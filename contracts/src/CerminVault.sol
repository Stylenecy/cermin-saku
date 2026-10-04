// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ICerminVault} from "./interfaces/ICerminVault.sol";
import {IBorrowerOperations} from "./interfaces/mezo/IBorrowerOperations.sol";
import {ITroveManager} from "./interfaces/mezo/ITroveManager.sol";
import {IPriceFeed} from "./interfaces/mezo/IPriceFeed.sol";
import {ISavingsVault} from "./interfaces/mezo/ISavingsVault.sol";

/// @title CerminVault — per-user wrapper around a single Mezo trove
/// @notice Deployed once, cloned per user via EIP-1167. Holds one trove plus a
///         spendable MUSD bucket and an sMUSD position.
/// @dev    v1.1 (Cermin Saku): adds delegated spending for scheduled allowances.
///         The owner grants a spender (the CerminSaku contract) a capped
///         allowance; every delegated payment is re-checked against the live
///         price and refused unless the position is healthy AND the reserve
///         left behind could still fund defend() after a simulated crash.
///         Min debt / gas compensation are deploy-time immutables so the same
///         code fits CDPs with different minimums (Mezo: 2,000 / 200 MUSD).
contract CerminVault is ICerminVault {
    using SafeERC20 for IERC20;

    uint256 private constant BASIS_POINTS = 10_000;
    uint256 private constant ICR_PRECISION = 1e18;
    uint256 private constant PRICE_PRECISION = 1e18;
    uint256 private constant DEFEND_OVERSHOOT_BPS = 2_000;

    // Cermin Saku policy bounds. The owner may tighten the policy, never
    // remove it: a delegated payment always keeps a margin above defendICR.
    uint16 public constant MIN_FLOOR_BUFFER_BPS = 500;       // +5 pts above defendICR
    uint16 public constant MAX_FLOOR_BUFFER_BPS = 5_000;     // +50 pts
    uint16 public constant MIN_STRESS_BPS = 1_000;           // must survive at least a 10% drop
    uint16 public constant MAX_STRESS_BPS = 7_000;           // up to a 70% drop
    uint16 public constant DEFAULT_FLOOR_BUFFER_BPS = 1_000; // +10 pts
    uint16 public constant DEFAULT_STRESS_BPS = 3_000;       // 30% crash

    /// @notice Minimum trove debt enforced at open (CDP rule; Mezo = 2,000 MUSD).
    uint256 public immutable MIN_DEBT;
    /// @notice Gas compensation the CDP keeps in its gas pool (Mezo = 200 MUSD).
    uint256 public immutable GAS_COMP;

    address public immutable BORROWER_OPS;
    address public immutable TROVE_MANAGER;
    address public immutable PRICE_FEED;
    address public immutable MUSD;
    address public immutable SAVINGS_VAULT;

    address private _owner;
    bool private _initialized;
    bool private _opened;
    uint8 private _locked;

    VaultParams private _params;
    VaultState private _state;

    // ── v1.1 storage (appended; clones start empty) ──
    mapping(address spender => uint256 cap) private _spendAllowance;
    SakuPolicy private _sakuPolicy;

    modifier nonReentrant() {
        if (_locked == 1) revert Reentrancy();
        _locked = 1;
        _;
        _locked = 0;
    }

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    modifier whenInitialized() {
        if (!_initialized) revert NotInitialized();
        _;
    }

    constructor(
        address borrowerOps_,
        address troveManager_,
        address priceFeed_,
        address musd_,
        address savingsVault_,
        uint256 minDebt_,
        uint256 gasComp_
    ) {
        if (gasComp_ >= minDebt_) revert InvalidParams();
        MIN_DEBT = minDebt_;
        GAS_COMP = gasComp_;
        BORROWER_OPS = borrowerOps_;
        TROVE_MANAGER = troveManager_;
        PRICE_FEED = priceFeed_;
        MUSD = musd_;
        SAVINGS_VAULT = savingsVault_;
        // Lock the implementation: clones inherit code, not state.
        _initialized = true;
        _opened = true;
    }

    receive() external payable {}

    /// @inheritdoc ICerminVault
    function initialize(address owner_, VaultParams calldata params_) external override {
        if (_initialized) revert AlreadyInitialized();
        _validateParams(params_);
        _initialized = true;
        _owner = owner_;
        _params = params_;
        _state.createdAt = uint64(block.timestamp);
        _sakuPolicy = SakuPolicy(DEFAULT_FLOOR_BUFFER_BPS, DEFAULT_STRESS_BPS);
    }

    /// @inheritdoc ICerminVault
    function open(uint256 maxBorrow, address upperHint, address lowerHint)
        external
        payable
        override
        whenInitialized
        nonReentrant
    {
        if (_opened) revert AlreadyOpened();
        _opened = true;

        uint256 price = IPriceFeed(PRICE_FEED).fetchPrice();
        uint256 borrowAmount = (msg.value * price * _params.targetLTV) / (PRICE_PRECISION * BASIS_POINTS);
        if (borrowAmount < MIN_DEBT) revert MinDebtNotMet();
        if (maxBorrow != 0 && borrowAmount > maxBorrow) revert BorrowExceedsCap();

        IBorrowerOperations(BORROWER_OPS).openTrove{value: msg.value}(borrowAmount, upperHint, lowerHint);

        _allocateBorrowed(borrowAmount);
        _state.lastSkimPrice = price;
        _state.lastSeenPrice = price;

        emit VaultOpened(_owner, _params);
    }

    /// @inheritdoc ICerminVault
    function close() external override whenInitialized onlyOwner nonReentrant {
        ISavingsVault(SAVINGS_VAULT).claimYield();
        uint256 shares = _state.smusdShares;
        if (shares > 0) {
            _state.smusdShares = 0;
            ISavingsVault(SAVINGS_VAULT).withdraw(shares);
        }

        // Mezo's closeTrove burns (debt − GAS_COMP) from the caller and burns
        // the gas-pool's GAS_COMP separately. The borrow fee (~0.1%) paid to
        // PCV at open is part of debt, so we cover it by pulling from the
        // owner — they must hold and approve enough MUSD before calling close.
        uint256 debt = ITroveManager(TROVE_MANAGER).getTroveDebt(address(this));
        uint256 toBurn = debt - GAS_COMP;
        uint256 musdBalance = IERC20(MUSD).balanceOf(address(this));
        if (musdBalance < toBurn) {
            uint256 shortfall;
            unchecked { shortfall = toBurn - musdBalance; }
            IERC20(MUSD).safeTransferFrom(_owner, address(this), shortfall);
        }

        _state.spendableMusd = 0;
        IERC20(MUSD).forceApprove(BORROWER_OPS, toBurn);
        IBorrowerOperations(BORROWER_OPS).closeTrove();

        uint256 musdRemainder = IERC20(MUSD).balanceOf(address(this));
        if (musdRemainder > 0) IERC20(MUSD).safeTransfer(_owner, musdRemainder);

        uint256 btcBalance = address(this).balance;
        if (btcBalance > 0) {
            (bool ok,) = payable(_owner).call{value: btcBalance}("");
            if (!ok) revert EthTransferFailed();
        }

        emit Closed(btcBalance, musdRemainder);
    }

    /// @inheritdoc ICerminVault
    function deposit(address upperHint, address lowerHint)
        external
        payable
        override
        whenInitialized
        onlyOwner
        nonReentrant
    {
        if (msg.value == 0) return;
        IBorrowerOperations(BORROWER_OPS).addColl{value: msg.value}(upperHint, lowerHint);
        emit CollateralAdded(msg.value);
    }

    /// @inheritdoc ICerminVault
    function withdrawSpendable(uint256 amount, address recipient)
        external
        override
        whenInitialized
        onlyOwner
        nonReentrant
    {
        if (amount > _state.spendableMusd) revert InsufficientSpendable();
        unchecked { _state.spendableMusd -= amount; }
        IERC20(MUSD).safeTransfer(recipient, amount);
        emit SpendableWithdrawn(recipient, amount);
    }

    /// @inheritdoc ICerminVault
    function skim(address upperHint, address lowerHint)
        external
        override
        whenInitialized
        nonReentrant
    {
        uint256 price = IPriceFeed(PRICE_FEED).fetchPrice();
        uint256 last = _state.lastSkimPrice;
        if (last == 0 || price <= last) revert PriceMoveBelowThreshold();

        uint256 priceMoveBps;
        unchecked { priceMoveBps = ((price - last) * BASIS_POINTS) / last; }
        if (priceMoveBps < _params.skimThresholdBps) revert PriceMoveBelowThreshold();

        uint256 debt = ITroveManager(TROVE_MANAGER).getTroveDebt(address(this));
        uint256 coll = ITroveManager(TROVE_MANAGER).getTroveColl(address(this));
        uint256 maxBorrow = (coll * price * _params.targetLTV) / (PRICE_PRECISION * BASIS_POINTS);
        if (maxBorrow <= debt) revert NoSkimCapacity();

        uint256 newCapacity;
        unchecked { newCapacity = maxBorrow - debt; }
        IBorrowerOperations(BORROWER_OPS).withdrawMUSD(newCapacity, upperHint, lowerHint);

        (uint256 toSpendable, uint256 toVault) = _allocateBorrowed(newCapacity);
        _state.lastSkimPrice = price;
        _state.lastSeenPrice = price;

        emit Skimmed(price, toSpendable, toVault, debt + newCapacity);
    }

    /// @inheritdoc ICerminVault
    function defend(address upperHint, address lowerHint)
        external
        override
        whenInitialized
        nonReentrant
    {
        uint256 price = IPriceFeed(PRICE_FEED).fetchPrice();
        uint256 icrBefore = _icrBps(price);
        if (icrBefore >= _params.defendICR) revert ICRAboveDefend();

        uint256 debt = ITroveManager(TROVE_MANAGER).getTroveDebt(address(this));
        uint256 coll = ITroveManager(TROVE_MANAGER).getTroveColl(address(this));

        uint256 targetICR = icrBefore < _params.emergencyICR
            ? uint256(_params.defendICR) + DEFEND_OVERSHOOT_BPS
            : uint256(_params.defendICR);
        uint256 targetDebt = (coll * price * BASIS_POINTS) / (targetICR * PRICE_PRECISION);
        uint256 needRepay = debt > targetDebt ? debt - targetDebt : 0;
        if (needRepay == 0) revert ICRAboveDefend();

        // Harvest pending yield; reclassify into spendable so principal-side
        // accounting stays pure 1:1 sMUSD.
        uint256 yieldClaimed = ISavingsVault(SAVINGS_VAULT).claimYield();
        if (yieldClaimed > 0) _state.spendableMusd += yieldClaimed;

        uint256 principal = _state.smusdShares;
        uint256 fromVault = needRepay <= principal ? needRepay : principal;
        uint256 fromSpendable;
        unchecked { fromSpendable = needRepay - fromVault; }
        if (fromSpendable > _state.spendableMusd) {
            fromSpendable = _state.spendableMusd;
            needRepay = fromVault + fromSpendable;
        }
        if (needRepay == 0) revert ICRAboveDefend();

        if (fromSpendable > 0) {
            unchecked { _state.spendableMusd -= fromSpendable; }
        }
        if (fromVault > 0) {
            unchecked { _state.smusdShares = principal - fromVault; }
            ISavingsVault(SAVINGS_VAULT).withdraw(fromVault);
        }

        IERC20(MUSD).forceApprove(BORROWER_OPS, needRepay);
        IBorrowerOperations(BORROWER_OPS).repayMUSD(needRepay, upperHint, lowerHint);

        uint256 icrAfter = _icrBps(price);
        if (icrAfter <= icrBefore) revert NoDefenseProgress();
        _state.lastSeenPrice = price;
        emit Defended(icrBefore, icrAfter, needRepay, fromVault, fromSpendable);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cermin Saku — delegated, safety-gated spending (v1.1)
    // ─────────────────────────────────────────────────────────────────────────

    /// @inheritdoc ICerminVault
    function setSpendAllowance(address spender, uint256 cap) external override whenInitialized onlyOwner {
        _spendAllowance[spender] = cap;
        emit SpendAllowanceSet(spender, cap);
    }

    /// @inheritdoc ICerminVault
    function setSakuPolicy(uint16 floorBufferBps, uint16 stressBps) external override whenInitialized onlyOwner {
        if (floorBufferBps < MIN_FLOOR_BUFFER_BPS || floorBufferBps > MAX_FLOOR_BUFFER_BPS) {
            revert InvalidSakuPolicy();
        }
        if (stressBps < MIN_STRESS_BPS || stressBps > MAX_STRESS_BPS) revert InvalidSakuPolicy();
        _sakuPolicy = SakuPolicy(floorBufferBps, stressBps);
        emit SakuPolicySet(floorBufferBps, stressBps);
    }

    /// @inheritdoc ICerminVault
    /// @dev Pays from the spendable bucket only — savings stay as the defense
    ///      reserve. Reverts with SakuBlocked(status) unless every gate passes
    ///      at the live price. Collateral is never touched.
    function withdrawSpendableFor(uint256 amount, address recipient)
        external
        override
        whenInitialized
        nonReentrant
    {
        uint256 price = IPriceFeed(PRICE_FEED).fetchPrice();
        (SakuStatus status, uint256 icrBps,,) = _sakuStatus(msg.sender, amount, price);
        if (status != SakuStatus.Ok) revert SakuBlocked(status);

        unchecked {
            _spendAllowance[msg.sender] -= amount;
            _state.spendableMusd -= amount;
        }
        _state.lastSeenPrice = price;
        IERC20(MUSD).safeTransfer(recipient, amount);
        emit SpendableWithdrawnFor(msg.sender, recipient, amount, icrBps);
    }

    /// @inheritdoc ICerminVault
    function sakuStatus(address spender, uint256 amount, uint256 price)
        external
        view
        override
        returns (SakuStatus status, uint256 icrBps, uint256 reserveAfter, uint256 reserveNeeded)
    {
        return _sakuStatus(spender, amount, price);
    }

    function spendAllowance(address spender) external view override returns (uint256) {
        return _spendAllowance[spender];
    }

    function sakuPolicy() external view override returns (SakuPolicy memory) {
        return _sakuPolicy;
    }

    /// @notice ICR at the last cached price. Open / skim / defend each refresh
    ///         the cache. Returns 0 before open. Mezo's oracle reverts under
    ///         STATICCALL so a view function cannot read it live.
    function getICR() external view override returns (uint256) {
        uint256 price = _state.lastSeenPrice;
        if (price == 0) return 0;
        return _icrBps(price);
    }

    function getDebt() external view override returns (uint256) {
        return ITroveManager(TROVE_MANAGER).getTroveDebt(address(this));
    }

    function getCollateral() external view override returns (uint256) {
        return ITroveManager(TROVE_MANAGER).getTroveColl(address(this));
    }

    function getShadow() external view override returns (uint256 spendable, uint256 vaultValue) {
        spendable = _state.spendableMusd;
        vaultValue = _state.smusdShares + ISavingsVault(SAVINGS_VAULT).claimableYield(address(this));
    }

    function params() external view override returns (VaultParams memory) {
        return _params;
    }

    function state() external view override returns (VaultState memory) {
        return _state;
    }

    function owner() external view override returns (address) {
        return _owner;
    }

    /// @dev Pure safety math at a given price. Gate order: allowance,
    ///      spendable, health floor, crash reserve. The reserve rule mirrors
    ///      defend(): the repay needed to bring ICR back to defendICR if the
    ///      price fell by `stressBps`, funded from spendable-left + savings.
    function _sakuStatus(address spender, uint256 amount, uint256 price)
        private
        view
        returns (SakuStatus status, uint256 icrBps, uint256 reserveAfter, uint256 reserveNeeded)
    {
        uint256 spendable = _state.spendableMusd;
        reserveAfter = (amount <= spendable ? spendable - amount : 0) + _state.smusdShares;

        SakuPolicy memory pol = _sakuPolicy;
        uint256 debt = ITroveManager(TROVE_MANAGER).getTroveDebt(address(this));
        // No debt (never opened or closed): nothing to defend, ICR unbounded.
        icrBps = debt == 0 ? type(uint256).max : _icrBps(price);
        if (debt > 0) {
            uint256 coll = ITroveManager(TROVE_MANAGER).getTroveColl(address(this));
            uint256 stressedPrice = (price * (BASIS_POINTS - pol.stressBps)) / BASIS_POINTS;
            uint256 targetDebt =
                (coll * stressedPrice * BASIS_POINTS) / (uint256(_params.defendICR) * PRICE_PRECISION);
            reserveNeeded = debt > targetDebt ? debt - targetDebt : 0;
        }

        if (amount > _spendAllowance[spender]) {
            return (SakuStatus.AllowanceExceeded, icrBps, reserveAfter, reserveNeeded);
        }
        if (amount > spendable) return (SakuStatus.InsufficientSpendable, icrBps, reserveAfter, reserveNeeded);
        if (icrBps < uint256(_params.defendICR) + pol.floorBufferBps) {
            return (SakuStatus.IcrBelowFloor, icrBps, reserveAfter, reserveNeeded);
        }
        if (reserveAfter < reserveNeeded) return (SakuStatus.ReserveTooThin, icrBps, reserveAfter, reserveNeeded);
        return (SakuStatus.Ok, icrBps, reserveAfter, reserveNeeded);
    }

    function _allocateBorrowed(uint256 amount) private returns (uint256 toSpendable, uint256 toVault) {
        uint256 share = _params.spendableShare;
        toSpendable = (amount * share) / BASIS_POINTS;
        unchecked { toVault = amount - toSpendable; }
        _state.spendableMusd += toSpendable;
        if (toVault > 0) {
            // MUSDSavingsRate mints sMUSD 1:1 — no return value, shares = toVault.
            IERC20(MUSD).forceApprove(SAVINGS_VAULT, toVault);
            _state.smusdShares += toVault;
            ISavingsVault(SAVINGS_VAULT).deposit(toVault);
        }
    }

    function _icrBps(uint256 price) private view returns (uint256) {
        uint256 raw = ITroveManager(TROVE_MANAGER).getCurrentICR(address(this), price);
        return (raw * BASIS_POINTS) / ICR_PRECISION;
    }

    function _validateParams(VaultParams calldata p) private pure {
        if (p.targetLTV < 1_000 || p.targetLTV > 9_000) revert InvalidParams();
        if (p.emergencyICR < 11_500) revert InvalidParams();
        if (p.defendICR <= p.emergencyICR) revert InvalidParams();
        if (p.skimThresholdBps < 100 || p.skimThresholdBps > 5_000) revert InvalidParams();
        if (p.spendableShare > 10_000) revert InvalidParams();
        // Open-time ICR = BPS² / targetLTV. defendICR must sit at least 1000 bps below.
        uint256 openICR = (BASIS_POINTS * BASIS_POINTS) / p.targetLTV;
        if (uint256(p.defendICR) + 1_000 > openICR) revert InvalidParams();
    }
}

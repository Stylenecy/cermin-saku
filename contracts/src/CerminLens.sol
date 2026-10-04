// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ICerminVault} from "./interfaces/ICerminVault.sol";
import {ITroveManager} from "./interfaces/mezo/ITroveManager.sol";
import {ISavingsVault} from "./interfaces/mezo/ISavingsVault.sol";

/// @title CerminLens — "what if BNB goes to X?" for any Cermin vault
/// @notice Read-only. Every function takes a hypothetical BNB/USD price and
///         answers with the same math the vault would run on-chain, so the UI
///         never re-implements it. Previews mirror `defend()` / `skim()`
///         exactly (tested against real execution).
/// @dev    Liquity-style CDPs liquidate below 110% ICR (MCR). The BSC testnet
///         mock CDP does not run liquidations; the price is shown as the line
///         a real CDP would enforce.
contract CerminLens {
    uint256 private constant BPS = 10_000;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant DEFEND_OVERSHOOT_BPS = 2_000;
    uint256 public constant MCR_BPS = 11_000;

    struct Lines {
        uint256 liquidationPrice; // ICR = 110%
        uint256 defendPrice; // ICR = defendICR  → keeper defends below this
        uint256 sakuPausePrice; // ICR = defendICR + floor buffer → allowances held below this
        uint256 skimPrice; // price that unlocks the next skim
    }

    struct Snapshot {
        uint256 price;
        uint256 collateral;
        uint256 debt;
        uint256 icrBps;
        uint256 spendable;
        uint256 savings; // sMUSD principal + claimable yield
        uint16 defendICR;
        uint16 emergencyICR;
        uint16 sakuFloorICR;
        uint16 sakuStressBps;
        Lines lines;
    }

    struct DefendPreview {
        bool wouldDefend;
        uint256 repay;
        uint256 fromSavings;
        uint256 fromSpendable;
        uint256 icrBeforeBps;
        uint256 icrAfterBps;
    }

    struct SkimPreview {
        bool wouldSkim;
        uint256 capacity;
        uint256 toSpendable;
        uint256 toSavings;
    }

    /// @notice Price lines for a vault (independent of the current price).
    function lines(address vault) public view returns (Lines memory l) {
        ICerminVault v = ICerminVault(vault);
        uint256 coll = v.getCollateral();
        uint256 debt = v.getDebt();
        if (coll == 0 || debt == 0) return l;
        ICerminVault.VaultParams memory p = v.params();
        ICerminVault.SakuPolicy memory pol = v.sakuPolicy();
        l.liquidationPrice = _priceAtIcr(debt, coll, MCR_BPS);
        l.defendPrice = _priceAtIcr(debt, coll, p.defendICR);
        l.sakuPausePrice = _priceAtIcr(debt, coll, uint256(p.defendICR) + pol.floorBufferBps);
        uint256 last = v.state().lastSkimPrice;
        l.skimPrice = last + (last * p.skimThresholdBps + BPS - 1) / BPS;
    }

    /// @notice Everything the dashboard needs at a (hypothetical) price.
    function snapshot(address vault, uint256 price) external view returns (Snapshot memory s) {
        s.price = price;
        _fillPosition(s, vault, price);
        _fillPolicy(s, vault);
        s.lines = lines(vault);
    }

    function _fillPosition(Snapshot memory s, address vault, uint256 price) private view {
        ICerminVault v = ICerminVault(vault);
        s.collateral = v.getCollateral();
        s.debt = v.getDebt();
        s.icrBps = s.debt == 0 ? type(uint256).max : _icrBps(vault, price);
        s.spendable = v.state().spendableMusd;
        s.savings = v.state().smusdShares + ISavingsVault(_savings(vault)).claimableYield(vault);
    }

    function _fillPolicy(Snapshot memory s, address vault) private view {
        ICerminVault.VaultParams memory p = ICerminVault(vault).params();
        ICerminVault.SakuPolicy memory pol = ICerminVault(vault).sakuPolicy();
        s.defendICR = p.defendICR;
        s.emergencyICR = p.emergencyICR;
        s.sakuFloorICR = p.defendICR + pol.floorBufferBps;
        s.sakuStressBps = pol.stressBps;
    }

    /// @notice What `defend()` would do at `price`. Mirrors CerminVault.defend.
    function previewDefend(address vault, uint256 price) external view returns (DefendPreview memory d) {
        ICerminVault v = ICerminVault(vault);
        uint256 debt = v.getDebt();
        if (debt == 0) return d;
        uint256 coll = v.getCollateral();
        ICerminVault.VaultParams memory p = v.params();
        d.icrBeforeBps = _icrBps(vault, price);
        if (d.icrBeforeBps >= p.defendICR) return d;

        uint256 targetICR =
            d.icrBeforeBps < p.emergencyICR ? uint256(p.defendICR) + DEFEND_OVERSHOOT_BPS : uint256(p.defendICR);
        uint256 targetDebt = (coll * price * BPS) / (targetICR * PRECISION);
        uint256 needRepay = debt > targetDebt ? debt - targetDebt : 0;
        if (needRepay == 0) return d;

        ICerminVault.VaultState memory st = v.state();
        uint256 spendable = st.spendableMusd + ISavingsVault(_savings(vault)).claimableYield(vault);
        uint256 principal = st.smusdShares;
        uint256 fromVault = needRepay <= principal ? needRepay : principal;
        uint256 fromSpendable = needRepay - fromVault;
        if (fromSpendable > spendable) {
            fromSpendable = spendable;
            needRepay = fromVault + fromSpendable;
        }
        if (needRepay == 0) return d;

        uint256 debtAfter = debt - needRepay;
        d.icrAfterBps = debtAfter == 0 ? type(uint256).max : (coll * price * BPS) / (debtAfter * PRECISION);
        if (d.icrAfterBps <= d.icrBeforeBps) return d; // defend() would revert NoDefenseProgress
        d.wouldDefend = true;
        d.repay = needRepay;
        d.fromSavings = fromVault;
        d.fromSpendable = fromSpendable;
    }

    /// @notice What `skim()` would do at `price`. Mirrors CerminVault.skim.
    function previewSkim(address vault, uint256 price) external view returns (SkimPreview memory k) {
        ICerminVault v = ICerminVault(vault);
        ICerminVault.VaultParams memory p = v.params();
        uint256 last = v.state().lastSkimPrice;
        if (last == 0 || price <= last) return k;
        if (((price - last) * BPS) / last < p.skimThresholdBps) return k;
        uint256 debt = v.getDebt();
        uint256 maxBorrow = (v.getCollateral() * price * p.targetLTV) / (PRECISION * BPS);
        if (maxBorrow <= debt) return k;
        k.wouldSkim = true;
        k.capacity = maxBorrow - debt;
        k.toSpendable = (k.capacity * p.spendableShare) / BPS;
        k.toSavings = k.capacity - k.toSpendable;
    }

    /// @notice Would an allowance of `amount` paid by `spender` go through at `price`?
    function previewSaku(address vault, address spender, uint256 amount, uint256 price)
        external
        view
        returns (ICerminVault.SakuStatus status, uint256 icrBps, uint256 reserveAfter, uint256 reserveNeeded)
    {
        return ICerminVault(vault).sakuStatus(spender, amount, price);
    }

    function _icrBps(address vault, uint256 price) private view returns (uint256) {
        uint256 raw = ITroveManager(_troveManager(vault)).getCurrentICR(vault, price);
        return (raw * BPS) / PRECISION;
    }

    /// @dev price (1e18) at which coll * price / debt == icrBps.
    function _priceAtIcr(uint256 debt, uint256 coll, uint256 icrBps) private pure returns (uint256) {
        return (debt * icrBps * PRECISION + coll * BPS - 1) / (coll * BPS);
    }

    function _savings(address vault) private view returns (address) {
        return IVaultWiring(vault).SAVINGS_VAULT();
    }

    function _troveManager(address vault) private view returns (address) {
        return IVaultWiring(vault).TROVE_MANAGER();
    }
}

interface IVaultWiring {
    function SAVINGS_VAULT() external view returns (address);
    function TROVE_MANAGER() external view returns (address);
}

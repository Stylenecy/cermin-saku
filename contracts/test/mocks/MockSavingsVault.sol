// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ISavingsVault} from "../../src/interfaces/mezo/ISavingsVault.sol";

/// @notice 100% behavioural mirror of Mezo's `MUSDSavingsRate` (proxy
///         0xb4D498029af77680cD1eF828b967f010d06C51CC). Used both in unit
///         tests and as the testnet stand-in deployed by `Deploy.s.sol`
///         since Mezo has not deployed `MUSDSavingsRate` on matsnet.
///
///         Behaviour:
///           - deposit(amount): pulls `amount` MUSD, mints `amount` sMUSD.
///           - withdraw(amount): burns `amount` sMUSD, sends `amount` MUSD.
///           - Yield accrues outside the share balance; holders see no
///             change in `balanceOf` until they call `claimYield()`.
///           - Yield is distributed pro-rata via an index, exactly like
///             the real `MUSDSavingsRate`.
contract MockSavingsVault is ISavingsVault, ERC20 {
    uint256 private constant INDEX_PRECISION = 1e18;

    address private immutable _musd;
    uint256 private _yieldIndex;
    mapping(address => uint256) private _holderIndex;
    mapping(address => uint256) private _pending;

    constructor(address musd_) ERC20("sMUSD", "sMUSD") {
        _musd = musd_;
    }

    function musdToken() external view override returns (address) {
        return _musd;
    }

    function deposit(uint256 amount) external override {
        _settleYield(msg.sender);
        IERC20(_musd).transferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);
    }

    function withdraw(uint256 amount) external override {
        _settleYield(msg.sender);
        _burn(msg.sender, amount);
        IERC20(_musd).transfer(msg.sender, amount);
    }

    function claimYield() external override returns (uint256 paid) {
        _settleYield(msg.sender);
        paid = _pending[msg.sender];
        if (paid > 0) {
            _pending[msg.sender] = 0;
            IERC20(_musd).transfer(msg.sender, paid);
        }
    }

    function claimableYield(address holder) external view override returns (uint256) {
        return _pending[holder] + _unsettledYield(holder);
    }

    /// @notice Test helper — simulate `amount` MUSD of protocol yield arriving
    ///         to the vault. Distributed pro-rata to every sMUSD holder via
    ///         the index, exactly like the real contract.
    function accrueYield(uint256 amount) external {
        require(totalSupply() > 0, "MockSV: no shares");
        IERC20(_musd).transferFrom(msg.sender, address(this), amount);
        _yieldIndex += (amount * INDEX_PRECISION) / totalSupply();
    }

    // ── ERC20 hook so settlement runs on every transfer (matches the real
    //    contract's bookkeeping pattern).
    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) _settleYield(from);
        if (to != address(0) && to != from) _settleYield(to);
        super._update(from, to, value);
    }

    function _settleYield(address holder) internal {
        uint256 unsettled = _unsettledYield(holder);
        if (unsettled > 0) _pending[holder] += unsettled;
        _holderIndex[holder] = _yieldIndex;
    }

    function _unsettledYield(address holder) internal view returns (uint256) {
        uint256 indexDelta = _yieldIndex - _holderIndex[holder];
        if (indexDelta == 0) return 0;
        return (balanceOf(holder) * indexDelta) / INDEX_PRECISION;
    }
}

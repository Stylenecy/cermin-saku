// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title ISavingsVault — Mezo MUSD Savings Vault (`MUSDSavingsRate`)
/// @notice The on-chain vault is NOT ERC4626. It is a rebase-style claim:
///         sMUSD is minted 1:1 with MUSD on deposit, burned 1:1 on withdraw.
///         Yield accrues outside the share balance and is harvested via
///         `claimYield()`. View pending yield with `claimableYield(holder)`.
///
///         Mainnet proxy: 0xb4D498029af77680cD1eF828b967f010d06C51CC
///         Mainnet impl:  0x874e281725b75bc9Ac138e17768a7471199d7f2c
///
///         Cermin must deploy a matching mock on matsnet because Mezo has not
///         deployed this vault on matsnet yet (only the CDP core).
interface ISavingsVault is IERC20 {
    /// @notice Deposit `amount` MUSD; mints `amount` sMUSD to msg.sender.
    /// @dev Caller must approve `amount` MUSD to the vault first.
    function deposit(uint256 amount) external;

    /// @notice Burn `amount` sMUSD from msg.sender and transfer `amount` MUSD back.
    function withdraw(uint256 amount) external;

    /// @notice Harvest accrued yield for msg.sender; transfers MUSD to msg.sender.
    /// @return The MUSD amount transferred.
    function claimYield() external returns (uint256);

    /// @notice Pending yield (in MUSD) claimable by `holder`.
    function claimableYield(address holder) external view returns (uint256);

    /// @notice The underlying MUSD token address.
    function musdToken() external view returns (address);
}

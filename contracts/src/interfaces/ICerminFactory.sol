// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ICerminVault} from "./ICerminVault.sol";

/// @title ICerminFactory — deploys CerminVault clones and tracks one vault per user
interface ICerminFactory {
    event VaultCreated(address indexed owner, address indexed vault, ICerminVault.VaultParams params);

    error VaultAlreadyExists();

    function createVault(
        ICerminVault.VaultParams calldata params,
        uint256 maxBorrow,
        address upperHint,
        address lowerHint
    ) external payable returns (address vault);

    function vaultOf(address user) external view returns (address);
    function allVaults() external view returns (address[] memory);
    function vaultImplementation() external view returns (address);
}

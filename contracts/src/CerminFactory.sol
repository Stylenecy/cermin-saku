// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ICerminFactory} from "./interfaces/ICerminFactory.sol";
import {ICerminVault} from "./interfaces/ICerminVault.sol";

/// @title CerminFactory — clones a CerminVault implementation per user
/// @notice One vault per address (mirrors Mezo's one-trove-per-address rule).
contract CerminFactory is ICerminFactory, ReentrancyGuard {
    address public immutable override vaultImplementation;

    mapping(address user => address vault) public override vaultOf;
    address[] private _allVaults;

    constructor(address vaultImplementation_) {
        vaultImplementation = vaultImplementation_;
    }

    /// @inheritdoc ICerminFactory
    function createVault(
        ICerminVault.VaultParams calldata params,
        uint256 maxBorrow,
        address upperHint,
        address lowerHint
    ) external payable override nonReentrant returns (address vault) {
        if (vaultOf[msg.sender] != address(0)) revert VaultAlreadyExists();

        vault = Clones.clone(vaultImplementation);
        vaultOf[msg.sender] = vault;
        _allVaults.push(vault);

        ICerminVault(vault).initialize(msg.sender, params);
        ICerminVault(vault).open{value: msg.value}(maxBorrow, upperHint, lowerHint);

        emit VaultCreated(msg.sender, vault, params);
    }

    function allVaults() external view override returns (address[] memory) {
        return _allVaults;
    }
}

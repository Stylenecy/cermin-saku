// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Cermin Saku: mint/burn are restricted to the deployer and the
///      addresses it authorises (BorrowerOperations). They were open to
///      anyone, which on a public testnet lets a stranger burn any balance.
contract MockMUSD is ERC20 {
    address public immutable owner;
    mapping(address => bool) public isMinter;

    error NotMinter();

    constructor() ERC20("Mock MUSD", "MUSD") {
        owner = msg.sender;
    }

    modifier onlyMinter() {
        if (msg.sender != owner && !isMinter[msg.sender]) revert NotMinter();
        _;
    }

    function setMinter(address minter, bool allowed) external {
        if (msg.sender != owner) revert NotMinter();
        isMinter[minter] = allowed;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyMinter {
        _burn(from, amount);
    }
}

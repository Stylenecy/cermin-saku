// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IPriceFeed} from "../../src/interfaces/mezo/IPriceFeed.sol";

/// @notice 1:1 mirror of Mezo PriceFeed's external surface: a single
///         `fetchPrice()` view returning BTC/USD scaled to 1e18.
/// @dev    Cermin Saku: `setPrice` is owner-only (it was open to anyone) so a
///         public testnet deployment cannot be moved by strangers, and every
///         change is logged so the UI can say when the simulated price moved.
contract MockPriceFeed is IPriceFeed {
    uint256 public price;
    uint256 public updatedAt;
    address public owner;

    event PriceSet(uint256 price, address indexed by);
    event OwnerChanged(address indexed owner);

    error NotOwner();

    constructor(uint256 initialPrice) {
        owner = msg.sender;
        price = initialPrice;
        updatedAt = block.timestamp;
        emit PriceSet(initialPrice, msg.sender);
    }

    function setPrice(uint256 newPrice) external {
        if (msg.sender != owner) revert NotOwner();
        price = newPrice;
        updatedAt = block.timestamp;
        emit PriceSet(newPrice, msg.sender);
    }

    function setOwner(address newOwner) external {
        if (msg.sender != owner) revert NotOwner();
        owner = newOwner;
        emit OwnerChanged(newOwner);
    }

    function fetchPrice() external view override returns (uint256) {
        return price;
    }
}

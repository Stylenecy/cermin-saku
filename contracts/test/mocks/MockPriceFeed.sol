// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IPriceFeed} from "../../src/interfaces/mezo/IPriceFeed.sol";

/// @notice 1:1 mirror of Mezo PriceFeed's external surface: a single
///         `fetchPrice()` view returning BTC/USD scaled to 1e18.
contract MockPriceFeed is IPriceFeed {
    uint256 public price;

    constructor(uint256 initialPrice) {
        price = initialPrice;
    }

    function setPrice(uint256 newPrice) external {
        price = newPrice;
    }

    function fetchPrice() external override returns (uint256) {
        return price;
    }
}

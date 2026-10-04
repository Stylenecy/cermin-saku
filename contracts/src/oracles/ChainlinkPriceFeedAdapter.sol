// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {IPriceFeed} from "../interfaces/mezo/IPriceFeed.sol";

interface IAggregatorV3 {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

/// @title ChainlinkPriceFeedAdapter — exposes a Chainlink aggregator (e.g. BNB/USD
///        on BNB Chain) through Cermin's `IPriceFeed.fetchPrice()` surface,
///        scaled to 1e18. Reverts on non-positive or stale answers.
contract ChainlinkPriceFeedAdapter is IPriceFeed {
    IAggregatorV3 public immutable AGGREGATOR;
    uint256 public immutable MAX_STALENESS;
    uint256 private immutable SCALE;

    error InvalidPrice();
    error StalePrice();

    constructor(address aggregator_, uint256 maxStaleness_) {
        AGGREGATOR = IAggregatorV3(aggregator_);
        MAX_STALENESS = maxStaleness_;
        SCALE = 10 ** (18 - IAggregatorV3(aggregator_).decimals());
    }

    function fetchPrice() external view override returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = AGGREGATOR.latestRoundData();
        if (answer <= 0) revert InvalidPrice();
        if (block.timestamp - updatedAt > MAX_STALENESS) revert StalePrice();
        return uint256(answer) * SCALE;
    }
}

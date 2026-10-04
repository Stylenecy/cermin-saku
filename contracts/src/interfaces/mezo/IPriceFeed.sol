// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @title IPriceFeed — Mezo BTC/USD oracle (subset used by Cermin)
/// @notice Verified against live impl on Mezo matsnet (proxy
///         0x86bCF0841622a5dAC14A313a15f96A95421b9366, impl
///         0xec42B37C12b8D73d320f4075A1BCd58B306629c1) on 2026-05-18.
///         Only one method: `fetchPrice()`.
///
///         IMPORTANT: although the deployed ABI labels `fetchPrice` as
///         `view`, the implementation calls Mezo's oracle precompile
///         (0x7b7c…15) which reverts when invoked via STATICCALL. We
///         therefore declare it non-view so Solidity emits a regular
///         CALL — caching the result locally is the only way to expose
///         an ICR view downstream.
interface IPriceFeed {
    function fetchPrice() external returns (uint256);
}

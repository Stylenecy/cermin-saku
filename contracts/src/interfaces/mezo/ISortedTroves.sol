// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @title ISortedTroves — Mezo SortedTroves (Liquity-style linked list of troves by NICR)
/// @notice Cermin reads this off-chain to compute hint pairs; on-chain code does not call it.
interface ISortedTroves {
    function getFirst() external view returns (address);
    function getLast() external view returns (address);
    function getNext(address _id) external view returns (address);
    function getPrev(address _id) external view returns (address);
    function findInsertPosition(
        uint256 _NICR,
        address _prevId,
        address _nextId
    ) external view returns (address, address);
    function contains(address _id) external view returns (bool);
    function getSize() external view returns (uint256);
}

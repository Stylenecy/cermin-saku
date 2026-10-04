// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

/// @title ICerminVault — per-user proxy vault that wraps a single Mezo trove
/// @notice Vault contracts are deployed as EIP-1167 clones; constructor logic lives on
///         the implementation, runtime state lives on the clone.
interface ICerminVault {
    /// @dev Packs into a single 256-bit slot (5 × uint16 = 80 bits).
    struct VaultParams {
        uint16 targetLTV;          // basis points; 5000 = 50%
        uint16 defendICR;          // basis points; defense triggers below this ICR
        uint16 emergencyICR;       // basis points; aggressive repay; ≥ 11500
        uint16 skimThresholdBps;   // basis points price increase needed to skim
        uint16 spendableShare;     // basis points of borrow that goes to spendable bucket
    }

    struct VaultState {
        uint256 lastSkimPrice;   // BTC/USD at last skim — drives skim threshold
        uint256 lastSeenPrice;   // BTC/USD at last state-changing op — drives getICR view
        uint256 spendableMusd;
        uint256 smusdShares;
        uint64  createdAt;
    }

    event VaultOpened(address indexed owner, VaultParams params);
    event Skimmed(uint256 priceAtSkim, uint256 toSpendable, uint256 toVault, uint256 newDebt);
    event Defended(uint256 icrBefore, uint256 icrAfter, uint256 repaid, uint256 fromVault, uint256 fromSpendable);
    event SpendableWithdrawn(address indexed recipient, uint256 amount);
    event CollateralAdded(uint256 amount);
    event Closed(uint256 btcReturned, uint256 musdRemainder);

    error AlreadyInitialized();
    error NotInitialized();
    error AlreadyOpened();
    error NotOwner();
    error MinDebtNotMet();
    error BorrowExceedsCap();
    error InvalidParams();
    error PriceMoveBelowThreshold();
    error NoSkimCapacity();
    error ICRAboveDefend();
    error InsufficientSpendable();
    error InsufficientFundsToClose();
    error EthTransferFailed();
    error Reentrancy();
    error NoDefenseProgress();

    function initialize(address owner_, VaultParams calldata params_) external;

    function open(uint256 maxBorrow, address upperHint, address lowerHint) external payable;
    function close() external;

    function deposit(address upperHint, address lowerHint) external payable;
    function withdrawSpendable(uint256 amount, address recipient) external;

    function skim(address upperHint, address lowerHint) external;
    function defend(address upperHint, address lowerHint) external;

    function getICR() external view returns (uint256);
    function getDebt() external view returns (uint256);
    function getCollateral() external view returns (uint256);
    function getShadow() external view returns (uint256 spendable, uint256 vaultValue);
    function params() external view returns (VaultParams memory);
    function state() external view returns (VaultState memory);
    function owner() external view returns (address);
}

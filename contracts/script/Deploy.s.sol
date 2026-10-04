// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Script, console2} from "forge-std/Script.sol";
import {CerminVault} from "../src/CerminVault.sol";
import {CerminFactory} from "../src/CerminFactory.sol";
import {ChainlinkPriceFeedAdapter} from "../src/oracles/ChainlinkPriceFeedAdapter.sol";
import {MockSavingsVault} from "../test/mocks/MockSavingsVault.sol";
import {MockMUSD} from "../test/mocks/MockMUSD.sol";
import {MockTroveManager} from "../test/mocks/MockTroveManager.sol";
import {MockBorrowerOperations} from "../test/mocks/MockBorrowerOperations.sol";
import {MockPriceFeed} from "../test/mocks/MockPriceFeed.sol";

/// @title Deploy — CerminVault impl + CerminFactory to BNB Chain (BSC testnet 97 / mainnet 56)
/// @notice Mezo (the original CDP backend) does not exist on BNB Chain. Every
///         CDP singleton is read from env; any that is unset is replaced by the
///         Liquity-style mock stack from `test/mocks` so the full Cermin flow
///         (open → skim → defend → close) runs on BSC testnet with native tBNB
///         as collateral. See `.env.example` and `../MIGRATION-BNB.md`.
///
///         Usage:
///           cp .env.example .env && source .env
///           forge script script/Deploy.s.sol:Deploy \
///             --rpc-url bsc_testnet --private-key $PRIVATE_KEY --broadcast \
///             --verify --etherscan-api-key $BSCSCAN_API_KEY
contract Deploy is Script {
    function run() external {
        address borrowerOps  = vm.envOr("CDP_BORROWER_OPS", address(0));
        address troveManager = vm.envOr("CDP_TROVE_MANAGER", address(0));
        address priceFeed    = vm.envOr("CDP_PRICE_FEED", address(0));
        address musd         = vm.envOr("CDP_MUSD", address(0));
        address savingsVault = vm.envOr("CDP_SAVINGS_VAULT", address(0));
        address chainlinkFeed = vm.envOr("CHAINLINK_BNB_USD_FEED", address(0));
        uint256 mockPrice    = vm.envOr("MOCK_BNB_PRICE", uint256(600e18));
        // BSC mainnet BNB/USD updates every ~30s; the testnet feed only ~hourly
        // (observed gaps up to 3603s), so 1h would intermittently revert there.
        uint256 maxStaleness =
            vm.envOr("CHAINLINK_MAX_STALENESS", block.chainid == 97 ? uint256(2 hours) : uint256(1 hours));

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:    ", deployer);
        console2.log("Chain ID:    ", block.chainid);

        vm.startBroadcast(pk);

        // ── Price feed: explicit > Chainlink adapter > owner-settable mock ──
        if (priceFeed == address(0)) {
            if (chainlinkFeed != address(0)) {
                priceFeed = address(new ChainlinkPriceFeedAdapter(chainlinkFeed, maxStaleness));
                console2.log("ChainlinkPriceFeedAdapter:", priceFeed);
            } else {
                priceFeed = address(new MockPriceFeed(mockPrice));
                console2.log("MockPriceFeed (BNB/USD):", priceFeed);
            }
        }

        // ── CDP stack: no Mezo on BNB Chain -> deploy the mock trove stack ──
        if (borrowerOps == address(0) || troveManager == address(0) || musd == address(0)) {
            require(
                borrowerOps == address(0) && troveManager == address(0) && musd == address(0),
                "Set all of CDP_BORROWER_OPS/CDP_TROVE_MANAGER/CDP_MUSD or none"
            );
            MockMUSD m = new MockMUSD();
            MockTroveManager tm = new MockTroveManager();
            MockBorrowerOperations bo = new MockBorrowerOperations(address(m), address(tm));
            tm.setBorrowerOps(address(bo));
            musd = address(m);
            troveManager = address(tm);
            borrowerOps = address(bo);
            console2.log("MockMUSD:              ", musd);
            console2.log("MockTroveManager:      ", troveManager);
            console2.log("MockBorrowerOperations:", borrowerOps);
        }

        if (savingsVault == address(0)) {
            savingsVault = address(new MockSavingsVault(musd));
            console2.log("MockSavingsVault:", savingsVault);
        }

        CerminVault impl = new CerminVault(borrowerOps, troveManager, priceFeed, musd, savingsVault);
        CerminFactory factory = new CerminFactory(address(impl));

        vm.stopBroadcast();

        console2.log("\n=== DEPLOY DONE ===");
        console2.log("CerminVault impl:", address(impl));
        console2.log("CerminFactory:   ", address(factory));
        console2.log("\nCopy into agent/.env and frontend/.env:");
        console2.log("CERMIN_FACTORY_ADDRESS=%s", address(factory));
        console2.log("PRICE_FEED_ADDRESS=%s", priceFeed);
        console2.log("MUSD_ADDRESS=%s", musd);
        console2.log("SAVINGS_VAULT_ADDRESS=%s", savingsVault);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import {Script, console2} from "forge-std/Script.sol";
import {CerminVault} from "../src/CerminVault.sol";
import {CerminFactory} from "../src/CerminFactory.sol";
import {CerminSaku} from "../src/CerminSaku.sol";
import {CerminLens} from "../src/CerminLens.sol";
import {ChainlinkPriceFeedAdapter} from "../src/oracles/ChainlinkPriceFeedAdapter.sol";
import {MockSavingsVault} from "../test/mocks/MockSavingsVault.sol";
import {MockMUSD} from "../test/mocks/MockMUSD.sol";
import {MockTroveManager} from "../test/mocks/MockTroveManager.sol";
import {MockBorrowerOperations} from "../test/mocks/MockBorrowerOperations.sol";
import {MockPriceFeed} from "../test/mocks/MockPriceFeed.sol";

/// @title Deploy — Cermin Saku stack to BNB Chain (BSC testnet 97 / local Anvil)
/// @notice Deploys CerminVault v1.1 impl + CerminFactory + CerminSaku + CerminLens.
///         Mezo (Cermin's original CDP) does not exist on BNB Chain; any CDP
///         singleton not given in env is replaced by the Liquity-style mock
///         stack from `test/mocks` (native BNB as collateral).
///
///         Min debt / gas compensation are deploy-time settings. Mezo uses
///         2,000 / 200 MUSD (the default). The testnet demo uses a smaller
///         pair so a faucet-sized trove works at a realistic BNB price.
///
///         Usage:
///           forge script script/Deploy.s.sol:Deploy --rpc-url bsc_testnet --broadcast
///         (PRIVATE_KEY from env; never passed on the command line.)
contract Deploy is Script {
    struct Stack {
        address borrowerOps;
        address troveManager;
        address priceFeed;
        address musd;
        address savingsVault;
        address impl;
        address factory;
        address saku;
        address lens;
        string feedKind;
        bool mockCdp;
        uint256 minDebt;
        uint256 gasComp;
    }

    function run() external {
        Stack memory d;
        d.borrowerOps = vm.envOr("CDP_BORROWER_OPS", address(0));
        d.troveManager = vm.envOr("CDP_TROVE_MANAGER", address(0));
        d.priceFeed = vm.envOr("CDP_PRICE_FEED", address(0));
        d.musd = vm.envOr("CDP_MUSD", address(0));
        d.savingsVault = vm.envOr("CDP_SAVINGS_VAULT", address(0));
        d.minDebt = vm.envOr("MIN_DEBT", uint256(2_000e18));
        d.gasComp = vm.envOr("GAS_COMP", uint256(200e18));
        d.feedKind = "explicit";

        uint256 pk = vm.envUint("PRIVATE_KEY");
        console2.log("Deployer:", vm.addr(pk));
        console2.log("Chain ID:", block.chainid);

        vm.startBroadcast(pk);
        _feed(d);
        _cdp(d);
        d.impl = address(
            new CerminVault(d.borrowerOps, d.troveManager, d.priceFeed, d.musd, d.savingsVault, d.minDebt, d.gasComp)
        );
        d.factory = address(new CerminFactory(d.impl));
        d.saku = address(new CerminSaku(d.factory));
        d.lens = address(new CerminLens());
        vm.stopBroadcast();

        _log(d);
        _write(d, vm.addr(pk));
    }

    /// Price feed: explicit > Chainlink adapter > owner-settable mock.
    function _feed(Stack memory d) internal {
        if (d.priceFeed != address(0)) return;
        address chainlinkFeed = vm.envOr("CHAINLINK_BNB_USD_FEED", address(0));
        if (chainlinkFeed != address(0)) {
            uint256 maxStaleness =
                vm.envOr("CHAINLINK_MAX_STALENESS", block.chainid == 97 ? uint256(2 hours) : uint256(1 hours));
            d.priceFeed = address(new ChainlinkPriceFeedAdapter(chainlinkFeed, maxStaleness));
            d.feedKind = "ChainlinkPriceFeedAdapter";
        } else {
            d.priceFeed = address(new MockPriceFeed(vm.envOr("MOCK_BNB_PRICE", uint256(600e18))));
            d.feedKind = "MockPriceFeed";
        }
    }

    /// CDP stack: no Mezo on BNB Chain -> deploy the mock trove stack.
    function _cdp(Stack memory d) internal {
        if (d.borrowerOps == address(0) || d.troveManager == address(0) || d.musd == address(0)) {
            require(
                d.borrowerOps == address(0) && d.troveManager == address(0) && d.musd == address(0),
                "Set all of CDP_BORROWER_OPS/CDP_TROVE_MANAGER/CDP_MUSD or none"
            );
            MockMUSD m = new MockMUSD();
            MockTroveManager tm = new MockTroveManager();
            MockBorrowerOperations bo = new MockBorrowerOperations(address(m), address(tm));
            tm.setBorrowerOps(address(bo));
            m.setMinter(address(bo), true);
            bo.setGasComp(d.gasComp);
            d.musd = address(m);
            d.troveManager = address(tm);
            d.borrowerOps = address(bo);
            d.mockCdp = true;
        }
        if (d.savingsVault == address(0)) d.savingsVault = address(new MockSavingsVault(d.musd));
    }

    function _log(Stack memory d) internal pure {
        console2.log("CerminFactory:", d.factory);
        console2.log("CerminVault impl:", d.impl);
        console2.log("CerminSaku:", d.saku);
        console2.log("CerminLens:", d.lens);
        console2.log("PriceFeed:", d.priceFeed, d.feedKind);
        console2.log("MUSD:", d.musd);
        console2.log("SavingsVault:", d.savingsVault);
        console2.log("TroveManager:", d.troveManager);
        console2.log("BorrowerOperations:", d.borrowerOps);
    }

    function _write(Stack memory d, address deployer) internal {
        string memory outFile = vm.envOr("DEPLOY_OUT", string(""));
        if (bytes(outFile).length == 0) return;
        string memory j = "deploy";
        vm.serializeUint(j, "chainId", block.chainid);
        vm.serializeAddress(j, "deployer", deployer);
        vm.serializeUint(j, "deployBlock", block.number);
        vm.serializeString(j, "priceFeedKind", d.feedKind);
        vm.serializeBool(j, "mockCdp", d.mockCdp);
        vm.serializeUint(j, "minDebt", d.minDebt);
        vm.serializeUint(j, "gasComp", d.gasComp);
        vm.serializeAddress(j, "CerminFactory", d.factory);
        vm.serializeAddress(j, "CerminVaultImpl", d.impl);
        vm.serializeAddress(j, "CerminSaku", d.saku);
        vm.serializeAddress(j, "CerminLens", d.lens);
        vm.serializeAddress(j, "PriceFeed", d.priceFeed);
        vm.serializeAddress(j, "MUSD", d.musd);
        vm.serializeAddress(j, "SavingsVault", d.savingsVault);
        vm.serializeAddress(j, "TroveManager", d.troveManager);
        string memory out = vm.serializeAddress(j, "BorrowerOperations", d.borrowerOps);
        vm.writeJson(out, outFile);
        console2.log("Wrote", outFile);
    }
}

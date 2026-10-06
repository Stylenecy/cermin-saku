#!/usr/bin/env bash
# Cermin Saku — one-shot BSC testnet deployment + demo setup.
#   bash scripts/deploy-testnet.sh            (from the repo root)
# Reads keys from ./wallets.env (gitignored). Never prints a key: keys are only
# passed through environment variables, never on a command line or to stdout.
set -euo pipefail
cd "$(dirname "$0")/.."

RPC="${BSC_TESTNET_RPC:-https://bsc-testnet-rpc.publicnode.com}"
CHAINLINK_BNB_USD="0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"
OUT="${DEPLOY_OUT_NAME:-deployments/bsc-testnet.json}"
CHAIN="${CHAIN_ID_OVERRIDE:-97}"

set -a; . ./wallets.env; set +a
: "${DEPLOYER_PRIVATE_KEY:?}" "${KEEPER_ADDRESS:?}" "${CHILD_ADDRESS:?}" "${DEPLOYER_ADDRESS:?}"

echo "== deployer $DEPLOYER_ADDRESS"
bal=$(cast balance "$DEPLOYER_ADDRESS" --rpc-url "$RPC")
echo "   balance $(cast from-wei "$bal") tBNB"
# Deploy ~0.01 tBNB gas + demo vault 0.1 + keeper 0.02 + demo txs. Stop early instead of half-deploying.
MIN_WEI="${MIN_DEPLOYER_WEI:-150000000000000000}"
if [ ! -f "contracts/$OUT" ] && python -c "import sys; sys.exit(0 if int('$bal') >= int('$MIN_WEI') else 1)"; then :; elif [ ! -f "contracts/$OUT" ]; then
  echo "!! deployer needs >= $(cast from-wei "$MIN_WEI") tBNB (faucet: https://www.bnbchain.org/en/testnet-faucet)"; exit 2
fi

# Seed the simulated feed with today's Chainlink BNB/USD (8 decimals -> 1e18).
answer=$(cast call "$CHAINLINK_BNB_USD" "latestRoundData()(uint80,int256,uint256,uint256,uint80)" --rpc-url "$RPC" 2>/dev/null | sed -n 2p | awk '{print $1}' || true)
if [ -z "$answer" ]; then answer="${FALLBACK_BNB_USD_8DP:-79256235895}"; echo "   (Chainlink not readable on this RPC, using fallback)"; fi
price=$(python -c "print(int($answer) * 10**10)")
echo "== Chainlink BNB/USD testnet: $(python -c "print($answer/1e8)") -> MockPriceFeed seed"

if [ ! -f "contracts/$OUT" ]; then
  (cd contracts && PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY" MOCK_BNB_PRICE="$price" \
    MIN_DEBT=20000000000000000000 GAS_COMP=2000000000000000000 DEPLOY_OUT="./$OUT" \
    forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC" --broadcast --slow 2>&1 \
    | grep -E "Cermin|PriceFeed|MUSD|Wrote|ONCHAIN|Error|error" )
else
  echo "== $OUT exists, skipping deploy"
fi
cat "contracts/$OUT"

echo "== Sourcify"
if [ -z "${SKIP_SOURCIFY:-}" ]; then (cd contracts && node script/verify-sourcify.mjs "$OUT") || echo "   (sourcify step failed; retry later)"; fi

export DEPLOYMENT="../contracts/$OUT" RPC_URL="$RPC" CHAIN_ID="$CHAIN" \
  PARENT_PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY" PRICE_OWNER_PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY"
cd agent

echo "== fund keeper (0.02 tBNB)"
kb=$(cast balance "$KEEPER_ADDRESS" --rpc-url "$RPC")
if [ "$kb" = "0" ]; then npx tsx scripts/demo.ts fund --to "$KEEPER_ADDRESS" --bnb 0.02; fi

echo "== demo vault + allowance"
if ! npx tsx scripts/demo.ts status >/dev/null 2>&1; then
  npx tsx scripts/demo.ts open --bnb "${DEMO_BNB:-0.1}"
  npx tsx scripts/demo.ts grant --musd 20
  npx tsx scripts/demo.ts schedule --to "$CHILD_ADDRESS" --musd "${DEMO_MUSD:-1.4}" --period "${DEMO_PERIOD:-300}" --count 12 --label "Uang saku Rara"
fi
npx tsx scripts/demo.ts status

echo "== wire web app + keeper + README"
cd ..
node scripts/post-deploy.mjs "$OUT" ${REHEARSAL:+--local} ${SITE_URL:+--site "$SITE_URL"} ${VIDEO_URL:+--video "$VIDEO_URL"}

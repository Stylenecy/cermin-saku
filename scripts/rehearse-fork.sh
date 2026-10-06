#!/usr/bin/env bash
# Dress rehearsal of scripts/deploy-testnet.sh on a local fork of BSC testnet (chain 97), no tBNB needed.
#   bash scripts/rehearse-fork.sh            (from the repo root; needs anvil on PATH)
# Same keys, same script, same Chainlink seed as the real run. Output goes to
# contracts/deployments/anvil-fork97.json and frontend/.env.local (both gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
PORT="${FORK_PORT:-8546}"
UPSTREAM="${BSC_TESTNET_RPC_UPSTREAM:-https://bsc-testnet-rpc.publicnode.com}"
set -a; . ./wallets.env; set +a

if ! cast chain-id --rpc-url "http://127.0.0.1:$PORT" >/dev/null 2>&1; then
  echo "== starting anvil fork of BSC testnet on :$PORT"
  anvil --fork-url "$UPSTREAM" --port "$PORT" --block-time 2 --silent > /dev/null 2>&1 &
  until cast chain-id --rpc-url "http://127.0.0.1:$PORT" >/dev/null 2>&1; do sleep 1; done
fi
RPC="http://127.0.0.1:$PORT"
echo "== fork chain id $(cast chain-id --rpc-url "$RPC"), block $(cast block-number --rpc-url "$RPC")"
cast rpc anvil_setBalance "$DEPLOYER_ADDRESS" 0x429D069189E0000 --rpc-url "$RPC" >/dev/null   # 0.3 BNB, like the faucet

rm -f contracts/deployments/anvil-fork97.json
BSC_TESTNET_RPC="$RPC" DEPLOY_OUT_NAME=deployments/anvil-fork97.json SKIP_SOURCIFY=1 REHEARSAL=1 \
  bash scripts/deploy-testnet.sh
echo "== rehearsal done. Keeper: cd agent && npm run keeper · web: cd frontend && npm run dev"

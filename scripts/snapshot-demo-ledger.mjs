#!/usr/bin/env node
// Freeze the demo vault's passbook from chain receipts.
//
// Public BSC testnet RPCs keep event logs for only a couple of days (publicnode: ~480k blocks,
// about 2.5 days; BNB's own dataseed refuses eth_getLogs), so the 6 Oct 2026 demo run can no
// longer be read with eth_getLogs. Receipts are still served by tx hash, so this script reads the
// receipt of every demo transaction, keeps the CerminSaku and demo-vault logs, and writes them with
// their block times to frontend/src/lib/demoLedger.gen.json. The web app decodes these raw logs
// with the same ABIs it uses for live logs, and keeps reading new blocks live.
//
// Usage: node scripts/snapshot-demo-ledger.mjs [rpcUrl]

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RPC = process.argv[2] || "https://bsc-testnet-dataseed.bnbchain.org";
const SAKU = "0x8603B62b82166D68A9f76d2753bD8a15066Cb6Df";
const VAULT = "0xfE1742bcFE1836d080f690526CD739bbaE192a03";
// Last block of the demo run that was read back with eth_getLogs on 6 Oct 2026 (agent/scripts/ledger.ts):
// every Saku and vault event up to here is in the transactions below. The schedule finished 12/12 at
// block 135161914 and the vault's balances have not changed since (debt 26.00, spendable 1.67, savings 12.33 MUSD).
const COVERS_TO_BLOCK = 135163423;

// Every transaction of the demo setup and run (docs/TESTNET-DEPLOY.md), in order.
const TXS = [
  "0x2d9d3b3b371a9a3af2e403c0029afd986b77753f82c32246bdb3366f3e13c978", // price feed seeded
  "0xfbc92704959f1836a2e0a9c29510a777c6ba7a6e88af987868c86a9fc1a1cbe7", // vault opened
  "0x45c652bd75d3cfb5126a4ea209e5d91e23941f38f95cb4f538335130c6f1b200", // spend allowance
  "0xfb00ba5237e4512fa883fc61b8a69e5389b8503aff038375384b780322d46896", // schedule created
  "0x5809ddaa97c84d6b0994349257210e226d2ce85ded9d8db662b326e311f3051b", // paid #1
  "0x1abf5b6a6d80435e9a9ef3a3a08ca4aee84fd11e9a84e3b6f3ed6c4eac1aef09", // paid #2
  "0xd5519560cab4765cc6ef72bcef0228b455b74c4ee461bbb2a7cf43e9eed42581", // price $560
  "0x8bfc7eb9d9f7eec2e4d7b7cea7178b8531a2165a88f50ba4e71cf4bce35c1883", // held
  "0xd46bcdb24a88162cae838308c2c055e8764c09467cf7db830da0aa9a0fafea16", // price $520
  "0x2822162267ba374cb026bfb18653cacbae58e55c5f6e440a628d327e1c34d5f8", // defended
  "0x21b94fc419befe40efc4e3fef69e151d46222c88466bf7713f7f4c65b0550400", // held
  "0x5c4050ea07ebfdc17ef4b9a35c152fe8b92a35ff5a477ec4c0464e4416b63d73", // price $800
  "0xf28644fe48d73f269ce5e1523756a873cae72b3c22ded9d547920b80208bc74e", // paid #3
  "0xbfb4be5078324c0061963b4a67cfc79fe5722049ef37f2ecec7d22d9be09a550", // paid #4
  "0x9374b427d20a33ee809e4ba75a1a41ffb4ca4afa986143c728949fd6a5f5f4e6", // paid #5
  "0x3d048022342c51633ec73d9369c1e33a99c85fb4a3b066bb3a0a917e2b57d052", // paid #6
  "0x3d1df5bcd9a486ebf09899f771749070967018e9d141153198a5be6c08981f01", // paid #7
  "0xc9efac97c8d6f31e8c279305b0e84c64deafe7e434e886c858fdee0f9e3d9783", // paid #8
  "0xc4825c4d3e73f5a8d1e705a62d31d5ba6d730469aff3460ec40437587d2243b0", // paid #9
  "0x6786a70192f6ce827f6a719a3dc236681a83a53f49f2e21b28877a53f129b805", // paid #10
  "0x2352ab1eccf3ea81ea9f2e9d20445029d931bbc32706e29d607aa6d2f533c05f", // paid #11
  "0x313c6171353f793a5aca85915e492e3d41380563b70a403cbc72ead4e6c0ff6e", // paid #12
];

let id = 0;
async function rpc(method, params) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    const body = await res.json().catch(() => ({}));
    if (body.result !== undefined && body.result !== null) return body.result;
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
  }
  throw new Error(`${method} ${JSON.stringify(params)}: no result from ${RPC}`);
}

const keep = new Set([SAKU.toLowerCase(), VAULT.toLowerCase()]);
const logs = [];
const blocks = new Set();
for (const tx of TXS) {
  const r = await rpc("eth_getTransactionReceipt", [tx]);
  if (r.status !== "0x1") throw new Error(`${tx} has status ${r.status}`);
  for (const l of r.logs) {
    if (!keep.has(l.address.toLowerCase())) continue;
    logs.push({
      address: l.address,
      topics: l.topics,
      data: l.data,
      blockNumber: l.blockNumber,
      transactionHash: l.transactionHash,
      transactionIndex: l.transactionIndex,
      blockHash: l.blockHash,
      logIndex: l.logIndex,
    });
    blocks.add(l.blockNumber);
  }
}

const blockTimes = {};
for (const b of blocks) {
  const blk = await rpc("eth_getBlockByNumber", [b, false]);
  blockTimes[String(BigInt(b))] = Number(BigInt(blk.timestamp));
}

const out = {
  _about:
    "Raw CerminSaku + demo-vault logs of the 6 Oct 2026 BSC testnet demo, read from transaction receipts by scripts/snapshot-demo-ledger.mjs. Public RPCs no longer serve these logs via eth_getLogs.",
  chainId: 97,
  vault: VAULT,
  saku: SAKU,
  coversToBlock: String(COVERS_TO_BLOCK),
  readFrom: RPC,
  readAt: new Date().toISOString(),
  blockTimes,
  logs,
};
const file = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend", "src", "lib", "demoLedger.gen.json");
writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(`${logs.length} logs from ${TXS.length} receipts (${blocks.size} blocks) → ${file}`);

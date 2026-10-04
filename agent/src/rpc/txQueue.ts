/**
 * Serializes on-chain writes for a single signer. viem assigns a tx nonce at
 * `writeContract` time by reading the pending count; firing several writes
 * concurrently (the cycle processes vaults with concurrency > 1) makes them all
 * grab the same nonce and collide. Funnelling every write through this queue —
 * one in flight at a time, each awaiting its receipt before the next starts —
 * keeps nonces strictly sequential.
 */
let tail: Promise<unknown> = Promise.resolve();

export function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
  const result = tail.then(() => fn());
  // Keep the chain alive regardless of this task's outcome.
  tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

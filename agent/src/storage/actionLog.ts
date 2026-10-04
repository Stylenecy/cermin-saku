import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DecisionLog } from '../types.js';

export function initDb(path: string): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vault TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      tx_hash TEXT,
      timestamp INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_actions_vault ON actions(vault);
    CREATE INDEX IF NOT EXISTS idx_actions_ts ON actions(timestamp DESC);
  `);
  return db;
}

export function recordAction(db: Database.Database, log: DecisionLog): void {
  db.prepare(`
    INSERT INTO actions (vault, action, reason, tx_hash, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(log.vault, log.action, log.reason, log.txHash ?? null, log.timestamp);
}

/** Most recent timestamp (ms) for a given action on a target, or null. */
export function lastActionAt(
  db: Database.Database,
  vault: string,
  action: string,
): number | null {
  const row = db
    .prepare(
      'SELECT timestamp FROM actions WHERE vault = ? AND action = ? ORDER BY timestamp DESC LIMIT 1',
    )
    .get(vault, action) as { timestamp: number } | undefined;
  return row?.timestamp ?? null;
}

export function recentActions(db: Database.Database, vault: string, limit = 20): DecisionLog[] {
  const rows = db
    .prepare('SELECT vault, action, reason, tx_hash, timestamp FROM actions WHERE vault = ? ORDER BY timestamp DESC LIMIT ?')
    .all(vault, limit) as Array<{
      vault: string;
      action: string;
      reason: string;
      tx_hash: string | null;
      timestamp: number;
    }>;
  return rows.map(r => ({
    vault: r.vault as `0x${string}`,
    action: r.action as DecisionLog['action'],
    reason: r.reason,
    txHash: (r.tx_hash ?? undefined) as `0x${string}` | undefined,
    timestamp: r.timestamp,
  }));
}

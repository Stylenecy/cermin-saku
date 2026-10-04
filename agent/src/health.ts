import { createServer, type Server } from 'node:http';
import type { Logger } from 'pino';
import type { Metrics } from './metrics.js';

export interface HealthOptions {
  /** A cycle running longer than this is treated as hung. */
  cycleTimeoutMs: number;
  /** No successful cycle within this window marks the keeper stale. */
  maxSilenceMs: number;
}

function isStale(m: Metrics, opts: HealthOptions, now: number): boolean {
  if (m.running && m.lastCycleStart !== null && now - m.lastCycleStart > opts.cycleTimeoutMs) {
    return true;
  }
  const lastProgress = m.lastSuccessAt ?? m.startedAt;
  return now - lastProgress > opts.maxSilenceMs;
}

/**
 * Tiny liveness endpoint. Returns 200 when the keeper is making progress and
 * 503 when a cycle has hung or no cycle has succeeded for too long — so Railway
 * (or any uptime monitor) can restart a wedged process that hasn't crashed.
 */
export function startHealthServer(
  port: number,
  metrics: Metrics,
  opts: HealthOptions,
  logger: Logger,
): Server {
  const server = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const stale = isStale(metrics, opts, Date.now());
      res.writeHead(stale ? 503 : 200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: stale ? 'stale' : 'ok', ...metrics }));
      return;
    }
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  server.on('error', err => logger.error({ err }, 'health server error'));
  server.listen(port, () => logger.info({ port }, 'health server listening'));
  return server;
}

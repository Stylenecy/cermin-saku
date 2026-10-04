# Cermin keeper agent — long-running daemon (skim/defend on BNB Chain).

# ── Builder: full deps + TypeScript compile ─────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Build toolchain for better-sqlite3's native binding (no prebuilt for slim).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
# Compile to dist/, then drop devDeps (tsx, typescript, @types) from
# node_modules so the runner stage carries only production deps. The compiled
# better-sqlite3 binary is a prod dep and survives the prune.
RUN npm run build && npm prune --omit=dev

# ── Runner: production deps + compiled output only (no toolchain) ────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DB_PATH=/data/cermin.db

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Action-log DB. Mount a Railway volume at /data to persist across redeploys;
# otherwise it lives in the ephemeral FS (fine — vault state is read fresh from
# chain each cycle; the log is only an audit trail).
RUN mkdir -p /data

# Health/liveness endpoint. Railway injects PORT and probes /health; the app
# falls back to HEALTH_PORT (8080) for local runs.
EXPOSE 8080

CMD ["node", "dist/index.js"]

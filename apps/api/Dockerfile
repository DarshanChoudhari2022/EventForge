# ── Stage 1: Install deps ──────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY packages/domain/package.json ./packages/domain/
COPY packages/config/package.json ./packages/config/
COPY packages/api-sdk/package.json ./packages/api-sdk/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules 2>/dev/null || true

# Copy source
COPY tsconfig.base.json ./
COPY packages/db ./packages/db
COPY packages/domain ./packages/domain
COPY packages/config ./packages/config
COPY packages/api-sdk ./packages/api-sdk
COPY apps/api ./apps/api

# Generate Prisma client
RUN pnpm --filter @eventforge/db db:generate

# Build shared packages
RUN pnpm --filter @eventforge/domain build 2>/dev/null || true
RUN pnpm --filter @eventforge/db build 2>/dev/null || true

# Build API
RUN pnpm --filter @eventforge/api build

# ── Stage 3: Production image ──────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/packages ./packages

EXPOSE 4000

CMD ["node", "--enable-source-maps", "apps/api/dist/main.js"]

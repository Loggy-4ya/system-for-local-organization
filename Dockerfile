# =============================================================================
# Nexus — unified multi-stage Dockerfile
# =============================================================================
#
# Targets (select via docker compose `build.target`):
#   dev         — local hot-reload (`npm run dev`), bind-mount source from host
#   production  — Next.js standalone server (`node server.js`)
#   worker      — long-running sidecars (telegram-worker, future job runners)
#
# Dev / prod: docker-compose.yml profiles dev | prod → target dev | production | worker
#
# Docs: .ai/docs/features/hosting_and_deployment.md
# =============================================================================

# ── Stage: dependencies ───────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── Stage: dev (hot-reload via Compose volume mount) ────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app

# Native deps (e.g. utf-8-validate via ws) need node-gyp build chain on Alpine.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Reinstall when lockfile changes, core packages are missing, or install is incomplete.
# The anonymous /app/node_modules volume can outlive image rebuilds — verify sentinel deps
# (including sidebar-only packages like react-day-picker) before starting dev.
CMD ["sh", "-c", "if [ ! -f node_modules/.bin/next ] || [ ! -d node_modules/vaul ] || [ ! -d node_modules/@puckeditor/core ] || [ ! -d node_modules/@tiptap/suggestion ] || [ ! -d node_modules/react-day-picker ] || [ ! -f node_modules/.install-stamp ] || [ package-lock.json -nt node_modules/.install-stamp ]; then npm ci && touch node_modules/.install-stamp; fi && npm run dev"]

# ── Stage: builder (production Next.js build) ───────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage: production (Next.js standalone web) ──────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# ── Stage: worker (telegram-worker and future VPS sidecars) ───────────────────
FROM node:20-alpine AS worker
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

CMD ["npx", "tsx", "scripts/workers/telegramWorker.ts"]

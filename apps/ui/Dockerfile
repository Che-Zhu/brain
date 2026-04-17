# ------------------------------------------------------------------
# 1. Pruner – Bun + turbo prune for @sealai/ui
# ------------------------------------------------------------------
FROM oven/bun:1.3.5 AS pruner
WORKDIR /app
COPY . .
# Must match apps/ui/package.json "name"
RUN bunx turbo@2.8.17 prune @sealai/ui --docker

# ------------------------------------------------------------------
# 2. Builder – install with Bun, build Next.js
# ------------------------------------------------------------------
FROM oven/bun:1.3.5 AS builder
WORKDIR /app

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY --from=pruner /app/out/json/ .
# Turbo's pruned bun.lock is not compatible with Bun's lockfile parser; install from pruned package.json trees.
RUN rm -f bun.lock && bun install

COPY --from=pruner /app/out/full/ .

RUN cd apps/ui && bun run build && \
    rm -rf node_modules/.cache && \
    rm -rf .next/cache

# ------------------------------------------------------------------
# 3. Runner – Node (Next standalone targets Node; image is minimal)
# ------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodeuser && \
    adduser --system --uid 1001 nodeuser
USER nodeuser

COPY --from=builder --chown=nodeuser:nodeuser \
    /app/apps/ui/.next/standalone ./
COPY --from=builder --chown=nodeuser:nodeuser \
    /app/apps/ui/.next/static ./apps/ui/.next/static

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_APP_URL=http://localhost:3000

CMD ["node", "apps/ui/server.js"]

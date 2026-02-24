# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer-cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# Public site URL is baked in at build time; override with --build-arg for production
ARG NUXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NUXT_PUBLIC_SITE_URL=${NUXT_PUBLIC_SITE_URL}

RUN npm run build

# ─── Stage 2: Run ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S applirank && adduser -S applirank -G applirank

# .output is fully self-contained (includes content DB, server, public assets)
COPY --from=builder /app/.output ./.output

# Drizzle migrations are loaded at runtime via a relative path ("./server/database/migrations")
# They must live alongside .output so the path resolves correctly inside the container
COPY --from=builder /app/server/database/migrations ./server/database/migrations

# Seed script support — copies node_modules, package.json, and server source
# so `docker compose exec app npm run db:seed` works inside the container
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server

RUN chown -R applirank:applirank /app
USER applirank

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]

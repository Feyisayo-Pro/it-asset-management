# syntax=docker/dockerfile:1

# Built from the monorepo root: docker build -f packages/backend/Dockerfile .
# This is an npm workspaces monorepo — the lockfile and workspace
# package.json files must be present together for `npm ci` to resolve
# correctly, so every stage copies from the repo root, not the package dir.

ARG NODE_VERSION=20-alpine

# ---- deps: install once, cached until package.json/lockfile change ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json
RUN npm ci

# ---- build: compile TypeScript -> dist ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/backend ./packages/backend
COPY packages/frontend/package.json packages/frontend/package.json
RUN npm --workspace @iam/backend run build

# ---- prod-deps: production-only dependencies for the final image ----
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json
RUN npm ci --omit=dev --workspace @iam/backend --ignore-scripts

# ---- production: minimal runtime image ----
FROM node:${NODE_VERSION} AS production
ENV NODE_ENV=production
WORKDIR /app

# node:*-alpine already ships a non-root "node" user (uid 1000) —
# reuse it instead of adding a new one. --chown on each COPY (rather
# than a separate `RUN chown -R /app` afterward) avoids a second
# full-tree write pass over node_modules, which is where nearly all
# the files are — that separate pass measured 2.5 minutes on this
# ~290-package prod install alone.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/backend/dist ./packages/backend/dist
COPY --chown=node:node packages/backend/package.json ./packages/backend/package.json

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/${API_PREFIX:-api/v1}/health/live" || exit 1

CMD ["node", "packages/backend/dist/main.js"]

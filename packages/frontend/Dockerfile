# syntax=docker/dockerfile:1

# Built from the monorepo root: docker build -f packages/frontend/Dockerfile .
# Same npm-workspaces reasoning as packages/backend/Dockerfile: the
# lockfile lives at the repo root, so every stage copies from there.

ARG NODE_VERSION=20-alpine
ARG NGINX_VERSION=1.27-alpine

# ---- deps: install once, cached until package.json/lockfile change ----
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/frontend/package.json packages/frontend/package.json
COPY packages/backend/package.json packages/backend/package.json
RUN npm ci

# ---- build: Vite production build -> static assets ----
FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/frontend ./packages/frontend
COPY packages/backend/package.json packages/backend/package.json
# Vite inlines VITE_* vars into the bundle at build time (not runtime).
# Relative by default so the SPA calls same-origin /api/v1, which the
# nginx config below reverse-proxies to the backend container — no
# CORS, no baked-in backend hostname.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm --workspace @iam/frontend run build

# ---- production: static files served by nginx ----
FROM nginx:${NGINX_VERSION} AS production
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html

# nginx:alpine already ships a non-root "nginx" user; the stock image's
# entrypoint still needs to write its PID file, so pre-create/own the
# runtime dirs it uses before dropping privileges.
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
  && touch /var/run/nginx.pid \
  && chown nginx:nginx /var/run/nginx.pid
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

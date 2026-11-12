# syntax=docker/dockerfile:1

# ---- deps ----
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/design-tokens/package.json packages/design-tokens/

RUN npm ci

# ---- build ----
FROM deps AS build
WORKDIR /app

COPY . .
RUN npx turbo run build --filter=@forja/backend
RUN npm prune --omit=dev

# ---- runtime ----
FROM node:24-alpine AS runtime
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/apps/backend/scripts ./scripts

RUN mkdir -p /app/storage && chmod +x /app/scripts/start.sh

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./scripts/start.sh"]

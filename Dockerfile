# Fly.io / any Node host — Nitro node_server preset
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NITRO_PRESET=node_server
ENV NODE_ENV=production
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0
COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]

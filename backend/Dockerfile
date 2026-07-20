# syntax=docker/dockerfile:1

# Multi-stage build. The goal is that the final image contains the app and its
# production dependencies — and nothing else. No build tools, no dev deps, no
# source history. Smaller image, faster pulls on the EC2 box, smaller attack
# surface, and it stays inside ECR's 500MB free-tier limit.

# ---- deps: production dependencies only --------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` (not `npm install`) installs exactly what the lockfile pins, so the
# image is reproducible. --ignore-scripts blocks arbitrary postinstall code from
# transitive dependencies; Prisma 7 needs no postinstall since there is no
# native engine to download.
RUN npm ci --omit=dev --ignore-scripts

# ---- build: generate the Prisma client ---------------------------------------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY prisma.config.ts ./
COPY prisma ./prisma
# The generated client is gitignored, so it MUST be produced during the build.
RUN npx prisma generate

# ---- migrator: runs migrations, then exits -----------------------------------
# Deployed as a one-off task before the app rolls out. Kept separate so the
# Prisma CLI never ships in the image serving traffic.
FROM node:24-alpine AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json prisma.config.ts ./
RUN npm ci --ignore-scripts
COPY prisma ./prisma
COPY --from=build /app/src/generated ./src/generated
RUN chown -R node:node /app
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runtime: what actually serves traffic -----------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src/generated ./src/generated
COPY package.json ./
COPY src ./src

# Never run as root. If the app is compromised, this is the difference between
# a contained process and a container escape.
USER node

EXPOSE 3000

# Docker-level liveness check. Compose and the blue/green deploy script both
# use this to decide whether the container came up healthy.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]

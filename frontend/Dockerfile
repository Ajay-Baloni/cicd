# syntax=docker/dockerfile:1

# ---- build: compile the React app to static files ----------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# The API URL must be supplied at BUILD time, because Vite inlines it into the
# bundle. This is the single most important difference between frontend and
# backend configuration: the backend reads env vars when it starts, the
# frontend has them compiled in. A different API URL means a different build.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- runtime: serve the static files -----------------------------------------
# Node is not needed to serve a built React app — only a static file server.
# Using the unprivileged nginx image means the container runs as a non-root
# user on port 8080 out of the box.
FROM nginxinc/nginx-unprivileged:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

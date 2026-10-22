# ============================================================
# Stage 1 — build do frontend React
# ============================================================
FROM node:20-bookworm-slim AS web-builder
WORKDIR /build/web
COPY web/package*.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# ============================================================
# Stage 2 — build da API (TypeScript → JS)
# ============================================================
FROM node:20-bookworm-slim AS api-builder
WORKDIR /build/api
COPY api/package*.json ./
RUN npm install
COPY api/ ./
RUN npm run build

# ============================================================
# Stage 3 — runtime (Debian slim + Chromium)
# ============================================================
FROM node:20-bookworm-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      fonts-liberation \
      libnss3 \
      libatk-bridge2.0-0 \
      libdrm2 \
      libxkbcommon0 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxrandr2 \
      libgbm1 \
      libasound2 \
      libpangocairo-1.0-0 \
      libatspi2.0-0 \
      tini \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium

RUN useradd --create-home --shell /bin/bash app
WORKDIR /app

COPY api/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=api-builder /build/api/dist ./dist
COPY --from=web-builder /build/web/dist ./public

RUN chown -R app:app /app
USER app

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/server.js"]

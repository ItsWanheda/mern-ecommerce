FROM node:22-bookworm-slim

WORKDIR /app

# Prisma's native query engine requires OpenSSL on Debian-based images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN mkdir -p /app/uploads \
    && chown -R node:node /app

USER node

ENV NODE_ENV=development
ENV PORT=5000
ENV IMAGE_STORAGE_DIR=/app/uploads

EXPOSE 5000

CMD ["node", "--watch", "server.js"]

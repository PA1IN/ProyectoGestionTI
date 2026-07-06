FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN npx nest build gateway && \
    npx nest build pagos && \
    npx nest build conciliacion && \
    npx nest build analitica && \
    npx nest build webhook-worker

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --only=production && npm install -g concurrently

COPY --from=builder /app/dist ./dist

CMD ["concurrently", \
  "node dist/apps/gateway/main.js", \
  "node dist/apps/pagos/main.js", \
  "node dist/apps/conciliacion/main.js", \
  "node dist/apps/analitica/main.js", \
  "node dist/apps/webhook-worker/main.js" \
]
# Multi-stage Dockerfile pour QuizFeedback
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm install
COPY . .
RUN npm run build

# Runtime Node.js 22 alpine (avec node:sqlite natif).
# Le serveur n'importe que des modules node:*, donc aucun node_modules nécessaire.
FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache su-exec

COPY server ./server
COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/status').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/server.mjs"]

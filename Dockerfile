# Multi-stage Dockerfile pour QuizFeedback
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm install
COPY . .
RUN npm run build

# Runtime Node.js 22 alpine (avec node:sqlite natif)
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY server ./server
COPY --from=builder /app/dist ./dist

# Répertoire de données persistantes pour la base SQLite
RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server/server.mjs"]

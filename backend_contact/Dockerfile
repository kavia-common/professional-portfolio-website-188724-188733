# syntax=docker/dockerfile:1

FROM node:18-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY src ./src

EXPOSE 4001
ENV PORT=4001
CMD ["node", "src/server.js"]

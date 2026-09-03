FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ gcc

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start with memory limits and tsx
CMD ["node", "--max-old-space-size=400", "--loader", "tsx", "src/server-with-auto.ts"]

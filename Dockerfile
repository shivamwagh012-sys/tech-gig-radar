FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ gcc

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Bundle to single JS file with esbuild (no tsx needed at runtime = much less memory)
RUN npx esbuild src/server-prod.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist/server.cjs --external:better-sqlite3

# Create data directory
RUN mkdir -p data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run compiled JS (~10MB memory vs ~400MB for tsx)
CMD ["node", "dist/server.cjs"]

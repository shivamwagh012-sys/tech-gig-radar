FROM node:20-alpine

WORKDIR /app

# Install dependencies (including dev deps for tsx)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Create data directory
RUN mkdir -p data

# Run database migrations
RUN npx drizzle-kit generate 2>/dev/null || true

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the server
CMD ["npx", "tsx", "src/server-with-auto.ts"]

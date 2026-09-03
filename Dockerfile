FROM node:18-alpine

WORKDIR /app

# Only install production dependencies (no native modules needed)
COPY package*.json ./

# Install only express (skip native modules like better-sqlite3)
RUN npm install express

# Copy source
COPY . .

# Bundle minimal server (no external dependencies)
RUN npx esbuild src/server-minimal.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist/server.cjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run (~5MB memory)
CMD ["node", "dist/server.cjs"]

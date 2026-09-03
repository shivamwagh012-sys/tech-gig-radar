FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for esbuild to bundle)
RUN npm install

# Copy source
COPY . .

# Bundle minimal server to single file (includes express, no native modules)
RUN npx esbuild src/server-minimal.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist/server.cjs

# Remove node_modules to save space (everything is bundled)
RUN rm -rf node_modules

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run bundled server (~5MB memory, no dependencies needed)
CMD ["node", "dist/server.cjs"]

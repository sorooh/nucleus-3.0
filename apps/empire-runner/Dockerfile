# EMPEROR NICHOLAS - PHASE Ω (11.5)
# Empire Runner Dockerfile
# IMPORTANT: This is NOT a standalone runner - it requires Nicholas Core to be running
# Use the main Dockerfile at project root for full deployment

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ===================================
# Production Stage
# ===================================
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create env directory
RUN mkdir -p /app/env

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)"

# Run as non-root user
USER node

CMD ["node", "dist/index.js"]

# NOTE: This runner expects Nicholas Core to be accessible via network
# For full deployment, use docker-compose.yml which orchestrates both services

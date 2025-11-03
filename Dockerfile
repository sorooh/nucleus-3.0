# Nucleus 3.0 - Production Dockerfile
# Multi-stage build for optimized image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Stage 2: Production
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app user (non-root)
RUN addgroup -g 1001 -S nucleus && \
    adduser -S nucleus -u 1001

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nucleus:nucleus /app/node_modules ./node_modules
COPY --from=builder --chown=nucleus:nucleus /app/package*.json ./
COPY --chown=nucleus:nucleus . .

# Set environment
ENV NODE_ENV=production \
    PORT=5000 \
    NPM_CONFIG_LOGLEVEL=warn

# Switch to non-root user
USER nucleus

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/api/ugw/monitoring/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]

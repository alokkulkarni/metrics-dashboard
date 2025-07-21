# Use Node.js 18 LTS as the base image
FROM node:18-alpine

# Install PostgreSQL client for health checks and database setup
RUN apk add --no-cache postgresql-client

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm install

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Copy migration files to dist directory since they're .js files and won't be compiled
RUN mkdir -p /app/dist/database/migrations
RUN cp -r /app/src/database/migrations/*.js /app/dist/database/migrations/

# Remove dev dependencies after building
RUN npm prune --omit=dev

# Make scripts executable
RUN chmod +x scripts/docker-start.sh

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create logs directory
RUN mkdir -p /app/logs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose the port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the application using the startup script
CMD ["/app/scripts/docker-start.sh"]

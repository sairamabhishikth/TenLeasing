# Layer 3: Customer Service - Build on top of common base
# This layer adds customer domain-specific code to the shared foundation
FROM 471112808954.dkr.ecr.us-east-1.amazonaws.com/ten/common-base:latest

# Set working directory (inherited from Layer 2)
WORKDIR /app

# Copy customer service code
COPY customer-service/ /app/customer-service/

# Switch to root for file operations
USER root

# Set proper ownership for customer service files
RUN chown -R nextjs:nodejs /app/customer-service

# Generate Prisma client for customer domain
RUN cd /app/customer-service && \
    PRISMA_CLI_BINARY_TARGETS="debian-openssl-1.1.x,debian-openssl-3.0.x" \
    npx prisma generate --schema=./schema.prisma

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R nextjs:nodejs /app/logs

# Switch back to non-root user for security
USER nextjs

# Set working directory to customer service
WORKDIR /app/customer-service

# Expose service port (matches AWS ECS configuration)
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Environment variables for runtime identification
ENV SERVICE_NAME="customer-service" \
    LAYER_NAME="customer-service" \
    NODE_ENV="production"

# Labels for container identification and management
LABEL layer="customer-service" \
      version="1.0" \
      description="Customer domain microservice with user/account management" \
      maintainer="ten-platform" \
      service="customer-service" \
      dependencies="ten-common-base:latest"

# Start customer service application
CMD ["node", "app.js"]

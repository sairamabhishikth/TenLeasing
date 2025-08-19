# Layer 2: Common Base - Build on top of shared installation
# This layer adds common services, utilities, and middleware to the base installation
FROM 471112808954.dkr.ecr.us-east-1.amazonaws.com/ten/shared-installation:latest

# Set working directory (inherited from Layer 1)
WORKDIR /app

# Copy common services and utilities
COPY common/ /app/common/

# Set ownership of common files to non-root user
USER root
RUN chown -R nextjs:nodejs /app/common
USER nextjs

# Health check endpoint (optional - can be overridden by Layer 3)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('./common/services/database.service').healthCheck().then(() => process.exit(0)).catch(() => process.exit(1))" || exit 1

# Labels for layer identification
LABEL layer="common-base" \
      version="1.0" \
      description="Common base layer with shared services, utilities, and middleware" \
      maintainer="ten-microservices" \
      dependencies="471112808954.dkr.ecr.us-east-1.amazonaws.com/ten/shared-installation:latest"

# Environment variable to identify layer
ENV LAYER_NAME="common-base"

# Working directory and user are ready for Layer 3 services
# Layer 3 services will build FROM this image and add their specific code
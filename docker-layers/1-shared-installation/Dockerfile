# Shared/Installation Layer - Base runtime and dependencies
FROM node:18-slim AS shared-installation

# Set working directory
WORKDIR /app

# Install system dependencies including SSL libraries for Prisma
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    postgresql-client \
    openssl \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set timezone (optional)
ENV TZ=UTC

# Set Prisma engine target for Debian
ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-1.1.x,debian-openssl-3.0.x"
ENV PRISMA_ENGINES_BINARY_TARGETS="debian-openssl-1.1.x,debian-openssl-3.0.x"
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL="true"

# Copy package.json and package-lock.json for dependency installation
COPY package*.json ./

# Install npm dependencies
RUN npm install --omit=dev && \
    npm cache clean --force

# Create non-root user for security
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nextjs

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose common port (can be overridden in service layers)
EXPOSE 3000

# Label for layer identification
LABEL layer="shared-installation"
LABEL version="1.2"
LABEL description="Shared installation layer with Node.js, npm packages, system tools, and Prisma SSL support"
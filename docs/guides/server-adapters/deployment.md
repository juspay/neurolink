---
title: Deployment Guide
sidebar_label: "Deployment Guide"
description: Deploy NeuroLink server adapters to Docker, Kubernetes, and serverless platforms
sidebar_position: 11
keywords: deployment, docker, kubernetes, serverless, cloudflare workers, vercel, production
---

# Deployment Guide

**Deploy NeuroLink server adapters to production**

This guide covers deploying NeuroLink server adapters to various environments including Docker, Kubernetes, and serverless platforms.

---

## Environment Variables

Configure your server using environment variables for security and flexibility.

### Required Variables

```bash
# AI Provider API Keys (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...

# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
```

### Optional Variables

```bash
# Security
JWT_SECRET=your-jwt-secret-min-32-chars
API_KEY_SECRET=your-api-key-for-service-auth

# CORS
ALLOWED_ORIGINS=https://myapp.com,https://api.myapp.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# Redis (for distributed rate limiting and memory)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=optional-password

# Logging
LOG_LEVEL=info

# Timeouts
REQUEST_TIMEOUT_MS=30000

# Observability
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Environment Configuration in Code

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: process.env.DEFAULT_PROVIDER || "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: parseInt(process.env.PORT || "3000"),
    host: process.env.HOST || "0.0.0.0",
    timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || "30000"),
    cors: {
      enabled: true,
      origins: process.env.ALLOWED_ORIGINS?.split(",") || ["*"],
    },
    rateLimit: {
      enabled: true,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
    },
  },
});
```

---

## Docker Deployment

### Basic Dockerfile

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 neurolink

# Copy built assets
COPY --from=builder --chown=neurolink:nodejs /app/dist ./dist
COPY --from=builder --chown=neurolink:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=neurolink:nodejs /app/package.json ./package.json

USER neurolink

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
```

### Multi-Stage Build for Smaller Images

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage with minimal dependencies
FROM node:20-alpine AS production

WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S neurolink -u 1001

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder --chown=neurolink:nodejs /app/dist ./dist

USER neurolink
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --spider -q http://localhost:3000/api/health || exit 1

CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test:
        ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 512M

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

### Build and Run

```bash
# Build the image
docker build -t neurolink-api:latest .

# Run with environment variables
docker run -d \
  --name neurolink-api \
  -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e JWT_SECRET=$JWT_SECRET \
  neurolink-api:latest

# Using docker-compose
docker-compose up -d
```

---

## Kubernetes Deployment

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: neurolink-api
  labels:
    app: neurolink-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: neurolink-api
  template:
    metadata:
      labels:
        app: neurolink-api
    spec:
      containers:
        - name: neurolink-api
          image: your-registry/neurolink-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3000"
            - name: OPENAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: neurolink-secrets
                  key: openai-api-key
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: neurolink-secrets
                  key: jwt-secret
            - name: REDIS_URL
              valueFrom:
                configMapKeyRef:
                  name: neurolink-config
                  key: redis-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          # Liveness probe - is the container alive?
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          # Readiness probe - is the container ready to serve traffic?
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          # Startup probe - has the container started?
          startupProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 30
      terminationGracePeriodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: neurolink-api
spec:
  selector:
    app: neurolink-api
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: neurolink-api
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
    - hosts:
        - api.yourdomain.com
      secretName: neurolink-api-tls
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: neurolink-api
                port:
                  number: 80
```

### Secrets and ConfigMap

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: neurolink-secrets
type: Opaque
stringData:
  openai-api-key: "sk-..."
  anthropic-api-key: "sk-ant-..."
  jwt-secret: "your-secure-jwt-secret"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: neurolink-config
data:
  redis-url: "redis://redis-master:6379"
  log-level: "info"
  rate-limit-max: "100"
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: neurolink-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: neurolink-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

---

## Serverless Deployment

### Cloudflare Workers (Hono)

Hono is ideal for edge deployment:

```typescript
// src/worker.ts
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    basePath: "/api",
  },
});

await server.initialize();

export default {
  fetch: server.getFrameworkInstance().fetch,
};
```

```toml
# wrangler.toml
name = "neurolink-api"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[vars]
NODE_ENV = "production"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-id"
```

### Vercel Edge Functions

```typescript
// api/[[...route]].ts
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: { basePath: "/api" },
});

await server.initialize();

export const config = {
  runtime: "edge",
};

export default server.getFrameworkInstance().fetch;
```

### AWS Lambda

```typescript
// handler.ts
import { NeuroLink } from "@juspay/neurolink";
import { createServer } from "@juspay/neurolink";
import { handle } from "hono/aws-lambda";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: { basePath: "/api" },
});

await server.initialize();

export const handler = handle(server.getFrameworkInstance());
```

```yaml
# serverless.yml
service: neurolink-api

provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
  environment:
    NODE_ENV: production
    OPENAI_API_KEY: ${ssm:/neurolink/openai-api-key}

functions:
  api:
    handler: handler.handler
    events:
      - httpApi:
          path: /api/{proxy+}
          method: ANY
    timeout: 30
    memorySize: 1024
```

---

## Production Configuration Recommendations

### Server Configuration

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    // Server
    port: parseInt(process.env.PORT || "3000"),
    host: "0.0.0.0",
    timeout: 30000,

    // CORS (specific origins only)
    cors: {
      enabled: true,
      origins: process.env.ALLOWED_ORIGINS?.split(",") || [],
      methods: ["GET", "POST"],
      credentials: true,
    },

    // Rate limiting
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000,
      skipPaths: ["/api/health", "/api/ready"],
    },

    // Body parsing
    bodyParser: {
      enabled: true,
      maxSize: "1mb",
      jsonLimit: "1mb",
    },

    // Logging
    logging: {
      enabled: true,
      level: "info",
      includeBody: false,
      includeResponse: false,
    },

    // Redaction (for sensitive data)
    redaction: {
      enabled: true,
      additionalFields: ["ssn", "creditCard"],
    },

    // Features
    enableMetrics: true,
    enableSwagger: false, // Disable in production
  },
});
```

### Health and Readiness Endpoints

The server adapter provides built-in health endpoints:

- `GET /api/health` - Basic health check (is the server running?)
- `GET /api/ready` - Readiness check (is the server ready to serve traffic?)
- `GET /api/version` - Version information

### Graceful Shutdown

NeuroLink server adapters support configurable graceful shutdown to ensure clean termination of active connections and requests.

#### Shutdown Configuration

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    shutdown: {
      gracefulShutdownTimeoutMs: 30000, // Max time to wait for shutdown
      drainTimeoutMs: 15000, // Max time to drain connections
      forceClose: true, // Force close if timeout exceeded
    },
  },
});
```

| Option                      | Default | Description                                        |
| --------------------------- | ------- | -------------------------------------------------- |
| `gracefulShutdownTimeoutMs` | 30000   | Maximum total time to wait for graceful shutdown   |
| `drainTimeoutMs`            | 15000   | Maximum time to wait for active connections to end |
| `forceClose`                | true    | Force close remaining connections after timeout    |

#### Shutdown Process Steps

When `server.stop()` is called, the shutdown proceeds through these steps:

1. **Stop accepting new connections** - The server immediately stops accepting new requests
2. **Drain active connections** - Active requests are allowed to complete (up to `drainTimeoutMs`)
3. **Complete graceful shutdown** - Finalize cleanup within `gracefulShutdownTimeoutMs`
4. **Force close if needed** - If `forceClose: true`, remaining connections are forcefully terminated after timeout

#### Signal Handling Example

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    shutdown: {
      gracefulShutdownTimeoutMs: 30000,
      drainTimeoutMs: 15000,
      forceClose: true,
    },
  },
});

await server.initialize();
await server.start();

// Handle SIGTERM (sent by Kubernetes, Docker, etc.)
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, starting graceful shutdown...");
  await server.stop();
  process.exit(0);
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", async () => {
  console.log("SIGINT received, starting graceful shutdown...");
  await server.stop();
  process.exit(0);
});
```

#### Complete Shutdown Handler

For production deployments, implement a comprehensive shutdown handler:

```typescript
const server = await createServer(neurolink, { framework: "hono" });
await server.initialize();
await server.start();

// Handle graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Gracefully shutting down...`);

  // Stop accepting new requests
  await server.stop();

  // Close database connections, flush logs, etc.
  await cleanup();

  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
```

#### Kubernetes Considerations

When deploying to Kubernetes, align your shutdown configuration with Kubernetes settings:

1. **Match `terminationGracePeriodSeconds` with `gracefulShutdownTimeoutMs`**

   ```yaml
   spec:
     terminationGracePeriodSeconds: 30 # Should match gracefulShutdownTimeoutMs
     containers:
       - name: neurolink-api
         # ...
   ```

2. **Use preStop hook for additional delay** (if load balancer needs time to deregister)

   ```yaml
   lifecycle:
     preStop:
       exec:
         command: ["sh", "-c", "sleep 5"]
   ```

3. **Ensure `drainTimeoutMs` < `gracefulShutdownTimeoutMs` < `terminationGracePeriodSeconds`**

   ```typescript
   // Recommended configuration for Kubernetes with 30s termination period
   const server = await createServer(neurolink, {
     framework: "hono",
     config: {
       shutdown: {
         gracefulShutdownTimeoutMs: 25000, // Leave buffer for cleanup
         drainTimeoutMs: 15000, // Drain before graceful timeout
         forceClose: true,
       },
     },
   });
   ```

### Logging for Production

```typescript
import { NeuroLink } from "@juspay/neurolink";
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Log all server events
server.on("request", (event) => {
  logger.info(
    { requestId: event.requestId, path: event.path },
    "Request received",
  );
});

server.on("response", (event) => {
  logger.info(
    {
      requestId: event.requestId,
      status: event.statusCode,
      duration: event.duration,
    },
    "Response sent",
  );
});

server.on("error", (event) => {
  logger.error(
    {
      requestId: event.requestId,
      error: event.error.message,
    },
    "Request error",
  );
});
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Secrets stored securely (Kubernetes Secrets, AWS Secrets Manager, etc.)
- [ ] Docker image built and tested
- [ ] Health endpoints working
- [ ] Rate limiting configured appropriately
- [ ] CORS configured with specific origins
- [ ] Authentication middleware in place
- [ ] Logging configured

### Infrastructure

- [ ] Load balancer configured
- [ ] TLS/SSL certificates provisioned
- [ ] DNS configured
- [ ] Firewall rules set
- [ ] Resource limits defined

### Monitoring

- [ ] Health check monitoring configured
- [ ] Metrics collection enabled
- [ ] Log aggregation set up
- [ ] Alerting configured
- [ ] Error tracking (Sentry, etc.) integrated

### Scaling

- [ ] Horizontal pod autoscaler configured
- [ ] Resource requests and limits set
- [ ] Redis (or equivalent) for distributed state
- [ ] Database connection pooling configured

### Security

- [ ] Non-root container user
- [ ] Read-only filesystem where possible
- [ ] Security headers configured
- [ ] Network policies defined
- [ ] Regular security scanning enabled

---

## Deployment Verification via CLI

Use CLI commands to verify your deployment:

### Pre-Deployment Checklist

```bash
# Verify configuration
neurolink server config --format json

# Check all routes are registered
neurolink server routes

# Generate OpenAPI spec for documentation
neurolink server openapi -o openapi.json
```

### Post-Deployment Verification

```bash
# Start server and verify status
neurolink server start --port 3000
neurolink server status

# Verify routes are accessible
neurolink server routes --format json

# Stop for production deployment
neurolink server stop
```

### Health Check Endpoints

After deployment, verify these endpoints are accessible:

| Endpoint           | Purpose            |
| ------------------ | ------------------ |
| `GET /api/health`  | Basic health check |
| `GET /api/ready`   | Readiness probe    |
| `GET /api/metrics` | Metrics endpoint   |

Use `neurolink server routes --group health` to list all health endpoints.

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Security Best Practices](./security.md)** - Securing your deployment
- **[Hono Adapter](./hono.md)** - Recommended for serverless deployments
- **[Enterprise Monitoring](../../features/observability.md)** - Production monitoring

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

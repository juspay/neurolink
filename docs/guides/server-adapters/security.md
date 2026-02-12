---
title: Security Best Practices
sidebar_label: "Security Best Practices"
description: Secure your NeuroLink server adapters with authentication, rate limiting, and production hardening
sidebar_position: 10
keywords: security, authentication, authorization, rate limiting, cors, api security, bearer token, api key
---

# Security Best Practices

**Protect your AI APIs with comprehensive security measures**

This guide covers authentication, authorization, rate limiting, and other security best practices for deploying NeuroLink server adapters in production.

---

## Authentication

NeuroLink server adapters support multiple authentication strategies out of the box.

### Bearer Token Authentication

Bearer tokens (JWT, OAuth tokens) are the most common authentication method for APIs:

```typescript
import { createServer, createAuthMiddleware } from "@juspay/neurolink";
import jwt from "jsonwebtoken";

const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

server.registerMiddleware(
  createAuthMiddleware({
    type: "bearer",
    validate: async (token, ctx) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return {
          id: decoded.sub,
          email: decoded.email,
          roles: decoded.roles || [],
        };
      } catch (error) {
        return null; // Invalid token
      }
    },
    skipPaths: ["/api/health", "/api/ready"],
    errorMessage: "Invalid or expired token",
  }),
);

await server.initialize();
await server.start();
```

### API Key Authentication

For service-to-service communication or simple API access:

```typescript
server.registerMiddleware(
  createAuthMiddleware({
    type: "api-key",
    headerName: "x-api-key", // Default header for api-key type
    validate: async (apiKey, ctx) => {
      // Validate against your API key store
      const keyRecord = await db.apiKeys.findOne({ key: apiKey });

      if (!keyRecord || keyRecord.revoked) {
        return null;
      }

      // Check if key is expired
      if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
        return null;
      }

      return {
        id: keyRecord.userId,
        roles: keyRecord.scopes || [],
        metadata: {
          keyId: keyRecord.id,
          rateLimit: keyRecord.rateLimit,
        },
      };
    },
    skipPaths: ["/api/health", "/api/ready", "/api/version"],
  }),
);
```

### Basic Authentication

For simple username/password authentication:

```typescript
server.registerMiddleware(
  createAuthMiddleware({
    type: "basic",
    validate: async (credentials, ctx) => {
      // credentials is base64 encoded "username:password"
      const decoded = Buffer.from(credentials, "base64").toString();
      const [username, password] = decoded.split(":");

      const user = await db.users.findOne({ username });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        roles: user.roles,
      };
    },
    skipPaths: ["/api/health"],
  }),
);
```

### Custom Authentication

For OAuth 2.0, OIDC, or custom schemes:

```typescript
server.registerMiddleware(
  createAuthMiddleware({
    type: "custom",
    extractToken: (ctx) => {
      // Extract from custom header or query param
      return ctx.headers["x-custom-auth"] || ctx.query.token || null;
    },
    validate: async (token, ctx) => {
      // Validate with external auth provider
      const response = await fetch("https://auth.example.com/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        return null;
      }

      const user = await response.json();
      return {
        id: user.sub,
        email: user.email,
        roles: user.roles,
      };
    },
    skipPaths: ["/api/health", "/api/ready"],
  }),
);
```

### Skip Paths Configuration

Certain endpoints should bypass authentication:

```typescript
const authMiddleware = createAuthMiddleware({
  type: "bearer",
  validate: validateToken,
  skipPaths: [
    "/api/health", // Health checks
    "/api/ready", // Readiness probes
    "/api/version", // Version info
    "/api/metrics", // Prometheus metrics (consider securing separately)
    "/api/docs", // API documentation
    "/api/auth/login", // Login endpoint
    "/api/auth/refresh", // Token refresh
  ],
});
```

---

## Rate Limiting

Protect your API from abuse with configurable rate limiting.

### Basic Configuration

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    rateLimit: {
      enabled: true,
      maxRequests: 100, // 100 requests
      windowMs: 60000, // per minute
      message: "Too many requests, please try again later",
      skipPaths: ["/api/health", "/api/ready"],
    },
  },
});
```

### Per-IP Rate Limiting

The default behavior limits requests by client IP:

```typescript
import { createRateLimitMiddleware } from "@juspay/neurolink";

server.registerMiddleware(
  createRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    keyGenerator: (ctx) => {
      // Use X-Forwarded-For when behind a proxy
      return (
        ctx.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        ctx.headers["x-real-ip"] ||
        "unknown"
      );
    },
    skipPaths: ["/api/health"],
  }),
);
```

### Per-User Rate Limiting

Limit based on authenticated user:

```typescript
server.registerMiddleware(
  createRateLimitMiddleware({
    maxRequests: 1000,
    windowMs: 3600000, // 1 hour
    keyGenerator: (ctx) => {
      // Use user ID if authenticated, fall back to IP
      return ctx.user?.id || ctx.headers["x-forwarded-for"] || "anonymous";
    },
  }),
);
```

### Per-API-Key Rate Limiting

Different limits for different API keys:

```typescript
server.registerMiddleware(
  createRateLimitMiddleware({
    maxRequests: 100, // Default limit
    windowMs: 60000,
    keyGenerator: (ctx) => {
      const apiKey = ctx.headers["x-api-key"];
      return apiKey ? `key:${apiKey}` : `ip:${ctx.headers["x-forwarded-for"]}`;
    },
    onRateLimitExceeded: (ctx, retryAfter) => {
      // Custom response with tier info
      return {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Upgrade your plan for higher limits.",
          retryAfter,
          upgradeUrl: "https://example.com/pricing",
        },
      };
    },
  }),
);
```

### Sliding Window Rate Limiting

For smoother rate limiting that prevents burst-and-wait patterns:

```typescript
import { createSlidingWindowRateLimitMiddleware } from "@juspay/neurolink";

server.registerMiddleware(
  createSlidingWindowRateLimitMiddleware({
    maxRequests: 100,
    windowMs: 60000,
    subWindows: 10, // 10 sub-windows for smoother limiting
    keyGenerator: (ctx) => ctx.user?.id || ctx.headers["x-forwarded-for"],
  }),
);
```

### Rate Limit Headers

Rate limit middleware automatically adds headers to responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1706745660
```

### Rate Limit Response Headers

When a request exceeds the rate limit, the server returns HTTP 429 (Too Many Requests) with these headers:

| Header                  | Description                      | Example      |
| ----------------------- | -------------------------------- | ------------ |
| `X-RateLimit-Limit`     | Maximum requests per window      | `100`        |
| `X-RateLimit-Remaining` | Requests remaining in window     | `0`          |
| `X-RateLimit-Reset`     | Unix timestamp when limit resets | `1706745660` |
| `Retry-After`           | Seconds to wait before retrying  | `60`         |

Clients should respect the `Retry-After` header to avoid unnecessary requests.

---

## Stream Redaction

Protect sensitive data in streaming responses. **Redaction is disabled by default** and must be explicitly enabled.

### Why Disabled by Default?

Stream redaction is disabled by default because:

1. It adds processing overhead to every stream chunk
2. Developers should consciously decide what to redact
3. Overly aggressive redaction can break functionality

### Enabling Stream Redaction

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    redaction: {
      enabled: true, // Must explicitly enable
      // Default redacted fields: apiKey, token, authorization,
      // credentials, password, secret, request, args, result
    },
  },
});
```

### Custom Redaction Configuration

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    redaction: {
      enabled: true,

      // Add custom fields to redact
      additionalFields: ["ssn", "creditCard", "bankAccount", "privateKey"],

      // Preserve fields that would normally be redacted
      preserveFields: ["result"], // Don't redact tool results

      // Control tool-specific redaction
      redactToolArgs: true, // Redact tool arguments
      redactToolResults: false, // Don't redact results

      // Custom placeholder
      placeholder: "[SENSITIVE DATA REMOVED]",
    },
  },
});
```

### Programmatic Redaction

For custom streaming routes:

```typescript
import { createStreamRedactor } from "@juspay/neurolink";

const redactor = createStreamRedactor({
  enabled: true,
  additionalFields: ["customSecret"],
});

// Use in custom stream handling
for await (const chunk of stream) {
  const redactedChunk = redactor(chunk);
  response.write(redactedChunk);
}
```

---

## CORS Configuration

Properly configure Cross-Origin Resource Sharing:

```typescript
const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    cors: {
      enabled: true,

      // Specific origins only (never use "*" in production)
      origins: [
        "https://myapp.com",
        "https://staging.myapp.com",
        "https://admin.myapp.com",
      ],

      // Allowed HTTP methods
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],

      // Allowed headers
      headers: ["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],

      // Allow credentials (cookies, authorization headers)
      credentials: true,

      // Preflight cache (reduce OPTIONS requests)
      maxAge: 86400, // 24 hours
    },
  },
});
```

### Dynamic CORS Origins

For multi-tenant applications:

```typescript
// Using Hono's native CORS middleware
import { cors } from "hono/cors";

const app = server.getFrameworkInstance();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      // Validate origin against allowed list
      const allowedPattern = /^https:\/\/.*\.myapp\.com$/;

      if (allowedPattern.test(origin)) {
        return origin;
      }

      // Check database for custom domains
      // (be careful with async operations here)
      return null;
    },
    credentials: true,
  }),
);
```

---

## Security Headers

Add essential security headers to all responses. NeuroLink provides a built-in `createSecurityHeadersMiddleware` that works with **all server adapters** (Hono, Express, Fastify, Koa).

### Using NeuroLink Security Headers Middleware (All Adapters)

The recommended approach is to use NeuroLink's built-in security headers middleware, which works consistently across all frameworks:

```typescript
import {
  createServer,
  createSecurityHeadersMiddleware,
} from "@juspay/neurolink";

const server = await createServer(neurolink, {
  framework: "hono", // Works with: hono, express, fastify, koa
  config: { port: 3000 },
});

server.registerMiddleware(
  createSecurityHeadersMiddleware({
    contentSecurityPolicy: "default-src 'self'; script-src 'self'",
    frameOptions: "DENY",
    contentTypeOptions: "nosniff",
    hstsMaxAge: 31536000,
    referrerPolicy: "strict-origin-when-cross-origin",
    customHeaders: {
      "X-Custom-Header": "custom-value",
    },
  }),
);

await server.initialize();
await server.start();
```

### Configuration Options

| Option                  | Type                              | Default                             | Description                    |
| ----------------------- | --------------------------------- | ----------------------------------- | ------------------------------ |
| `contentSecurityPolicy` | `string`                          | `undefined`                         | Content-Security-Policy header |
| `frameOptions`          | `"DENY" \| "SAMEORIGIN" \| false` | `"DENY"`                            | X-Frame-Options header         |
| `contentTypeOptions`    | `"nosniff" \| false`              | `"nosniff"`                         | X-Content-Type-Options header  |
| `hstsMaxAge`            | `number \| false`                 | `31536000` (1 year)                 | HSTS max-age in seconds        |
| `referrerPolicy`        | `string \| false`                 | `"strict-origin-when-cross-origin"` | Referrer-Policy header         |
| `customHeaders`         | `Record<string, string>`          | `{}`                                | Additional custom headers      |

### Headers Set by the Middleware

The middleware automatically sets these security headers:

| Header                      | Default Value                         | Purpose                       |
| --------------------------- | ------------------------------------- | ----------------------------- |
| `X-Frame-Options`           | `DENY`                                | Prevents clickjacking attacks |
| `X-Content-Type-Options`    | `nosniff`                             | Prevents MIME type sniffing   |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS connections    |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`     | Controls referrer information |
| `X-XSS-Protection`          | `1; mode=block`                       | XSS filter for older browsers |
| `Content-Security-Policy`   | (only if configured)                  | Controls resource loading     |

### Express Example

```typescript
import { NeuroLink } from "@juspay/neurolink";
import {
  createServer,
  createSecurityHeadersMiddleware,
} from "@juspay/neurolink";

const neurolink = new NeuroLink({ defaultProvider: "openai" });

const server = await createServer(neurolink, {
  framework: "express",
  config: { port: 3000 },
});

server.registerMiddleware(
  createSecurityHeadersMiddleware({
    contentSecurityPolicy: "default-src 'self'; img-src 'self' data:",
    frameOptions: "SAMEORIGIN",
    hstsMaxAge: 63072000, // 2 years
  }),
);

await server.initialize();
await server.start();
```

### Fastify Example

```typescript
import { NeuroLink } from "@juspay/neurolink";
import {
  createServer,
  createSecurityHeadersMiddleware,
} from "@juspay/neurolink";

const neurolink = new NeuroLink({ defaultProvider: "anthropic" });

const server = await createServer(neurolink, {
  framework: "fastify",
  config: { port: 3000 },
});

server.registerMiddleware(
  createSecurityHeadersMiddleware({
    frameOptions: "DENY",
    referrerPolicy: "no-referrer",
    customHeaders: {
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    },
  }),
);

await server.initialize();
await server.start();
```

### Koa Example

```typescript
import { NeuroLink } from "@juspay/neurolink";
import {
  createServer,
  createSecurityHeadersMiddleware,
} from "@juspay/neurolink";

const neurolink = new NeuroLink({ defaultProvider: "openai" });

const server = await createServer(neurolink, {
  framework: "koa",
  config: { port: 3000 },
});

server.registerMiddleware(
  createSecurityHeadersMiddleware({
    contentSecurityPolicy: "default-src 'self'",
    hstsMaxAge: 31536000,
  }),
);

await server.initialize();
await server.start();
```

### Hono Example

```typescript
import { NeuroLink } from "@juspay/neurolink";
import {
  createServer,
  createSecurityHeadersMiddleware,
} from "@juspay/neurolink";

const neurolink = new NeuroLink({ defaultProvider: "openai" });

const server = await createServer(neurolink, {
  framework: "hono",
  config: { port: 3000 },
});

server.registerMiddleware(
  createSecurityHeadersMiddleware({
    contentSecurityPolicy:
      "default-src 'self'; script-src 'self' 'unsafe-inline'",
    frameOptions: "DENY",
  }),
);

await server.initialize();
await server.start();
```

### Disabling Specific Headers

Set any option to `false` to disable that header:

```typescript
server.registerMiddleware(
  createSecurityHeadersMiddleware({
    frameOptions: false, // Disable X-Frame-Options
    hstsMaxAge: false, // Disable HSTS
    referrerPolicy: false, // Disable Referrer-Policy
  }),
);
```

### Framework-Specific Alternatives

If you prefer to use framework-native security middleware, you can access the underlying framework instance:

#### Using Hono's secureHeaders

```typescript
import { secureHeaders } from "hono/secure-headers";

const app = server.getFrameworkInstance();

app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  }),
);
```

#### Using Express with Helmet

```typescript
import helmet from "helmet";

const app = server.getFrameworkInstance();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

#### Using Koa with koa-helmet

```typescript
import helmet from "koa-helmet";

const app = server.getFrameworkInstance();

app.use(helmet());
```

---

## Production Security Checklist

### Authentication

- [ ] Implement authentication middleware
- [ ] Use secure token validation (verify signatures, check expiration)
- [ ] Configure skip paths carefully
- [ ] Implement token refresh mechanism
- [ ] Log authentication failures
- [ ] Implement account lockout after failed attempts

### Authorization

- [ ] Implement role-based access control (RBAC)
- [ ] Validate permissions for each endpoint
- [ ] Use principle of least privilege
- [ ] Audit authorization decisions

### Rate Limiting

- [ ] Enable rate limiting globally
- [ ] Configure appropriate limits per endpoint type
- [ ] Use sliding window for critical endpoints
- [ ] Implement different tiers for different users
- [ ] Monitor rate limit hits

### Data Protection

- [ ] Enable stream redaction for sensitive operations
- [ ] Configure custom fields to redact
- [ ] Validate and sanitize all inputs
- [ ] Encrypt sensitive data at rest
- [ ] Use TLS for all connections

### CORS

- [ ] Configure specific allowed origins (no wildcards)
- [ ] Restrict allowed methods and headers
- [ ] Enable credentials only if needed
- [ ] Set appropriate preflight cache

### Headers

- [ ] Add Content-Security-Policy
- [ ] Set X-Frame-Options to DENY
- [ ] Enable X-Content-Type-Options
- [ ] Configure Referrer-Policy
- [ ] Add Strict-Transport-Security (HSTS)

### Infrastructure

- [ ] Use HTTPS everywhere (terminate at load balancer)
- [ ] Configure firewall rules
- [ ] Use private networking for internal services
- [ ] Implement request timeout
- [ ] Set maximum body size limits
- [ ] Enable access logging
- [ ] Set up intrusion detection

### Monitoring

- [ ] Monitor authentication failures
- [ ] Alert on rate limit breaches
- [ ] Track unusual API patterns
- [ ] Log all security events
- [ ] Set up anomaly detection

---

## Security Validation via CLI

Use CLI commands to validate security configuration:

### Verify Security Settings

```bash
# Check authentication configuration
neurolink server config --get auth

# Check rate limiting settings
neurolink server config --get rateLimit
neurolink server config --get rateLimit.maxRequests

# Check CORS configuration
neurolink server config --get cors
neurolink server config --get cors.enabled
```

### Route Security Audit

```bash
# List all routes to verify middleware is applied
neurolink server routes --format json

# Check specific route groups
neurolink server routes --group agent  # Verify auth on agent routes
neurolink server routes --group health # Health routes (typically public)
```

### Security Configuration Checklist

| Setting       | Check Command                               | Recommended          |
| ------------- | ------------------------------------------- | -------------------- |
| Rate Limiting | `server config --get rateLimit.enabled`     | `true`               |
| Max Requests  | `server config --get rateLimit.maxRequests` | `100` per minute     |
| CORS          | `server config --get cors.enabled`          | `true` in production |
| CORS Origins  | `server config --get cors.origins`          | Specific domains     |

### Hardening Configuration

```bash
# Set stricter rate limits for production
neurolink server config --set rateLimit.maxRequests=50
neurolink server config --set rateLimit.windowMs=60000

# Verify changes
neurolink server config --format json
```

---

## Example: Complete Secure Server

```typescript
import { NeuroLink } from "@juspay/neurolink";
import {
  createServer,
  createAuthMiddleware,
  createRateLimitMiddleware,
  createRoleMiddleware,
} from "@juspay/neurolink";

const neurolink = new NeuroLink({
  defaultProvider: "openai",
});

const server = await createServer(neurolink, {
  framework: "hono",
  config: {
    port: 3000,
    host: "0.0.0.0",
    basePath: "/api",
    timeout: 30000,

    cors: {
      enabled: true,
      origins: [process.env.ALLOWED_ORIGIN],
      methods: ["GET", "POST"],
      headers: ["Content-Type", "Authorization"],
      credentials: true,
    },

    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000,
      skipPaths: ["/api/health", "/api/ready"],
    },

    bodyParser: {
      enabled: true,
      maxSize: "1mb",
      jsonLimit: "1mb",
    },

    redaction: {
      enabled: true,
      additionalFields: ["ssn", "creditCard"],
    },
  },
});

// Authentication
server.registerMiddleware(
  createAuthMiddleware({
    type: "bearer",
    validate: async (token) => {
      // Your JWT validation logic
      return validateJWT(token);
    },
    skipPaths: ["/api/health", "/api/ready", "/api/auth/login"],
  }),
);

// Additional rate limit for AI endpoints
server.registerMiddleware({
  name: "ai-rate-limit",
  order: 6,
  paths: ["/api/agent/*"],
  handler: async (ctx, next) => {
    // Stricter rate limit for AI operations
    // Implementation here
    return next();
  },
});

// Admin-only endpoints
server.registerMiddleware(
  createRoleMiddleware({
    requiredRoles: ["admin"],
    errorMessage: "Admin access required",
  }),
);

await server.initialize();
await server.start();

console.log("Secure server running on port 3000");
```

---

## Related Documentation

- **[Server Adapters Overview](./index.md)** - Getting started with server adapters
- **[Deployment Guide](./deployment.md)** - Production deployment strategies
- **[Hono Adapter](./hono.md)** - Hono-specific security features
- **[Enterprise Monitoring](../../features/observability.md)** - Security monitoring

---

**Need Help?** Join our [GitHub Discussions](https://github.com/juspay/neurolink/discussions) or open an [issue](https://github.com/juspay/neurolink/issues).

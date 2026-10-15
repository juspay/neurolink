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

### Carrying middleware state to guards and handlers (`carryMiddlewareState`)

Authentication middleware sets `ctx.user`. On the built-in adapters, whether the
middleware that runs after it, and the route handler, see it depends on the
adapter and on `carryMiddlewareState`, which is **off by default**: each adapter
then propagates context as it always did. Express, Fastify and Koa build a fresh
context for every middleware step and for the handler and carry only the
response headers; Hono shares one context between the steps and the handler only
when the client sent its own `X-Request-ID`.

The option does not apply to a context you build yourself: a custom adapter, or a
route handler you call directly, can supply a context that already has `ctx.user`
set.

So by default a role guard (`createRoleMiddleware`) registered after
`createAuthMiddleware` sees the user on one request shape only. Measured: it
answers 401 to every request on Express, Fastify and Koa, and on Hono without a
client `X-Request-ID`, even for a user holding the required role, and a
rate-limit `keyGenerator` reads `ctx.user` as undefined there. Set the option on
the server to carry `ctx.user`, `ctx.session`, `ctx.metadata` and the abort
signal to later middleware and the handler on every built-in adapter:

```typescript
const server = await createServer(neurolink, {
  framework: "express",
  config: { carryMiddlewareState: true },
});
```

With it on, the role guard admits a user holding the role (200) and refuses one
without it (403), and a `keyGenerator` sees `ctx.user`, on every built-in adapter. A key
generator that keys on the user id then does what it says, so make it ignore a
shared identity (`ctx.user.shared`), or every holder of one API key falls into a
single bucket; the rate-limit examples below do. Turning the option on does not
change whose identity the agent routes trust, and `registerAllRoutes` turns it
on by itself when given `perUserAuth`, as the next section says.

### Who the agent routes treat as the user (`perUserAuth`)

Whether the agent routes (`/agent/execute`, `/agent/stream`, and the skill
mutation routes' `requestedBy`) trust `ctx.user` as a person is a separate
choice from whether the server carries it: a single shared API key sets the same
`ctx.user` for every caller, and taking it as the user would give every client
one `userId` and no conversation memory.

So without an opt-in the agent routes resolve identity as they always have:

- On Express, Fastify and Koa, and on Hono when the client sent no
  `X-Request-ID`, `userId` and `sessionId` come from the request body.
  `ctx.user` and `ctx.session` are ignored (they are not in the handler's
  context at all unless the server carries middleware state), and the skill
  routes use the body's `requestedBy`.
- On Hono, when the client sent its own `X-Request-ID` header, an authenticated
  `ctx.user` wins over the body (and `ctx.session` over the body's
  `sessionId`), as it did before. Hono kept the middleware's context under that
  header, so the handler found it. That is the only built-in combination where
  the default ever guarded `userId`.
- A context the built-in adapters did not hand the carry to keeps the same
  rule, an authenticated `ctx.user` wins: an adapter you wrote that sets
  `ctx.user` itself, or a route handler you call directly with a context you
  built (a test harness, for one).

Set `perUserAuth: true` when your middleware identifies individual people (one
credential per person). Only this option, with `carryMiddlewareState` on, makes the agent routes take
the user from `ctx.user`, and ignore the body's `userId`, on every built-in
adapter and for every request:

```typescript
registerAllRoutes(server, "/api", { perUserAuth: true });
```

`registerAllRoutes` also turns on `carryMiddlewareState` for the server, because
the routes can only take identity from `ctx.user` if the adapter hands it to the
handler. With `carryMiddlewareState` on, a `perUserAuth` request that your middleware
authenticated reaches the handler with that user on every built-in adapter. A
request that no middleware authenticated (optional authentication) runs as
anonymous, with no `userId` and no session.

If you register the agent routes yourself with
`createAgentRoutes("/api", { perUserAuth: true })`, create the server with
`carryMiddlewareState: true`. Without it, whether a `perUserAuth` request has a
user depends on the adapter and the request:

- Hono, when the client sent its own `X-Request-ID` header: an authenticated
  request has its user and session. Hono hands the handler the middleware's context for such
  a request whether or not `carryMiddlewareState` is on, so a client that chooses to send the
  header is identified.
- Every other request (Hono without that header, Express, Fastify and Koa): the
  handler has no `ctx.user`, so the request runs as anonymous, with no `userId`
  and no session. The body's `userId` and `sessionId` are still ignored.

Both are the strict behaviour for the requests that have no user, but the
inconsistency between them is rarely what you want, so set the option.

**A server that uses a built-in adapter with per-person authentication must set
`perUserAuth`.** Without it, on every built-in adapter except Hono with
`X-Request-ID`, any authenticated caller can name another person's `userId` and
`sessionId` in the request body and the agent routes will run as them. A custom
adapter that sets `ctx.user` itself, or a handler called directly with a context
you built, already takes the user from `ctx.user` over the body.

The routes can tell you when that is happening, but only when the server carries
middleware state. Without `perUserAuth` and with `carryMiddlewareState` on, the
first time a request that is served from the body names a different `userId`
than its non-`shared` `ctx.user`, the agent routes write one warning to stderr
(once per server, so a busy server is not flooded; the warning shows even with
debug logging off) saying that per-person authentication without `perUserAuth`
lets a caller name another user. The request is not refused: the body's `userId`
is still used. The message carries no user id or other request value.

With `carryMiddlewareState` off, which is the default, there is no warning: the handler has no
`ctx.user` on the requests served from the body, so there is nothing to compare
the body's `userId` against. A per-person server that sets neither
`carryMiddlewareState` nor `perUserAuth` therefore gets no notice, and any
authenticated caller can still name another person; `registerAllRoutes` leaves
`carryMiddlewareState` off unless it is given `perUserAuth`.

When it is raised, the warning stays quiet for a request whose `ctx.user` is
marked `shared: true`,
for a body that names the same user or none, for a request with no
authenticated user, for a Hono request with `X-Request-ID` (where `ctx.user`
already wins), and whenever `perUserAuth` is on. `shared: true` marks an
identity that stands for every holder of one credential, such as a shared API
key, rather than one person. Middleware that authenticates a shared key should
set it on the user it returns, from `createAuthMiddleware`'s `validate` or on
`ctx.user` directly:

```typescript
createAuthMiddleware({
  type: "api-key",
  validate: async (key) =>
    key === process.env.TEAM_KEY ? { id: "team-key", shared: true } : null,
});
```

`neurolink serve` with `NEUROLINK_SERVER_API_KEY` sets the mark for you, and so
does the dev playground user.

| Mode                                       | Adapter and request                                                                                                                                                | `userId`                                                                                               | session                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| default, no authentication                 | any                                                                                                                                                                | the body's `userId`                                                                                    | the body's (on Hono with `X-Request-ID`, a `ctx.session` set by middleware wins)      |
| default, one shared key (`shared: true`)   | Express, Fastify, Koa; Hono without `X-Request-ID`                                                                                                                 | the body's `userId`                                                                                    | the body's                                                                            |
| default, one shared key                    | Hono with `X-Request-ID`                                                                                                                                           | the key's identity (`api-key`), body ignored                                                           | none (`ctx.session` only), body ignored                                               |
| default, per-person authentication         | Express, Fastify, Koa; Hono without `X-Request-ID`                                                                                                                 | the body's `userId`: **any caller can name anyone** (one warning, only with `carryMiddlewareState` on) | the body's; `ctx.session` is ignored                                                  |
| default, per-person authentication         | Hono with `X-Request-ID`                                                                                                                                           | `ctx.user.id`, body ignored                                                                            | `ctx.session` only, body ignored                                                      |
| default, per-person authentication         | your own adapter, or a direct handler call                                                                                                                         | `ctx.user.id`, body ignored                                                                            | `ctx.session` only, body ignored                                                      |
| `perUserAuth: true`, user identified       | any, when the handler receives `ctx.user` (always with `registerAllRoutes`)                                                                                        | `ctx.user.id`, body ignored                                                                            | `ctx.session` only, body ignored                                                      |
| `perUserAuth: true`, no authenticated user | any; also `createAgentRoutes` without `carryMiddlewareState` on Express, Fastify, Koa and Hono without `X-Request-ID`, where the handler never receives `ctx.user` | none, body ignored                                                                                     | none: body and `ctx.session` ignored, so anonymous callers never share a conversation |

On Hono with `X-Request-ID` and no authenticated user (optional authentication),
the default uses the body's `userId` and `ctx.session`, else the body's
`sessionId`. The skill routes' `requestedBy` follows the same split: the body's
by default, with the authenticated user winning on Hono with `X-Request-ID`, and
always the authenticated user under `perUserAuth`.

`neurolink serve` with `NEUROLINK_SERVER_API_KEY` is a shared key and uses the
default. Do not set `perUserAuth` on a server with no authentication: nothing
sets `ctx.user`, so every request would run without a user or a session.

Hono behind one shared key has always been the odd case: clients that send
`X-Request-ID` (NeuroLink's own HTTP client always does) run as the key's
identity, `api-key` with no session, so all of them share one user and have no
conversation memory, while clients that do not send it choose their own
`userId` and `sessionId`. The default keeps that behaviour as it was. Do not set
`perUserAuth` to fix it with a shared key: that makes every caller `api-key`
on every adapter.

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
      // A person's bucket is their user ID. A shared identity (one API key for
      // many callers) would put every caller in one bucket, so it, and an
      // anonymous caller, fall back to the forwarded address. Read
      // x-forwarded-for only behind a trusted proxy that sets or overwrites it:
      // otherwise the client chooses its own bucket by sending any value.
      return ctx.user && !ctx.user.shared
        ? ctx.user.id
        : ctx.headers["x-forwarded-for"] || "anonymous";
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
      // x-forwarded-for only behind a trusted proxy that sets or overwrites it
      // (see above), and a string key when the header is absent
      return apiKey
        ? `key:${apiKey}`
        : `ip:${ctx.headers["x-forwarded-for"] || "unknown"}`;
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
    // x-forwarded-for only behind a trusted proxy (see above), and always a
    // string key: a request without the header would otherwise key on undefined
    keyGenerator: (ctx) =>
      ctx.user && !ctx.user.shared
        ? ctx.user.id
        : ctx.headers["x-forwarded-for"] || "anonymous",
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

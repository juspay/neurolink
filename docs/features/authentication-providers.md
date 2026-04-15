---
title: "Authentication Providers"
description: Secure your AI endpoints with 11 authentication providers including Auth0, Clerk, Firebase, Supabase, AWS Cognito, Keycloak, WorkOS, Better Auth, OAuth2, JWT, and custom adapters
keywords:
  [
    authentication,
    auth,
    auth0,
    clerk,
    firebase,
    supabase,
    cognito,
    keycloak,
    workos,
    better-auth,
    oauth2,
    jwt,
    rbac,
    middleware,
    session-management,
  ]
---

# Authentication Providers

> **Status**: Stable | **Availability**: SDK + CLI + Server

## Overview

NeuroLink ships with a pluggable authentication system that validates tokens, manages sessions, and enforces role-based access control (RBAC) across your AI endpoints. Rather than forcing a single auth solution, NeuroLink supports 11 providers through a unified interface so you can use the same identity platform your application already relies on.

Key capabilities:

- **Token validation** -- verify JWTs and opaque tokens from any supported provider
- **Session management** -- in-memory or Redis-backed session storage with auto-refresh
- **RBAC enforcement** -- role and permission checks with hierarchical wildcard support
- **Per-call authentication** -- validate tokens on every `generate()` or `stream()` call
- **Middleware pipeline** -- composable auth, RBAC, and rate-limiting middleware for server routes
- **AsyncLocalStorage context** -- access the authenticated user from anywhere in the request lifecycle without explicit parameter passing
- **CLI management** -- list providers, validate tokens, and check health from the command line

## Quick Start

### SDK -- Constructor Auth Config

Pass authentication configuration in the `NeuroLink` constructor. The provider is lazily initialized on first use.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  auth: {
    type: "auth0",
    config: {
      domain: "your-tenant.auth0.com",
      clientId: "your-client-id",
      audience: "https://api.example.com",
    },
  },
});
```

### SDK -- Per-Call Token Validation

When an auth provider is configured, pass `auth: { token }` to `generate()` or `stream()` to validate the caller's token before the AI request executes. Validated user identity is automatically injected into the request context.

```typescript
const result = await neurolink.generate({
  input: { text: "Summarize the quarterly report" },
  auth: { token: bearerToken },
});

// Streaming with auth
const stream = await neurolink.stream({
  input: { text: "Explain this chart" },
  auth: { token: bearerToken },
});
```

### SDK -- Pre-Validated Request Context

If your server has already validated the user, pass `requestContext` instead. When both `auth.token` and `requestContext` are provided, token-derived identity fields take precedence to prevent privilege escalation.

```typescript
const result = await neurolink.generate({
  input: { text: "Generate report" },
  requestContext: {
    userId: "user-123",
    userEmail: "alice@example.com",
    userRoles: ["analyst"],
  },
});
```

### Server Middleware

Protect HTTP routes with composable middleware.

```typescript
import {
  createAuthMiddleware,
  createRBACMiddleware,
  createRateLimitByUserMiddleware,
} from "@juspay/neurolink";

// 1. Authentication middleware
const auth = await createAuthMiddleware({
  provider: "auth0",
  providerConfig: {
    type: "auth0",
    domain: "your-tenant.auth0.com",
    clientId: "your-client-id",
  },
  publicRoutes: ["/health", "/public/*"],
});

// 2. RBAC middleware
const rbac = createRBACMiddleware({
  roles: ["admin", "analyst"],
  permissions: ["generate:execute"],
});

// 3. Rate limiting by user
const rateLimit = createRateLimitByUserMiddleware({
  maxRequests: 100,
  windowMs: 60_000,
  roleLimits: { premium: 500, admin: 1000 },
  skipRoles: ["super-admin"],
});
```

## Provider Support

| Provider    | Type          | JWT Validation | Session Mgmt | RBAC | Health Check | Aliases                           |
| ----------- | ------------- | -------------- | ------------ | ---- | ------------ | --------------------------------- |
| Auth0       | `auth0`       | Yes            | Yes          | Yes  | Yes          | `auth0-jwt`, `auth0-oauth`        |
| Clerk       | `clerk`       | Yes            | Yes          | Yes  | Yes          | `clerk-jwt`                       |
| Firebase    | `firebase`    | Yes            | Yes          | Yes  | Yes          | `firebase-auth`                   |
| Supabase    | `supabase`    | Yes            | Yes          | Yes  | Yes          | `supabase-auth`                   |
| AWS Cognito | `cognito`     | Yes            | Yes          | Yes  | Yes          | `aws-cognito`, `amazon-cognito`   |
| Keycloak    | `keycloak`    | Yes            | Yes          | Yes  | Yes          | `keycloak-oidc`                   |
| WorkOS      | `workos`      | Yes            | Yes          | Yes  | Yes          | `workos-sso`, `work-os`           |
| Better Auth | `better-auth` | Yes            | Yes          | Yes  | Yes          | `betterauth`, `better_auth`       |
| OAuth2      | `oauth2`      | Yes            | Yes          | Yes  | Yes          | `oauth`, `oidc`, `openid-connect` |
| JWT         | `jwt`         | Yes            | Yes          | Yes  | Yes          | `jwt-auth`, `jwt-token`           |
| Custom      | `custom`      | Yes            | Yes          | Yes  | Yes          | `custom-auth`                     |

All providers implement the `AuthProvider` interface, ensuring a consistent API regardless of which identity platform you choose.

## SDK API

### Constructor Configuration

The `auth` field in `NeurolinkConstructorConfig` accepts several forms:

```typescript
// Form 1: Typed provider config (recommended)
new NeuroLink({
  auth: {
    type: "auth0",
    config: { domain: "...", clientId: "..." },
  },
});

// Form 2: Direct AuthProvider instance
const provider = await AuthProviderFactory.create("clerk", {
  type: "clerk",
  secretKey: process.env.CLERK_SECRET_KEY!,
});
new NeuroLink({ auth: provider });

// Form 3: Wrapped provider instance
new NeuroLink({ auth: { provider: myAuthProviderInstance } });
```

The `NeuroLinkAuthConfig` union type supports all 11 provider types with their specific config shapes:

| Config Type                           | Required Fields                            |
| ------------------------------------- | ------------------------------------------ |
| `{ type: "auth0"; config: ... }`      | `domain`, `clientId`                       |
| `{ type: "clerk"; config: ... }`      | `secretKey`                                |
| `{ type: "firebase"; config: ... }`   | `projectId`                                |
| `{ type: "supabase"; config: ... }`   | `url`, `anonKey`                           |
| `{ type: "cognito"; config: ... }`    | `userPoolId`, `clientId`, `region`         |
| `{ type: "keycloak"; config: ... }`   | `serverUrl`, `realm`, `clientId`           |
| `{ type: "workos"; config: ... }`     | `apiKey`, `clientId`                       |
| `{ type: "better-auth"; config: ...}` | `secret`, `baseUrl`                        |
| `{ type: "oauth2"; config: ... }`     | `clientId`, `authorizationUrl`, `tokenUrl` |
| `{ type: "jwt"; config: ... }`        | `secret` or `publicKey`                    |
| `{ type: "custom"; config: ... }`     | `validateToken` function                   |

### `setAuthProvider(config)`

Set or change the authentication provider at runtime.

```typescript
// Pass a typed config
await neurolink.setAuthProvider({
  type: "supabase",
  config: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
  },
});

// Or pass a pre-created provider instance
await neurolink.setAuthProvider(myAuthProvider);
```

### `getAuthProvider()`

Get the currently configured authentication provider, or `undefined` if none is set.

```typescript
const provider = neurolink.getAuthProvider();
if (provider) {
  const health = await provider.healthCheck();
  console.log("Auth provider healthy:", health.healthy);
}
```

### `setAuthContext(context)`

Set the current authentication context for request handling. Useful when integrating with server frameworks that have already authenticated the user.

```typescript
neurolink.setAuthContext({
  user: { id: "user-123", roles: ["admin"], permissions: ["*"] },
  headers: {},
  authenticatedAt: new Date(),
  provider: "auth0",
});
```

### `generate()` / `stream()` Auth Options

Both `generate()` and `stream()` accept `auth` and `requestContext` options:

| Option           | Type                      | Description                                          |
| ---------------- | ------------------------- | ---------------------------------------------------- |
| `auth.token`     | `string`                  | Raw token validated by the configured auth provider  |
| `requestContext` | `Record<string, unknown>` | Pre-validated user context (userId, userRoles, etc.) |

When `auth.token` is provided:

1. NeuroLink calls `authProvider.authenticateToken(token)` with a 5-second timeout
2. If invalid, an `InvalidTokenError` is thrown
3. If valid, `userId`, `userEmail`, and `userRoles` are merged into the request context
4. Token-derived identity fields take precedence over `requestContext` to prevent privilege escalation

## CLI Usage

The `auth` command provides subcommands for managing authentication:

```bash
# List available auth providers
neurolink auth providers
neurolink auth providers --format json
neurolink auth providers --format table

# Validate a token against a provider
neurolink auth validate <token> --provider auth0 --domain your-tenant.auth0.com --client-id your-id
neurolink auth validate <token> --provider clerk --secret-key sk_test_xxx
neurolink auth validate <token> --provider jwt --secret your-jwt-secret

# Check provider health
neurolink auth health --provider auth0 --domain your-tenant.auth0.com --client-id your-id
neurolink auth health --provider supabase --url https://xxx.supabase.co --anon-key xxx

# Anthropic OAuth management
neurolink auth login anthropic
neurolink auth logout anthropic
neurolink auth status anthropic
neurolink auth refresh anthropic
```

### Environment Variable Configuration

Provider configuration can be supplied via environment variables instead of CLI flags:

| Provider    | Environment Variables                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Auth0       | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_AUDIENCE`                                                                                  |
| Clerk       | `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`                                                                                          |
| Supabase    | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`                                                                           |
| Firebase    | `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY`                                                                                            |
| WorkOS      | `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`                                                                                                 |
| Better Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_BASE_URL`                                                                                         |
| OAuth2      | `OAUTH2_CLIENT_ID`, `OAUTH2_CLIENT_SECRET`, `OAUTH2_AUTHORIZATION_URL`, `OAUTH2_TOKEN_URL`, `OAUTH2_USERINFO_URL`, `OAUTH2_JWKS_URL` |
| Cognito     | `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION` (or `AWS_REGION`)                                                      |
| Keycloak    | `KEYCLOAK_REALM`, `KEYCLOAK_SERVER_URL`, `KEYCLOAK_CLIENT_ID`                                                                        |
| JWT         | `JWT_SECRET`, `JWT_PUBLIC_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`                                                                         |

## Configuration Reference

### Provider-Specific Configs

#### Auth0

```typescript
{
  type: "auth0",
  config: {
    domain: "your-tenant.auth0.com",    // Required
    clientId: "your-client-id",          // Required
    clientSecret: "your-client-secret",  // Optional, for backend ops
    audience: "https://api.example.com", // Optional, API identifier
    scope: "openid profile email",       // Optional
    claimsNamespace: "https://myapp/",   // Optional, custom claims prefix
    managementApi: {                     // Optional
      clientId: "mgmt-client-id",
      clientSecret: "mgmt-secret",
    },
  },
}
```

#### Clerk

```typescript
{
  type: "clerk",
  config: {
    secretKey: "sk_test_xxx",            // Required
    publishableKey: "pk_test_xxx",       // Optional
    jwtKey: "your-jwt-key",              // Optional, for local validation
    jwksUrl: "https://...",              // Optional, JWKS endpoint override
    allowedOrigins: ["https://app.com"], // Optional
  },
}
```

#### Firebase

```typescript
{
  type: "firebase",
  config: {
    projectId: "your-project-id",   // Required
    apiKey: "your-api-key",          // Optional
    serviceAccount: {                // Optional
      clientEmail: "...",
      privateKey: "...",
    },
    rolesClaimKey: "roles",          // Optional, custom claims key
    permissionsClaimKey: "perms",    // Optional
  },
}
```

#### Supabase

```typescript
{
  type: "supabase",
  config: {
    url: "https://xxx.supabase.co",  // Required
    anonKey: "eyJ...",                // Required
    serviceRoleKey: "eyJ...",         // Optional, for backend ops
    jwtSecret: "your-jwt-secret",    // Optional
  },
}
```

#### AWS Cognito

```typescript
{
  type: "cognito",
  config: {
    userPoolId: "us-east-1_xxx",     // Required
    clientId: "your-client-id",      // Required
    region: "us-east-1",             // Required
    clientSecret: "...",             // Optional
    customAttributes: ["department"], // Optional
  },
}
```

#### Keycloak

```typescript
{
  type: "keycloak",
  config: {
    serverUrl: "https://keycloak.example.com", // Required
    realm: "my-realm",                          // Required
    clientId: "my-app",                         // Required
    clientSecret: "...",                        // Optional
    verifyToken: true,                          // Optional (default: true)
  },
}
```

#### WorkOS

```typescript
{
  type: "workos",
  config: {
    apiKey: "sk_test_xxx",           // Required
    clientId: "client_xxx",          // Required
    organizationId: "org_xxx",       // Optional, for multi-tenant
  },
}
```

#### Better Auth

```typescript
{
  type: "better-auth",
  config: {
    secret: "your-secret",            // Required
    baseUrl: "https://auth.example.com", // Required
    databaseUrl: "postgresql://...",   // Optional
    socialProviders: {                 // Optional
      github: { clientId: "...", clientSecret: "..." },
      google: { clientId: "...", clientSecret: "..." },
    },
  },
}
```

#### OAuth2

```typescript
{
  type: "oauth2",
  config: {
    clientId: "your-client-id",                  // Required
    authorizationUrl: "https://auth.example.com/authorize", // Required
    tokenUrl: "https://auth.example.com/token",  // Required
    clientSecret: "...",                          // Optional
    userInfoUrl: "https://auth.example.com/userinfo", // Optional
    jwksUrl: "https://auth.example.com/.well-known/jwks.json", // Optional
    scopes: ["openid", "profile"],               // Optional
    redirectUrl: "http://localhost:3000/callback", // Optional
    usePKCE: true,                               // Optional
  },
}
```

#### JWT

```typescript
{
  type: "jwt",
  config: {
    secret: "your-hmac-secret",      // Required (or publicKey)
    publicKey: "-----BEGIN PUBLIC KEY-----...", // Required (or secret)
    algorithms: ["HS256"],           // Optional
    issuer: "https://auth.example.com", // Optional
    audience: "https://api.example.com", // Optional
  },
}
```

#### Custom

```typescript
{
  type: "custom",
  config: {
    validateToken: async (token, context) => {
      // Your custom validation logic
      const user = await myAuthService.verify(token);
      return {
        valid: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          roles: user.roles,
          permissions: user.permissions,
        } : undefined,
      };
    },
    getUser: async (userId) => { /* Optional */ },
    createSession: async (user, context) => { /* Optional */ },
  },
}
```

### Base Provider Config

All providers share these base configuration fields:

| Field             | Type                      | Default | Description                             |
| ----------------- | ------------------------- | ------- | --------------------------------------- |
| `required`        | `boolean`                 | `true`  | Whether authentication is mandatory     |
| `debug`           | `boolean`                 | `false` | Enable debug logging                    |
| `tokenValidation` | `TokenValidationConfig`   | --      | Token issuer, audience, clock tolerance |
| `tokenExtraction` | `TokenExtractionStrategy` | Bearer  | Where to find the token in requests     |
| `session`         | `SessionConfig`           | --      | Session storage and duration            |
| `rbac`            | `RBACConfig`              | --      | Role hierarchy and permissions          |
| `cache`           | `AuthCacheConfig`         | --      | Token validation result caching         |

### Token Extraction Strategy

Configure where and how tokens are extracted from requests:

```typescript
{
  tokenExtraction: {
    // Default: Authorization: Bearer <token>
    fromHeader: { name: "Authorization", scheme: "Bearer" },

    // Or from a cookie
    fromCookie: { name: "session_token" },

    // Or from a query parameter
    fromQuery: { name: "access_token" },

    // Or a custom extraction function
    custom: (context) => context.headers["x-api-key"] ?? null,
  },
}
```

## Middleware

### Authentication Middleware

Create middleware that validates tokens and attaches user context to requests.

```typescript
import { createAuthMiddleware } from "@juspay/neurolink";

const authMiddleware = await createAuthMiddleware({
  provider: "auth0",
  providerConfig: {
    type: "auth0",
    domain: "your-tenant.auth0.com",
    clientId: "your-client-id",
  },
  publicRoutes: ["/health", "/public/*"],
  optional: false,
  tokenExtraction: {
    fromHeader: { name: "Authorization", scheme: "Bearer" },
  },
  onAuthenticated: async (context) => {
    console.log("Authenticated:", context.user.id);
  },
  onError: async (error, context) => {
    console.error("Auth error:", error.message);
  },
});

// Use in request handler
const result = await authMiddleware(requestContext);
if (result.proceed) {
  console.log("User:", result.context?.user);
} else {
  console.log("Error:", result.error?.statusCode, result.error?.message);
}
```

### RBAC Middleware

Enforce role and permission requirements after authentication.

```typescript
import { createRBACMiddleware } from "@juspay/neurolink";

const rbacMiddleware = createRBACMiddleware({
  roles: ["admin", "moderator"], // User must have at least one
  permissions: ["generate:execute"], // User must have all
  requireAllRoles: false, // Default: any role matches
  superAdminRoles: ["super-admin"], // Bypass all checks
  roleHierarchy: {
    // Role inheritance
    admin: ["moderator", "viewer"],
    moderator: ["viewer"],
  },
  rolePermissions: {
    // Role-to-permission mapping
    admin: ["generate:execute", "admin:read", "admin:write"],
    moderator: ["generate:execute", "admin:read"],
  },
  custom: async (user, context) => {
    // Custom authorization
    return user.organizationId === "org-123";
  },
  onDenied: async (result, context) => {
    console.log("Access denied:", result.reason);
  },
});
```

### Combined Auth + RBAC Middleware

```typescript
import { createProtectedMiddleware } from "@juspay/neurolink";

const protectedRoute = await createProtectedMiddleware({
  auth: {
    provider: "clerk",
    providerConfig: { type: "clerk", secretKey: process.env.CLERK_SECRET_KEY! },
    publicRoutes: ["/health"],
  },
  rbac: {
    roles: ["admin"],
    permissions: ["admin:write"],
  },
});

const result = await protectedRoute(requestContext);
```

### Express-Compatible Middleware

```typescript
import { createExpressAuthMiddleware } from "@juspay/neurolink";

const middleware = await createExpressAuthMiddleware({
  provider: "jwt",
  providerConfig: {
    type: "jwt",
    secret: process.env.JWT_SECRET!,
    issuer: "https://auth.example.com",
  },
});

// Use with Express
app.use(middleware);
// req.user and req.authContext are available in routes
```

### Rate Limiting by User

Apply per-user rate limits with role-based differentiation and memory or Redis storage.

```typescript
import {
  createRateLimitByUserMiddleware,
  createRateLimitStorage,
} from "@juspay/neurolink";

// Memory storage (single instance)
const rateLimiter = createRateLimitByUserMiddleware({
  maxRequests: 100,
  windowMs: 60_000,
  roleLimits: { premium: 500, admin: 1000 },
  skipRoles: ["super-admin"],
  message: "Rate limit exceeded. Please try again later.",
});

// Redis storage (distributed)
const redisStorage = createRateLimitStorage({
  type: "redis",
  redis: { url: "redis://localhost:6379", prefix: "myapp:ratelimit:" },
});

const distributedLimiter = createRateLimitByUserMiddleware(
  { maxRequests: 100, windowMs: 60_000 },
  redisStorage,
);
```

## Session Management

Sessions are managed through the `SessionManager` class with pluggable storage backends.

### In-Memory Sessions

Default for single-instance deployments. Sessions are lost on restart.

```typescript
import { SessionManager } from "@juspay/neurolink";

const sessions = new SessionManager({
  storage: "memory",
  duration: 3600, // 1 hour in seconds
  autoRefresh: true, // Refresh sessions near expiration
  refreshThreshold: 300, // Refresh when < 5 minutes remain
});

const session = await sessions.createSession(user, {
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
});
```

### Redis Sessions

For multi-instance deployments with distributed session state.

```typescript
const sessions = new SessionManager({
  storage: "redis",
  duration: 3600,
  redis: {
    url: "redis://localhost:6379",
    prefix: "myapp:sessions:",
    ttl: 3600,
  },
});
```

### Session Config Reference

| Field                   | Type                              | Default                 | Description                              |
| ----------------------- | --------------------------------- | ----------------------- | ---------------------------------------- |
| `storage`               | `"memory" \| "redis" \| "custom"` | `"memory"`              | Storage backend                          |
| `duration`              | `number`                          | `3600`                  | Session duration in seconds              |
| `autoRefresh`           | `boolean`                         | `true`                  | Auto-refresh sessions near expiration    |
| `refreshThreshold`      | `number`                          | `300`                   | Seconds before expiry to trigger refresh |
| `allowMultipleSessions` | `boolean`                         | --                      | Allow multiple sessions per user         |
| `maxSessionsPerUser`    | `number`                          | --                      | Maximum concurrent sessions              |
| `redis.url`             | `string`                          | --                      | Redis connection URL                     |
| `redis.prefix`          | `string`                          | `"neurolink:sessions:"` | Key prefix                               |
| `redis.ttl`             | `number`                          | --                      | Redis key TTL in seconds                 |

## Auth Context (AsyncLocalStorage)

NeuroLink uses Node.js `AsyncLocalStorage` to propagate authentication context through the request lifecycle. This means any function in the call chain can access the current user without explicit parameter passing.

```typescript
import {
  runWithAuthContext,
  getAuthContext,
  getCurrentUser,
  getCurrentSession,
  isAuthenticated,
  requireAuth,
  requirePermission,
  requireRole,
  hasPermission,
  hasRole,
  hasAnyRole,
  hasAllPermissions,
} from "@juspay/neurolink";

// Wrap a request handler with auth context
await runWithAuthContext(authenticatedContext, async () => {
  // These work anywhere in the call stack
  const user = getCurrentUser();
  const session = getCurrentSession();

  if (isAuthenticated()) {
    console.log("User:", user?.email);
  }

  // Throws if not authenticated
  const ctx = requireAuth();

  // Throws if user lacks permission
  requirePermission("admin:write");

  // Boolean checks
  if (hasRole("admin") && hasPermission("reports:generate")) {
    await generateReport();
  }
});
```

For environments where `AsyncLocalStorage` is not available, use the `AuthContextHolder`:

```typescript
import { globalAuthContext } from "@juspay/neurolink";

globalAuthContext.set(authenticatedContext);
const user = globalAuthContext.getUser();
globalAuthContext.clear();
```

## Error Handling

All auth errors extend `AuthError` with typed subclasses for different failure modes:

| Error Class                    | Use Case                         | HTTP Status |
| ------------------------------ | -------------------------------- | ----------- |
| `AuthenticationFailedError`    | Invalid credentials or token     | 401         |
| `MissingTokenError`            | No token provided                | 401         |
| `InvalidTokenError`            | Malformed or unverifiable token  | 401         |
| `TokenExpiredError`            | Token has expired                | 401         |
| `InsufficientPermissionsError` | User lacks required permissions  | 403         |
| `SessionNotFoundError`         | Session ID does not exist        | 401         |
| `SessionExpiredError`          | Session has expired              | 401         |
| `UserNotFoundError`            | User not found in provider       | 404         |
| `ProviderInitializationError`  | Provider setup failed            | 500         |
| `InvalidConfigurationError`    | Missing or invalid config fields | 500         |
| `ProviderAPIError`             | Provider API returned an error   | 502         |
| `AuthRateLimitError`           | Too many auth attempts           | 429         |

### Error Codes

| Code     | Meaning                  |
| -------- | ------------------------ |
| AUTH-001 | Invalid token            |
| AUTH-002 | Expired token            |
| AUTH-003 | Invalid credentials      |
| AUTH-004 | Invalid signature        |
| AUTH-005 | Missing token            |
| AUTH-006 | Token decode failed      |
| AUTH-007 | JWKS fetch failed        |
| AUTH-008 | Session not found        |
| AUTH-009 | Session expired          |
| AUTH-010 | Session revoked          |
| AUTH-011 | Insufficient permissions |
| AUTH-012 | Insufficient roles       |
| AUTH-013 | Access denied            |
| AUTH-014 | Provider error           |
| AUTH-015 | Configuration error      |
| AUTH-016 | Rate limited             |
| AUTH-017 | User not found           |
| AUTH-018 | User disabled            |
| AUTH-019 | Email not verified       |
| AUTH-020 | MFA required             |

### Type Guards

```typescript
import {
  isAuthError,
  isAuthenticationError,
  isPermissionError,
  isTokenError,
  isSessionError,
} from "@juspay/neurolink";

try {
  await neurolink.generate({
    input: { text: "Hello" },
    auth: { token: expiredToken },
  });
} catch (error) {
  if (isTokenError(error)) {
    // InvalidTokenError | TokenExpiredError | MissingTokenError
    console.log("Token problem:", error.message);
  } else if (isPermissionError(error)) {
    console.log("Missing:", error.missingPermissions);
  } else if (isAuthError(error)) {
    console.log("Auth error from provider:", error.provider);
  }
}
```

## Auth Events

Auth providers emit events you can subscribe to for logging or monitoring:

```typescript
const provider = neurolink.getAuthProvider();
if (provider && "on" in provider) {
  provider.on("auth:login", (user) => {
    console.log("User logged in:", user.id);
  });

  provider.on("auth:unauthorized", (context, reason) => {
    console.warn("Unauthorized:", reason);
  });

  provider.on("auth:error", (error, context) => {
    console.error("Auth error:", error.message);
  });
}
```

## Best Practices

1. **Always validate tokens server-side.** Never trust client-provided identity claims without `auth: { token }` validation.
2. **Use RBAC for fine-grained control.** Define role hierarchies and permission mappings rather than checking roles directly in application code.
3. **Use Redis sessions in production.** In-memory sessions are suitable for development but are lost on restart and do not work across multiple instances.
4. **Leverage AsyncLocalStorage context.** Use `runWithAuthContext` and `getCurrentUser()` instead of passing user objects through every function parameter.
5. **Set token extraction strategy explicitly.** The default (`Authorization: Bearer`) works for most APIs, but configure cookie or custom extraction for browser-based flows.
6. **Handle token expiration gracefully.** Catch `TokenExpiredError` and return a response that tells the client to refresh.
7. **Use rate limiting per user.** Apply `createRateLimitByUserMiddleware` to prevent abuse while giving premium users higher limits.
8. **Keep secrets in environment variables.** Never hard-code client secrets, JWT secrets, or service account keys in source code.

## Key Files

| File                                         | Purpose                                                 |
| -------------------------------------------- | ------------------------------------------------------- |
| `src/lib/auth/AuthProviderFactory.ts`        | Factory for creating auth provider instances            |
| `src/lib/auth/AuthProviderRegistry.ts`       | Registry for provider metadata and discovery            |
| `src/lib/auth/authProvider.ts`               | `BaseAuthProvider` abstract class                       |
| `src/lib/auth/authContext.ts`                | AsyncLocalStorage context propagation                   |
| `src/lib/auth/authErrors.ts`                 | Typed error hierarchy                                   |
| `src/lib/auth/sessionManager.ts`             | Session storage (memory + Redis)                        |
| `src/lib/auth/middleware/AuthMiddleware.ts`  | Auth and RBAC middleware factories                      |
| `src/lib/auth/middleware/rateLimitByUser.ts` | Per-user rate limiting middleware                       |
| `src/lib/auth/providers/auth0.ts`            | Auth0 provider implementation                           |
| `src/lib/auth/providers/clerk.ts`            | Clerk provider implementation                           |
| `src/lib/auth/providers/firebase.ts`         | Firebase provider implementation                        |
| `src/lib/auth/providers/supabase.ts`         | Supabase provider implementation                        |
| `src/lib/auth/providers/CognitoProvider.ts`  | AWS Cognito provider implementation                     |
| `src/lib/auth/providers/KeycloakProvider.ts` | Keycloak provider implementation                        |
| `src/lib/auth/providers/workos.ts`           | WorkOS provider implementation                          |
| `src/lib/auth/providers/betterAuth.ts`       | Better Auth provider implementation                     |
| `src/lib/auth/providers/oauth2.ts`           | OAuth2/OIDC provider implementation                     |
| `src/lib/auth/providers/jwt.ts`              | JWT provider implementation                             |
| `src/lib/auth/providers/custom.ts`           | Custom provider implementation                          |
| `src/lib/auth/index.ts`                      | Module exports                                          |
| `src/lib/types/authTypes.ts`                 | All auth type definitions                               |
| `src/lib/types/configTypes.ts`               | `NeuroLinkAuthConfig` union type                        |
| `src/lib/neurolink.ts`                       | `setAuthProvider()`, `getAuthProvider()`, per-call auth |
| `src/cli/commands/authProviders.ts`          | CLI auth command handlers                               |
| `src/cli/factories/authCommandFactory.ts`    | CLI auth command builder                                |

## See Also

- [Auth Architecture Guide](../advanced/auth-architecture.md) -- factory + registry pattern, request flow, and integration points
- [Server Adapters](../guides/server-adapters/index.md) -- deploying NeuroLink as an HTTP API with auth middleware
- [Observability Guide](observability.md) -- tracing authenticated requests with Langfuse context
- [SDK API Reference](../sdk/api-reference.md) -- complete SDK reference

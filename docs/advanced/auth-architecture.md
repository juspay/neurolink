---
title: "Authentication Architecture"
description: Internal architecture of NeuroLink's authentication system -- factory + registry pattern, request flow, RBAC enforcement, session lifecycle, and integration points
keywords:
  [
    auth-architecture,
    factory-pattern,
    registry-pattern,
    rbac,
    session-management,
    async-local-storage,
    middleware,
    authentication-flow,
  ]
---

# Authentication Architecture

> **Audience**: Contributors and advanced users who need to understand how authentication is wired into NeuroLink's internals.

## Design Principles

NeuroLink's auth system follows the same architectural patterns used for AI providers:

1. **Factory + Registry** -- providers are registered with factory functions and instantiated on demand via dynamic imports to avoid circular dependencies
2. **Lazy initialization** -- the auth provider is not created in the synchronous constructor; it is initialized on first use (generate/stream with `auth.token`)
3. **Fail closed** -- a valid token that does not resolve to a user identity is treated as an authentication failure
4. **Token-derived identity wins** -- when both `auth.token` and `requestContext` are provided, token-derived fields (`userId`, `userEmail`, `userRoles`) override `requestContext` to prevent privilege escalation

## System Overview

```
                    NeuroLink Constructor
                           |
                    auth config stored
                    (pendingAuthConfig)
                           |
         ┌─────────────────┴──────────────────┐
         |                                     |
   generate()/stream()                  setAuthProvider()
   with auth.token                      (explicit init)
         |                                     |
   ensureAuthProvider() ────────────> AuthProviderFactory
         |                               .create(type, config)
         |                                     |
   provider.authenticateToken(token)     Dynamic import
         |                               provider module
   TokenValidationResult                       |
         |                               AuthProvider
   userId/email/roles                    instance returned
   merged into context
```

## Factory + Registry Pattern

### AuthProviderFactory

`AuthProviderFactory` extends `BaseFactory` and follows the singleton pattern. It registers 11 provider factory functions during initialization, each using dynamic imports:

```
AuthProviderFactory.getInstance()
  └── registerAll()
        ├── "auth0"       → import("./providers/auth0.js")
        ├── "clerk"       → import("./providers/clerk.js")
        ├── "firebase"    → import("./providers/firebase.js")
        ├── "supabase"    → import("./providers/supabase.js")
        ├── "cognito"     → import("./providers/CognitoProvider.js")
        ├── "keycloak"    → import("./providers/KeycloakProvider.js")
        ├── "better-auth" → import("./providers/betterAuth.js")
        ├── "workos"      → import("./providers/workos.js")
        ├── "custom"      → import("./providers/custom.js")
        ├── "oauth2"      → import("./providers/oauth2.js")
        └── "jwt"         → import("./providers/jwt.js")
```

Each registration includes:

- **Type identifier** -- canonical name (e.g., `"auth0"`)
- **Factory function** -- async function that dynamically imports and instantiates the provider
- **Aliases** -- alternative names for convenience (e.g., `"auth0-jwt"`, `"auth0-oauth"`)
- **Metadata** -- human-readable name, description, documentation URL

The `create(type, config)` method:

1. Calls `ensureInitialized()` to lazily run `registerAll()` once
2. Resolves the name through alias lookup via `resolveName()`
3. Calls the registered factory function with the provider config
4. Returns the `AuthProvider` instance

### AuthProviderRegistry

`AuthProviderRegistry` extends `BaseRegistry` and layers metadata and discovery on top of the factory:

- Tracks provider capabilities (features like `jwt-validation`, `session-management`, `sso`)
- Provides discovery APIs (`getProvidersByFeature()`, `getBuiltInProviders()`)
- Runs health checks by creating temporary provider instances
- Caches health status per provider type

The registry does not create providers directly; it delegates to `AuthProviderFactory.create()`.

### Error Factories

Both `AuthProviderFactory` and `AuthProviderRegistry` use `createErrorFactory()` from the core infrastructure to produce typed errors with unique codes:

| Module   | Code Prefix      | Example                         |
| -------- | ---------------- | ------------------------------- |
| Factory  | `AUTH_FACTORY-`  | `AUTH_FACTORY-001` (not found)  |
| Registry | `AUTH_REGISTRY-` | `AUTH_REGISTRY-001` (not found) |

## Provider Interface

All providers implement the `AuthProvider` type, which defines:

### Required Methods

| Method                     | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `authenticateToken()`      | Validate and decode a token, return user identity |
| `extractToken()`           | Extract token from request context                |
| `authorizeUser()`          | Check if user has a specific permission           |
| `authorizeRoles()`         | Check if user has any of the required roles       |
| `authorizePermissions()`   | Check if user has all specified permissions       |
| `createSession()`          | Create a new session for a user                   |
| `getSession()`             | Get an existing session by ID                     |
| `refreshSession()`         | Extend a session's expiration                     |
| `destroySession()`         | Invalidate a session                              |
| `getUserSessions()`        | Get all active sessions for a user                |
| `destroyAllUserSessions()` | Global logout                                     |
| `authenticateRequest()`    | Full request authentication flow                  |
| `healthCheck()`            | Check provider connectivity                       |

### Optional Methods

| Method                    | Purpose                         |
| ------------------------- | ------------------------------- |
| `refreshToken()`          | Refresh an authentication token |
| `revokeToken()`           | Revoke a token (logout)         |
| `getUser()`               | Get user by ID                  |
| `getUserByEmail()`        | Get user by email               |
| `updateUserMetadata()`    | Update user metadata            |
| `updateUserRoles()`       | Update user roles               |
| `updateUserPermissions()` | Update user permissions         |
| `initialize()`            | Provider initialization         |
| `cleanup()`               | Resource cleanup                |

### BaseAuthProvider

The abstract `BaseAuthProvider` class provides default implementations for token extraction, authorization checks, and the full `authenticateRequest()` flow. Concrete providers only need to implement the abstract methods:

- `authenticateToken()` -- provider-specific token validation
- `createSession()` / `getSession()` / `refreshSession()` / `destroySession()` -- session lifecycle
- `getUserSessions()` / `destroyAllUserSessions()` -- multi-session management

The base class also:

- Defaults token extraction to `Authorization: Bearer` header with case-insensitive lookup
- Supports hierarchical wildcard permissions (e.g., `tools:*` matches `tools:execute`)
- Supports role hierarchy via `config.rbac.roleHierarchy`
- Emits `auth:unauthorized` events via `EventEmitter`

## Request Authentication Flow

### Per-Call Token Validation (generate/stream)

When `auth: { token }` is passed to `generate()` or `stream()`:

```
1. ensureAuthProvider()
   └── If authProvider is null and pendingAuthConfig exists:
       └── setAuthProvider(pendingAuthConfig)  [one-time lazy init]

2. authProvider.authenticateToken(token)
   └── 5-second timeout via withTimeout()

3. If result is invalid:
   └── throw InvalidTokenError(result.error, provider.type)

4. If result is valid and result.user exists:
   └── Merge into options.context:
       { userId, userEmail, userRoles }

5. If both auth.token and requestContext exist:
   └── Token-derived identity fields OVERRIDE requestContext
       (prevents privilege escalation)

6. Proceed with AI generation
```

### Server Middleware Flow

When using `createAuthMiddleware()`:

```
1. Check if route is public (isPublicRoute)
   └── If public: return { proceed: true }

2. Extract token (extractToken)
   └── Header → Cookie → Query → Custom
   └── If no token and not optional: return 401

3. Validate token (provider.authenticateToken)
   └── If invalid and not optional: return 401

4. Fail closed: valid token without user → return 401

5. Build AuthenticatedContext:
   { ...requestContext, user, token, claims }

6. Call onAuthenticated hook (if configured)

7. Return { proceed: true, context }
```

### RBAC Enforcement Flow

When using `createRBACMiddleware()`:

```
1. Check user exists
   └── If no user: return 401

2. Check super admin roles
   └── If user has any super admin role: bypass all checks

3. Expand roles via hierarchy
   └── e.g., admin → [admin, moderator, viewer]

4. Build effective permissions
   └── Direct permissions + rolePermissions mapping for all expanded roles

5. Run custom authorization function (if configured)
   └── If denied: return 403

6. Check role requirements
   └── requireAllRoles: every role must be present
   └── Default: any role must be present
   └── If insufficient: return 403

7. Check permission requirements (all required)
   └── Uses effective permissions (includes role-derived)
   └── If insufficient: return 403

8. Return { proceed: true, context }
```

## Session Lifecycle

```
                    authenticateRequest()
                           |
                    extractToken(context)
                           |
                    authenticateToken(token)
                           |
                    ┌──────┴──────┐
                    |              |
              getUserSessions()   (no existing session)
                    |              |
              find valid session  createSession(user, context)
                    |              |
                    └──────┬──────┘
                           |
                    AuthenticatedContext
                    { user, session }
```

### Storage Backends

| Backend   | Class                      | Characteristics                                       |
| --------- | -------------------------- | ----------------------------------------------------- |
| In-memory | `MemorySessionStorage`     | Single-instance, sessions lost on restart             |
| Redis     | `RedisSessionStorage`      | Distributed, TTL-based expiration, redis (node-redis) |
| Custom    | Implement `SessionStorage` | User-provided storage backend                         |

`SessionManager` wraps the storage backend and adds:

- Automatic session refresh when close to expiration (`refreshThreshold`)
- Configurable session duration
- Metadata updates
- Health checks

## AsyncLocalStorage Context Propagation

NeuroLink uses Node.js `AsyncLocalStorage` to make the authenticated context available throughout the request lifecycle:

```
runWithAuthContext(context, callback)
  └── AsyncLocalStorage.run(context, callback)
        └── Inside callback (any depth):
              getAuthContext()     → AuthenticatedContext | undefined
              getCurrentUser()     → AuthUser | undefined
              getCurrentSession()  → AuthSession | undefined
              isAuthenticated()    → boolean
              requireAuth()        → AuthenticatedContext (throws if not set)
              hasPermission(p)     → boolean
              hasRole(r)           → boolean
              requirePermission(p) → void (throws if denied)
              requireRole(r)       → void (throws if denied)
```

For environments where `AsyncLocalStorage` is not available (edge runtimes, etc.), the `globalAuthContext` singleton (`AuthContextHolder`) provides an imperative alternative with the same API surface.

## Integration Points

### NeuroLink SDK

| Method                  | Where                     | What it does                                                     |
| ----------------------- | ------------------------- | ---------------------------------------------------------------- |
| `constructor({ auth })` | `src/lib/neurolink.ts`    | Stores `pendingAuthConfig` for lazy init                         |
| `setAuthProvider()`     | `src/lib/neurolink.ts`    | Creates or sets the auth provider                                |
| `getAuthProvider()`     | `src/lib/neurolink.ts`    | Returns the current auth provider                                |
| `ensureAuthProvider()`  | `src/lib/neurolink.ts`    | Lazy init on first use                                           |
| `setAuthContext()`      | `src/lib/neurolink.ts`    | Sets global auth context                                         |
| Per-call auth           | `generate()` / `stream()` | Token validation, context merge, privilege escalation prevention |

### Server Routes

| Route                      | Where                                  | Auth Integration                               |
| -------------------------- | -------------------------------------- | ---------------------------------------------- |
| `POST /api/agent/generate` | `src/lib/server/routes/agentRoutes.ts` | `requestContext` and `authContext` passthrough |
| `POST /api/agent/stream`   | `src/lib/server/routes/agentRoutes.ts` | `requestContext` and `authContext` passthrough |

### CLI

| Command                            | Where                               | What it does                        |
| ---------------------------------- | ----------------------------------- | ----------------------------------- |
| `auth providers`                   | `src/cli/commands/authProviders.ts` | List all 11 providers with metadata |
| `auth validate`                    | `src/cli/commands/authProviders.ts` | Validate a token against a provider |
| `auth health`                      | `src/cli/commands/authProviders.ts` | Health check a provider             |
| `auth login/logout/status/refresh` | `src/cli/commands/auth.ts`          | Anthropic OAuth management          |

### Tool Execution

Authentication context can be passed to tool execution:

```typescript
await neurolink.executeTool("myTool", {
  input: { query: "..." },
  authContext: {
    userId: "user-123",
    roles: ["admin"],
  },
});
```

## Error Hierarchy

```
BaseError (from src/lib/types/errors.ts)
  └── AuthError (auth base class)
        ├── AuthenticationFailedError
        ├── MissingTokenError
        ├── InvalidTokenError
        ├── TokenExpiredError
        ├── InsufficientPermissionsError
        ├── SessionNotFoundError
        ├── SessionExpiredError
        ├── UserNotFoundError
        ├── ProviderInitializationError
        ├── InvalidConfigurationError
        ├── ProviderAPIError
        └── AuthRateLimitError
```

Each error carries the provider type (`error.provider`) so error handlers can distinguish provider-specific failures.

## Rate Limiting Architecture

The rate limiter uses the **token bucket algorithm**:

- Each user gets a bucket with `maxRequests` tokens
- Tokens are continuously refilled at `maxRequests / windowMs` rate
- Each request consumes one token
- When the bucket is empty, requests are rejected with `429 Too Many Requests`

### Concurrency Safety

- **In-memory**: Single-threaded Node.js guarantees atomicity
- **Redis**: Uses a Lua script (`atomicConsume`) that performs refill-and-consume in a single atomic operation, preventing race conditions where parallel requests read the same token count

### Role-Based Differentiation

- `roleLimits` assigns per-role limits (highest limit wins for multi-role users)
- `userLimits` assigns per-user overrides
- `skipRoles` bypasses rate limiting entirely for specified roles (e.g., `super-admin`)

## Adding a New Auth Provider

1. Create a provider class in `src/lib/auth/providers/myProvider.ts` that extends `BaseAuthProvider`
2. Implement the abstract methods: `authenticateToken()`, `createSession()`, `getSession()`, `refreshSession()`, `destroySession()`, `getUserSessions()`, `destroyAllUserSessions()`
3. Register the provider in `AuthProviderFactory.registerAll()` with a dynamic import
4. Register metadata in `AuthProviderRegistry.registerAll()`
5. Add the type name to `AuthProviderType` union in `src/lib/types/authTypes.ts`
6. Add a typed config to `src/lib/types/authTypes.ts` and a discriminated union branch to `NeuroLinkAuthConfig` in `src/lib/types/configTypes.ts`
7. Add environment variable mappings to `buildProviderConfig()` in `src/cli/commands/authProviders.ts`
8. Export the provider from `src/lib/auth/index.ts`
9. Add tests

## See Also

- [Authentication Providers Guide](../features/authentication-providers.md) -- user-facing guide with configuration examples
- [Factory Pattern Architecture](../factory-pattern-architecture.md) -- how NeuroLink uses factory + registry across the codebase
- [Middleware Architecture](middleware-architecture.md) -- the broader middleware system

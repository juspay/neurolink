/**
 * Authentication Middleware
 * Provides flexible authentication support for server adapters
 */

import type {
  ApiKeyAuthOptions,
  AuthResult,
  AuthenticatedUser,
  BearerAuthOptions,
  MiddlewareDefinition,
  ServerContext,
  ServerServerAuthConfig,
  TokenValidator,
} from "../../types/index.js";
import {
  AuthenticationError,
  AuthorizationError,
  InvalidAuthenticationError,
} from "../errors.js";

/**
 * Check if request is from development playground.
 * Detects playground requests via special headers for development mode.
 *
 * @param headers - Request headers to check
 * @returns True if request is from dev playground
 *
 * @example
 * ```typescript
 * if (isDevPlayground(ctx.headers)) {
 *   // Skip authentication for playground
 * }
 * ```
 */
export function isDevPlayground(
  headers: Record<string, string | string[] | undefined>,
): boolean {
  const getHeader = (name: string): string | undefined => {
    const value = headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  };

  return (
    getHeader("x-neurolink-dev-playground") === "true" ||
    getHeader("x-neurolink-playground") === "true"
  );
}

/**
 * Default dev user for playground requests
 */
export const DEV_PLAYGROUND_USER: AuthResult = {
  id: "playground",
  roles: ["developer"],
};
/**
 * Authentication result
 */

/**
 * Create authentication middleware
 *
 * @example
 * ```typescript
 * const authMiddleware = createAuthMiddleware({
 *   type: "bearer",
 *   validate: async (token) => {
 *     const user = await verifyJWT(token);
 *     return user ? { id: user.id, email: user.email } : null;
 *   },
 *   skipPaths: ["/api/health", "/api/ready"],
 * });
 *
 * server.registerMiddleware(authMiddleware);
 * ```
 */
export function createAuthMiddleware(
  config: ServerServerAuthConfig,
): MiddlewareDefinition {
  const {
    type,
    validate,
    skipPaths = [],
    errorMessage = "Authentication required",
    skipDevPlayground = true,
  } = config;

  // Determine header name based on auth type
  const headerName = config.headerName ?? getDefaultHeaderName(type);

  return {
    name: "authentication",
    order: 10, // Run early but after request ID
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      // Skip auth for dev playground in non-production
      if (
        skipDevPlayground &&
        process.env.NODE_ENV !== "production" &&
        isDevPlayground(ctx.headers)
      ) {
        ctx.user = {
          id: DEV_PLAYGROUND_USER.id,
          email: DEV_PLAYGROUND_USER.email,
          roles: DEV_PLAYGROUND_USER.roles,
        };
        return next();
      }

      try {
        // Extract token based on auth type
        const token = extractToken(ctx, type, headerName, config.extractToken);

        if (!token) {
          throw new AuthenticationError(errorMessage);
        }

        // Validate token
        const result = await validate(token, ctx);

        if (!result) {
          throw new InvalidAuthenticationError("Invalid authentication token");
        }

        // Set user information in context
        ctx.user = {
          id: result.id,
          email: result.email,
          roles: result.roles,
        };

        // Store additional metadata
        if (result.metadata) {
          ctx.metadata.auth = result.metadata;
        }

        return next();
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof InvalidAuthenticationError
        ) {
          throw error;
        }
        throw new AuthenticationError(
          error instanceof Error ? error.message : "Authentication failed",
        );
      }
    },
  };
}

/**
 * Get default header name for auth type
 */
function getDefaultHeaderName(type: ServerServerAuthConfig["type"]): string {
  switch (type) {
    case "bearer":
    case "basic":
      return "authorization";
    case "api-key":
      return "x-api-key";
    case "custom":
      return "authorization";
    default:
      return "authorization";
  }
}

/**
 * Extract token from request based on auth type
 */
function extractToken(
  ctx: ServerContext,
  type: ServerServerAuthConfig["type"],
  headerName: string,
  customExtractor?: (ctx: ServerContext) => string | null,
): string | null {
  // Use custom extractor if provided
  if (type === "custom" && customExtractor) {
    return customExtractor(ctx);
  }

  const headerValue = ctx.headers[headerName.toLowerCase()];
  if (!headerValue) {
    return null;
  }

  switch (type) {
    case "bearer": {
      // Extract token from "Bearer <token>"
      const match = headerValue.match(/^Bearer\s+(.+)$/i);
      return match ? match[1] : null;
    }

    case "basic": {
      // Extract credentials from "Basic <base64>"
      const match = headerValue.match(/^Basic\s+(.+)$/i);
      return match ? match[1] : null;
    }

    case "api-key":
      // API key is the raw header value
      return headerValue;

    case "custom":
      // For custom type without extractor, return raw header
      return headerValue;

    default:
      return null;
  }
}

/**
 * Role-based access control middleware
 * Use after authentication middleware
 *
 * @example
 * ```typescript
 * const adminOnly = createRoleMiddleware({
 *   requiredRoles: ["admin"],
 *   errorMessage: "Admin access required",
 * });
 * ```
 */
export function createRoleMiddleware(config: {
  requiredRoles: string[];
  requireAll?: boolean; // Default false (any role matches)
  errorMessage?: string;
}): MiddlewareDefinition {
  const {
    requiredRoles,
    requireAll = false,
    errorMessage = "Insufficient permissions",
  } = config;

  return {
    name: "role-check",
    order: 11, // Run after authentication
    handler: async (ctx, next) => {
      if (!ctx.user) {
        throw new AuthenticationError("Authentication required");
      }

      const userRoles = ctx.user.roles || [];

      const hasAccess = requireAll
        ? requiredRoles.every((role) => userRoles.includes(role))
        : requiredRoles.some((role) => userRoles.includes(role));

      if (!hasAccess) {
        throw new AuthorizationError(
          errorMessage,
          ctx.requestId,
          requiredRoles,
        );
      }

      return next();
    },
  };
}

// ============================================
// API Key Store
// ============================================

/**
 * In-memory API key store for managing API keys
 *
 * @example
 * ```typescript
 * const store = new ApiKeyStore();
 *
 * // Add an API key
 * store.addKey("my-api-key", { id: "user_1", email: "user@example.com" });
 *
 * // Validate a key
 * const user = store.validate("my-api-key");
 * if (user) {
 *   console.log("Valid key for user:", user.id);
 * }
 *
 * // Remove a key
 * store.removeKey("my-api-key");
 *
 * // Clear all keys
 * store.clear();
 * ```
 */
export class ApiKeyStore {
  private keys = new Map<string, AuthenticatedUser>();

  /**
   * Add an API key with associated user
   */
  addKey(apiKey: string, user: AuthenticatedUser): void {
    this.keys.set(apiKey, user);
  }

  /**
   * Validate an API key
   * @returns The user associated with the key, or null if invalid
   */
  validate(apiKey: string): AuthenticatedUser | null {
    return this.keys.get(apiKey) ?? null;
  }

  /**
   * Remove an API key
   */
  removeKey(apiKey: string): boolean {
    return this.keys.delete(apiKey);
  }

  /**
   * Clear all API keys
   */
  clear(): void {
    this.keys.clear();
  }

  /**
   * Get the number of stored keys
   */
  get size(): number {
    return this.keys.size;
  }
}

// ============================================
// Bearer Token Authentication
// ============================================

/**
 * Options for bearer auth middleware
 */

/**
 * Create bearer token authentication middleware
 *
 * @example
 * ```typescript
 * const authMiddleware = createBearerAuthMiddleware(
 *   async (token) => {
 *     const user = await verifyJWT(token);
 *     return user ? { id: user.id, roles: user.roles } : null;
 *   },
 *   { required: true }
 * );
 * ```
 */
export function createBearerAuthMiddleware(
  validate: TokenValidator,
  options: BearerAuthOptions = {},
): MiddlewareDefinition {
  const {
    required = true,
    headerName = "authorization",
    skipPaths = [],
  } = options;

  return {
    name: "bearer-auth",
    order: 10,
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      const authHeader = ctx.headers[headerName.toLowerCase()];

      // Extract bearer token
      let token: string | null = null;
      if (authHeader) {
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        token = match ? match[1] : null;
      }

      // Handle missing token
      if (!token) {
        if (required) {
          throw new AuthenticationError("Authentication required");
        }
        return next();
      }

      // Validate token
      const user = await validate(token);
      if (!user) {
        throw new AuthenticationError("Invalid authentication token");
      }

      // Set user in context
      ctx.user = user;
      return next();
    },
  };
}

// ============================================
// API Key Authentication
// ============================================

/**
 * Options for API key auth middleware
 */

/**
 * Create API key authentication middleware
 *
 * @example
 * ```typescript
 * const store = new ApiKeyStore();
 * store.addKey("my-key", { id: "user_1" });
 *
 * const authMiddleware = createApiKeyAuthMiddleware(store);
 * ```
 */
export function createApiKeyAuthMiddleware(
  store: ApiKeyStore,
  options: ApiKeyAuthOptions = {},
): MiddlewareDefinition {
  const { headerName = "x-api-key", skipPaths = [] } = options;

  return {
    name: "api-key-auth",
    order: 10,
    excludePaths: skipPaths,
    handler: async (ctx, next) => {
      const apiKey = ctx.headers[headerName.toLowerCase()];

      if (!apiKey) {
        throw new AuthenticationError("API key required");
      }

      const user = store.validate(apiKey);
      if (!user) {
        throw new AuthenticationError("Invalid API key");
      }

      ctx.user = user;
      return next();
    },
  };
}

// ============================================
// Role-based Authorization (Simple)
// ============================================

/**
 * Create role-based authorization middleware (simple version)
 *
 * @example
 * ```typescript
 * const adminMiddleware = createRoleAuthMiddleware(["admin"]);
 * const editorMiddleware = createRoleAuthMiddleware(["admin", "editor"]);
 * ```
 */
export function createRoleAuthMiddleware(
  requiredRoles: string[],
  options: { requireAll?: boolean } = {},
): MiddlewareDefinition {
  const { requireAll = false } = options;

  return {
    name: "role-auth",
    order: 11,
    handler: async (ctx, next) => {
      if (!ctx.user) {
        throw new AuthenticationError("Authentication required");
      }

      const userRoles = ctx.user.roles || [];

      const hasAccess = requireAll
        ? requiredRoles.every((role) => userRoles.includes(role))
        : requiredRoles.some((role) => userRoles.includes(role));

      if (!hasAccess) {
        throw new AuthorizationError(
          `Required roles: ${requiredRoles.join(", ")}. User has: ${userRoles.join(", ") || "none"}`,
          ctx.requestId,
          requiredRoles,
        );
      }

      return next();
    },
  };
}

// ============================================
// Permission-based Authorization
// ============================================

/**
 * Create permission-based authorization middleware
 *
 * @example
 * ```typescript
 * const canEditMiddleware = createPermissionAuthMiddleware(["posts:edit"]);
 * const canManageMiddleware = createPermissionAuthMiddleware(["users:read", "users:write"]);
 * ```
 */
export function createPermissionAuthMiddleware(
  requiredPermissions: string[],
  options: { requireAll?: boolean } = {},
): MiddlewareDefinition {
  const { requireAll = false } = options;

  return {
    name: "permission-auth",
    order: 11,
    handler: async (ctx, next) => {
      if (!ctx.user) {
        throw new AuthenticationError("Authentication required");
      }

      // Get permissions from user metadata or roles
      const userPermissions: string[] =
        (ctx.user as AuthenticatedUser & { permissions?: string[] })
          .permissions || [];

      const hasAccess = requireAll
        ? requiredPermissions.every((perm) => userPermissions.includes(perm))
        : requiredPermissions.some((perm) => userPermissions.includes(perm));

      if (!hasAccess) {
        throw new AuthorizationError(
          `Required permissions: ${requiredPermissions.join(", ")}. User has: ${userPermissions.join(", ") || "none"}`,
          ctx.requestId,
          requiredPermissions,
        );
      }

      return next();
    },
  };
}

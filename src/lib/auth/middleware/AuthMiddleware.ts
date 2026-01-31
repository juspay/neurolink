/**
 * AuthMiddleware - Authentication and authorization middleware
 *
 * Provides middleware factories for:
 * - Token extraction and validation
 * - User context propagation
 * - RBAC enforcement
 * - Public route handling
 */

import { createErrorFactory } from "../../core/infrastructure/baseError.js";
import { logger } from "../../utils/logger.js";
import { AuthProviderFactory } from "../AuthProviderFactory.js";
import type {
  AuthErrorCode,
  AuthenticatedContext,
  AuthMiddlewareConfig,
  AuthorizationResult,
  AuthRequestContext,
  AuthUser,
  MastraAuthProvider,
  RBACMiddlewareConfig,
  TokenExtractionConfig,
} from "../types/authTypes.js";

// =============================================================================
// ERROR FACTORY
// =============================================================================

/**
 * Auth middleware error codes
 */
export const AuthMiddlewareErrorCodes = {
  MISSING_TOKEN: "AUTH_MIDDLEWARE-001",
  INVALID_TOKEN: "AUTH_MIDDLEWARE-002",
  UNAUTHORIZED: "AUTH_MIDDLEWARE-003",
  FORBIDDEN: "AUTH_MIDDLEWARE-004",
  PROVIDER_ERROR: "AUTH_MIDDLEWARE-005",
  CONFIGURATION_ERROR: "AUTH_MIDDLEWARE-006",
} as const;

/**
 * Auth middleware error factory
 */
export const AuthMiddlewareError = createErrorFactory("AuthMiddleware", AuthMiddlewareErrorCodes);

// =============================================================================
// TYPES
// =============================================================================

/**
 * Middleware handler function type
 */
export type MiddlewareHandler<TContext = AuthRequestContext> = (context: TContext) => Promise<MiddlewareResult>;

/**
 * Middleware result
 */
export type MiddlewareResult = {
  /** Whether to proceed to next handler */
  proceed: boolean;
  /** Updated context (if authenticated) */
  context?: AuthenticatedContext;
  /** Error response if not proceeding */
  error?: {
    statusCode: number;
    message: string;
    code?: string;
  };
};

/**
 * Next function for middleware chaining
 */
export type NextFunction = () => Promise<void>;

/**
 * Express-style middleware function
 */
export type ExpressMiddleware = (req: unknown, res: unknown, next: NextFunction) => Promise<void>;

// =============================================================================
// TOKEN EXTRACTION
// =============================================================================

/**
 * Extract token from request context based on configuration
 */
export async function extractToken(
  context: AuthRequestContext,
  config?: TokenExtractionConfig,
): Promise<string | null> {
  // Default: extract from Authorization header
  const headerConfig = config?.fromHeader ?? {
    name: "authorization",
    prefix: "Bearer",
  };

  // Try header extraction (case-insensitive header lookup)
  const headerName = headerConfig.name?.toLowerCase() ?? "authorization";

  // Find header value with case-insensitive lookup
  let headerValue: string | string[] | undefined;
  for (const [key, value] of Object.entries(context.headers)) {
    if (key.toLowerCase() === headerName) {
      headerValue = value;
      break;
    }
  }

  if (headerValue) {
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (value) {
      const prefix = headerConfig.prefix ?? "Bearer";
      if (value.startsWith(`${prefix} `)) {
        return value.slice(prefix.length + 1);
      }
      // If no prefix required, return as-is
      if (!prefix) {
        return value;
      }
    }
  }

  // Try cookie extraction
  if (config?.fromCookie?.name && context.cookies) {
    const cookieToken = context.cookies[config.fromCookie.name];
    if (cookieToken) {
      return cookieToken;
    }
  }

  // Try query parameter extraction
  if (config?.fromQuery?.name && context.query) {
    const queryToken = context.query[config.fromQuery.name];
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }
  }

  // Try custom extraction
  if (config?.custom) {
    const customToken = await config.custom(context);
    if (customToken) {
      return customToken;
    }
  }

  return null;
}

// =============================================================================
// AUTH MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create authentication middleware
 *
 * Validates tokens and attaches user context to requests.
 *
 * @example
 * ```typescript
 * const authMiddleware = await createAuthMiddleware({
 *   provider: 'auth0',
 *   providerConfig: {
 *     type: 'auth0',
 *     domain: 'your-tenant.auth0.com',
 *     clientId: 'your-client-id',
 *   },
 *   publicRoutes: ['/health', '/public/*'],
 * });
 *
 * // Use in request handler
 * const result = await authMiddleware(requestContext);
 * if (result.proceed) {
 *   // Access authenticated context
 *   console.log('User:', result.context?.user);
 * } else {
 *   // Return error response
 *   res.status(result.error.statusCode).json({ error: result.error.message });
 * }
 * ```
 */
export async function createAuthMiddleware(
  config: AuthMiddlewareConfig,
): Promise<MiddlewareHandler<AuthRequestContext>> {
  // Create provider instance
  const factory = AuthProviderFactory.getInstance();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const provider = await factory.create(config.provider, config.providerConfig as any);

  logger.debug(`[AuthMiddleware] Created middleware with ${config.provider} provider`);

  return async (context: AuthRequestContext): Promise<MiddlewareResult> => {
    try {
      // Check if route is public
      if (isPublicRoute(context.path, config.publicRoutes)) {
        logger.debug(`[AuthMiddleware] Public route: ${context.path}`);
        return { proceed: true };
      }

      // Extract token
      const token = await extractToken(context, config.tokenExtraction);

      if (!token) {
        // If auth is optional, proceed without user
        if (config.optional) {
          return { proceed: true };
        }

        const error = {
          statusCode: 401,
          message: "Authentication required",
          code: "AUTH-005" as AuthErrorCode,
        };

        if (config.onError) {
          await config.onError(
            Object.assign(new Error(error.message), {
              code: error.code,
            }) as any,
            context,
          );
        }

        return { proceed: false, error };
      }

      // Validate token
      const validationResult = await provider.authenticateToken(token);

      if (!validationResult.valid) {
        // If auth is optional, proceed without user
        if (config.optional) {
          return { proceed: true };
        }

        const error = {
          statusCode: 401,
          message: validationResult.error ?? "Invalid token",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: (validationResult as any).errorCode ?? "AUTH-001",
        };

        if (config.onError) {
          await config.onError(
            Object.assign(new Error(error.message), {
              code: error.code,
            }) as any,
            context,
          );
        }

        return { proceed: false, error };
      }

      // Create authenticated context
      const authenticatedContext: AuthenticatedContext = {
        ...context,
        user: validationResult.user! as AuthUser,
        token,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        claims: (validationResult as any).claims,
      };

      // Call success hook
      if (config.onAuthenticated) {
        await config.onAuthenticated(authenticatedContext);
      }

      logger.debug(`[AuthMiddleware] Authenticated user: ${validationResult.user?.id}`);

      return { proceed: true, context: authenticatedContext };
    } catch (error) {
      logger.error(`[AuthMiddleware] Error:`, error);

      const errorResult = {
        statusCode: 500,
        message: error instanceof Error ? error.message : "Authentication error",
        code: "AUTH-014" as AuthErrorCode,
      };

      if (config.onError) {
        await config.onError(
          Object.assign(new Error(errorResult.message), {
            code: errorResult.code,
          }) as any,
          context,
        );
      }

      return { proceed: false, error: errorResult };
    }
  };
}

// =============================================================================
// RBAC MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create RBAC (Role-Based Access Control) middleware
 *
 * Checks if authenticated user has required roles/permissions.
 *
 * @example
 * ```typescript
 * const rbacMiddleware = createRBACMiddleware({
 *   roles: ['admin', 'moderator'],
 *   permissions: ['read:users'],
 * });
 *
 * // Use after auth middleware
 * const authResult = await authMiddleware(context);
 * if (authResult.proceed && authResult.context) {
 *   const rbacResult = await rbacMiddleware(authResult.context);
 *   if (!rbacResult.proceed) {
 *     res.status(403).json({ error: rbacResult.error.message });
 *   }
 * }
 * ```
 */
export function createRBACMiddleware(config: RBACMiddlewareConfig): MiddlewareHandler<AuthenticatedContext> {
  return async (context: AuthenticatedContext): Promise<MiddlewareResult> => {
    try {
      const user = context.user;

      if (!user) {
        return {
          proceed: false,
          error: {
            statusCode: 401,
            message: "User not authenticated",
            code: "AUTH-005",
          },
        };
      }

      // Check custom authorization first
      if (config.custom) {
        const customResult = await config.custom(user, context);
        if (!customResult) {
          const result: AuthorizationResult = {
            authorized: false,
            user,
            reason: "Custom authorization denied",
          };

          if (config.onDenied) {
            await config.onDenied(result, context);
          }

          return {
            proceed: false,
            error: {
              statusCode: 403,
              message: "Access denied",
              code: "AUTH-013",
            },
          };
        }
      }

      // Check roles
      if (config.roles && config.roles.length > 0) {
        const userRoles = new Set(user.roles);
        const hasRequiredRoles = config.requireAllRoles
          ? config.roles.every((r) => userRoles.has(r))
          : config.roles.some((r) => userRoles.has(r));

        if (!hasRequiredRoles) {
          const missingRoles = config.roles.filter((r) => !userRoles.has(r));
          const result: AuthorizationResult = {
            authorized: false,
            user,
            requiredRoles: config.roles,
            missingRoles,
            reason: `Missing roles: ${missingRoles.join(", ")}`,
          };

          if (config.onDenied) {
            await config.onDenied(result, context);
          }

          return {
            proceed: false,
            error: {
              statusCode: 403,
              message: `Insufficient roles. Required: ${config.roles.join(", ")}`,
              code: "AUTH-012",
            },
          };
        }
      }

      // Check permissions (all required)
      if (config.permissions && config.permissions.length > 0) {
        const userPermissions = new Set(user.permissions);
        const missingPermissions = config.permissions.filter((p) => !userPermissions.has(p));

        if (missingPermissions.length > 0) {
          const result: AuthorizationResult = {
            authorized: false,
            user,
            requiredPermissions: config.permissions,
            missingPermissions,
            reason: `Missing permissions: ${missingPermissions.join(", ")}`,
          };

          if (config.onDenied) {
            await config.onDenied(result, context);
          }

          return {
            proceed: false,
            error: {
              statusCode: 403,
              message: `Insufficient permissions. Required: ${config.permissions.join(", ")}`,
              code: "AUTH-011",
            },
          };
        }
      }

      logger.debug(`[RBACMiddleware] Authorized user: ${user.id}`);

      return { proceed: true, context };
    } catch (error) {
      logger.error(`[RBACMiddleware] Error:`, error);

      return {
        proceed: false,
        error: {
          statusCode: 500,
          message: error instanceof Error ? error.message : "Authorization error",
          code: "AUTH-014",
        },
      };
    }
  };
}

// =============================================================================
// COMBINED MIDDLEWARE
// =============================================================================

/**
 * Create combined auth + RBAC middleware
 *
 * Convenience function that combines authentication and authorization.
 *
 * @example
 * ```typescript
 * const protectedMiddleware = await createProtectedMiddleware({
 *   auth: {
 *     provider: 'auth0',
 *     providerConfig: { type: 'auth0', domain: '...', clientId: '...' },
 *   },
 *   rbac: {
 *     roles: ['admin'],
 *   },
 * });
 *
 * const result = await protectedMiddleware(context);
 * ```
 */
export async function createProtectedMiddleware(config: {
  auth: AuthMiddlewareConfig;
  rbac?: RBACMiddlewareConfig;
}): Promise<MiddlewareHandler<AuthRequestContext>> {
  const authMiddleware = await createAuthMiddleware(config.auth);
  const rbacMiddleware = config.rbac ? createRBACMiddleware(config.rbac) : null;

  return async (context: AuthRequestContext): Promise<MiddlewareResult> => {
    // Run auth middleware
    const authResult = await authMiddleware(context);

    if (!authResult.proceed) {
      return authResult;
    }

    // If no RBAC or no authenticated context, return auth result
    if (!rbacMiddleware || !authResult.context) {
      return authResult;
    }

    // Run RBAC middleware
    return rbacMiddleware(authResult.context);
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a path matches public routes
 */
function isPublicRoute(path: string, publicRoutes?: string[]): boolean {
  if (!publicRoutes || publicRoutes.length === 0) {
    return false;
  }

  const normalizedPath = path.replace(/\/$/, "") || "/";

  for (const route of publicRoutes) {
    // Exact match
    if (route === normalizedPath) {
      return true;
    }

    // Wildcard match (e.g., '/public/*')
    if (route.endsWith("*")) {
      const prefix = route.slice(0, -1);
      if (normalizedPath.startsWith(prefix)) {
        return true;
      }
    }

    // Pattern match with path segments
    if (route.includes(":")) {
      const routeParts = route.split("/");
      const pathParts = normalizedPath.split("/");

      if (routeParts.length === pathParts.length) {
        const matches = routeParts.every((part, i) => {
          return part.startsWith(":") || part === pathParts[i];
        });
        if (matches) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Create request context from standard request object
 */
export function createRequestContext(req: {
  method?: string;
  url?: string;
  path?: string;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  ip?: string;
}): AuthRequestContext {
  return {
    method: req.method ?? "GET",
    path: req.path ?? req.url ?? "/",
    headers: req.headers ?? {},
    cookies: req.cookies,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.headers?.["user-agent"] as string | undefined,
  };
}

/**
 * Create Express-compatible middleware
 */
export async function createExpressAuthMiddleware(config: AuthMiddlewareConfig): Promise<ExpressMiddleware> {
  const middleware = await createAuthMiddleware(config);

  return async (req: any, res: any, next: NextFunction): Promise<void> => {
    const context = createRequestContext(req);
    const result = await middleware(context);

    if (result.proceed) {
      // Attach user to request
      if (result.context) {
        req.user = result.context.user;
        req.authContext = result.context;
      }
      next();
    } else {
      res.status(result.error?.statusCode ?? 401).json({
        error: result.error?.message ?? "Unauthorized",
        code: result.error?.code,
      });
    }
  };
}

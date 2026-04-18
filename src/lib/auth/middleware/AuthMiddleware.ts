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
import { withTimeout } from "../../utils/async/withTimeout.js";
import { logger } from "../../utils/logger.js";
import { AuthProviderFactory } from "../AuthProviderFactory.js";
import type {
  AuthErrorCode,
  AuthErrorInfo,
  AuthMiddlewareConfig,
  AuthMiddlewareHandler,
  AuthMiddlewareResult,
  AuthRequestContext,
  AuthenticatedContext,
  AuthorizationResult,
  ExpressMiddleware,
  IncomingRequest,
  NextFunction,
  OutgoingResponse,
  RBACMiddlewareConfig,
  TokenExtractionConfig,
} from "../../types/index.js";

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
export const AuthMiddlewareError = createErrorFactory(
  "AuthMiddleware",
  AuthMiddlewareErrorCodes,
);

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create an AuthErrorInfo object for the onError callback.
 *
 * Avoids `as any` by constructing a proper Error with the required `code` field.
 */
function createAuthErrorInfo(
  message: string,
  code: AuthErrorCode,
): AuthErrorInfo {
  const err = new Error(message) as AuthErrorInfo;
  err.code = code;
  return err;
}

// =============================================================================
// TYPES
// =============================================================================

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
      if (!prefix) {
        // If no prefix required, return as-is
        return value;
      }
      // Compare scheme case-insensitively per RFC 7235
      const prefixWithSpace = `${prefix} `;
      if (
        value.length > prefixWithSpace.length &&
        value.slice(0, prefixWithSpace.length).toLowerCase() ===
          prefixWithSpace.toLowerCase()
      ) {
        return value.slice(prefixWithSpace.length);
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
): Promise<AuthMiddlewareHandler<AuthRequestContext>> {
  // Create provider instance
  const provider = await AuthProviderFactory.createProvider(
    config.provider,
    config.providerConfig,
  );

  logger.debug(
    `[AuthMiddleware] Created middleware with ${config.provider} provider`,
  );

  return async (context: AuthRequestContext): Promise<AuthMiddlewareResult> => {
    try {
      // Check if route is public
      if (isPublicRoute(context.path ?? "", config.publicRoutes)) {
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
            createAuthErrorInfo(error.message, error.code),
            context,
          );
        }

        return { proceed: false, error };
      }

      // Validate token (with 5s timeout to prevent hanging on slow providers)
      const validationResult = await withTimeout(
        provider.authenticateToken(token),
        5000,
        "Token authentication timed out after 5000ms",
      );

      if (!validationResult.valid) {
        // If auth is optional, proceed without user
        if (config.optional) {
          return { proceed: true };
        }

        const errorCode: AuthErrorCode =
          validationResult.errorCode ?? "AUTH-001";
        const error = {
          statusCode: 401,
          message: validationResult.error ?? "Invalid token",
          code: errorCode,
        };

        if (config.onError) {
          await config.onError(
            createAuthErrorInfo(error.message, error.code),
            context,
          );
        }

        return { proceed: false, error };
      }

      // Fail closed: valid token without a user object is treated as failure
      if (!validationResult.user) {
        const error = {
          statusCode: 401,
          message: "Token valid but no user identity resolved",
          code: "AUTH-001" as AuthErrorCode,
        };

        if (config.onError) {
          await config.onError(
            createAuthErrorInfo(error.message, error.code),
            context,
          );
        }

        return { proceed: false, error };
      }

      // Create authenticated context
      // Providers populate `payload` (most) or `claims` (Cognito, Keycloak).
      // Prefer `payload`, fall back to `claims` for compatibility.
      const authenticatedContext: AuthenticatedContext = {
        ...context,
        user: validationResult.user,
        token,
        claims:
          (validationResult.payload as AuthenticatedContext["claims"]) ??
          validationResult.claims,
      };

      // Call success hook
      if (config.onAuthenticated) {
        await config.onAuthenticated(authenticatedContext);
      }

      logger.debug(
        `[AuthMiddleware] Authenticated user: ${validationResult.user?.id}`,
      );

      return { proceed: true, context: authenticatedContext };
    } catch (error) {
      logger.error(`[AuthMiddleware] Error:`, error);

      const errorResult = {
        statusCode: 500,
        message:
          error instanceof Error ? error.message : "Authentication error",
        code: "AUTH-014" as AuthErrorCode,
      };

      if (config.onError) {
        await config.onError(
          createAuthErrorInfo(errorResult.message, errorResult.code),
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
export function createRBACMiddleware(
  config: RBACMiddlewareConfig,
): AuthMiddlewareHandler<AuthenticatedContext> {
  return async (
    context: AuthenticatedContext,
  ): Promise<AuthMiddlewareResult> => {
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

      // Super admin roles bypass all role/permission checks
      const superAdminRoles = config.superAdminRoles ?? [];
      if (
        superAdminRoles.length > 0 &&
        user.roles.some((r) => superAdminRoles.includes(r))
      ) {
        logger.debug(
          `[RBACMiddleware] Super admin bypass for user: ${user.id}`,
        );
        return { proceed: true, context };
      }

      // Build effective permissions from rolePermissions mapping and
      // role hierarchy so that checks below consider inherited grants.
      const effectivePermissions = new Set(user.permissions);
      const rolePermissions = config.rolePermissions ?? {};
      const roleHierarchy = config.roleHierarchy ?? {};

      const expandRoles = (roles: string[]): string[] => {
        const expanded = new Set<string>();
        const queue = [...roles];
        while (queue.length > 0) {
          const role = queue.pop();
          if (role === undefined || expanded.has(role)) {
            continue;
          }
          expanded.add(role);
          const children = roleHierarchy[role];
          if (children) {
            queue.push(...children);
          }
        }
        return [...expanded];
      };

      const allRoles = expandRoles(user.roles);
      for (const role of allRoles) {
        const perms = rolePermissions[role];
        if (perms) {
          for (const p of perms) {
            effectivePermissions.add(p);
          }
        }
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

      // Check roles (includes inherited roles from hierarchy)
      if (config.roles && config.roles.length > 0) {
        const userRolesSet = new Set(allRoles);
        const hasRequiredRoles = config.requireAllRoles
          ? config.roles.every((r) => userRolesSet.has(r))
          : config.roles.some((r) => userRolesSet.has(r));

        if (!hasRequiredRoles) {
          const missingRoles = config.roles.filter((r) => !userRolesSet.has(r));
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

      // Check permissions (all required; uses effective permissions from role mapping)
      if (config.permissions && config.permissions.length > 0) {
        const missingPermissions = config.permissions.filter(
          (p) => !effectivePermissions.has(p),
        );

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
          message:
            error instanceof Error ? error.message : "Authorization error",
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
}): Promise<AuthMiddlewareHandler<AuthRequestContext>> {
  const authMiddleware = await createAuthMiddleware(config.auth);
  const rbacMiddleware = config.rbac ? createRBACMiddleware(config.rbac) : null;

  return async (context: AuthRequestContext): Promise<AuthMiddlewareResult> => {
    // Run auth middleware
    const authResult = await authMiddleware(context);

    if (!authResult.proceed) {
      return authResult;
    }

    // If no RBAC configured, return auth result as-is
    if (!rbacMiddleware) {
      return authResult;
    }

    // Build the context for RBAC. When auth is optional and no token was
    // provided, authResult.context is undefined. We still need to run RBAC
    // so that role/permission checks are not silently bypassed. Pass a
    // context without a user — the RBAC middleware already handles the
    // missing-user case and returns a 401.
    const rbacContext =
      authResult.context ?? (context as unknown as AuthenticatedContext);

    // Run RBAC middleware
    return rbacMiddleware(rbacContext);
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

  // Strip query string before matching
  const pathWithoutQuery = path.split("?")[0];
  const normalizedPath = pathWithoutQuery.replace(/\/$/, "") || "/";

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
export function createRequestContext(req: IncomingRequest): AuthRequestContext {
  return {
    method: req.method ?? "GET",
    path: req.path ?? req.url ?? "/",
    headers: req.headers ?? {},
    cookies: req.cookies,
    query: req.query,
    body: req.body,
    ip: req.ip,
    ipAddress: req.ip,
    userAgent: req.headers?.["user-agent"] as string | undefined,
  };
}

/**
 * Create Express-compatible middleware
 */
export async function createExpressAuthMiddleware(
  config: AuthMiddlewareConfig,
): Promise<ExpressMiddleware> {
  const middleware = await createAuthMiddleware(config);

  return async (
    req: IncomingRequest,
    res: OutgoingResponse,
    next: NextFunction,
  ): Promise<void> => {
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

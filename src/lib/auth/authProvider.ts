// src/lib/auth/authProvider.ts

import type {
  AuthProviderConfig,
  AuthProviderType,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthorizationResult,
  AuthRequestContext,
  AuthenticatedContext,
  AuthHealthCheck,
  MastraAuthProvider,
} from "../types/authTypes.js";
import { EventEmitter } from "events";

/**
 * Abstract base class implementing common auth provider functionality
 *
 * Provides default implementations for:
 * - Token extraction from request context
 * - Authorization by permission and role
 * - Request authentication flow
 * - Health check
 *
 * Subclasses must implement:
 * - authenticateToken
 * - createSession
 * - getSession
 * - refreshSession
 * - destroySession
 * - getUserSessions
 * - destroyAllUserSessions
 *
 * @example
 * ```typescript
 * class MyAuthProvider extends BaseAuthProvider {
 *   readonly type = "custom" as const;
 *
 *   async authenticateToken(token: string): Promise<TokenValidationResult> {
 *     // Custom token validation logic
 *   }
 *   // ... implement other abstract methods
 * }
 * ```
 */
export abstract class BaseAuthProvider implements MastraAuthProvider {
  abstract readonly type: AuthProviderType;
  readonly config: AuthProviderConfig;
  protected emitter = new EventEmitter();

  constructor(config: AuthProviderConfig) {
    this.config = {
      required: true,
      tokenExtraction: {
        fromHeader: { name: "Authorization", scheme: "Bearer" },
      },
      ...config,
    };
  }

  /**
   * Extract token using configured strategy
   *
   * Attempts extraction in order:
   * 1. Header (Authorization: Bearer <token>)
   * 2. Cookie
   * 3. Query parameter
   * 4. Custom function
   *
   * @param context - Request context containing headers, cookies, etc.
   * @returns Extracted token or null if not found
   */
  extractToken(context: AuthRequestContext): string | null {
    const strategy = this.config.tokenExtraction;

    // Try header extraction
    if (strategy?.fromHeader) {
      const headerName = strategy.fromHeader.name.toLowerCase();
      const headerValue = context.headers[headerName];

      if (typeof headerValue === "string") {
        if (strategy.fromHeader.scheme) {
          const prefix = `${strategy.fromHeader.scheme} `;
          if (headerValue.startsWith(prefix)) {
            return headerValue.slice(prefix.length);
          }
        } else {
          return headerValue;
        }
      }
    }

    // Try cookie extraction
    if (strategy?.fromCookie && context.cookies) {
      const cookieValue = context.cookies[strategy.fromCookie.name];
      if (cookieValue) {
        return cookieValue;
      }
    }

    // Try query parameter extraction
    if (strategy?.fromQuery && context.path) {
      try {
        const url = new URL(context.path, "http://localhost");
        const queryValue = url.searchParams.get(strategy.fromQuery.name);
        if (queryValue) {
          return queryValue;
        }
      } catch {
        // Invalid URL, skip query extraction
      }
    }

    // Try custom extraction
    if (strategy?.custom) {
      return strategy.custom(context);
    }

    return null;
  }

  /**
   * Default authorization by permission
   *
   * Checks if user has the permission directly or via wildcards.
   * Supports permission hierarchy (e.g., "tools:*" includes "tools:execute")
   *
   * @param user - The authenticated user
   * @param permission - Required permission
   * @returns Authorization result
   */
  async authorizeUser(
    user: AuthUser,
    permission: string,
  ): Promise<AuthorizationResult> {
    // Check if user has the permission directly
    if (user.permissions.includes(permission)) {
      return { authorized: true };
    }

    // Check if user has wildcard permission
    if (user.permissions.includes("*")) {
      return { authorized: true };
    }

    // Check permission hierarchy (e.g., "tools:*" includes "tools:execute")
    const permissionParts = permission.split(":");
    for (let i = permissionParts.length - 1; i > 0; i--) {
      const wildcardPermission = [...permissionParts.slice(0, i), "*"].join(
        ":",
      );
      if (user.permissions.includes(wildcardPermission)) {
        return { authorized: true };
      }
    }

    return {
      authorized: false,
      reason: `User lacks permission: ${permission}`,
      missingPermissions: [permission],
    };
  }

  /**
   * Authorization by roles
   *
   * Checks if user has any of the required roles.
   * Supports role hierarchy if configured.
   *
   * @param user - The authenticated user
   * @param roles - Required roles (any of)
   * @returns Authorization result
   */
  async authorizeRoles(
    user: AuthUser,
    roles: string[],
  ): Promise<AuthorizationResult> {
    const hasRole = roles.some((role) => user.roles.includes(role));

    if (hasRole) {
      return { authorized: true };
    }

    // Check role hierarchy if configured
    if (this.config.rbac?.roleHierarchy) {
      for (const userRole of user.roles) {
        const inheritedRoles = this.config.rbac.roleHierarchy[userRole] || [];
        if (roles.some((role) => inheritedRoles.includes(role))) {
          return { authorized: true };
        }
      }
    }

    return {
      authorized: false,
      reason: `User lacks required role(s): ${roles.join(", ")}`,
      missingRoles: roles.filter((r) => !user.roles.includes(r)),
    };
  }

  /**
   * Authorization by multiple permissions (all required)
   *
   * @param user - The authenticated user
   * @param permissions - Required permissions (all of)
   * @returns Authorization result
   */
  async authorizePermissions(
    user: AuthUser,
    permissions: string[],
  ): Promise<AuthorizationResult> {
    const missing: string[] = [];

    for (const permission of permissions) {
      const result = await this.authorizeUser(user, permission);
      if (!result.authorized) {
        missing.push(permission);
      }
    }

    if (missing.length === 0) {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: `User lacks permissions: ${missing.join(", ")}`,
      missingPermissions: missing,
    };
  }

  /**
   * Full request authentication flow
   *
   * Combines token extraction, validation, and session creation.
   *
   * @param context - Request context
   * @returns Authenticated context with user and session, or null if authentication fails
   */
  async authenticateRequest(
    context: AuthRequestContext,
  ): Promise<AuthenticatedContext | null> {
    // Extract token
    const token = this.extractToken(context);

    if (!token) {
      if (!this.config.required) {
        return null;
      }
      this.emitter.emit("auth:unauthorized", context, "No token provided");
      return null;
    }

    // Validate token
    const validation = await this.authenticateToken(token, context);

    if (!validation.valid || !validation.user) {
      this.emitter.emit(
        "auth:unauthorized",
        context,
        validation.error || "Invalid token",
      );
      return null;
    }

    // Get or create session
    const session = await this.createSession(validation.user, context);

    return {
      user: validation.user,
      session,
      request: context,
      authenticatedAt: new Date(),
      provider: this.type,
    };
  }

  /**
   * Default health check implementation
   *
   * Subclasses should override to check provider-specific health
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    return {
      healthy: true,
      providerConnected: true,
      sessionStorageHealthy: true,
    };
  }

  /**
   * Subscribe to auth events
   *
   * @param event - Event name
   * @param listener - Event handler
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from auth events
   *
   * @param event - Event name
   * @param listener - Event handler
   */
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Emit an auth event
   *
   * @param event - Event name
   * @param args - Event arguments
   */
  protected emit(event: string, ...args: unknown[]): void {
    this.emitter.emit(event, ...args);
  }

  // ===================
  // Abstract Methods
  // ===================

  /**
   * Validate and decode an authentication token
   * Must be implemented by subclasses
   */
  abstract authenticateToken(
    token: string,
    context?: AuthRequestContext,
  ): Promise<TokenValidationResult>;

  /**
   * Create a new session for a user
   * Must be implemented by subclasses
   */
  abstract createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession>;

  /**
   * Get an existing session by ID
   * Must be implemented by subclasses
   */
  abstract getSession(sessionId: string): Promise<AuthSession | null>;

  /**
   * Refresh/extend a session
   * Must be implemented by subclasses
   */
  abstract refreshSession(sessionId: string): Promise<AuthSession | null>;

  /**
   * Invalidate/destroy a session
   * Must be implemented by subclasses
   */
  abstract destroySession(sessionId: string): Promise<void>;

  /**
   * Get all active sessions for a user
   * Must be implemented by subclasses
   */
  abstract getUserSessions(userId: string): Promise<AuthSession[]>;

  /**
   * Invalidate all sessions for a user (global logout)
   * Must be implemented by subclasses
   */
  abstract destroyAllUserSessions(userId: string): Promise<void>;
}

// Re-export the type for convenience
export type { MastraAuthProvider };

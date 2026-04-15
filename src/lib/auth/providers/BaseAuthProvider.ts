/**
 * BaseAuthProvider - Abstract base class for authentication providers
 *
 * Provides common functionality for all auth providers including:
 * - Token extraction (header, cookie, query param, custom function)
 * - Session management (create, validate, refresh, revoke)
 * - RBAC authorization (roles, permissions, wildcards, hierarchy)
 * - Token validation utilities (JWT parsing, expiry checks)
 * - Event emission for auth lifecycle hooks
 * - Error handling via unified AuthError factory
 */

import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import type {
  JsonValue,
  AuthenticatedContext,
  AuthErrorCode,
  AuthHealthCheck,
  AuthorizationResult,
  AuthProviderConfig,
  AuthProviderType,
  AuthRequestContext,
  AuthSession,
  AuthUser,
  AuthProvider,
  RBACConfig,
  SessionConfig,
  SessionStorage,
  SessionValidationResult,
  TokenClaims,
  TokenValidationResult,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { AuthError } from "../errors.js";
// =============================================================================
// BACKWARD-COMPAT RE-EXPORTS
// =============================================================================

/**
 * @deprecated Use `AuthError` from `../errors.js` instead.
 * Kept for backward compatibility with CognitoProvider / KeycloakProvider.
 */
export const AuthProviderError = AuthError;

// =============================================================================
// IN-MEMORY SESSION STORAGE
// =============================================================================

/**
 * Default in-memory session storage
 */
export class InMemorySessionStorage implements SessionStorage {
  private sessions = new Map<string, AuthSession>();
  private userSessions = new Map<string, Set<string>>();

  async get(sessionId: string): Promise<AuthSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async save(session: AuthSession): Promise<void> {
    this.sessions.set(session.id, session);

    // Track sessions by user
    const userSessionSet = this.userSessions.get(session.user.id) ?? new Set();
    userSessionSet.add(session.id);
    this.userSessions.set(session.user.id, userSessionSet);
  }

  async delete(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);

      // Remove from user tracking
      const userSessionSet = this.userSessions.get(session.user.id);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
        if (userSessionSet.size === 0) {
          this.userSessions.delete(session.user.id);
        }
      }
    }
  }

  async deleteAllForUser(userId: string): Promise<void> {
    const userSessionSet = this.userSessions.get(userId);
    if (userSessionSet) {
      for (const sessionId of userSessionSet) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
    }
  }

  async getForUser(userId: string): Promise<AuthSession[]> {
    const userSessionSet = this.userSessions.get(userId);
    if (!userSessionSet) {
      return [];
    }

    const now = Date.now();
    const sessions: AuthSession[] = [];
    const expiredIds: string[] = [];
    for (const sessionId of userSessionSet) {
      const session = this.sessions.get(sessionId);
      if (!session) {
        continue;
      }
      // Filter out expired and revoked sessions so maxSessionsPerUser counts are accurate
      if (session.expiresAt && session.expiresAt.getTime() < now) {
        expiredIds.push(sessionId);
        continue;
      }
      if (!session.isValid) {
        expiredIds.push(sessionId);
        continue;
      }
      sessions.push(session);
    }

    // Clean up expired sessions lazily
    for (const id of expiredIds) {
      this.sessions.delete(id);
      userSessionSet.delete(id);
    }
    if (userSessionSet.size === 0) {
      this.userSessions.delete(userId);
    }

    return sessions;
  }

  async exists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  async touch(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
      this.sessions.set(sessionId, session);
    }
  }

  async clear(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
  }

  /**
   * Get session count (for testing/monitoring)
   */
  get size(): number {
    return this.sessions.size;
  }
}

// =============================================================================
// BASE PROVIDER IMPLEMENTATION
// =============================================================================

/**
 * BaseAuthProvider - Abstract base class for all auth providers
 *
 * Subclasses must implement:
 * - authenticateToken() - Validate and decode JWT/access tokens
 *
 * Optionally override:
 * - getUser() - Fetch user by ID from provider
 * - updateUserRoles() - Update user roles in provider
 * - updateUserPermissions() - Update user permissions in provider
 * - dispose() - Clean up resources
 */
export abstract class BaseAuthProvider implements AuthProvider {
  abstract readonly type: AuthProviderType;
  readonly config: AuthProviderConfig;

  protected sessionStorage: SessionStorage;
  protected sessionConfig: SessionConfig;
  protected rbacConfig: RBACConfig;
  protected emitter = new EventEmitter();

  constructor(config: AuthProviderConfig) {
    // Deep-merge tokenExtraction: preserve header defaults when partial config given
    const defaultTokenExtraction = {
      fromHeader: { name: "Authorization", scheme: "Bearer" },
    };

    this.config = {
      required: true,
      ...config,
      tokenExtraction: {
        ...defaultTokenExtraction,
        ...config.tokenExtraction,
      },
    };

    // Initialize session configuration
    this.sessionConfig = {
      storage: "memory",
      duration: 3600, // 1 hour default
      autoRefresh: true,
      refreshThreshold: 300, // 5 minutes
      allowMultipleSessions: true,
      maxSessionsPerUser: 10,
      prefix: "neurolink:session:",
      ...config.session,
    };

    // Initialize RBAC configuration
    this.rbacConfig = {
      enabled: true,
      defaultRoles: [],
      roleHierarchy: {},
      rolePermissions: {},
      superAdminRoles: ["super_admin", "root"],
      ...config.rbac,
    };

    // Initialize session storage
    this.sessionStorage =
      config.session?.customStorage ?? new InMemorySessionStorage();

    logger.debug(`[BaseAuthProvider] Initialized`);
  }

  // ===========================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ===========================================================================

  /**
   * Validate and authenticate a token
   * Subclasses must implement provider-specific token validation
   */
  abstract authenticateToken(
    token: string,
    context?: AuthRequestContext,
  ): Promise<TokenValidationResult>;

  // ===========================================================================
  // TOKEN EXTRACTION
  // ===========================================================================

  /**
   * Extract token using configured strategy
   *
   * Attempts extraction in order:
   * 1. Header (Authorization: Bearer <token> by default)
   * 2. Cookie
   * 3. Query parameter
   * 4. Custom function
   *
   * @param context - Request context containing headers, cookies, etc.
   * @returns Extracted token or null if not found
   */
  async extractToken(context: AuthRequestContext): Promise<string | null> {
    const strategy = this.config.tokenExtraction;

    // Try header extraction (case-insensitive header lookup)
    if (strategy?.fromHeader) {
      const headerName = strategy.fromHeader.name.toLowerCase();

      // Find header value with case-insensitive lookup
      let headerValue: string | undefined;
      for (const [key, value] of Object.entries(context.headers)) {
        if (key.toLowerCase() === headerName && typeof value === "string") {
          headerValue = value;
          break;
        }
      }

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

    // Try custom extraction (may be sync or async)
    if (strategy?.custom) {
      return await Promise.resolve(strategy.custom(context));
    }

    return null;
  }

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  /**
   * Create a new session for an authenticated user
   *
   * Session duration and metadata are derived from `this.sessionConfig` and
   * the optional `context`. This matches the `AuthSessionManager` type
   * signature: `createSession(user, context?)`.
   */
  async createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession> {
    const now = new Date();
    const duration = this.sessionConfig.duration ?? 3600;

    // Check session limits
    if (!this.sessionConfig.allowMultipleSessions) {
      await this.revokeAllSessions(user.id);
    } else if (this.sessionConfig.maxSessionsPerUser) {
      const existingSessions = await this.sessionStorage.getForUser(user.id);
      if (existingSessions.length >= this.sessionConfig.maxSessionsPerUser) {
        // Remove oldest session
        const oldestSession = existingSessions.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        )[0];
        if (oldestSession) {
          await this.sessionStorage.delete(oldestSession.id);
        }
      }
    }

    const session: AuthSession = {
      id: randomUUID(),
      user,
      accessToken: randomUUID(), // Internal session token
      isValid: true,
      expiresAt: new Date(now.getTime() + duration * 1000),
      createdAt: now,
      lastActivityAt: now,
      ipAddress: context?.ip ?? context?.ipAddress,
      userAgent: context?.userAgent,
    };

    await this.sessionStorage.save(session);

    logger.debug(
      `[BaseAuthProvider] Created session ${session.id} for user ${user.id}`,
    );

    return session;
  }

  /**
   * Validate an existing session
   */
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const session = await this.sessionStorage.get(sessionId);

    if (!session) {
      return {
        valid: false,
        error: "Session not found",
        errorCode: "AUTH-010" as AuthErrorCode,
      };
    }

    // Check expiration
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      await this.sessionStorage.delete(sessionId);
      return {
        valid: false,
        error: "Session expired",
        errorCode: "AUTH-011" as AuthErrorCode,
      };
    }

    // Check if revoked
    if (!session.isValid) {
      return {
        valid: false,
        error: "Session revoked",
        errorCode: "AUTH-012" as AuthErrorCode,
      };
    }

    // Auto-refresh if near expiration
    let refreshed = false;
    if (
      this.sessionConfig.autoRefresh &&
      this.sessionConfig.refreshThreshold &&
      session.expiresAt &&
      session.expiresAt.getTime() - Date.now() <
        this.sessionConfig.refreshThreshold * 1000
    ) {
      const refreshedSession = await this.refreshSession(sessionId);
      refreshed = true;
      return {
        valid: true,
        session: refreshedSession ?? undefined,
        refreshed,
      };
    }

    // Update last activity
    await this.sessionStorage.touch(sessionId);

    return {
      valid: true,
      session,
      refreshed,
    };
  }

  /**
   * Refresh a session (extend expiration)
   */
  async refreshSession(sessionId: string): Promise<AuthSession> {
    const session = await this.sessionStorage.get(sessionId);

    if (!session) {
      throw AuthError.create(
        "SESSION_NOT_FOUND",
        `Session not found: ${sessionId}`,
        { details: { sessionId } },
      );
    }

    // Don't refresh revoked sessions
    if (!session.isValid) {
      throw AuthError.create(
        "SESSION_REVOKED",
        `Cannot refresh revoked session: ${sessionId}`,
        { details: { sessionId } },
      );
    }

    // Don't refresh expired sessions
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
      await this.sessionStorage.delete(sessionId);
      throw AuthError.create(
        "SESSION_EXPIRED",
        `Cannot refresh expired session: ${sessionId}`,
        { details: { sessionId } },
      );
    }

    const duration = this.sessionConfig.duration ?? 3600;
    session.expiresAt = new Date(Date.now() + duration * 1000);
    session.lastActivityAt = new Date();

    await this.sessionStorage.save(session);

    logger.debug(`[BaseAuthProvider] Refreshed session ${sessionId}`);

    return session;
  }

  /**
   * Revoke a session
   *
   * Marks the session as invalid rather than deleting it immediately.
   * This keeps a tombstone so that "revoked" is distinguishable from
   * "not found" during subsequent validation attempts.
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.sessionStorage.get(sessionId);

    if (session) {
      session.isValid = false;
      await this.sessionStorage.save(session);

      logger.debug(`[BaseAuthProvider] Revoked session ${sessionId}`);
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionStorage.deleteAllForUser(userId);
    logger.debug(`[BaseAuthProvider] Revoked all sessions for user ${userId}`);
  }

  // ===========================================================================
  // AUTHORIZATION (RBAC)
  // ===========================================================================

  /**
   * Check if a user is authorized for specific roles/permissions
   */
  async authorize(
    user: AuthUser,
    options: {
      roles?: string[];
      permissions?: string[];
      requireAllRoles?: boolean;
    },
  ): Promise<AuthorizationResult> {
    // Check if RBAC is enabled
    if (!this.rbacConfig.enabled) {
      return { authorized: true, user };
    }

    // Super admin bypass
    if (this.isSuperAdmin(user)) {
      return { authorized: true, user };
    }

    const result: AuthorizationResult = {
      authorized: true,
      user,
      requiredRoles: options.roles,
      requiredPermissions: options.permissions,
      missingRoles: [],
      missingPermissions: [],
    };

    // Check roles
    if (options.roles && options.roles.length > 0) {
      const userRoles = this.getEffectiveRoles(user);
      const missingRoles = options.roles.filter((r) => !userRoles.has(r));

      if (options.requireAllRoles) {
        // All roles required
        if (missingRoles.length > 0) {
          result.authorized = false;
          result.missingRoles = missingRoles;
          result.reason = `Missing required roles: ${missingRoles.join(", ")}`;
        }
      } else {
        // Any role is sufficient
        const hasAnyRole = options.roles.some((r) => userRoles.has(r));
        if (!hasAnyRole) {
          result.authorized = false;
          result.missingRoles = options.roles;
          result.reason = `Missing any of required roles: ${options.roles.join(", ")}`;
        }
      }
    }

    // Check permissions (all required)
    if (options.permissions && options.permissions.length > 0) {
      const userPermissions = this.getEffectivePermissions(user);
      const missingPermissions = options.permissions.filter(
        (p) => !this.hasPermission(userPermissions, p),
      );

      if (missingPermissions.length > 0) {
        result.authorized = false;
        result.missingPermissions = missingPermissions;
        result.reason = result.reason
          ? `${result.reason}; Missing permissions: ${missingPermissions.join(", ")}`
          : `Missing required permissions: ${missingPermissions.join(", ")}`;
      }
    }

    return result;
  }

  /**
   * Check if user is a super admin
   */
  protected isSuperAdmin(user: AuthUser): boolean {
    const superAdminRoles = this.rbacConfig.superAdminRoles ?? [];
    return user.roles.some((r) => superAdminRoles.includes(r));
  }

  /**
   * Get effective roles including inherited roles from hierarchy (transitive)
   */
  protected getEffectiveRoles(user: AuthUser): Set<string> {
    const effectiveRoles = new Set<string>(user.roles);

    // Transitive closure: keep expanding until no new roles are added
    const hierarchy = this.rbacConfig.roleHierarchy ?? {};
    let added = true;
    while (added) {
      added = false;
      for (const role of effectiveRoles) {
        const inheritedRoles = hierarchy[role] ?? [];
        for (const inherited of inheritedRoles) {
          if (!effectiveRoles.has(inherited)) {
            effectiveRoles.add(inherited);
            added = true;
          }
        }
      }
    }

    return effectiveRoles;
  }

  /**
   * Get effective permissions including role-based permissions
   */
  protected getEffectivePermissions(user: AuthUser): Set<string> {
    const effectivePermissions = new Set<string>(user.permissions);

    // Add permissions from roles
    const rolePermissions = this.rbacConfig.rolePermissions ?? {};
    const effectiveRoles = this.getEffectiveRoles(user);

    for (const role of effectiveRoles) {
      const permissions = rolePermissions[role] ?? [];
      for (const permission of permissions) {
        effectivePermissions.add(permission);
      }
    }

    return effectivePermissions;
  }

  /**
   * Check if a permission set grants a given permission.
   * Supports exact match, global wildcard ("*"), and hierarchical wildcards
   * (e.g. "tools:*" grants "tools:execute").
   */
  private hasPermission(permissions: Set<string>, required: string): boolean {
    if (permissions.has(required)) {
      return true;
    }
    if (permissions.has("*")) {
      return true;
    }
    const parts = required.split(":");
    for (let i = parts.length - 1; i > 0; i--) {
      const wildcard = [...parts.slice(0, i), "*"].join(":");
      if (permissions.has(wildcard)) {
        return true;
      }
    }
    return false;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Parse JWT token (without validation)
   */
  protected parseJWT(token: string): TokenClaims | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = Buffer.from(payload, "base64url").toString("utf-8");
      return JSON.parse(decoded) as TokenClaims;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  protected isTokenExpired(claims: TokenClaims, clockTolerance = 0): boolean {
    if (!claims.exp) {
      return false; // No expiration claim
    }

    const now = Math.floor(Date.now() / 1000);
    return claims.exp + clockTolerance < now;
  }

  /**
   * Check if token is not yet valid
   */
  protected isTokenNotYetValid(
    claims: TokenClaims,
    clockTolerance = 0,
  ): boolean {
    if (!claims.nbf) {
      return false; // No nbf claim
    }

    const now = Math.floor(Date.now() / 1000);
    return claims.nbf - clockTolerance > now;
  }

  /**
   * Extract user from token claims
   */
  protected extractUserFromClaims(
    claims: TokenClaims,
    options?: {
      rolesClaimKey?: string;
      permissionsClaimKey?: string;
      idClaimKey?: string;
    },
  ): AuthUser {
    const rolesKey = options?.rolesClaimKey ?? "roles";
    const permissionsKey = options?.permissionsClaimKey ?? "permissions";
    const idKey = options?.idClaimKey ?? "sub";

    const roles = Array.isArray(claims[rolesKey])
      ? (claims[rolesKey] as string[])
      : (this.rbacConfig.defaultRoles ?? []);

    const permissions = Array.isArray(claims[permissionsKey])
      ? (claims[permissionsKey] as string[])
      : [];

    return {
      id: (claims[idKey] as string) ?? "",
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      roles,
      permissions,
      emailVerified: claims.email_verified,
      providerData: claims as Record<string, JsonValue>,
    };
  }

  // ===========================================================================
  // OPTIONAL METHODS (can be overridden by subclasses)
  // ===========================================================================

  /**
   * Get user by ID
   * Override in subclass if provider supports user lookup
   */
  async getUser?(_userId: string): Promise<AuthUser | null> {
    logger.debug(`[BaseAuthProvider] getUser not implemented for ${this.type}`);
    return null;
  }

  /**
   * Update user roles
   * Override in subclass if provider supports role updates.
   * Returns the user with updated roles.
   */
  async updateUserRoles?(_userId: string, _roles: string[]): Promise<AuthUser> {
    throw AuthError.create(
      "PROVIDER_ERROR",
      `updateUserRoles not supported by ${this.type} provider`,
    );
  }

  /**
   * Update user permissions
   * Override in subclass if provider supports permission updates.
   * Returns the user with updated permissions.
   */
  async updateUserPermissions?(
    _userId: string,
    _permissions: string[],
  ): Promise<AuthUser> {
    throw AuthError.create(
      "PROVIDER_ERROR",
      `updateUserPermissions not supported by ${this.type} provider`,
    );
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.sessionStorage.clear();
    logger.debug(`[BaseAuthProvider] Disposed ${this.type} provider`);
  }

  // ===========================================================================
  // METHODS FROM AuthProvider INTERFACE
  // ===========================================================================

  /**
   * Check if a user is authorized to perform an action
   */
  async authorizeUser(
    user: AuthUser,
    permission: string,
  ): Promise<AuthorizationResult> {
    return this.authorize(user, { permissions: [permission] });
  }

  /**
   * Check if user has specific roles
   */
  async authorizeRoles(
    user: AuthUser,
    roles: string[],
  ): Promise<AuthorizationResult> {
    return this.authorize(user, { roles });
  }

  /**
   * Check if user has all specified permissions
   */
  async authorizePermissions(
    user: AuthUser,
    permissions: string[],
  ): Promise<AuthorizationResult> {
    return this.authorize(user, { permissions });
  }

  /**
   * Get an existing session by ID
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    return this.sessionStorage.get(sessionId);
  }

  /**
   * Invalidate/destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    await this.revokeSession(sessionId);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    return this.sessionStorage.getForUser(userId);
  }

  /**
   * Invalidate all sessions for a user (global logout)
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    await this.revokeAllSessions(userId);
  }

  /**
   * Full request authentication flow
   *
   * Combines token extraction (with full strategy support), validation,
   * and session creation/reuse.
   *
   * @param context - Request context
   * @returns Authenticated context with user and session, or null
   */
  async authenticateRequest(
    context: AuthRequestContext,
  ): Promise<AuthenticatedContext | null> {
    // Extract token (async to support custom extractors)
    const token = await this.extractToken(context);

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
        validation.error ?? "Invalid token",
      );
      return null;
    }

    // Reuse existing session if one exists for this user
    const existingSessions = await this.getUserSessions(validation.user.id);
    const validSession = existingSessions.find(
      (s) => s.isValid && (!s.expiresAt || s.expiresAt.getTime() > Date.now()),
    );
    const session =
      validSession ?? (await this.createSession(validation.user, context));

    return {
      ...context,
      user: validation.user,
      session,
      request: context,
      authenticatedAt: new Date(),
      provider: this.type,
    };
  }

  /**
   * Check provider health
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    return {
      healthy: true,
      providerConnected: true,
      sessionStorageHealthy: true,
    };
  }

  // ===========================================================================
  // EVENT HELPERS
  // ===========================================================================

  /**
   * Subscribe to auth events
   */
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.on(event, listener);
  }

  /**
   * Unsubscribe from auth events
   */
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.off(event, listener);
  }

  /**
   * Emit an auth event
   */
  protected emit(event: string, ...args: unknown[]): void {
    this.emitter.emit(event, ...args);
  }
}

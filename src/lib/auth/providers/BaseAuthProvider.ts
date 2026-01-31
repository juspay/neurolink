/**
 * BaseAuthProvider - Abstract base class for authentication providers
 *
 * Provides common functionality for all auth providers including:
 * - Session management
 * - RBAC authorization
 * - Token validation utilities
 * - Error handling
 */

import { randomUUID } from "crypto";
import { createErrorFactory } from "../../core/infrastructure/baseError.js";
import type { JsonValue } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import type {
  AuthErrorCode,
  AuthorizationResult,
  AuthProviderConfig,
  AuthProviderType,
  AuthSession,
  AuthUser,
  MastraAuthProvider,
  RBACConfig,
  SessionConfig,
  SessionStorage,
  SessionValidationResult,
  TokenClaims,
  TokenValidationResult,
} from "../types/authTypes.js";

// =============================================================================
// ERROR FACTORY
// =============================================================================

/**
 * Auth provider error codes
 */
export const AuthProviderErrorCodes = {
  INVALID_TOKEN: "AUTH-001",
  EXPIRED_TOKEN: "AUTH-002",
  INVALID_CREDENTIALS: "AUTH-003",
  INVALID_SIGNATURE: "AUTH-004",
  MISSING_TOKEN: "AUTH-005",
  TOKEN_DECODE_FAILED: "AUTH-006",
  JWKS_FETCH_FAILED: "AUTH-007",
  SESSION_NOT_FOUND: "AUTH-008",
  SESSION_EXPIRED: "AUTH-009",
  SESSION_REVOKED: "AUTH-010",
  INSUFFICIENT_PERMISSIONS: "AUTH-011",
  INSUFFICIENT_ROLES: "AUTH-012",
  ACCESS_DENIED: "AUTH-013",
  PROVIDER_ERROR: "AUTH-014",
  CONFIGURATION_ERROR: "AUTH-015",
  RATE_LIMITED: "AUTH-016",
  USER_NOT_FOUND: "AUTH-017",
  USER_DISABLED: "AUTH-018",
  EMAIL_NOT_VERIFIED: "AUTH-019",
  MFA_REQUIRED: "AUTH-020",
} as const;

/**
 * Auth provider error factory
 */
export const AuthProviderError = createErrorFactory("AuthProvider", AuthProviderErrorCodes);

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

    const sessions: AuthSession[] = [];
    for (const sessionId of userSessionSet) {
      const session = this.sessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
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
export abstract class BaseAuthProvider implements MastraAuthProvider {
  abstract readonly type: AuthProviderType;
  readonly config: AuthProviderConfig;

  protected sessionStorage: SessionStorage;
  protected sessionConfig: SessionConfig;
  protected rbacConfig: RBACConfig;

  constructor(config: AuthProviderConfig) {
    this.config = config;

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
    this.sessionStorage = config.session?.customStorage ?? new InMemorySessionStorage();

    // Note: Cannot log this.type here as it's an abstract property
    logger.debug(`[BaseAuthProvider] Initialized`);
  }

  // ===========================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ===========================================================================

  /**
   * Validate and authenticate a token
   * Subclasses must implement provider-specific token validation
   */
  abstract authenticateToken(token: string): Promise<TokenValidationResult>;

  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================

  /**
   * Create a new session for an authenticated user
   */
  async createSession(
    user: AuthUser,
    options?: {
      expiresIn?: number;
      metadata?: Record<string, JsonValue>;
    },
  ): Promise<AuthSession> {
    const now = new Date();
    const duration = options?.expiresIn ?? this.sessionConfig.duration ?? 3600;

    // Check session limits
    if (!this.sessionConfig.allowMultipleSessions) {
      await this.revokeAllSessions(user.id);
    } else if (this.sessionConfig.maxSessionsPerUser) {
      const existingSessions = await this.sessionStorage.getForUser(user.id);
      if (existingSessions.length >= this.sessionConfig.maxSessionsPerUser) {
        // Remove oldest session
        const oldestSession = existingSessions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
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
      metadata: options?.metadata,
    };

    await this.sessionStorage.save(session);

    logger.debug(`[BaseAuthProvider] Created session ${session.id} for user ${user.id}`);

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
        errorCode: "AUTH-008" as AuthErrorCode,
      };
    }

    // Check expiration
    if (session.expiresAt.getTime() < Date.now()) {
      await this.sessionStorage.delete(sessionId);
      return {
        valid: false,
        error: "Session expired",
        errorCode: "AUTH-009" as AuthErrorCode,
      };
    }

    // Check if revoked
    if (!session.isValid) {
      return {
        valid: false,
        error: "Session revoked",
        errorCode: "AUTH-010" as AuthErrorCode,
      };
    }

    // Auto-refresh if near expiration
    let refreshed = false;
    if (
      this.sessionConfig.autoRefresh &&
      this.sessionConfig.refreshThreshold &&
      session.expiresAt.getTime() - Date.now() < this.sessionConfig.refreshThreshold * 1000
    ) {
      const refreshedSession = await this.refreshSession(sessionId);
      refreshed = true;
      return {
        valid: true,
        session: refreshedSession,
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
      throw AuthProviderError.create("SESSION_NOT_FOUND", `Session not found: ${sessionId}`, {
        details: { sessionId },
      });
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
   */
  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.sessionStorage.get(sessionId);

    if (session) {
      session.isValid = false;
      await this.sessionStorage.save(session);
      await this.sessionStorage.delete(sessionId);

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
      const missingPermissions = options.permissions.filter((p) => !userPermissions.has(p));

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
   * Get effective roles including inherited roles from hierarchy
   */
  protected getEffectiveRoles(user: AuthUser): Set<string> {
    const effectiveRoles = new Set<string>(user.roles);

    // Add inherited roles from hierarchy
    const hierarchy = this.rbacConfig.roleHierarchy ?? {};
    for (const role of user.roles) {
      const inheritedRoles = hierarchy[role] ?? [];
      for (const inherited of inheritedRoles) {
        effectiveRoles.add(inherited);
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
  protected isTokenNotYetValid(claims: TokenClaims, clockTolerance = 0): boolean {
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

    const permissions = Array.isArray(claims[permissionsKey]) ? (claims[permissionsKey] as string[]) : [];

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
  async getUser?(userId: string): Promise<AuthUser | null> {
    logger.debug(`[BaseAuthProvider] getUser not implemented for ${this.type}`);
    return null;
  }

  /**
   * Update user roles
   * Override in subclass if provider supports role updates
   */
  async updateUserRoles?(userId: string, roles: string[]): Promise<void> {
    throw AuthProviderError.create("PROVIDER_ERROR", `updateUserRoles not supported by ${this.type} provider`);
  }

  /**
   * Update user permissions
   * Override in subclass if provider supports permission updates
   */
  async updateUserPermissions?(userId: string, permissions: string[]): Promise<void> {
    throw AuthProviderError.create("PROVIDER_ERROR", `updateUserPermissions not supported by ${this.type} provider`);
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    await this.sessionStorage.clear();
    logger.debug(`[BaseAuthProvider] Disposed ${this.type} provider`);
  }
}

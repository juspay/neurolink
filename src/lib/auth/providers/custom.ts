// src/lib/auth/providers/custom.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  CustomAuthConfig,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { InvalidConfigurationError } from "../authErrors.js";

/**
 * Custom Authentication Provider
 *
 * Allows users to provide their own authentication logic through callback functions.
 * Useful for integrating with custom auth systems or implementing unique auth flows.
 *
 * Features:
 * - Custom token validation via callback
 * - Custom user fetching (optional)
 * - Custom session creation (optional)
 * - In-memory session management
 *
 * @example
 * ```typescript
 * const custom = new CustomAuthProvider({
 *   type: "custom",
 *   validateToken: async (token, context) => {
 *     // Your custom token validation logic
 *     const decoded = await myAuthService.verify(token);
 *     return {
 *       valid: !!decoded,
 *       user: decoded ? {
 *         id: decoded.sub,
 *         email: decoded.email,
 *         roles: decoded.roles || [],
 *         permissions: decoded.permissions || [],
 *       } : undefined,
 *     };
 *   },
 *   getUser: async (userId) => {
 *     // Your custom user fetching logic
 *     return myUserService.getById(userId);
 *   },
 * });
 *
 * const result = await custom.authenticateToken(token);
 * ```
 */
export class CustomAuthProvider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "custom" as const;

  private validateTokenFn: (
    token: string,
    context?: AuthRequestContext,
  ) => Promise<TokenValidationResult>;
  private getUserFn?: (userId: string) => Promise<AuthUser | null>;
  private createSessionFn?: (
    user: AuthUser,
    context?: AuthRequestContext,
  ) => Promise<AuthSession>;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & CustomAuthConfig) {
    super(config);

    if (!config.validateToken) {
      throw new InvalidConfigurationError(
        "Custom validateToken function is required",
        "custom",
        ["validateToken"],
      );
    }

    this.validateTokenFn = config.validateToken;
    this.getUserFn = config.getUser;
    this.createSessionFn = config.createSession;
  }

  /**
   * Validate token using custom function
   */
  async authenticateToken(
    token: string,
    context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    try {
      return await this.validateTokenFn(token, context);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new session
   * Uses custom function if provided, otherwise uses default implementation
   */
  async createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession> {
    // Use custom session creation if provided
    if (this.createSessionFn) {
      try {
        const session = await this.createSessionFn(user, context);
        // Still track in internal store for retrieval
        this.sessions.set(session.id, session);
        if (!this.userSessions.has(user.id)) {
          this.userSessions.set(user.id, new Set());
        }
        this.userSessions.get(user.id)!.add(session.id);
        this.emit("auth:login", user);
        return session;
      } catch (error) {
        logger.warn("Custom createSession failed, using default:", error);
      }
    }

    // Default session creation
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const duration = this.config.session?.duration || 3600;

    const session: AuthSession = {
      id: sessionId,
      user,
      createdAt: now,
      expiresAt: new Date(now.getTime() + duration * 1000),
      isValid: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);

    this.emit("auth:login", user);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await this.destroySession(sessionId);
      }
      return null;
    }

    return session;
  }

  /**
   * Refresh session
   */
  async refreshSession(sessionId: string): Promise<AuthSession | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const duration = this.config.session?.duration || 3600;
    session.expiresAt = new Date(Date.now() + duration * 1000);

    this.sessions.set(sessionId, session);
    this.emit("auth:tokenRefresh", session);

    return session;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      const userSessionSet = this.userSessions.get(session.user.id);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
      }
      this.sessions.delete(sessionId);
      this.emit("auth:logout", session.user.id);
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return [];
    }

    const sessions: AuthSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);

    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
      this.emit("auth:logout", userId);
    }
  }

  /**
   * Get user by ID using custom function
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    if (this.getUserFn) {
      try {
        return await this.getUserFn(userId);
      } catch (error) {
        logger.error("Custom getUser failed:", error);
        return null;
      }
    }

    // No custom user fetching, return null
    logger.warn("Custom getUser function not provided");
    return null;
  }

  /**
   * Health check - always healthy for custom provider
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    return {
      healthy: true,
      providerConnected: true,
      sessionStorageHealthy: true,
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
    logger.debug("Custom auth provider cleaned up");
  }
}

// src/lib/auth/providers/betterAuth.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  BetterAuthConfig,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import { InvalidConfigurationError } from "../authErrors.js";
import * as jose from "jose";

/**
 * Better Auth Provider
 *
 * Supports Better Auth, a self-hosted open-source authentication solution.
 * Validates session tokens and JWTs issued by Better Auth server.
 *
 * Features:
 * - JWT validation using HMAC secret
 * - Session validation via Better Auth API
 * - Social provider support (GitHub, Google, Discord)
 * - In-memory session management
 *
 * @example
 * ```typescript
 * const betterAuth = new BetterAuthProvider({
 *   type: "better-auth",
 *   secret: "your-better-auth-secret",
 *   baseUrl: "https://your-app.com"
 * });
 *
 * const result = await betterAuth.authenticateToken(sessionToken);
 * if (result.valid) {
 *   console.log("Authenticated user:", result.user);
 * }
 * ```
 */
export class BetterAuthProvider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "better-auth" as const;

  private secret: string;
  private baseUrl: string;
  private secretKey: Uint8Array;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & BetterAuthConfig) {
    super(config);

    if (!config.secret) {
      throw new InvalidConfigurationError(
        "Better Auth secret is required",
        "better-auth",
        ["secret"],
      );
    }
    if (!config.baseUrl) {
      throw new InvalidConfigurationError(
        "Better Auth baseUrl is required",
        "better-auth",
        ["baseUrl"],
      );
    }

    this.secret = config.secret;
    this.baseUrl = config.baseUrl.replace(/\/$/, ""); // Remove trailing slash
    this.secretKey = new TextEncoder().encode(this.secret);
  }

  /**
   * Validate Better Auth token (session or JWT)
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    // Try JWT validation first (if it looks like a JWT)
    if (token.includes(".") && token.split(".").length === 3) {
      const jwtResult = await this.validateJWT(token);
      if (jwtResult.valid) {
        return jwtResult;
      }
    }

    // Fall back to session validation via API
    return this.validateSession(token);
  }

  /**
   * Validate JWT using the secret
   */
  private async validateJWT(token: string): Promise<TokenValidationResult> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secretKey);

      const user: AuthUser = {
        id: payload.sub as string,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        picture: payload.picture as string | undefined,
        emailVerified: payload.email_verified as boolean | undefined,
        roles: (payload.roles as string[]) || [],
        permissions: (payload.permissions as string[]) || [],
        metadata: payload.metadata as Record<string, unknown>,
      };

      return {
        valid: true,
        payload: payload as unknown as Record<string, unknown>,
        user,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
        tokenType: "jwt",
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate session via Better Auth API
   */
  private async validateSession(
    sessionToken: string,
  ): Promise<TokenValidationResult> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(`${this.baseUrl}/api/auth/session`, {
        headers: {
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `Session validation failed: HTTP ${response.status}`,
        };
      }

      const session = (await response.json()) as {
        user?: Record<string, unknown>;
        session?: Record<string, unknown>;
      };

      if (!session.user) {
        return {
          valid: false,
          error: "Invalid session",
        };
      }

      const user: AuthUser = {
        id: session.user.id as string,
        email: session.user.email as string | undefined,
        name: session.user.name as string | undefined,
        picture: session.user.image as string | undefined,
        emailVerified: session.user.emailVerified as boolean | undefined,
        roles: (session.user.roles as string[]) || [],
        permissions: (session.user.permissions as string[]) || [],
        createdAt: session.user.createdAt
          ? new Date(session.user.createdAt as string)
          : undefined,
        metadata: session.user,
      };

      return {
        valid: true,
        payload: session as Record<string, unknown>,
        user,
        expiresAt: session.session?.expiresAt
          ? new Date(session.session.expiresAt as string)
          : undefined,
        tokenType: "session",
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const duration = this.config.session?.duration || 604800; // 7 days default

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

    const duration = this.config.session?.duration || 604800;
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
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      const proxyFetch = createProxyFetch();
      // Better Auth typically exposes session endpoint that we can check
      const response = await proxyFetch(`${this.baseUrl}/api/auth/session`);

      // Even a 401 means the endpoint is working
      const isReachable = response.status < 500;

      return {
        healthy: isReachable,
        providerConnected: isReachable,
        sessionStorageHealthy: true,
      };
    } catch (error) {
      return {
        healthy: false,
        providerConnected: false,
        sessionStorageHealthy: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
    logger.debug("Better Auth provider cleaned up");
  }
}

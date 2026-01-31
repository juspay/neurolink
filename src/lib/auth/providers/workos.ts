// src/lib/auth/providers/workos.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  WorkOSConfig,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import { InvalidConfigurationError, ProviderAPIError } from "../authErrors.js";
import * as jose from "jose";

/**
 * WorkOS Authentication Provider
 *
 * Supports WorkOS for enterprise SSO and user management.
 * Validates JWTs issued by WorkOS and fetches user information.
 *
 * Features:
 * - JWT validation using WorkOS JWKS
 * - SSO token validation
 * - Enterprise directory integration
 * - Organization support for multi-tenant apps
 * - In-memory session management
 *
 * @example
 * ```typescript
 * const workos = new WorkOSProvider({
 *   type: "workos",
 *   apiKey: "sk_...",
 *   clientId: "client_..."
 * });
 *
 * const result = await workos.authenticateToken(accessToken);
 * if (result.valid) {
 *   console.log("Authenticated user:", result.user);
 * }
 * ```
 */
export class WorkOSProvider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "workos" as const;

  private apiKey: string;
  private clientId: string;
  private organizationId?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & WorkOSConfig) {
    super(config);

    if (!config.apiKey) {
      throw new InvalidConfigurationError(
        "WorkOS API key is required",
        "workos",
        ["apiKey"],
      );
    }
    if (!config.clientId) {
      throw new InvalidConfigurationError(
        "WorkOS client ID is required",
        "workos",
        ["clientId"],
      );
    }

    this.apiKey = config.apiKey;
    this.clientId = config.clientId;
    this.organizationId = config.organizationId;
  }

  /**
   * Initialize JWKS for WorkOS token verification
   */
  async initialize(): Promise<void> {
    // WorkOS JWKS endpoint
    const jwksUrl = new URL("https://api.workos.com/sso/jwks");
    this.jwks = jose.createRemoteJWKSet(jwksUrl);
    logger.debug("WorkOS provider initialized");
  }

  /**
   * Validate WorkOS access token
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    if (!this.jwks) {
      await this.initialize();
    }

    try {
      // Verify the JWT
      const { payload } = await jose.jwtVerify(token, this.jwks!, {
        audience: this.clientId,
      });

      const user: AuthUser = {
        id: payload.sub as string,
        email: payload.email as string | undefined,
        name:
          (payload.first_name as string) && (payload.last_name as string)
            ? `${payload.first_name} ${payload.last_name}`.trim()
            : undefined,
        emailVerified: true, // WorkOS verifies emails via SSO
        roles: (payload.roles as string[]) || [],
        permissions: (payload.permissions as string[]) || [],
        organizationId: payload.org_id as string | undefined,
        metadata: {
          connection_id: payload.connection_id,
          connection_type: payload.connection_type,
          idp_id: payload.idp_id,
        },
      };

      return {
        valid: true,
        payload: payload as unknown as Record<string, unknown>,
        user,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
        tokenType: "jwt",
      };
    } catch {
      // If JWT validation fails, try session validation
      return this.validateSession(token);
    }
  }

  /**
   * Validate session via WorkOS API
   */
  private async validateSession(token: string): Promise<TokenValidationResult> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        "https://api.workos.com/user_management/authenticate",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_token: token,
            client_id: this.clientId,
          }),
        },
      );

      if (!response.ok) {
        return {
          valid: false,
          error: `Session validation failed: HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        user?: Record<string, unknown>;
        organization_id?: string;
      };

      if (!data.user) {
        return {
          valid: false,
          error: "User not found in session",
        };
      }

      const user: AuthUser = {
        id: data.user.id as string,
        email: data.user.email as string | undefined,
        name:
          (data.user.first_name as string) && (data.user.last_name as string)
            ? `${data.user.first_name} ${data.user.last_name}`.trim()
            : undefined,
        picture: data.user.profile_picture_url as string | undefined,
        emailVerified: data.user.email_verified as boolean | undefined,
        roles: [],
        permissions: [],
        organizationId: data.organization_id,
        createdAt: data.user.created_at
          ? new Date(data.user.created_at as string)
          : undefined,
        metadata: data.user,
      };

      return {
        valid: true,
        payload: data as Record<string, unknown>,
        user,
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
   * Get user by ID via WorkOS API
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://api.workos.com/user_management/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new ProviderAPIError(
          `WorkOS API returned ${response.status}`,
          "workos",
          response.status,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        id: data.id as string,
        email: data.email as string | undefined,
        name:
          (data.first_name as string) && (data.last_name as string)
            ? `${data.first_name} ${data.last_name}`.trim()
            : undefined,
        picture: data.profile_picture_url as string | undefined,
        emailVerified: data.email_verified as boolean | undefined,
        roles: [],
        permissions: [],
        createdAt: data.created_at
          ? new Date(data.created_at as string)
          : undefined,
        metadata: data,
      };
    } catch (error) {
      logger.error("Failed to fetch WorkOS user:", error);
      if (error instanceof ProviderAPIError) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get user by email via WorkOS API
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://api.workos.com/user_management/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new ProviderAPIError(
          `WorkOS API returned ${response.status}`,
          "workos",
          response.status,
        );
      }

      const result = (await response.json()) as {
        data?: Array<Record<string, unknown>>;
      };
      const users = result.data || [];

      if (users.length === 0) {
        return null;
      }

      const data = users[0];
      return {
        id: data.id as string,
        email: data.email as string | undefined,
        name:
          (data.first_name as string) && (data.last_name as string)
            ? `${data.first_name} ${data.last_name}`.trim()
            : undefined,
        picture: data.profile_picture_url as string | undefined,
        emailVerified: data.email_verified as boolean | undefined,
        roles: [],
        permissions: [],
        createdAt: data.created_at
          ? new Date(data.created_at as string)
          : undefined,
        metadata: data,
      };
    } catch (error) {
      logger.error("Failed to fetch WorkOS user by email:", error);
      if (error instanceof ProviderAPIError) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch("https://api.workos.com/sso/jwks");

      return {
        healthy: response.ok,
        providerConnected: response.ok,
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
    logger.debug("WorkOS provider cleaned up");
  }
}

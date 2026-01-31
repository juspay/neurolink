// src/lib/auth/providers/supabase.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  SupabaseConfig,
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
 * Supabase Authentication Provider
 *
 * Supports Supabase JWT validation and user management.
 * Can validate tokens locally with JWT secret or via Supabase API.
 *
 * Features:
 * - Local JWT validation with JWT secret
 * - API-based token validation
 * - User profile fetching (requires service role key)
 * - Role extraction from app_metadata
 * - In-memory session management
 *
 * @example
 * ```typescript
 * const supabase = new SupabaseAuthProvider({
 *   type: "supabase",
 *   url: "https://your-project.supabase.co",
 *   anonKey: "your-anon-key",
 *   jwtSecret: "your-jwt-secret" // Optional for local validation
 * });
 *
 * const result = await supabase.authenticateToken(accessToken);
 * if (result.valid) {
 *   console.log("Authenticated user:", result.user);
 * }
 * ```
 */
export class SupabaseAuthProvider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "supabase" as const;

  private supabaseUrl: string;
  private anonKey: string;
  private serviceRoleKey?: string;
  private jwtSecret?: string;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & SupabaseConfig) {
    super(config);

    if (!config.url) {
      throw new InvalidConfigurationError(
        "Supabase URL is required",
        "supabase",
        ["url"],
      );
    }
    if (!config.anonKey) {
      throw new InvalidConfigurationError(
        "Supabase anon key is required",
        "supabase",
        ["anonKey"],
      );
    }

    this.supabaseUrl = config.url.replace(/\/$/, ""); // Remove trailing slash
    this.anonKey = config.anonKey;
    this.serviceRoleKey = config.serviceRoleKey;
    this.jwtSecret = config.jwtSecret;
  }

  /**
   * Validate Supabase JWT
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    try {
      // If JWT secret is provided, verify locally
      if (this.jwtSecret) {
        const secret = new TextEncoder().encode(this.jwtSecret);
        const { payload } = await jose.jwtVerify(token, secret);

        const user = this.payloadToUser(payload);

        return {
          valid: true,
          payload: payload as unknown as Record<string, unknown>,
          user,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
          tokenType: "jwt",
        };
      }

      // Otherwise, validate via Supabase API
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(`${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.anonKey,
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `Token validation failed: HTTP ${response.status}`,
        };
      }

      const userData = (await response.json()) as Record<string, unknown>;
      const user = this.supabaseUserToAuthUser(userData);

      return {
        valid: true,
        payload: userData,
        user,
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
   * Convert JWT payload to AuthUser
   */
  private payloadToUser(payload: jose.JWTPayload): AuthUser {
    const appMetadata = payload.app_metadata as Record<string, unknown>;
    const userMetadata = payload.user_metadata as Record<string, unknown>;

    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      name:
        (userMetadata?.full_name as string) || (userMetadata?.name as string),
      picture: userMetadata?.avatar_url as string | undefined,
      emailVerified: (payload.email_confirmed as boolean) || false,
      roles: payload.user_role
        ? [payload.user_role as string]
        : (appMetadata?.roles as string[]) || [],
      permissions: (appMetadata?.permissions as string[]) || [],
      metadata: userMetadata,
    };
  }

  /**
   * Convert Supabase user to AuthUser
   */
  private supabaseUserToAuthUser(userData: Record<string, unknown>): AuthUser {
    const appMetadata = userData.app_metadata as Record<string, unknown>;
    const userMetadata = userData.user_metadata as Record<string, unknown>;

    return {
      id: userData.id as string,
      email: userData.email as string | undefined,
      name:
        (userMetadata?.full_name as string) || (userMetadata?.name as string),
      picture: userMetadata?.avatar_url as string | undefined,
      emailVerified: userData.email_confirmed_at !== null,
      roles: (appMetadata?.roles as string[]) || [],
      permissions: (appMetadata?.permissions as string[]) || [],
      createdAt: userData.created_at
        ? new Date(userData.created_at as string)
        : undefined,
      lastLoginAt: userData.last_sign_in_at
        ? new Date(userData.last_sign_in_at as string)
        : undefined,
      metadata: userMetadata,
    };
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
   * Get user by ID via Supabase Admin API
   * Requires service role key
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    if (!this.serviceRoleKey) {
      logger.warn("Service role key required for user lookup");
      return null;
    }

    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `${this.supabaseUrl}/auth/v1/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.serviceRoleKey}`,
            apikey: this.anonKey,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new ProviderAPIError(
          `Supabase API returned ${response.status}`,
          "supabase",
          response.status,
        );
      }

      const userData = (await response.json()) as Record<string, unknown>;
      return this.supabaseUserToAuthUser(userData);
    } catch (error) {
      logger.error("Failed to fetch Supabase user:", error);
      if (error instanceof ProviderAPIError) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get user by email via Supabase Admin API
   * Requires service role key
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    if (!this.serviceRoleKey) {
      logger.warn("Service role key required for user lookup by email");
      return null;
    }

    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `${this.supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${this.serviceRoleKey}`,
            apikey: this.anonKey,
          },
        },
      );

      if (!response.ok) {
        throw new ProviderAPIError(
          `Supabase API returned ${response.status}`,
          "supabase",
          response.status,
        );
      }

      const result = (await response.json()) as {
        users?: Array<Record<string, unknown>>;
      };
      const users = result.users || [];

      if (users.length === 0) {
        return null;
      }

      return this.supabaseUserToAuthUser(users[0]);
    } catch (error) {
      logger.error("Failed to fetch Supabase user by email:", error);
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
      const response = await proxyFetch(`${this.supabaseUrl}/auth/v1/health`, {
        headers: {
          apikey: this.anonKey,
        },
      });

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
    logger.debug("Supabase provider cleaned up");
  }
}

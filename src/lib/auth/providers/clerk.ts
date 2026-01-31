// src/lib/auth/providers/clerk.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  ClerkConfig,
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
 * Clerk Authentication Provider
 *
 * Supports Clerk's session-based and JWT authentication.
 * Can validate both JWT tokens and session tokens via Clerk API.
 *
 * Features:
 * - JWT validation using Clerk's JWKS
 * - Session token validation via Clerk API
 * - User profile fetching
 * - Organization support for multi-tenant apps
 * - In-memory session management
 *
 * @example
 * ```typescript
 * const clerk = new ClerkProvider({
 *   type: "clerk",
 *   publishableKey: "pk_test_...",
 *   secretKey: "sk_test_..."
 * });
 *
 * const result = await clerk.authenticateToken(sessionToken);
 * if (result.valid) {
 *   console.log("Authenticated user:", result.user);
 * }
 * ```
 */
export class ClerkProvider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "clerk" as const;

  private secretKey: string;
  private jwtKey?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & ClerkConfig) {
    super(config);

    if (!config.secretKey) {
      throw new InvalidConfigurationError(
        "Clerk secretKey is required",
        "clerk",
        ["secretKey"],
      );
    }

    this.secretKey = config.secretKey;
    this.jwtKey = config.jwtKey;
  }

  /**
   * Initialize Clerk JWKS
   */
  async initialize(): Promise<void> {
    // Clerk's JWKS endpoint
    const jwksUrl = new URL("https://api.clerk.com/.well-known/jwks.json");
    this.jwks = jose.createRemoteJWKSet(jwksUrl);
    logger.debug("Clerk provider initialized");
  }

  /**
   * Validate Clerk session token or JWT
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    // First try JWT validation (tokens with dots)
    if (token.includes(".") && token.split(".").length === 3) {
      return this.validateJWT(token);
    }

    // Otherwise treat as session token
    return this.validateSessionToken(token);
  }

  /**
   * Validate JWT using JWKS
   */
  private async validateJWT(token: string): Promise<TokenValidationResult> {
    if (!this.jwks) {
      await this.initialize();
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.jwks!);

      const user: AuthUser = {
        id: payload.sub as string,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        picture: payload.picture as string | undefined,
        emailVerified: payload.email_verified as boolean | undefined,
        roles: (payload["https://clerk.dev/roles"] as string[]) || [],
        permissions:
          (payload["https://clerk.dev/permissions"] as string[]) || [],
        organizationId: payload.org_id as string | undefined,
        metadata: {
          azp: payload.azp,
          sid: payload.sid,
        },
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
   * Validate session token via Clerk API
   */
  private async validateSessionToken(
    token: string,
  ): Promise<TokenValidationResult> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        "https://api.clerk.com/v1/sessions/verify",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as {
          errors?: Array<{ message?: string }>;
        };
        return {
          valid: false,
          error: error.errors?.[0]?.message || "Session validation failed",
        };
      }

      const session = (await response.json()) as Record<string, unknown>;

      const userData = session.user as Record<string, unknown>;
      const emailAddresses = userData?.email_addresses as Array<{
        email_address?: string;
      }>;

      const user: AuthUser = {
        id: session.user_id as string,
        email: emailAddresses?.[0]?.email_address,
        name: userData?.first_name
          ? `${userData.first_name} ${userData.last_name || ""}`.trim()
          : undefined,
        picture: userData?.image_url as string | undefined,
        roles:
          ((userData?.public_metadata as Record<string, unknown>)
            ?.roles as string[]) || [],
        permissions:
          ((userData?.public_metadata as Record<string, unknown>)
            ?.permissions as string[]) || [],
        organizationId: session.active_organization_id as string | undefined,
      };

      return {
        valid: true,
        payload: session,
        user,
        expiresAt: session.expire_at
          ? new Date(session.expire_at as number)
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
    const duration = this.config.session?.duration || 86400; // 24 hours default

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

    const duration = this.config.session?.duration || 86400;
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
   * Get user by ID from Clerk API
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://api.clerk.com/v1/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new ProviderAPIError(
          `Clerk API returned ${response.status}`,
          "clerk",
          response.status,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const emailAddresses = data.email_addresses as Array<{
        email_address?: string;
        verification?: { status?: string };
      }>;

      return {
        id: data.id as string,
        email: emailAddresses?.[0]?.email_address,
        name: data.first_name
          ? `${data.first_name} ${data.last_name || ""}`.trim()
          : undefined,
        picture: data.image_url as string | undefined,
        emailVerified: emailAddresses?.[0]?.verification?.status === "verified",
        roles:
          ((data.public_metadata as Record<string, unknown>)
            ?.roles as string[]) || [],
        permissions:
          ((data.public_metadata as Record<string, unknown>)
            ?.permissions as string[]) || [],
        createdAt: data.created_at
          ? new Date(data.created_at as number)
          : undefined,
        lastLoginAt: data.last_sign_in_at
          ? new Date(data.last_sign_in_at as number)
          : undefined,
        metadata: data.private_metadata as Record<string, unknown>,
      };
    } catch (error) {
      logger.error("Failed to fetch Clerk user:", error);
      if (error instanceof ProviderAPIError) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get user by email from Clerk API
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new ProviderAPIError(
          `Clerk API returned ${response.status}`,
          "clerk",
          response.status,
        );
      }

      const users = (await response.json()) as Array<Record<string, unknown>>;

      if (users.length === 0) {
        return null;
      }

      const data = users[0];
      const emailAddresses = data.email_addresses as Array<{
        email_address?: string;
        verification?: { status?: string };
      }>;

      return {
        id: data.id as string,
        email: emailAddresses?.[0]?.email_address,
        name: data.first_name
          ? `${data.first_name} ${data.last_name || ""}`.trim()
          : undefined,
        picture: data.image_url as string | undefined,
        emailVerified: emailAddresses?.[0]?.verification?.status === "verified",
        roles:
          ((data.public_metadata as Record<string, unknown>)
            ?.roles as string[]) || [],
        permissions:
          ((data.public_metadata as Record<string, unknown>)
            ?.permissions as string[]) || [],
        createdAt: data.created_at
          ? new Date(data.created_at as number)
          : undefined,
        lastLoginAt: data.last_sign_in_at
          ? new Date(data.last_sign_in_at as number)
          : undefined,
        metadata: data.private_metadata as Record<string, unknown>,
      };
    } catch (error) {
      logger.error("Failed to fetch Clerk user by email:", error);
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
      // Use a lightweight endpoint to check connectivity
      const response = await proxyFetch(
        "https://api.clerk.com/v1/organizations?limit=1",
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

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
    logger.debug("Clerk provider cleaned up");
  }
}

// src/lib/auth/providers/auth0.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  Auth0Config,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import {
  InvalidConfigurationError,
  ProviderInitializationError,
  ProviderAPIError,
} from "../authErrors.js";
import * as jose from "jose";

/**
 * Auth0 token payload structure
 */
type Auth0TokenPayload = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  "https://your-namespace/roles"?: string[];
  "https://your-namespace/permissions"?: string[];
  iat: number;
  exp: number;
  aud: string | string[];
  iss: string;
};

/**
 * Auth0 Authentication Provider
 *
 * Supports JWT validation with JWKS for Auth0-issued tokens.
 * Uses jose library for JWT verification against Auth0's JWKS endpoint.
 *
 * Features:
 * - JWT validation with JWKS
 * - User profile fetching (requires Management API token)
 * - In-memory session management
 * - Role and permission extraction from token claims
 *
 * @example
 * ```typescript
 * const auth0 = new Auth0Provider({
 *   type: "auth0",
 *   domain: "your-tenant.auth0.com",
 *   clientId: "your-client-id",
 *   audience: "https://your-api.example.com"
 * });
 *
 * const result = await auth0.authenticateToken(bearerToken);
 * if (result.valid) {
 *   console.log("Authenticated user:", result.user);
 * }
 * ```
 */
export class Auth0Provider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "auth0" as const;

  private domain: string;
  private clientId: string;
  private audience?: string;
  private rolesNamespace?: string;
  private permissionsNamespace?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & Auth0Config) {
    super(config);

    if (!config.domain) {
      throw new InvalidConfigurationError("Auth0 domain is required", "auth0", [
        "domain",
      ]);
    }
    if (!config.clientId) {
      throw new InvalidConfigurationError(
        "Auth0 clientId is required",
        "auth0",
        ["clientId"],
      );
    }

    this.domain = config.domain;
    this.clientId = config.clientId;
    this.audience = config.audience;

    // Allow custom namespaces for roles/permissions claims
    this.rolesNamespace =
      (config.options?.rolesNamespace as string) ||
      "https://your-namespace/roles";
    this.permissionsNamespace =
      (config.options?.permissionsNamespace as string) ||
      "https://your-namespace/permissions";
  }

  /**
   * Initialize JWKS for JWT verification
   */
  async initialize(): Promise<void> {
    try {
      const jwksUrl = new URL(`https://${this.domain}/.well-known/jwks.json`);
      this.jwks = jose.createRemoteJWKSet(jwksUrl);
      logger.debug(`Auth0 provider initialized for domain: ${this.domain}`);
    } catch (error) {
      throw new ProviderInitializationError(
        "Failed to initialize Auth0 JWKS",
        "auth0",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Validate Auth0 JWT token
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    if (!this.jwks) {
      await this.initialize();
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.jwks!, {
        issuer: `https://${this.domain}/`,
        audience: this.audience,
      });

      const auth0Payload = payload as unknown as Auth0TokenPayload;

      // Extract user information from token
      const user: AuthUser = {
        id: auth0Payload.sub,
        email: auth0Payload.email,
        name: auth0Payload.name,
        picture: auth0Payload.picture,
        emailVerified: auth0Payload.email_verified,
        roles:
          (payload[this.rolesNamespace!] as string[]) ||
          auth0Payload["https://your-namespace/roles"] ||
          [],
        permissions:
          (payload[this.permissionsNamespace!] as string[]) ||
          auth0Payload["https://your-namespace/permissions"] ||
          [],
        metadata: {
          iss: auth0Payload.iss,
          aud: auth0Payload.aud,
        },
      };

      return {
        valid: true,
        payload: payload as unknown as Record<string, unknown>,
        user,
        expiresAt: new Date(auth0Payload.exp * 1000),
        tokenType: "jwt",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Auth0 token validation failed:", message);

      return {
        valid: false,
        error: message,
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
    const duration = this.config.session?.duration || 3600; // 1 hour default

    const session: AuthSession = {
      id: sessionId,
      user,
      createdAt: now,
      expiresAt: new Date(now.getTime() + duration * 1000),
      isValid: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track user's sessions
    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);

    this.emit("auth:login", user);
    logger.debug(`Session created for user: ${user.id}`);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await this.destroySession(sessionId);
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
      // Remove from user's sessions
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
   * Fetch user profile from Auth0 Management API
   * Note: Requires AUTH0_MANAGEMENT_TOKEN environment variable
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    const managementToken = process.env.AUTH0_MANAGEMENT_TOKEN;

    if (!managementToken) {
      logger.warn("AUTH0_MANAGEMENT_TOKEN not set, cannot fetch user profile");
      return null;
    }

    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://${this.domain}/api/v2/users/${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${managementToken}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new ProviderAPIError(
          `Auth0 API returned ${response.status}`,
          "auth0",
          response.status,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      return {
        id: data.user_id as string,
        email: data.email as string | undefined,
        name: data.name as string | undefined,
        picture: data.picture as string | undefined,
        emailVerified: data.email_verified as boolean | undefined,
        roles:
          ((data.app_metadata as Record<string, unknown>)?.roles as string[]) ||
          [],
        permissions:
          ((data.app_metadata as Record<string, unknown>)
            ?.permissions as string[]) || [],
        createdAt: data.created_at
          ? new Date(data.created_at as string)
          : undefined,
        lastLoginAt: data.last_login
          ? new Date(data.last_login as string)
          : undefined,
        metadata: data.user_metadata as Record<string, unknown>,
      };
    } catch (error) {
      logger.error("Failed to fetch Auth0 user:", error);
      if (error instanceof ProviderAPIError) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Get user by email from Auth0 Management API
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const managementToken = process.env.AUTH0_MANAGEMENT_TOKEN;

    if (!managementToken) {
      logger.warn("AUTH0_MANAGEMENT_TOKEN not set, cannot fetch user by email");
      return null;
    }

    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://${this.domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${managementToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new ProviderAPIError(
          `Auth0 API returned ${response.status}`,
          "auth0",
          response.status,
        );
      }

      const users = (await response.json()) as Array<Record<string, unknown>>;

      if (users.length === 0) {
        return null;
      }

      const data = users[0];
      return {
        id: data.user_id as string,
        email: data.email as string | undefined,
        name: data.name as string | undefined,
        picture: data.picture as string | undefined,
        emailVerified: data.email_verified as boolean | undefined,
        roles:
          ((data.app_metadata as Record<string, unknown>)?.roles as string[]) ||
          [],
        permissions:
          ((data.app_metadata as Record<string, unknown>)
            ?.permissions as string[]) || [],
        createdAt: data.created_at
          ? new Date(data.created_at as string)
          : undefined,
        lastLoginAt: data.last_login
          ? new Date(data.last_login as string)
          : undefined,
        metadata: data.user_metadata as Record<string, unknown>,
      };
    } catch (error) {
      logger.error("Failed to fetch Auth0 user by email:", error);
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
      const response = await proxyFetch(
        `https://${this.domain}/.well-known/openid-configuration`,
      );

      return {
        healthy: response.ok,
        providerConnected: response.ok,
        sessionStorageHealthy: true,
        error: response.ok ? undefined : `HTTP ${response.status}`,
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
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
    logger.debug("Auth0 provider cleaned up");
  }
}

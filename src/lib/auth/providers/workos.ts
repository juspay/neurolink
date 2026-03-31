// src/lib/auth/providers/workos.ts

import type {
  AuthProviderConfig,
  WorkOSConfig,
  AuthUser,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import { AuthError } from "../errors.js";
import * as jose from "jose";
import { BaseAuthProvider } from "./BaseAuthProvider.js";

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
 * - Session management (inherited from BaseAuthProvider)
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
export class WorkOSProvider extends BaseAuthProvider {
  readonly type = "workos" as const;

  private apiKey: string;
  private clientId: string;
  private organizationId?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;

  constructor(config: AuthProviderConfig & WorkOSConfig) {
    super(config);

    if (!config.apiKey) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "WorkOS API key is required",
        { details: { provider: "workos", missingFields: ["apiKey"] } },
      );
    }
    if (!config.clientId) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "WorkOS client ID is required",
        { details: { provider: "workos", missingFields: ["clientId"] } },
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
      const jwks = this.jwks;
      if (!jwks) {
        throw AuthError.create(
          "PROVIDER_INIT_FAILED",
          "WorkOS JWKS was not initialized",
          { details: { provider: "workos" } },
        );
      }

      // Verify the JWT
      const { payload } = await jose.jwtVerify(token, jwks, {
        audience: this.clientId,
      });

      // Enforce organizationId if configured
      if (
        this.organizationId &&
        (payload.org_id as string) !== this.organizationId
      ) {
        return {
          valid: false,
          error: `Organization mismatch: expected ${this.organizationId}, got ${payload.org_id as string}`,
        };
      }

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
      // If JWT validation fails, try session validation via API
      return this.validateSessionViaAPI(token);
    }
  }

  /**
   * Validate session via WorkOS API
   */
  private async validateSessionViaAPI(
    token: string,
  ): Promise<TokenValidationResult> {
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
          signal: AbortSignal.timeout(5000),
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

      // Enforce organizationId if configured
      if (this.organizationId && data.organization_id !== this.organizationId) {
        return {
          valid: false,
          error: `Organization mismatch: expected ${this.organizationId}, got ${data.organization_id}`,
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `WorkOS API returned ${response.status}`,
          { details: { provider: "workos", statusCode: response.status } },
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
      logger.error(
        "Failed to fetch WorkOS user:",
        error instanceof Error ? error.message : String(error),
      );
      // Always rethrow -- transport errors should not be silenced as null
      throw error;
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `WorkOS API returned ${response.status}`,
          { details: { provider: "workos", statusCode: response.status } },
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
      logger.error(
        "Failed to fetch WorkOS user by email:",
        error instanceof Error ? error.message : String(error),
      );
      // Rethrow AuthErrors, silence unknown transport errors
      if (error instanceof Error && error.name === "AuthError") {
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
}

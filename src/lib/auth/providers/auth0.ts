// src/lib/auth/providers/auth0.ts

import { BaseAuthProvider } from "./BaseAuthProvider.js";
import { AuthError } from "../errors.js";
import type {
  Auth0Config,
  Auth0TokenPayload,
  AuthHealthCheck,
  AuthProviderConfig,
  AuthProviderType,
  AuthRequestContext,
  AuthUser,
  TokenValidationResult,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import * as jose from "jose";

/**
 * Auth0 Authentication Provider
 *
 * Supports JWT validation with JWKS for Auth0-issued tokens.
 * Uses jose library for JWT verification against Auth0's JWKS endpoint.
 *
 * Features:
 * - JWT validation with JWKS
 * - User profile fetching (requires Management API token)
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
export class Auth0Provider extends BaseAuthProvider {
  readonly type: AuthProviderType = "auth0";

  private domain: string;
  private clientId: string;
  private audience?: string;
  private rolesNamespace?: string;
  private permissionsNamespace?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;

  constructor(config: AuthProviderConfig & Auth0Config) {
    super(config);

    if (!config.domain) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Auth0 domain is required",
        { details: { missingFields: ["domain"] } },
      );
    }
    if (!config.clientId) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Auth0 clientId is required",
        { details: { missingFields: ["clientId"] } },
      );
    }

    this.domain = config.domain;
    this.clientId = config.clientId;
    this.audience = config.audience;

    // Allow custom namespaces for roles/permissions claims.
    // If no namespace is configured, fall back to standard "roles" / "permissions" claims.
    this.rolesNamespace = config.options?.rolesNamespace as string | undefined;
    this.permissionsNamespace = config.options?.permissionsNamespace as
      | string
      | undefined;
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
      throw AuthError.create(
        "PROVIDER_INIT_FAILED",
        "Failed to initialize Auth0 JWKS",
        { cause: error instanceof Error ? error : new Error(String(error)) },
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
      if (!this.jwks) {
        return {
          valid: false,
          error: "Auth0 JWKS not initialized",
        };
      }

      const { payload } = await jose.jwtVerify(token, this.jwks, {
        issuer: `https://${this.domain}/`,
        audience: this.audience,
      });

      const auth0Payload = payload as unknown as Auth0TokenPayload;

      // Validate audience / authorized party against clientId
      if (this.audience) {
        const aud = auth0Payload.aud;
        const audArray = Array.isArray(aud) ? aud : [aud];
        if (!audArray.includes(this.audience)) {
          return {
            valid: false,
            error: `Token audience does not match expected audience: ${this.audience}`,
          };
        }
      }

      if (this.clientId) {
        const aud = auth0Payload.aud;
        const azp = (payload as Record<string, unknown>).azp as
          | string
          | undefined;
        const audArray = Array.isArray(aud) ? aud : [aud];
        if (azp) {
          if (azp !== this.clientId) {
            return {
              valid: false,
              error: `Token azp claim "${azp}" does not match clientId "${this.clientId}"`,
            };
          }
        } else if (!audArray.includes(this.clientId)) {
          return {
            valid: false,
            error: `Token audience does not include clientId "${this.clientId}"`,
          };
        }
      }

      // Extract roles: use custom namespace if configured, otherwise standard "roles" claim
      const rolesKey = this.rolesNamespace ?? "roles";
      const permissionsKey = this.permissionsNamespace ?? "permissions";

      const roles = (payload[rolesKey] as string[]) || auth0Payload.roles || [];
      const permissions =
        (payload[permissionsKey] as string[]) || auth0Payload.permissions || [];

      // Extract user information from token
      const user: AuthUser = {
        id: auth0Payload.sub,
        email: auth0Payload.email,
        name: auth0Payload.name,
        picture: auth0Payload.picture,
        emailVerified: auth0Payload.email_verified,
        roles,
        permissions,
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `Auth0 API returned ${response.status}`,
          { details: { statusCode: response.status } },
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
      throw error;
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `Auth0 API returned ${response.status}`,
          { details: { statusCode: response.status } },
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
      throw error;
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
}

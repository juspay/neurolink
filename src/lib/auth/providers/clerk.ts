// src/lib/auth/providers/clerk.ts

import { BaseAuthProvider } from "./BaseAuthProvider.js";
import { AuthError } from "../errors.js";
import type {
  AuthProviderConfig,
  ClerkConfig,
  AuthUser,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
  AuthProviderType,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
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
export class ClerkProvider extends BaseAuthProvider {
  readonly type: AuthProviderType = "clerk";

  private secretKey: string;
  private jwtKey?: string;
  private publishableKey?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;
  private localKey: Uint8Array | null = null;

  constructor(config: AuthProviderConfig & ClerkConfig) {
    super(config);

    if (!config.secretKey) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Clerk secretKey is required",
        { details: { missingFields: ["secretKey"] } },
      );
    }

    this.secretKey = config.secretKey;
    this.jwtKey = config.jwtKey;
    this.publishableKey = config.publishableKey;
  }

  /**
   * Initialize Clerk JWKS
   */
  async initialize(): Promise<void> {
    // Clerk JWKS endpoint (v1 API)
    const jwksUrl = new URL("https://api.clerk.com/v1/jwks");
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
   * Validate JWT using local jwtKey (if configured) or JWKS
   */
  private async validateJWT(token: string): Promise<TokenValidationResult> {
    try {
      let payload: jose.JWTPayload;

      if (this.jwtKey) {
        // Use locally provided JWT key for verification
        if (!this.localKey) {
          this.localKey = new TextEncoder().encode(this.jwtKey);
        }
        ({ payload } = await jose.jwtVerify(token, this.localKey));
      } else {
        // Fall back to Clerk JWKS endpoint
        if (!this.jwks) {
          await this.initialize();
        }
        if (!this.jwks) {
          return {
            valid: false,
            error: "Clerk JWKS not initialized",
          };
        }
        ({ payload } = await jose.jwtVerify(token, this.jwks));
      }

      // Validate azp (authorized party) claim if publishableKey is configured
      if (this.publishableKey && payload.azp) {
        if (payload.azp !== this.publishableKey) {
          return {
            valid: false,
            error: `Invalid authorized party: ${payload.azp as string}. Expected: ${this.publishableKey}`,
          };
        }
      }

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
        payload,
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `Clerk API returned ${response.status}`,
          { details: { statusCode: response.status } },
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
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as Record<string, unknown>).code === "string"
      ) {
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `Clerk API returned ${response.status}`,
          { details: { statusCode: response.status } },
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
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        typeof (error as Record<string, unknown>).code === "string"
      ) {
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
}

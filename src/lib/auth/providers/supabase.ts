// src/lib/auth/providers/supabase.ts

import { BaseAuthProvider } from "./BaseAuthProvider.js";
import { AuthError } from "../errors.js";
import type {
  AuthProviderConfig,
  SupabaseConfig,
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
export class SupabaseAuthProvider extends BaseAuthProvider {
  readonly type: AuthProviderType = "supabase";

  private supabaseUrl: string;
  private anonKey: string;
  private serviceRoleKey?: string;
  private jwtSecret?: string;

  constructor(config: AuthProviderConfig & SupabaseConfig) {
    super(config);

    if (!config.url) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Supabase URL is required",
        { details: { missingFields: ["url"] } },
      );
    }
    if (!config.anonKey) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Supabase anon key is required",
        { details: { missingFields: ["anonKey"] } },
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

        // Reject tokens without a sub claim (anon/service_role JWTs)
        if (!payload.sub) {
          return {
            valid: false,
            error:
              "Token missing sub claim: cannot authenticate without a user identity",
          };
        }

        // Only accept tokens with "authenticated" role
        const role = payload.role as string | undefined;
        if (role && role !== "authenticated") {
          return {
            valid: false,
            error: `Invalid token role: ${role}. Only "authenticated" role is accepted`,
          };
        }

        const user = this.payloadToUser(payload);

        return {
          valid: true,
          payload,
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

    // Use payload.role (Supabase standard claim) for the roles array
    const role = payload.role as string | undefined;

    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      name:
        (userMetadata?.full_name as string) || (userMetadata?.name as string),
      picture: userMetadata?.avatar_url as string | undefined,
      emailVerified: (payload.email_confirmed as boolean) || false,
      roles: role ? [role] : (appMetadata?.roles as string[]) || [],
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
      emailVerified: !!userData.email_confirmed_at,
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `Supabase API returned ${response.status}`,
          { details: { statusCode: response.status } },
        );
      }

      const userData = (await response.json()) as Record<string, unknown>;
      return this.supabaseUserToAuthUser(userData);
    } catch (error) {
      logger.error("Failed to fetch Supabase user:", error);
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
        throw AuthError.create(
          "PROVIDER_ERROR",
          `Supabase API returned ${response.status}`,
          { details: { statusCode: response.status } },
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
}

// src/lib/auth/providers/betterAuth.ts

import type {
  AuthProviderConfig,
  BetterAuthConfig,
  AuthUser,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/index.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import { AuthError } from "../errors.js";
import * as jose from "jose";
import { BaseAuthProvider } from "./BaseAuthProvider.js";

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
 * - Session management (inherited from BaseAuthProvider)
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
export class BetterAuthProvider extends BaseAuthProvider {
  readonly type = "better-auth" as const;

  private secret: string;
  private baseUrl: string;
  private secretKey: Uint8Array;

  constructor(config: AuthProviderConfig & BetterAuthConfig) {
    super(config);

    if (!config.secret) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Better Auth secret is required",
        { details: { provider: "better-auth", missingFields: ["secret"] } },
      );
    }
    if (!config.baseUrl) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Better Auth baseUrl is required",
        { details: { provider: "better-auth", missingFields: ["baseUrl"] } },
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
    return this.validateSessionViaAPI(token);
  }

  /**
   * Validate JWT using the secret
   */
  private async validateJWT(token: string): Promise<TokenValidationResult> {
    try {
      const { payload } = await jose.jwtVerify(token, this.secretKey);

      if (!payload.sub) {
        return {
          valid: false,
          error: "Token missing required 'sub' claim",
        };
      }

      const user: AuthUser = {
        id: payload.sub,
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
   * Validate session via Better Auth API
   */
  private async validateSessionViaAPI(
    sessionToken: string,
  ): Promise<TokenValidationResult> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(`${this.baseUrl}/api/auth/session`, {
        headers: {
          Cookie: `better-auth.session_token=${sessionToken}`,
        },
        signal: AbortSignal.timeout(5000),
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
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      const proxyFetch = createProxyFetch();
      // Better Auth typically exposes session endpoint that we can check
      const response = await proxyFetch(`${this.baseUrl}/api/auth/session`, {
        signal: AbortSignal.timeout(5000),
      });

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
}

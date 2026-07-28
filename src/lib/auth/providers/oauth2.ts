// src/lib/auth/providers/oauth2.ts

import * as jose from "jose";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import type {
  AuthHealthCheck,
  AuthProviderConfig,
  AuthRequestContext,
  AuthUser,
  OAuth2Config,
  TokenValidationResult,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { AuthError } from "../errors.js";
import { BaseAuthProvider } from "./BaseAuthProvider.js";

/**
 * Generic OAuth2/OIDC Provider
 *
 * Supports any OAuth2-compliant identity provider with configurable endpoints.
 * Works with both JWKS-based JWT validation and token introspection.
 *
 * Features:
 * - JWT validation with JWKS (if jwksUrl provided)
 * - Token introspection endpoint support
 * - User info endpoint integration
 * - PKCE support
 *
 * @example
 * ```typescript
 * const oauth2 = new OAuth2Provider({
 *   type: "oauth2",
 *   authorizationUrl: "https://idp.example.com/oauth/authorize",
 *   tokenUrl: "https://idp.example.com/oauth/token",
 *   userInfoUrl: "https://idp.example.com/userinfo",
 *   jwksUrl: "https://idp.example.com/.well-known/jwks.json",
 *   clientId: "your-client-id",
 *   clientSecret: "your-client-secret",
 * });
 *
 * const result = await oauth2.authenticateToken(accessToken);
 * ```
 */
export class OAuth2Provider extends BaseAuthProvider {
  readonly type = "oauth2" as const;

  private authorizationUrl: string;
  private tokenUrl: string;
  private userInfoUrl?: string;
  private jwksUrl?: string;
  private clientId: string;
  private clientSecret?: string;
  private scopes: string[];
  private redirectUrl?: string;
  private usePKCE: boolean;

  private jwks: jose.JWTVerifyGetKey | null = null;

  constructor(config: AuthProviderConfig & OAuth2Config) {
    super(config);

    if (!config.authorizationUrl) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "OAuth2 authorizationUrl is required",
      );
    }
    if (!config.tokenUrl) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "OAuth2 tokenUrl is required",
      );
    }
    if (!config.clientId) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "OAuth2 clientId is required",
      );
    }

    this.authorizationUrl = config.authorizationUrl;
    this.tokenUrl = config.tokenUrl;
    this.userInfoUrl = config.userInfoUrl;
    this.jwksUrl = config.jwksUrl;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.scopes = config.scopes ?? ["openid", "profile", "email"];
    this.redirectUrl = config.redirectUrl;
    this.usePKCE = config.usePKCE ?? false;
  }

  /**
   * Initialize JWKS for JWT verification (if jwksUrl is provided)
   */
  async initialize(): Promise<void> {
    if (this.jwksUrl) {
      try {
        const jwksUrl = new URL(this.jwksUrl);
        this.jwks = jose.createRemoteJWKSet(jwksUrl);
        logger.debug(`OAuth2 provider initialized with JWKS: ${this.jwksUrl}`);
      } catch (error) {
        throw AuthError.create(
          "PROVIDER_INIT_FAILED",
          "Failed to initialize OAuth2 JWKS",
          {
            cause: error instanceof Error ? error : new Error(String(error)),
          },
        );
      }
    }
  }

  /**
   * Validate OAuth2 access token
   *
   * Uses JWKS validation if available, otherwise falls back to userinfo endpoint
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    // Try JWKS validation first if available
    if (this.jwksUrl) {
      // Lazy-init JWKS on first use if initialize() was not called
      if (!this.jwks) {
        await this.initialize();
      }

      if (!this.jwks) {
        return {
          valid: false,
          error: "JWKS not available after initialization",
        };
      }

      try {
        const { payload } = await jose.jwtVerify(token, this.jwks);

        // Validate issuer against the authorization server origin
        if (payload.iss) {
          const expectedIssuerOrigin = new URL(this.authorizationUrl).origin;
          if (!payload.iss.startsWith(expectedIssuerOrigin)) {
            return {
              valid: false,
              error: `Invalid issuer: ${payload.iss}. Expected origin: ${expectedIssuerOrigin}`,
            };
          }
        }

        // Validate audience against the configured clientId
        if (payload.aud) {
          const audiences = Array.isArray(payload.aud)
            ? payload.aud
            : [payload.aud];
          if (!audiences.includes(this.clientId)) {
            return {
              valid: false,
              error: `Invalid audience: ${audiences.join(", ")}. Expected: ${this.clientId}`,
            };
          }
        }

        if (!payload.sub) {
          return {
            valid: false,
            error: "JWT is missing required 'sub' claim: cannot identify user",
          };
        }

        const user: AuthUser = {
          id: payload.sub,
          email: payload.email as string | undefined,
          name: payload.name as string | undefined,
          picture: payload.picture as string | undefined,
          roles: (payload.roles as string[]) ?? [],
          permissions: (payload.permissions as string[]) ?? [],
          metadata: payload as Record<string, unknown>,
        };

        return {
          valid: true,
          payload,
          user,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
          tokenType: "jwt",
        };
      } catch {
        logger.debug("JWKS validation failed, trying userinfo endpoint");
      }
    }

    // Fall back to userinfo endpoint if available
    if (this.userInfoUrl) {
      return this.validateViaUserInfo(token);
    }

    return {
      valid: false,
      error: "No validation method available (provide jwksUrl or userInfoUrl)",
    };
  }

  /**
   * Validate token via userinfo endpoint
   */
  private async validateViaUserInfo(
    token: string,
  ): Promise<TokenValidationResult> {
    try {
      const proxyFetch = createProxyFetch();
      if (!this.userInfoUrl) {
        return {
          valid: false,
          error: "UserInfo URL not configured",
        };
      }

      const response = await proxyFetch(this.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return {
          valid: false,
          error: `UserInfo endpoint returned ${response.status}`,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;

      const userId =
        (data.sub as string | undefined) ?? (data.id as string | undefined);
      if (!userId) {
        return {
          valid: false,
          error:
            "UserInfo response is missing 'sub' and 'id': cannot identify user",
        };
      }

      const user: AuthUser = {
        id: userId,
        email: data.email as string | undefined,
        name: data.name as string | undefined,
        picture: data.picture as string | undefined,
        emailVerified: data.email_verified as boolean | undefined,
        roles: (data.roles as string[]) ?? [],
        permissions: (data.permissions as string[]) ?? [],
        metadata: data,
      };

      return {
        valid: true,
        payload: data,
        user,
        tokenType: "oauth",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("OAuth2 userinfo validation failed:", message);

      return {
        valid: false,
        error: message,
      };
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(state: string, codeChallenge?: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      scope: this.scopes.join(" "),
      state,
    });

    if (this.redirectUrl) {
      params.set("redirect_uri", this.redirectUrl);
    }

    if (this.usePKCE && codeChallenge) {
      params.set("code_challenge", codeChallenge);
      params.set("code_challenge_method", "S256");
    }

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    code: string,
    codeVerifier?: string,
  ): Promise<{ accessToken: string; refreshToken?: string; idToken?: string }> {
    const proxyFetch = createProxyFetch();

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.clientId,
      code,
    });

    if (this.clientSecret) {
      body.set("client_secret", this.clientSecret);
    }

    if (this.redirectUrl) {
      body.set("redirect_uri", this.redirectUrl);
    }

    if (this.usePKCE && codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    const response = await proxyFetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw AuthError.create(
        "PROVIDER_ERROR",
        `Token exchange failed: ${response.status}`,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      idToken: data.id_token as string | undefined,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      // Try to fetch JWKS or authorization endpoint to check connectivity
      const proxyFetch = createProxyFetch();
      const checkUrl = this.jwksUrl ?? this.authorizationUrl;
      const response = await proxyFetch(checkUrl, { method: "HEAD" });

      return {
        healthy: response.ok || response.status === 405, // 405 is ok for HEAD
        providerConnected: true,
        sessionStorageHealthy: true,
        error:
          response.ok || response.status === 405
            ? undefined
            : `HTTP ${response.status}`,
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

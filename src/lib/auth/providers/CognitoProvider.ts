/**
 * CognitoProvider - AWS Cognito User Pools provider implementation
 *
 * Provides JWT validation, session management, and RBAC for AWS Cognito.
 */

import { importJWK, jwtVerify } from "jose";
import { logger } from "../../utils/logger.js";
import type {
  JsonValue,
  AuthJWKSCacheEntry,
  AuthProviderConfig,
  AuthUser,
  CognitoConfig,
  JWKS,
  TokenClaims,
  TokenValidationResult,
} from "../../types/index.js";
import { AuthError } from "../errors.js";
import { BaseAuthProvider } from "./BaseAuthProvider.js";

// =============================================================================
// JWKS CACHE
// =============================================================================

const jwksCache = new Map<string, AuthJWKSCacheEntry>();

// =============================================================================
// COGNITO PROVIDER
// =============================================================================

/**
 * CognitoProvider - AWS Cognito User Pools integration
 *
 * Features:
 * - Cognito ID token and access token validation
 * - JWKS-based signature verification
 * - Cognito groups for roles
 * - Custom attributes support
 * - Session management
 *
 * @example
 * ```typescript
 * const provider = new CognitoProvider({
 *   type: 'cognito',
 *   userPoolId: 'us-east-1_xxxxx',
 *   clientId: 'your-client-id',
 *   region: 'us-east-1',
 * });
 *
 * const result = await provider.authenticateToken(idToken);
 * if (result.valid) {
 *   console.log('User:', result.user);
 * }
 * ```
 */
export class CognitoProvider extends BaseAuthProvider {
  readonly type = "cognito" as const;
  private cognitoConfig: CognitoConfig;
  private jwksUri: string;
  private jwksCacheDuration: number;
  private expectedIssuer: string;

  constructor(config: AuthProviderConfig) {
    super(config);

    if (config.type !== "cognito") {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        `Invalid provider type: ${config.type}. Expected: cognito`,
      );
    }

    this.cognitoConfig = config as unknown as CognitoConfig;

    if (!this.cognitoConfig.userPoolId) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Cognito userPoolId is required",
      );
    }

    if (!this.cognitoConfig.clientId) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Cognito clientId is required",
      );
    }

    if (!this.cognitoConfig.region) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Cognito region is required",
      );
    }

    // Set up JWKS URI and issuer
    this.expectedIssuer = `https://cognito-idp.${this.cognitoConfig.region}.amazonaws.com/${this.cognitoConfig.userPoolId}`;
    this.jwksUri = `${this.expectedIssuer}/.well-known/jwks.json`;
    this.jwksCacheDuration =
      config.tokenValidation?.jwksCacheDuration ?? 600000; // 10 minutes

    logger.debug(
      `[CognitoProvider] Initialized for user pool: ${this.cognitoConfig.userPoolId}`,
    );
  }

  /**
   * Validate and authenticate a Cognito JWT token
   */
  async authenticateToken(token: string): Promise<TokenValidationResult> {
    try {
      // Parse token without verification first
      const claims = this.parseJWT(token);

      if (!claims) {
        return {
          valid: false,
          error: "Failed to decode token",
          errorCode: "AUTH-006",
        };
      }

      // Validate issuer
      if (claims.iss !== this.expectedIssuer) {
        return {
          valid: false,
          error: `Invalid issuer: ${claims.iss}. Expected: ${this.expectedIssuer}`,
          errorCode: "AUTH-001",
        };
      }

      // Validate token_use (id or access)
      const tokenUse = claims.token_use as string | undefined;
      if (tokenUse !== "id" && tokenUse !== "access") {
        return {
          valid: false,
          error: `Invalid token_use: ${tokenUse}. Expected: id or access`,
          errorCode: "AUTH-001",
        };
      }

      // Validate client_id for ID tokens, or client_id in aud for access tokens
      if (tokenUse === "id") {
        if (claims.aud !== this.cognitoConfig.clientId) {
          return {
            valid: false,
            error: `Invalid audience: ${claims.aud}. Expected: ${this.cognitoConfig.clientId}`,
            errorCode: "AUTH-001",
          };
        }
      } else {
        // Access tokens have client_id claim
        if (claims.client_id !== this.cognitoConfig.clientId) {
          return {
            valid: false,
            error: `Invalid client_id: ${claims.client_id}. Expected: ${this.cognitoConfig.clientId}`,
            errorCode: "AUTH-001",
          };
        }
      }

      // Check expiration
      const clockTolerance = this.config.tokenValidation?.clockTolerance ?? 30;
      if (this.isTokenExpired(claims, clockTolerance)) {
        return {
          valid: false,
          error: "Token has expired",
          errorCode: "AUTH-002",
          expiresAt: claims.exp ? new Date(claims.exp * 1000) : undefined,
        };
      }

      // Verify signature if enabled
      if (this.config.tokenValidation?.validateSignature !== false) {
        const signatureValid = await this.verifySignature(token);
        if (!signatureValid) {
          return {
            valid: false,
            error: "Invalid token signature",
            errorCode: "AUTH-004",
          };
        }
      }

      // Extract user from claims
      const user = this.extractCognitoUser(claims, tokenUse);

      // Convert claims to Record<string, JsonValue> by filtering out undefined
      const validClaims: Record<string, JsonValue> = {};
      for (const [key, value] of Object.entries(claims)) {
        if (value !== undefined) {
          validClaims[key] = value;
        }
      }

      return {
        valid: true,
        user,
        claims: validClaims,
        expiresAt: claims.exp ? new Date(claims.exp * 1000) : undefined,
        issuer: claims.iss,
        audience: claims.aud,
      };
    } catch (error) {
      logger.error(`[CognitoProvider] Token validation error:`, error);
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : "Token validation failed",
        errorCode: "AUTH-014",
      };
    }
  }

  /**
   * Verify token signature using JWKS
   */
  private async verifySignature(token: string): Promise<boolean> {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return false;
      }

      // Decode header to get kid
      const header = JSON.parse(
        Buffer.from(parts[0], "base64url").toString("utf-8"),
      );
      const kid = header.kid;

      if (!kid) {
        logger.warn("[CognitoProvider] Token missing kid in header");
        return false;
      }

      // Get JWKS
      const jwks = await this.getJWKS();
      const key = jwks.keys.find((k) => k.kid === kid);

      if (!key) {
        logger.warn(`[CognitoProvider] Key not found for kid: ${kid}`);
        return false;
      }

      // Verify the JWT signature against the public key
      const publicKey = await importJWK(key, header.alg);
      const clockTolerance = this.config.tokenValidation?.clockTolerance ?? 30;
      await jwtVerify(token, publicKey, { clockTolerance });
      return true;
    } catch (error) {
      logger.error(`[CognitoProvider] Signature verification error:`, error);
      return false;
    }
  }

  /**
   * Fetch JWKS with caching
   */
  private async getJWKS(): Promise<JWKS> {
    const cached = jwksCache.get(this.jwksUri);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.jwks;
    }

    try {
      const response = await fetch(this.jwksUri, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status}`);
      }

      const jwks = (await response.json()) as JWKS;

      // Cache the JWKS
      jwksCache.set(this.jwksUri, {
        jwks,
        expiresAt: Date.now() + this.jwksCacheDuration,
      });

      return jwks;
    } catch (error) {
      throw AuthError.create(
        "JWKS_FETCH_FAILED",
        `Failed to fetch JWKS from ${this.jwksUri}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Extract Cognito-specific user data from claims
   */
  private extractCognitoUser(claims: TokenClaims, tokenUse: string): AuthUser {
    // User ID (sub claim)
    const userId = claims.sub ?? "";

    // Email (from ID token or custom attributes)
    const email =
      claims.email ?? (claims["custom:email"] as string | undefined);

    // Name (various possible claims)
    const name =
      claims.name ??
      (claims["cognito:username"] as string | undefined) ??
      (claims.preferred_username as string | undefined);

    // Picture (custom attribute)
    const picture =
      claims.picture ?? (claims["custom:picture"] as string | undefined);

    // Get roles from Cognito groups
    let roles: string[] = [];
    const cognitoGroups = claims["cognito:groups"] as string[] | undefined;
    if (cognitoGroups && Array.isArray(cognitoGroups)) {
      roles = cognitoGroups;
    }

    // Apply default roles
    if (roles.length === 0 && this.rbacConfig.defaultRoles) {
      roles = this.rbacConfig.defaultRoles;
    }

    // Extract custom attributes as permissions if configured
    const permissions: string[] = [];
    if (this.cognitoConfig.customAttributes) {
      for (const attr of this.cognitoConfig.customAttributes) {
        const value = claims[`custom:${attr}`] as string | undefined;
        if (value) {
          // If it looks like a comma-separated list, split it
          if (value.includes(",")) {
            permissions.push(...value.split(",").map((p) => p.trim()));
          } else {
            permissions.push(value);
          }
        }
      }
    }

    // Build provider data, filtering out undefined values
    const providerData: Record<string, JsonValue> = {
      provider: "cognito",
    };
    if (claims["cognito:username"] !== undefined) {
      providerData.username = claims["cognito:username"];
    }
    providerData.token_use = tokenUse;
    if (claims.auth_time !== undefined) {
      providerData.auth_time = claims.auth_time;
    }
    const clientId = claims.client_id ?? claims.aud;
    if (clientId !== undefined) {
      providerData.client_id = clientId;
    }
    if (cognitoGroups !== undefined) {
      providerData.cognito_groups = cognitoGroups;
    }

    return {
      id: userId,
      email,
      name,
      picture,
      roles,
      permissions,
      emailVerified: claims.email_verified,
      providerData,
    };
  }

  /**
   * Get user from Cognito
   * Note: Requires AWS SDK for full implementation
   */
  async getUser(_userId: string): Promise<AuthUser | null> {
    logger.debug(
      "[CognitoProvider] getUser() is not implemented. Requires AWS SDK (@aws-sdk/client-cognito-identity-provider).",
    );
    return null;
  }
}

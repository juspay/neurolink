/**
 * KeycloakProvider - Keycloak OpenID Connect provider implementation
 *
 * Provides JWT validation, session management, and RBAC for Keycloak.
 */

import { importJWK, jwtVerify } from "jose";
import { logger } from "../../utils/logger.js";
import type {
  AuthJWKSCacheEntry,
  AuthProviderConfig,
  AuthUser,
  JWKS,
  KeycloakConfig,
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
// KEYCLOAK PROVIDER
// =============================================================================

/**
 * KeycloakProvider - Keycloak OpenID Connect integration
 *
 * Features:
 * - Keycloak JWT token validation
 * - JWKS-based signature verification
 * - Realm roles and client roles support
 * - Resource access for fine-grained permissions
 * - Session management
 *
 * @example
 * ```typescript
 * const provider = new KeycloakProvider({
 *   type: 'keycloak',
 *   serverUrl: 'https://keycloak.example.com',
 *   realm: 'your-realm',
 *   clientId: 'your-client-id',
 * });
 *
 * const result = await provider.authenticateToken(accessToken);
 * if (result.valid) {
 *   console.log('User:', result.user);
 * }
 * ```
 */
export class KeycloakProvider extends BaseAuthProvider {
  readonly type = "keycloak" as const;
  private keycloakConfig: KeycloakConfig;
  private jwksUri: string;
  private jwksCacheDuration: number;
  private expectedIssuer: string;

  constructor(config: AuthProviderConfig) {
    super(config);

    if (config.type !== "keycloak") {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        `Invalid provider type: ${config.type}. Expected: keycloak`,
      );
    }

    this.keycloakConfig = config as unknown as KeycloakConfig;

    if (!this.keycloakConfig.serverUrl) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Keycloak serverUrl is required",
      );
    }

    if (!this.keycloakConfig.realm) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Keycloak realm is required",
      );
    }

    if (!this.keycloakConfig.clientId) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Keycloak clientId is required",
      );
    }

    // Normalize server URL
    const serverUrl = this.keycloakConfig.serverUrl.replace(/\/$/, "");

    // Set up issuer and JWKS URI
    this.expectedIssuer = `${serverUrl}/realms/${this.keycloakConfig.realm}`;
    this.jwksUri = `${this.expectedIssuer}/protocol/openid-connect/certs`;
    this.jwksCacheDuration =
      config.tokenValidation?.jwksCacheDuration ?? 600000; // 10 minutes

    logger.debug(
      `[KeycloakProvider] Initialized for realm: ${this.keycloakConfig.realm}`,
    );
  }

  /**
   * Validate and authenticate a Keycloak JWT token
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

      // Validate audience — always check aud contains clientId
      const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (!audiences.includes(this.keycloakConfig.clientId)) {
        return {
          valid: false,
          error: `Invalid audience: token aud does not contain clientId "${this.keycloakConfig.clientId}"`,
          errorCode: "AUTH-001",
        };
      }

      // Additionally validate azp if present
      const azp = claims.azp as string | undefined;
      if (azp && azp !== this.keycloakConfig.clientId) {
        return {
          valid: false,
          error: `Invalid authorized party: ${azp}. Expected: ${this.keycloakConfig.clientId}`,
          errorCode: "AUTH-001",
        };
      }

      // Check expiration
      const clockTolerance = this.config.tokenValidation?.clockTolerance ?? 0;
      if (this.isTokenExpired(claims, clockTolerance)) {
        return {
          valid: false,
          error: "Token has expired",
          errorCode: "AUTH-002",
          expiresAt: claims.exp ? new Date(claims.exp * 1000) : undefined,
        };
      }

      // Check nbf (not before)
      if (this.isTokenNotYetValid(claims, clockTolerance)) {
        return {
          valid: false,
          error: "Token is not yet valid",
          errorCode: "AUTH-001",
        };
      }

      // Verify signature if enabled
      if (
        this.keycloakConfig.verifyToken !== false &&
        this.config.tokenValidation?.validateSignature !== false
      ) {
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
      const user = this.extractKeycloakUser(claims);

      // Convert claims to Record<string, JsonValue> by filtering out undefined
      const validClaims: Record<
        string,
        import("../../types/index.js").JsonValue
      > = {};
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
      logger.error(`[KeycloakProvider] Token validation error:`, error);
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
        logger.warn("[KeycloakProvider] Token missing kid in header");
        return false;
      }

      // Get JWKS
      const jwks = await this.getJWKS();
      const key = jwks.keys.find((k) => k.kid === kid);

      if (!key) {
        logger.warn(`[KeycloakProvider] Key not found for kid: ${kid}`);
        return false;
      }

      // Verify the JWT signature against the public key
      const publicKey = await importJWK(key, header.alg);
      const clockTolerance = this.config.tokenValidation?.clockTolerance ?? 30;
      await jwtVerify(token, publicKey, { clockTolerance });
      return true;
    } catch (error) {
      logger.error(`[KeycloakProvider] Signature verification error:`, error);
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
   * Extract Keycloak-specific user data from claims
   */
  private extractKeycloakUser(claims: TokenClaims): AuthUser {
    const userId = claims.sub ?? "";
    const email = claims.email;
    const name =
      claims.name ?? (claims.preferred_username as string | undefined);
    const picture = claims.picture;

    // Get realm roles
    let roles: string[] = [];
    const realmAccess = claims.realm_access as { roles?: string[] } | undefined;
    if (realmAccess?.roles) {
      roles = [...realmAccess.roles];
    }

    // Get client roles
    const resourceAccess = claims.resource_access as
      | Record<string, { roles?: string[] }>
      | undefined;
    if (resourceAccess) {
      // Add roles from the specific client
      const clientRoles = resourceAccess[this.keycloakConfig.clientId]?.roles;
      if (clientRoles) {
        roles = [
          ...roles,
          ...clientRoles.map((r) => `${this.keycloakConfig.clientId}:${r}`),
        ];
      }

      // Optionally add roles from all clients (prefixed)
      for (const [client, access] of Object.entries(resourceAccess)) {
        if (client !== this.keycloakConfig.clientId && access.roles) {
          roles = [...roles, ...access.roles.map((r) => `${client}:${r}`)];
        }
      }
    }

    // Apply default roles
    if (roles.length === 0 && this.rbacConfig.defaultRoles) {
      roles = this.rbacConfig.defaultRoles;
    }

    // Get scope as permissions
    let permissions: string[] = [];
    const scope = claims.scope as string | undefined;
    if (scope) {
      permissions = scope.split(" ").filter((s) => s.length > 0);
    }

    // Build provider data, filtering out undefined values
    const providerData: Record<
      string,
      import("../../types/index.js").JsonValue
    > = {
      provider: "keycloak",
    };
    if (claims.preferred_username !== undefined) {
      providerData.preferred_username = claims.preferred_username;
    }
    if (claims.given_name !== undefined) {
      providerData.given_name = claims.given_name;
    }
    if (claims.family_name !== undefined) {
      providerData.family_name = claims.family_name;
    }
    if (realmAccess !== undefined) {
      providerData.realm_access =
        realmAccess as import("../../types/index.js").JsonValue;
    }
    if (resourceAccess !== undefined) {
      providerData.resource_access =
        resourceAccess as import("../../types/index.js").JsonValue;
    }
    if (claims.azp !== undefined) {
      providerData.azp = claims.azp;
    }
    if (claims.session_state !== undefined) {
      providerData.session_state = claims.session_state;
    }
    if (claims.acr !== undefined) {
      providerData.acr = claims.acr;
    }
    if (claims.typ !== undefined) {
      providerData.typ = claims.typ;
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
   * Get user from Keycloak Admin API
   * Note: Requires client credentials with admin access
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    if (!this.keycloakConfig.clientSecret) {
      logger.debug("[KeycloakProvider] clientSecret required for admin API");
      return null;
    }

    try {
      // Get admin token
      const tokenResponse = await fetch(
        `${this.expectedIssuer}/protocol/openid-connect/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.keycloakConfig.clientId,
            client_secret: this.keycloakConfig.clientSecret,
          }),
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get admin token: ${tokenResponse.status}`);
      }

      const tokenData = (await tokenResponse.json()) as {
        access_token: string;
      };

      // Get user from admin API
      const serverUrl = this.keycloakConfig.serverUrl.replace(/\/$/, "");
      const userResponse = await fetch(
        `${serverUrl}/admin/realms/${this.keycloakConfig.realm}/users/${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!userResponse.ok) {
        if (userResponse.status === 404) {
          return null;
        }
        throw new Error(`Failed to get user: ${userResponse.status}`);
      }

      const userData = (await userResponse.json()) as Record<string, unknown>;

      // Get user's realm roles
      const rolesResponse = await fetch(
        `${serverUrl}/admin/realms/${this.keycloakConfig.realm}/users/${encodeURIComponent(userId)}/role-mappings/realm`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      let roles: string[] = this.rbacConfig.defaultRoles ?? [];
      if (rolesResponse.ok) {
        const rolesData = (await rolesResponse.json()) as Array<{
          name: string;
        }>;
        roles = rolesData.map((r) => r.name);
      }

      // Convert userData to Record<string, JsonValue> by filtering out undefined
      const providerData: Record<
        string,
        import("../../types/index.js").JsonValue
      > = {};
      for (const [key, value] of Object.entries(userData)) {
        if (value !== undefined) {
          providerData[key] = value as import("../../types/index.js").JsonValue;
        }
      }

      return {
        id: userData.id as string,
        email: userData.email as string | undefined,
        name:
          `${userData.firstName ?? ""} ${userData.lastName ?? ""}`.trim() ||
          (userData.username as string | undefined),
        picture: undefined, // Keycloak doesn't store picture by default
        roles,
        permissions: [],
        emailVerified: userData.emailVerified as boolean | undefined,
        providerData,
        createdAt: userData.createdTimestamp
          ? new Date(userData.createdTimestamp as number)
          : undefined,
      };
    } catch (error) {
      logger.error(`[KeycloakProvider] Failed to get user ${userId}:`, error);
      return null;
    }
  }
}

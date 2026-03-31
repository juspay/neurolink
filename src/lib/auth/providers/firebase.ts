// src/lib/auth/providers/firebase.ts

import { BaseAuthProvider } from "./BaseAuthProvider.js";
import { AuthError } from "../errors.js";
import type {
  AuthProviderConfig,
  FirebaseConfig,
  AuthUser,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
  AuthProviderType,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import * as jose from "jose";

/**
 * Firebase Authentication Provider
 *
 * Supports Firebase ID token validation using Google's public keys.
 * Can validate tokens locally or via Firebase REST API.
 *
 * Features:
 * - JWT validation using Google's public keys
 * - Token verification via Firebase REST API
 * - Custom claims extraction for roles/permissions
 *
 * @example
 * ```typescript
 * const firebase = new FirebaseAuthProvider({
 *   type: "firebase",
 *   projectId: "your-project-id"
 * });
 *
 * const result = await firebase.authenticateToken(idToken);
 * if (result.valid) {
 *   console.log("Authenticated user:", result.user);
 * }
 * ```
 */
export class FirebaseAuthProvider extends BaseAuthProvider {
  readonly type: AuthProviderType = "firebase";

  private projectId: string;
  private apiKey?: string;
  private serviceAccount?: {
    clientEmail: string;
    privateKey: string;
  };
  private jwks: jose.JWTVerifyGetKey | null = null;

  constructor(config: AuthProviderConfig & FirebaseConfig) {
    super(config);

    if (!config.projectId) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Firebase projectId is required",
        { details: { missingFields: ["projectId"] } },
      );
    }

    this.projectId = config.projectId;
    this.apiKey = config.apiKey;
    this.serviceAccount = config.serviceAccount;
  }

  /**
   * Initialize JWKS for Firebase token verification
   */
  async initialize(): Promise<void> {
    // Firebase uses Google's secure token service public keys
    const jwksUrl = new URL(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
    );
    this.jwks = jose.createRemoteJWKSet(jwksUrl);
    logger.debug(
      `Firebase provider initialized for project: ${this.projectId}`,
    );
  }

  /**
   * Validate Firebase ID token
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
          "Firebase JWKS was not initialized",
          { details: { provider: "firebase" } },
        );
      }

      // Verify the token using Google's public keys
      const { payload } = await jose.jwtVerify(token, jwks, {
        issuer: `https://securetoken.google.com/${this.projectId}`,
        audience: this.projectId,
      });

      // Extract user info from Firebase token claims
      const user = this.payloadToUser(payload);

      return {
        valid: true,
        payload: payload as unknown as Record<string, unknown>,
        user,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
        tokenType: "jwt",
      };
    } catch (error) {
      // If local validation fails and API key is available, try REST API
      if (this.apiKey) {
        return this.validateViaApi(token);
      }

      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate token via Firebase REST API
   */
  private async validateViaApi(token: string): Promise<TokenValidationResult> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken: token }),
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        const error = (await response.json()) as {
          error?: { message?: string };
        };
        return {
          valid: false,
          error:
            error.error?.message || `Firebase API returned ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        users?: Array<Record<string, unknown>>;
      };
      const users = data.users || [];

      if (users.length === 0) {
        return {
          valid: false,
          error: "User not found",
        };
      }

      const userData = users[0];
      const user = this.firebaseUserToAuthUser(userData);

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
    // Extract custom claims
    const customClaims = payload as Record<string, unknown>;

    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      picture: payload.picture as string | undefined,
      emailVerified: payload.email_verified as boolean | undefined,
      roles: (customClaims.roles as string[]) || [],
      permissions: (customClaims.permissions as string[]) || [],
      metadata: {
        firebase: {
          sign_in_provider:
            (payload.firebase as Record<string, unknown>)?.sign_in_provider ||
            "unknown",
          identities: (payload.firebase as Record<string, unknown>)?.identities,
        },
      },
    };
  }

  /**
   * Convert Firebase user data to AuthUser
   */
  private firebaseUserToAuthUser(userData: Record<string, unknown>): AuthUser {
    let customAttributes: Record<string, unknown> = {};
    if (userData.customAttributes) {
      try {
        customAttributes = JSON.parse(userData.customAttributes as string);
      } catch {
        logger.warn(
          "Failed to parse Firebase customAttributes, treating as empty",
        );
      }
    }

    return {
      id: userData.localId as string,
      email: userData.email as string | undefined,
      name: userData.displayName as string | undefined,
      picture: userData.photoUrl as string | undefined,
      emailVerified: userData.emailVerified as boolean | undefined,
      roles: (customAttributes.roles as string[]) || [],
      permissions: (customAttributes.permissions as string[]) || [],
      createdAt: userData.createdAt
        ? new Date(parseInt(userData.createdAt as string))
        : undefined,
      lastLoginAt: userData.lastLoginAt
        ? new Date(parseInt(userData.lastLoginAt as string))
        : undefined,
      metadata: {
        providerUserInfo: userData.providerUserInfo,
      },
    };
  }

  /**
   * Get user by ID via Firebase REST API
   * Requires API key
   */
  async getUser(_userId: string): Promise<AuthUser | null> {
    if (!this.apiKey) {
      logger.warn("Firebase API key required for user lookup");
      return null;
    }

    // Firebase REST API doesn't support direct user lookup by UID
    // This would require Admin SDK or custom backend
    logger.warn(
      "Direct user lookup by ID requires Firebase Admin SDK which is not supported in browser/edge environments",
    );
    return null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      // Check if we can fetch the JWKS
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
        { signal: AbortSignal.timeout(5000) },
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

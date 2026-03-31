// src/lib/auth/providers/jwt.ts

import * as jose from "jose";
import type {
  AuthHealthCheck,
  AuthProviderConfig,
  AuthRequestContext,
  AuthUser,
  JWTConfig,
  TokenValidationResult,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { AuthError } from "../errors.js";
import { BaseAuthProvider } from "./BaseAuthProvider.js";

/**
 * Generic JWT Provider
 *
 * Supports validation of JWT tokens using either symmetric secrets (HS256/384/512)
 * or asymmetric keys (RS256/384/512, ES256/384/512).
 *
 * Features:
 * - Symmetric secret validation (HMAC)
 * - Asymmetric key validation (RSA, ECDSA)
 * - Configurable algorithms
 * - Issuer and audience validation
 * - Token signing (symmetric keys only)
 * - Session management (inherited from BaseAuthProvider)
 *
 * @example
 * ```typescript
 * // Symmetric key (HMAC)
 * const jwtProvider = new JWTProvider({
 *   type: "jwt",
 *   secret: "your-256-bit-secret",
 *   algorithms: ["HS256"],
 *   issuer: "your-app",
 *   audience: "your-api",
 * });
 *
 * // Asymmetric key (RSA/ECDSA)
 * const jwtProvider = new JWTProvider({
 *   type: "jwt",
 *   publicKey: "-----BEGIN PUBLIC KEY-----...",
 *   algorithms: ["RS256"],
 *   issuer: "your-app",
 * });
 *
 * const result = await jwtProvider.authenticateToken(token);
 * ```
 */
export class JWTProvider extends BaseAuthProvider {
  readonly type = "jwt" as const;

  private secret?: string;
  private publicKey?: string;
  private algorithms: string[];
  private issuer?: string;
  private audience?: string | string[];

  private keyObject:
    | Uint8Array
    | Awaited<ReturnType<typeof jose.importSPKI>>
    | null = null;

  constructor(config: AuthProviderConfig & JWTConfig) {
    super(config);

    if (!config.secret && !config.publicKey) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "JWT requires either secret (for HMAC) or publicKey (for RSA/ECDSA)",
        {
          details: { provider: "jwt", missingFields: ["secret", "publicKey"] },
        },
      );
    }

    this.secret = config.secret;
    this.publicKey = config.publicKey;
    this.algorithms =
      config.algorithms ?? (config.secret ? ["HS256"] : ["RS256"]);
    this.issuer = config.issuer;
    this.audience = config.audience;
  }

  /**
   * Initialize the key for verification
   */
  async initialize(): Promise<void> {
    try {
      if (this.secret) {
        // Symmetric key (HMAC)
        this.keyObject = new TextEncoder().encode(this.secret);
        logger.debug("JWT provider initialized with symmetric secret");
      } else if (this.publicKey) {
        // Asymmetric key (RSA/ECDSA)
        this.keyObject = await jose.importSPKI(
          this.publicKey,
          this.algorithms[0] as
            | "RS256"
            | "RS384"
            | "RS512"
            | "ES256"
            | "ES384"
            | "ES512",
        );
        logger.debug("JWT provider initialized with asymmetric public key");
      }
    } catch (error) {
      throw AuthError.create(
        "PROVIDER_INIT_FAILED",
        `Failed to initialize JWT key: ${error instanceof Error ? error.message : String(error)}`,
        {
          details: { provider: "jwt" },
          cause: error instanceof Error ? error : undefined,
        },
      );
    }
  }

  /**
   * Validate JWT token
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    if (!this.keyObject) {
      await this.initialize();
    }

    try {
      const keyObject = this.keyObject;
      if (!keyObject) {
        throw AuthError.create(
          "PROVIDER_INIT_FAILED",
          "JWT verification key was not initialized",
          { details: { provider: "jwt" } },
        );
      }

      const verifyOptions: jose.JWTVerifyOptions = {};

      if (this.algorithms.length > 0) {
        verifyOptions.algorithms = this
          .algorithms as jose.JWTVerifyOptions["algorithms"];
      }

      if (this.issuer) {
        verifyOptions.issuer = this.issuer;
      }

      if (this.audience) {
        verifyOptions.audience = this.audience;
      }

      const { payload } = await jose.jwtVerify(token, keyObject, verifyOptions);

      // Reject tokens without a non-empty sub claim
      if (!payload.sub) {
        return {
          valid: false,
          error: "JWT is missing required 'sub' claim: cannot identify user",
        };
      }

      // Extract user from standard JWT claims
      const user: AuthUser = {
        id: payload.sub,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        picture: payload.picture as string | undefined,
        emailVerified: payload.email_verified as boolean | undefined,
        roles: (payload.roles as string[]) ?? [],
        permissions:
          (payload.permissions as string[]) ??
          (payload.scope as string)?.split(" ") ??
          [],
        metadata: {
          iss: payload.iss,
          aud: payload.aud,
          jti: payload.jti,
        },
      };

      return {
        valid: true,
        payload: payload as unknown as Record<string, unknown>,
        user,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
        tokenType: "jwt",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("JWT validation failed:", message);

      // Provide specific error messages
      let errorDetail = message;
      if (message.includes("JWTExpired")) {
        errorDetail = "Token has expired";
      } else if (message.includes("signature")) {
        errorDetail = "Invalid token signature";
      } else if (message.includes("audience")) {
        errorDetail = "Invalid token audience";
      } else if (message.includes("issuer")) {
        errorDetail = "Invalid token issuer";
      }

      return {
        valid: false,
        error: errorDetail,
      };
    }
  }

  /**
   * Create a signed JWT token
   *
   * Useful for issuing tokens from this provider.
   */
  async signToken(
    payload: Record<string, unknown>,
    options?: { expiresIn?: string },
  ): Promise<string> {
    if (!this.secret) {
      throw AuthError.create(
        "CONFIGURATION_ERROR",
        "Token signing requires a secret (symmetric key)",
        { details: { provider: "jwt" } },
      );
    }

    if (!this.keyObject) {
      await this.initialize();
    }

    const jwt = new jose.SignJWT(payload as jose.JWTPayload)
      .setProtectedHeader({ alg: this.algorithms[0] })
      .setIssuedAt();

    if (this.issuer) {
      jwt.setIssuer(this.issuer);
    }

    if (this.audience) {
      jwt.setAudience(this.audience);
    }

    if (options?.expiresIn) {
      jwt.setExpirationTime(options.expiresIn);
    }

    return jwt.sign(this.keyObject as Uint8Array);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      // Verify the key is properly initialized
      if (!this.keyObject) {
        await this.initialize();
      }

      return {
        healthy: this.keyObject !== null,
        providerConnected: true,
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

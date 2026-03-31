/**
 * Anthropic OAuth 2.0 Authentication for Claude Pro/Max Subscriptions
 *
 * This module implements OAuth 2.0 flow with PKCE support for authenticating
 * Claude Pro and Max subscription users through console.anthropic.com.
 *
 * OAuth Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. User is redirected to Anthropic authorization URL
 * 3. User authenticates and grants permissions
 * 4. Callback receives authorization code
 * 5. Code is exchanged for access and refresh tokens
 * 6. Tokens are used for API authentication
 *
 * @module auth/anthropicOAuth
 */

import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import { createServer, IncomingMessage, ServerResponse } from "http";
import type { Server } from "http";
import {
  OAuthError,
  OAuthConfigurationError,
  OAuthTokenExchangeError,
  OAuthTokenRefreshError,
  OAuthTokenRevocationError,
  OAuthCallbackServerError,
} from "../types/errors.js";
import { logger } from "../utils/logger.js";

/**
 * HTML-escape a string to prevent XSS when embedding in HTML responses.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Redact likely tokens/secrets from a string before logging.
 * Replaces JWTs and long opaque token strings.
 */
function redactTokens(s: string): string {
  return s
    .replace(/[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, "[JWT]")
    .replace(/\b[A-Za-z0-9\-_]{32,}\b/g, "[TOKEN]");
}

// =============================================================================
// OAUTH CONSTANTS (Claude Code Official)
// =============================================================================

/**
 * Claude Code's official OAuth client ID
 * Used to authenticate with Anthropic's OAuth system
 */
export const CLAUDE_CODE_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";

/**
 * Anthropic OAuth authorization URL for Claude Pro/Max
 */
export const ANTHROPIC_AUTH_URL = "https://claude.ai/oauth/authorize";

/**
 * Anthropic OAuth token endpoint (primary — lighter Cloudflare)
 */
export const ANTHROPIC_TOKEN_URL = "https://api.anthropic.com/v1/oauth/token";

/**
 * Anthropic OAuth token endpoint (fallback)
 */
export const ANTHROPIC_TOKEN_URL_FALLBACK =
  "https://console.anthropic.com/v1/oauth/token";

/**
 * Anthropic OAuth redirect URI (official callback)
 */
export const ANTHROPIC_REDIRECT_URI =
  "https://console.anthropic.com/oauth/code/callback";

/**
 * Default OAuth scopes for Claude subscription access
 */
export const DEFAULT_SCOPES: readonly string[] = [
  "org:create_api_key",
  "user:profile",
  "user:inference",
];

/**
 * User-Agent string to spoof Claude CLI
 */
export const CLAUDE_CODE_VERSION = "2.1.87.6d6";
export const CLAUDE_CODE_ENTRYPOINT = "sdk-cli";
export const CLAUDE_CLI_USER_AGENT = "claude-cli/2.1.87 (external, sdk-cli)";

export type ClaudeCodeIdentity = {
  deviceId: string;
  accountUuid: string;
  sessionId: string;
  metadataUserId: string;
};

const CLAUDE_CODE_IDENTITY_TTL_MS = 3_600_000;
const CLAUDE_CODE_IDENTITY_NAMESPACE = "neurolink-claude-code-identity-v1";
const claudeCodeIdentityCache = new Map<
  string,
  ClaudeCodeIdentity & { expiresAt: number }
>();

function stableIdentityDigest(input: string): string {
  // These identifiers are deterministic pseudonyms for Claude Code metadata,
  // not password hashes or authentication secrets.
  return createHmac("sha256", CLAUDE_CODE_IDENTITY_NAMESPACE)
    .update(input)
    .digest("hex");
}

function hexToUuid(hex: string): string {
  const trimmed = hex.replace(/-/g, "").slice(0, 32).padEnd(32, "0");
  return `${trimmed.slice(0, 8)}-${trimmed.slice(8, 12)}-${trimmed.slice(12, 16)}-${trimmed.slice(16, 20)}-${trimmed.slice(20, 32)}`;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function buildMetadataUserId(identity: {
  deviceId: string;
  accountUuid: string;
  sessionId: string;
}): string {
  return JSON.stringify({
    device_id: identity.deviceId,
    account_uuid: identity.accountUuid,
    session_id: identity.sessionId,
  });
}

export function parseClaudeCodeUserId(
  userId: unknown,
): ClaudeCodeIdentity | null {
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(userId) as {
      device_id?: unknown;
      account_uuid?: unknown;
      session_id?: unknown;
    };
    if (
      typeof parsed.device_id !== "string" ||
      !/^[0-9a-f]{64}$/i.test(parsed.device_id) ||
      typeof parsed.account_uuid !== "string" ||
      !isUuid(parsed.account_uuid) ||
      typeof parsed.session_id !== "string" ||
      !isUuid(parsed.session_id)
    ) {
      return null;
    }

    return {
      deviceId: parsed.device_id,
      accountUuid: parsed.account_uuid,
      sessionId: parsed.session_id,
      metadataUserId: buildMetadataUserId({
        deviceId: parsed.device_id,
        accountUuid: parsed.account_uuid,
        sessionId: parsed.session_id,
      }),
    };
  } catch {
    return null;
  }
}

export function getOrCreateClaudeCodeIdentity(
  seed: string,
  options?: { existingUserId?: unknown; preferredSessionId?: string },
): ClaudeCodeIdentity {
  const parsedExisting = parseClaudeCodeUserId(options?.existingUserId);
  if (parsedExisting) {
    if (options?.preferredSessionId && isUuid(options.preferredSessionId)) {
      return {
        deviceId: parsedExisting.deviceId,
        accountUuid: parsedExisting.accountUuid,
        sessionId: options.preferredSessionId,
        metadataUserId: buildMetadataUserId({
          deviceId: parsedExisting.deviceId,
          accountUuid: parsedExisting.accountUuid,
          sessionId: options.preferredSessionId,
        }),
      };
    }
    return parsedExisting;
  }

  const now = Date.now();
  const cacheKey = seed || "default";
  const cached = claudeCodeIdentityCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    if (options?.preferredSessionId && isUuid(options.preferredSessionId)) {
      return {
        deviceId: cached.deviceId,
        accountUuid: cached.accountUuid,
        sessionId: options.preferredSessionId,
        metadataUserId: buildMetadataUserId({
          deviceId: cached.deviceId,
          accountUuid: cached.accountUuid,
          sessionId: options.preferredSessionId,
        }),
      };
    }
    return cached;
  }

  const deviceId = stableIdentityDigest(`${cacheKey}:device`);
  const accountUuid = hexToUuid(stableIdentityDigest(`${cacheKey}:account`));
  const sessionId =
    options?.preferredSessionId && isUuid(options.preferredSessionId)
      ? options.preferredSessionId
      : randomUUID();
  const identity = {
    deviceId,
    accountUuid,
    sessionId,
    metadataUserId: buildMetadataUserId({
      deviceId,
      accountUuid,
      sessionId,
    }),
    expiresAt: now + CLAUDE_CODE_IDENTITY_TTL_MS,
  };
  claudeCodeIdentityCache.set(cacheKey, identity);
  return identity;
}

export function purgeExpiredClaudeCodeIdentities(now = Date.now()): number {
  let removed = 0;
  for (const [cacheKey, identity] of claudeCodeIdentityCache.entries()) {
    if (identity.expiresAt <= now) {
      claudeCodeIdentityCache.delete(cacheKey);
      removed += 1;
    }
  }
  return removed;
}

export function buildStableClaudeCodeBillingHeader(
  originalText?: string,
): string {
  const version =
    originalText?.match(/cc_version=([^;]+)/)?.[1]?.trim() ||
    CLAUDE_CODE_VERSION;
  const entrypoint =
    originalText?.match(/cc_entrypoint=([^;]+)/)?.[1]?.trim() ||
    CLAUDE_CODE_ENTRYPOINT;

  return `x-anthropic-billing-header: cc_version=${version}; cc_entrypoint=${entrypoint}; cch=00000;`;
}

/**
 * Required beta headers for OAuth API requests.
 * The "oauth-2025-04-20" header is CRITICAL for OAuth authentication.
 */
export const OAUTH_BETA_HEADERS = "oauth-2025-04-20";

export const CLAUDE_CODE_OAUTH_BETAS = [
  "oauth-2025-04-20",
  "claude-code-20250219",
  "context-management-2025-06-27",
  "prompt-caching-scope-2026-01-05",
  "advanced-tool-use-2025-11-20",
  "effort-2025-11-24",
] as const;

/**
 * Tool name prefix required for OAuth API requests
 */
export const MCP_TOOL_PREFIX = "mcp_";

/**
 * @deprecated Use ANTHROPIC_AUTH_URL instead
 */
export const ANTHROPIC_OAUTH_BASE_URL = "https://console.anthropic.com/oauth";

/**
 * @deprecated Use ANTHROPIC_REDIRECT_URI instead
 */
export const DEFAULT_REDIRECT_URI =
  "https://console.anthropic.com/oauth/code/callback";

/**
 * Default local callback server port (for local testing only)
 */
export const DEFAULT_CALLBACK_PORT = 8787;

// =============================================================================
// TYPES AND INTERFACES (canonical definitions in types/subscriptionTypes.ts)
// =============================================================================

import type {
  OAuthTokenResponse,
  OAuthFlowTokens,
  TokenValidationResult,
  AnthropicOAuthConfig,
  PKCEParams,
  CallbackResult,
} from "../types/index.js";

// =============================================================================
// MAIN OAUTH CLASS
// =============================================================================

/**
 * AnthropicOAuth - OAuth 2.0 authentication for Claude Pro/Max subscriptions
 *
 * Implements OAuth 2.0 authorization code flow with PKCE support for
 * authenticating users with Claude Pro or Max subscriptions.
 *
 * @example
 * ```typescript
 * const oauth = new AnthropicOAuth({
 *   clientId: "your-client-id",
 *   redirectUri: "http://localhost:8787/callback",
 * });
 *
 * // Generate PKCE parameters
 * const codeVerifier = AnthropicOAuth.generateCodeVerifier();
 * const codeChallenge = await AnthropicOAuth.generateCodeChallenge(codeVerifier);
 *
 * // Generate auth URL
 * const authUrl = oauth.generateAuthUrl({
 *   codeChallenge,
 *   state: "random-state",
 * });
 *
 * // After user authenticates, exchange code for tokens
 * const tokens = await oauth.exchangeCodeForTokens(code, codeVerifier);
 * ```
 */
export class AnthropicOAuth {
  private readonly clientId: string;
  private readonly clientSecret?: string;
  private readonly redirectUri: string;
  private readonly scopes: string[];
  private readonly authorizationUrl: string;
  private readonly tokenUrl: string;
  private readonly validationUrl: string;
  private readonly revocationUrl: string;

  constructor(config: AnthropicOAuthConfig = {}) {
    // Get client ID from config or environment, defaulting to Claude Code's official client ID
    this.clientId =
      config.clientId ||
      process.env.ANTHROPIC_OAUTH_CLIENT_ID ||
      CLAUDE_CODE_CLIENT_ID;
    if (!this.clientId) {
      throw new OAuthConfigurationError(
        "Missing OAuth client ID. Set ANTHROPIC_OAUTH_CLIENT_ID environment variable or provide clientId in config.",
      );
    }

    // Client secret is optional (for public clients using PKCE)
    this.clientSecret =
      config.clientSecret || process.env.ANTHROPIC_OAUTH_CLIENT_SECRET;

    // Get redirect URI from config or environment or use official redirect URI
    this.redirectUri =
      config.redirectUri ||
      process.env.ANTHROPIC_OAUTH_REDIRECT_URI ||
      ANTHROPIC_REDIRECT_URI;

    // Configure scopes
    this.scopes = config.scopes || [...DEFAULT_SCOPES];

    // Configure endpoints (using Claude Code's official endpoints)
    this.authorizationUrl = config.authorizationUrl || ANTHROPIC_AUTH_URL;
    this.tokenUrl = config.tokenUrl || ANTHROPIC_TOKEN_URL;
    this.validationUrl =
      config.validationUrl || "https://console.anthropic.com/v1/oauth/validate";
    this.revocationUrl =
      config.revocationUrl || "https://console.anthropic.com/v1/oauth/revoke";

    logger.debug("AnthropicOAuth initialized", {
      clientId: this.clientId.substring(0, 8) + "...",
      redirectUri: this.redirectUri,
      scopes: this.scopes,
    });
  }

  // =============================================================================
  // PKCE METHODS (STATIC)
  // =============================================================================

  /**
   * Generates a cryptographically secure code verifier for PKCE
   *
   * The code verifier is a high-entropy random string between 43-128 characters
   * using URL-safe characters (A-Z, a-z, 0-9, "-", ".", "_", "~").
   *
   * @returns A random code verifier string (64 characters)
   *
   * @example
   * ```typescript
   * const codeVerifier = AnthropicOAuth.generateCodeVerifier();
   * // Returns something like "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
   * ```
   */
  static generateCodeVerifier(): string {
    // Generate 32 random bytes and convert to base64url (43-44 chars)
    // Using 48 bytes gives us 64 characters which is well within spec
    const buffer = randomBytes(48);
    return buffer
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * Generates a PKCE code challenge from a code verifier
   *
   * Uses SHA-256 hashing as per RFC 7636. The challenge is the
   * base64url-encoded SHA-256 hash of the code verifier.
   *
   * @param verifier - The code verifier to generate challenge from
   * @returns Promise resolving to the code challenge string
   *
   * @example
   * ```typescript
   * const verifier = AnthropicOAuth.generateCodeVerifier();
   * const challenge = await AnthropicOAuth.generateCodeChallenge(verifier);
   * ```
   */
  static async generateCodeChallenge(verifier: string): Promise<string> {
    if (!verifier || verifier.length < 43 || verifier.length > 128) {
      throw new OAuthError(
        "Code verifier must be between 43-128 characters",
        "INVALID_CODE_VERIFIER",
      );
    }

    // Create SHA-256 hash of the verifier
    const hash = createHash("sha256").update(verifier).digest();

    // Base64URL encode the hash
    return hash
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  }

  /**
   * Generates both code verifier and challenge for PKCE
   *
   * Convenience method that generates both PKCE parameters at once.
   *
   * @returns Promise resolving to PKCE parameters object
   *
   * @example
   * ```typescript
   * const pkce = await AnthropicOAuth.generatePKCE();
   * console.log(pkce.codeVerifier);
   * console.log(pkce.codeChallenge);
   * ```
   */
  static async generatePKCE(): Promise<PKCEParams> {
    const codeVerifier = AnthropicOAuth.generateCodeVerifier();
    const codeChallenge =
      await AnthropicOAuth.generateCodeChallenge(codeVerifier);

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: "S256",
    };
  }

  // =============================================================================
  // AUTHORIZATION URL GENERATION
  // =============================================================================

  /**
   * Generates the OAuth authorization URL with PKCE support
   *
   * Builds the complete authorization URL including all required parameters
   * for the OAuth 2.0 authorization code flow with PKCE.
   *
   * @param config - Authorization URL configuration
   * @param state - Optional state parameter for CSRF protection
   * @returns The complete authorization URL
   *
   * @example
   * ```typescript
   * const pkce = await AnthropicOAuth.generatePKCE();
   * const authUrl = oauth.generateAuthUrl({
   *   codeChallenge: pkce.codeChallenge,
   *   state: crypto.randomUUID(),
   * });
   * // Redirect user to authUrl
   * ```
   */
  generateAuthUrl(
    config: {
      /** PKCE code challenge (required for public clients) */
      codeChallenge?: string;
      /** Additional URL parameters */
      additionalParams?: Record<string, string>;
    } = {},
    state?: string,
  ): string {
    // Generate state if not provided
    const stateParam = state || this.generateState();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(" "),
      state: stateParam,
    });

    // Add PKCE code challenge if provided
    if (config.codeChallenge) {
      params.append("code_challenge", config.codeChallenge);
      params.append("code_challenge_method", "S256");
    }

    // Add any additional parameters
    if (config.additionalParams) {
      for (const [key, value] of Object.entries(config.additionalParams)) {
        params.append(key, value);
      }
    }

    const url = `${this.authorizationUrl}?${params.toString()}`;

    logger.debug("Generated authorization URL", {
      url: url.substring(0, 80) + "...",
      hasPKCE: !!config.codeChallenge,
    });

    return url;
  }

  // =============================================================================
  // TOKEN EXCHANGE
  // =============================================================================

  /**
   * Exchanges an authorization code for access and refresh tokens
   *
   * Performs the token exchange step of the OAuth flow. For public clients
   * using PKCE, the code verifier must be provided.
   *
   * @param code - The authorization code from the OAuth callback
   * @param codeVerifier - The PKCE code verifier used to generate the challenge
   * @param config - Optional additional configuration
   * @returns Promise resolving to the parsed OAuth tokens
   * @throws OAuthTokenExchangeError if the exchange fails
   *
   * @example
   * ```typescript
   * const tokens = await oauth.exchangeCodeForTokens(
   *   authorizationCode,
   *   pkce.codeVerifier
   * );
   * console.log("Access token:", tokens.accessToken);
   * console.log("Expires at:", tokens.expiresAt);
   * ```
   */
  async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    config: AnthropicOAuthConfig = {},
  ): Promise<OAuthFlowTokens> {
    if (!code) {
      throw new OAuthTokenExchangeError("Authorization code is required");
    }

    if (!codeVerifier) {
      throw new OAuthTokenExchangeError(
        "Code verifier is required for PKCE token exchange",
      );
    }

    logger.debug("Exchanging authorization code for tokens");

    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: config.redirectUri || this.redirectUri,
      client_id: config.clientId || this.clientId,
      code_verifier: codeVerifier,
    };

    // Add client secret if available (confidential clients)
    const clientSecret = config.clientSecret || this.clientSecret;
    if (clientSecret) {
      body.client_secret = clientSecret;
    }

    const urls = this.getTokenUrls(config.tokenUrl);
    let lastError: unknown;

    for (const url of urls) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams(body).toString(),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error("Token exchange failed", {
            url,
            status: response.status,
            error: redactTokens(errorBody).slice(0, 500),
          });
          lastError = new OAuthTokenExchangeError(
            `Token exchange failed: ${response.status} - ${errorBody}`,
            response.status,
          );
          continue;
        }

        const tokenResponse: OAuthTokenResponse = await response.json();
        const tokens = this.parseTokenResponse(tokenResponse);

        logger.info("Token exchange successful", {
          expiresAt: tokens.expiresAt.toISOString(),
          hasRefreshToken: !!tokens.refreshToken,
        });

        return tokens;
      } catch (error) {
        if (error instanceof OAuthError) {
          lastError = error;
          continue;
        }
        lastError = new OAuthTokenExchangeError(
          `Failed to exchange authorization code: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    throw lastError instanceof OAuthError
      ? lastError
      : new OAuthTokenExchangeError(
          `Failed to exchange authorization code: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        );
  }

  // =============================================================================
  // TOKEN REFRESH
  // =============================================================================

  /**
   * Refreshes an expired access token using a refresh token
   *
   * @param refreshToken - The refresh token from a previous authentication
   * @param config - Optional configuration overrides
   * @returns Promise resolving to new OAuth tokens
   * @throws OAuthTokenRefreshError if the refresh fails
   *
   * @example
   * ```typescript
   * if (AnthropicOAuth.isTokenExpired(tokens.expiresAt)) {
   *   const newTokens = await oauth.refreshAccessToken(tokens.refreshToken);
   *   console.log("New access token:", newTokens.accessToken);
   * }
   * ```
   */
  async refreshAccessToken(
    refreshToken: string,
    config: AnthropicOAuthConfig = {},
  ): Promise<OAuthFlowTokens> {
    if (!refreshToken) {
      throw new OAuthTokenRefreshError("Refresh token is required");
    }

    logger.debug("Refreshing access token");

    const body: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: config.clientId || this.clientId,
    };

    // Add client secret if available
    const clientSecret = config.clientSecret || this.clientSecret;
    if (clientSecret) {
      body.client_secret = clientSecret;
    }

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": CLAUDE_CLI_USER_AGENT,
    };

    const urls = this.getTokenUrls(config.tokenUrl);

    let lastError: unknown;

    for (const url of urls) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: new URLSearchParams(body).toString(),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error("Token refresh failed", {
            url,
            status: response.status,
            error: redactTokens(errorBody).slice(0, 500),
          });
          lastError = new OAuthTokenRefreshError(
            `Token refresh failed: ${response.status} - ${errorBody}`,
            response.status,
          );
          // Try fallback URL if available
          continue;
        }

        const tokenResponse: OAuthTokenResponse = await response.json();
        const tokens = this.parseTokenResponse(tokenResponse);

        logger.info("Access token refreshed successfully", {
          expiresAt: tokens.expiresAt.toISOString(),
        });

        return tokens;
      } catch (error) {
        if (error instanceof OAuthError) {
          lastError = error;
          // Try fallback URL if available
          continue;
        }
        lastError = new OAuthTokenRefreshError(
          `Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // All URLs exhausted — throw the last error
    throw lastError instanceof OAuthError
      ? lastError
      : new OAuthTokenRefreshError(
          `Failed to refresh access token: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
        );
  }

  // =============================================================================
  // TOKEN VALIDATION
  // =============================================================================

  /**
   * Validates an access token and returns token information
   *
   * Checks if the token is still valid by calling the validation endpoint.
   * Returns user information if available.
   *
   * @param accessToken - The access token to validate
   * @returns Promise resolving to validation result
   *
   * @example
   * ```typescript
   * const result = await oauth.validateToken(accessToken);
   * if (result.isValid) {
   *   console.log("Token is valid, expires in:", result.expiresIn, "seconds");
   *   console.log("User email:", result.user?.email);
   * } else {
   *   console.log("Token is invalid:", result.error);
   * }
   * ```
   */
  async validateToken(accessToken: string): Promise<boolean> {
    if (!accessToken) {
      return false;
    }

    logger.debug("Validating access token");

    try {
      const response = await fetch(this.validationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": CLAUDE_CLI_USER_AGENT,
        },
        body: new URLSearchParams({
          token: accessToken,
        }).toString(),
      });

      if (!response.ok) {
        logger.debug("Token validation failed", {
          status: response.status,
        });
        return false;
      }

      logger.debug("Token is valid");
      return true;
    } catch (error) {
      logger.warn("Token validation request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Validates token and returns detailed information
   *
   * @param accessToken - The access token to validate
   * @returns Promise resolving to detailed validation result
   */
  async validateTokenWithDetails(
    accessToken: string,
  ): Promise<TokenValidationResult> {
    if (!accessToken) {
      return {
        isValid: false,
        error: "Access token is required",
      };
    }

    logger.debug("Validating access token with details");

    try {
      const response = await fetch(this.validationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": CLAUDE_CLI_USER_AGENT,
        },
        body: new URLSearchParams({
          token: accessToken,
        }).toString(),
      });

      if (!response.ok) {
        logger.debug("Token validation failed", {
          status: response.status,
        });
        return {
          isValid: false,
          error: `Token validation failed: ${response.status}`,
        };
      }

      const validationData = await response.json();

      return {
        isValid: true,
        expiresIn: validationData.expires_in,
        scopes: validationData.scope?.split(" ") || [],
        user: validationData.user
          ? {
              id: validationData.user.id,
              email: validationData.user.email,
              subscription: validationData.user.subscription,
            }
          : undefined,
      };
    } catch (error) {
      logger.warn("Token validation request failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        isValid: false,
        error: `Validation request failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // =============================================================================
  // TOKEN REVOCATION
  // =============================================================================

  /**
   * Revokes an access token or refresh token
   *
   * @param token - The token to revoke
   * @param tokenType - Type of token ("access_token" or "refresh_token")
   * @returns Promise that resolves when revocation is complete
   * @throws OAuthTokenRevocationError if revocation fails
   */
  async revokeToken(
    token: string,
    tokenType: "access_token" | "refresh_token" = "access_token",
  ): Promise<void> {
    if (!token) {
      throw new OAuthTokenRevocationError("Token is required for revocation");
    }

    logger.debug("Revoking token", { tokenType });

    const body: Record<string, string> = {
      token: token,
      token_type_hint: tokenType,
      client_id: this.clientId,
    };

    if (this.clientSecret) {
      body.client_secret = this.clientSecret;
    }

    try {
      const response = await fetch(this.revocationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams(body).toString(),
      });

      // RFC 7009: Revocation endpoint should return 200 even if token was already revoked
      if (!response.ok && response.status !== 200) {
        const errorBody = await response.text();
        logger.error("Token revocation failed", {
          status: response.status,
          error: redactTokens(errorBody).slice(0, 500),
        });
        throw new OAuthTokenRevocationError(
          `Token revocation failed: ${response.status} - ${errorBody}`,
          response.status,
        );
      }

      logger.info("Token revoked successfully", { tokenType });
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new OAuthTokenRevocationError(
        `Failed to revoke token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // =============================================================================
  // HELPER METHODS
  // =============================================================================

  /**
   * Build the list of token endpoint URLs to try, with optional fallback.
   *
   * When a custom tokenUrl was provided (via config param OR constructor), never
   * fall back to the default Anthropic endpoint — leaking credentials to an
   * unexpected endpoint is a security risk.
   */
  private getTokenUrls(configTokenUrl?: string): string[] {
    if (configTokenUrl) {
      return [configTokenUrl];
    }
    const isCustomConstructorUrl = this.tokenUrl !== ANTHROPIC_TOKEN_URL;
    if (isCustomConstructorUrl) {
      return [this.tokenUrl];
    }
    return [this.tokenUrl, ANTHROPIC_TOKEN_URL_FALLBACK];
  }

  /**
   * Parses a token response into structured OAuthFlowTokens
   */
  private parseTokenResponse(response: OAuthTokenResponse): OAuthFlowTokens {
    const expiresAt = new Date(Date.now() + response.expires_in * 1000);

    return {
      accessToken: response.access_token,
      tokenType: response.token_type || "Bearer",
      expiresAt: expiresAt,
      refreshToken: response.refresh_token,
      scopes: response.scope?.split(" ") || this.scopes,
    };
  }

  /**
   * Generates a random state parameter for CSRF protection
   */
  private generateState(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Checks if a token is expired or about to expire
   *
   * @param expiresAt - Token expiration date
   * @param bufferSeconds - Buffer time before actual expiration (default: 60 seconds)
   * @returns True if token is expired or will expire within buffer time
   */
  static isTokenExpired(expiresAt: Date, bufferSeconds: number = 60): boolean {
    const bufferMs = bufferSeconds * 1000;
    return Date.now() >= expiresAt.getTime() - bufferMs;
  }

  /**
   * Gets the configured client ID
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * Gets the configured redirect URI
   */
  getRedirectUri(): string {
    return this.redirectUri;
  }

  /**
   * Gets the configured scopes
   */
  getScopes(): readonly string[] {
    return this.scopes;
  }
}

// =============================================================================
// LOCAL CALLBACK SERVER HELPER
// =============================================================================

/**
 * Creates and starts a local HTTP server to receive OAuth callbacks
 *
 * This helper function starts a temporary HTTP server that listens for
 * the OAuth callback and extracts the authorization code.
 *
 * @param port - Port to listen on (default: 8787)
 * @param path - Path to listen on (default: "/callback")
 * @param timeout - Timeout in milliseconds (default: 5 minutes)
 * @returns Promise resolving to the callback result with authorization code
 *
 * @example
 * ```typescript
 * // Start callback server before redirecting user
 * const callbackPromise = startCallbackServer();
 *
 * // Generate auth URL and redirect user
 * const authUrl = oauth.generateAuthUrl({ codeChallenge });
 * console.log("Please visit:", authUrl);
 *
 * // Wait for callback
 * const result = await callbackPromise;
 * console.log("Got authorization code:", result.code);
 *
 * // Exchange for tokens
 * const tokens = await oauth.exchangeCodeForTokens(result.code, codeVerifier);
 * ```
 */
export function startCallbackServer(
  port: number = DEFAULT_CALLBACK_PORT,
  path: string = "/callback",
  timeout: number = 5 * 60 * 1000, // 5 minutes default
): Promise<CallbackResult> {
  return new Promise((resolve, reject) => {
    let server: Server | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (server) {
        server.close();
        server = null;
      }
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      cleanup();
      reject(
        new OAuthCallbackServerError(
          `Callback server timed out after ${timeout / 1000} seconds`,
        ),
      );
    }, timeout);

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      // Only handle the callback path
      const url = new URL(req.url || "/", `http://localhost:${port}`);
      if (url.pathname !== path) {
        res.writeHead(404);
        res.end("Not Found");
        return;
      }

      // Extract authorization code and state
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error) {
        // OAuth error response — HTML-escape user-provided values to prevent XSS
        const safeError = escapeHtml(error);
        const safeDescription = errorDescription
          ? escapeHtml(errorDescription)
          : "Please try again.";
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Authentication Error</title></head>
            <body>
              <h1>Authentication Failed</h1>
              <p>Error: ${safeError}</p>
              <p>${safeDescription}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        cleanup();
        reject(
          new OAuthCallbackServerError(
            `OAuth error: ${error} - ${errorDescription}`,
          ),
        );
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>Missing Authorization Code</title></head>
            <body>
              <h1>Authentication Failed</h1>
              <p>No authorization code received.</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        cleanup();
        reject(
          new OAuthCallbackServerError("No authorization code in callback"),
        );
        return;
      }

      // Success response
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Successful</title></head>
          <body>
            <h1>Authentication Successful!</h1>
            <p>You have been authenticated successfully.</p>
            <p>You can close this window and return to the CLI.</p>
            <script>window.close();</script>
          </body>
        </html>
      `);

      cleanup();
      resolve({
        code,
        state: state || undefined,
      });
    });

    server.on("error", (error: Error) => {
      cleanup();
      reject(
        new OAuthCallbackServerError(
          `Failed to start callback server: ${error.message}`,
        ),
      );
    });

    server.listen(port, () => {
      logger.info(`OAuth callback server listening on port ${port}`);
    });
  });
}

/**
 * Stops the callback server if running
 * Note: The server automatically stops after receiving a callback or timing out
 */
export async function stopCallbackServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(
          new OAuthCallbackServerError(
            `Failed to stop callback server: ${error.message}`,
          ),
        );
      } else {
        logger.info("OAuth callback server stopped");
        resolve();
      }
    });
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates an AnthropicOAuth instance with default configuration from environment
 *
 * @param overrides - Optional configuration overrides
 * @returns Configured AnthropicOAuth instance
 *
 * @example
 * ```typescript
 * const oauth = createAnthropicOAuth();
 * const authUrl = oauth.generateAuthUrl({ codeChallenge });
 * ```
 */
export function createAnthropicOAuth(
  overrides: Partial<AnthropicOAuthConfig> = {},
): AnthropicOAuth {
  return new AnthropicOAuth(overrides);
}

/**
 * Anthropic OAuth configuration creator for providerConfig pattern
 *
 * @returns Provider configuration options for Anthropic OAuth
 */
export function createAnthropicOAuthConfig() {
  return {
    providerName: "Anthropic OAuth",
    envVarName: "ANTHROPIC_OAUTH_CLIENT_ID",
    setupUrl: ANTHROPIC_OAUTH_BASE_URL,
    description: "Claude Pro/Max OAuth Client Credentials",
    instructions: [
      `1. Visit: ${ANTHROPIC_OAUTH_BASE_URL}`,
      "2. Create an OAuth application",
      "3. Copy the Client ID",
      `4. Set redirect URI to: ${DEFAULT_REDIRECT_URI}`,
      "5. Set ANTHROPIC_OAUTH_CLIENT_ID environment variable",
    ],
    fallbackEnvVars: [],
  };
}

/**
 * Checks if Anthropic OAuth credentials are configured
 *
 * @returns True if OAuth client ID is available
 */
export function hasAnthropicOAuthCredentials(): boolean {
  return !!process.env.ANTHROPIC_OAUTH_CLIENT_ID;
}

/**
 * Performs a complete OAuth flow including callback server
 *
 * This is a convenience function that handles the entire OAuth flow:
 * 1. Generates PKCE parameters
 * 2. Starts the callback server
 * 3. Opens the browser (if possible)
 * 4. Waits for the callback
 * 5. Exchanges the code for tokens
 *
 * @param oauth - AnthropicOAuth instance
 * @param options - Flow options
 * @returns Promise resolving to OAuth tokens
 *
 * @example
 * ```typescript
 * const oauth = createAnthropicOAuth();
 * const tokens = await performOAuthFlow(oauth);
 * console.log("Authenticated! Token expires at:", tokens.expiresAt);
 * ```
 */
export async function performOAuthFlow(
  oauth: AnthropicOAuth,
  options: {
    /** Port for callback server (default: 8787) */
    port?: number;
    /** Timeout in milliseconds (default: 5 minutes) */
    timeout?: number;
    /** Whether to automatically open browser (default: true) */
    openBrowser?: boolean;
  } = {},
): Promise<OAuthFlowTokens> {
  const {
    port = DEFAULT_CALLBACK_PORT,
    timeout = 5 * 60 * 1000,
    openBrowser = true,
  } = options;

  // Generate PKCE parameters
  const pkce = await AnthropicOAuth.generatePKCE();

  // Generate state for CSRF protection
  const state = randomBytes(32).toString("base64url");

  // Start callback server
  const callbackPromise = startCallbackServer(port, "/callback", timeout);

  // Generate auth URL
  const authUrl = oauth.generateAuthUrl(
    {
      codeChallenge: pkce.codeChallenge,
    },
    state,
  );

  // Try to open browser
  if (openBrowser) {
    try {
      const open = (await import("open" as string)).default as (
        url: string,
      ) => Promise<unknown>;
      await open(authUrl);
      logger.info("Browser opened for authentication");
    } catch {
      logger.warn("Could not open browser automatically");
      logger.always("\nPlease open this URL in your browser to authenticate:");
      logger.always(authUrl);
      logger.always();
    }
  } else {
    logger.always("\nPlease open this URL in your browser to authenticate:");
    logger.always(authUrl);
    logger.always();
  }

  // Wait for callback
  const callbackResult = await callbackPromise;

  // Verify state
  if (!callbackResult.state || callbackResult.state !== state) {
    throw new OAuthError(
      "State mismatch - possible CSRF attack",
      "STATE_MISMATCH",
    );
  }

  // Exchange code for tokens
  const tokens = await oauth.exchangeCodeForTokens(
    callbackResult.code,
    pkce.codeVerifier,
  );

  return tokens;
}

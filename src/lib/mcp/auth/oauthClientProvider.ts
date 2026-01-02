/**
 * OAuth 2.1 Client Provider for MCP HTTP Transport
 * Implements OAuth 2.1 authentication with PKCE support
 */

import { randomBytes, createHash } from "crypto";
import type {
  OAuthTokens,
  TokenStorage,
  MCPOAuthConfig,
  OAuthClientInformation,
  AuthorizationUrlResult,
  TokenExchangeRequest,
  PKCEChallenge,
  TokenResponse,
} from "../../types/mcpTypes.js";
import {
  InMemoryTokenStorage,
  isTokenExpired,
  calculateExpiresAt,
} from "./tokenStorage.js";
import { logger } from "../../utils/logger.js";

/**
 * NeuroLink OAuth Provider for MCP HTTP Transport
 * Handles OAuth 2.1 authentication flow with optional PKCE support
 */
export class NeuroLinkOAuthProvider {
  private config: MCPOAuthConfig;
  private storage: TokenStorage;
  private pendingChallenges: Map<string, PKCEChallenge> = new Map();
  private pendingStates: Set<string> = new Set();

  constructor(config: MCPOAuthConfig, storage?: TokenStorage) {
    this.config = {
      ...config,
      usePKCE: config.usePKCE ?? true, // PKCE enabled by default for OAuth 2.1
    };
    this.storage = storage ?? new InMemoryTokenStorage();
  }

  /**
   * Get stored tokens for a server
   * Returns null if tokens are not available or expired (without refresh token)
   */
  async tokens(serverId: string): Promise<OAuthTokens | null> {
    const tokens = await this.storage.getTokens(serverId);

    if (!tokens) {
      return null;
    }

    // Check if tokens are expired
    if (isTokenExpired(tokens)) {
      // Try to refresh if refresh token is available
      if (tokens.refreshToken) {
        try {
          const refreshedTokens = await this.refreshTokens(
            serverId,
            tokens.refreshToken,
          );
          return refreshedTokens;
        } catch (error) {
          logger.warn(
            `[NeuroLinkOAuthProvider] Token refresh failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Delete expired tokens if refresh fails
          await this.storage.deleteTokens(serverId);
          return null;
        }
      }

      // No refresh token, delete expired tokens
      await this.storage.deleteTokens(serverId);
      return null;
    }

    return tokens;
  }

  /**
   * Save tokens for a server
   */
  async saveTokens(serverId: string, tokens: OAuthTokens): Promise<void> {
    await this.storage.saveTokens(serverId, tokens);
  }

  /**
   * Delete tokens for a server
   */
  async deleteTokens(serverId: string): Promise<void> {
    await this.storage.deleteTokens(serverId);
  }

  /**
   * Get client information for MCP SDK
   */
  clientInformation(): OAuthClientInformation {
    return {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUri: this.config.redirectUrl,
    };
  }

  /**
   * Generate authorization URL for OAuth flow
   * Returns the URL to redirect the user to for authorization
   * @param _serverId - Server ID (reserved for future use in state management)
   */
  redirectToAuthorization(_serverId: string): AuthorizationUrlResult {
    // Generate state parameter for CSRF protection
    const state = this.generateState();
    this.pendingStates.add(state);

    // Build authorization URL
    const url = new URL(this.config.authorizationUrl);

    // Required OAuth 2.1 parameters
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUrl);
    url.searchParams.set("state", state);

    // Optional scope
    if (this.config.scope) {
      url.searchParams.set("scope", this.config.scope);
    }

    // PKCE support
    let codeVerifier: string | undefined;
    if (this.config.usePKCE) {
      const pkce = this.generatePKCE();
      codeVerifier = pkce.codeVerifier;

      // Store PKCE challenge for later verification
      this.pendingChallenges.set(state, pkce);

      url.searchParams.set("code_challenge", pkce.codeChallenge);
      url.searchParams.set("code_challenge_method", pkce.codeChallengeMethod);
    }

    // Additional custom parameters
    if (this.config.additionalParams) {
      for (const [key, value] of Object.entries(this.config.additionalParams)) {
        url.searchParams.set(key, value);
      }
    }

    return {
      url: url.toString(),
      state,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    serverId: string,
    request: TokenExchangeRequest,
  ): Promise<OAuthTokens> {
    // Validate state
    if (!this.pendingStates.has(request.state)) {
      throw new Error("Invalid or expired state parameter");
    }
    this.pendingStates.delete(request.state);

    // Get PKCE verifier if applicable
    let codeVerifier = request.codeVerifier;
    if (this.config.usePKCE && !codeVerifier) {
      const pkce = this.pendingChallenges.get(request.state);
      if (pkce) {
        codeVerifier = pkce.codeVerifier;
        this.pendingChallenges.delete(request.state);
      }
    }

    // Build token request
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", request.code);
    body.set("redirect_uri", this.config.redirectUrl);
    body.set("client_id", this.config.clientId);

    // Include client secret if available (confidential clients)
    if (this.config.clientSecret) {
      body.set("client_secret", this.config.clientSecret);
    }

    // Include PKCE verifier if applicable
    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    // Request tokens
    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const tokenResponse = (await response.json()) as TokenResponse;

    // Convert to OAuthTokens format
    const tokens: OAuthTokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenResponse.expires_in
        ? calculateExpiresAt(tokenResponse.expires_in)
        : undefined,
      tokenType: tokenResponse.token_type ?? "Bearer",
      scope: tokenResponse.scope,
    };

    // Save tokens
    await this.saveTokens(serverId, tokens);

    return tokens;
  }

  /**
   * Refresh tokens using refresh token
   */
  async refreshTokens(
    serverId: string,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    const body = new URLSearchParams();
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", refreshToken);
    body.set("client_id", this.config.clientId);

    if (this.config.clientSecret) {
      body.set("client_secret", this.config.clientSecret);
    }

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const tokenResponse = (await response.json()) as TokenResponse;

    const tokens: OAuthTokens = {
      accessToken: tokenResponse.access_token,
      // Keep old refresh token if new one not provided
      refreshToken: tokenResponse.refresh_token ?? refreshToken,
      expiresAt: tokenResponse.expires_in
        ? calculateExpiresAt(tokenResponse.expires_in)
        : undefined,
      tokenType: tokenResponse.token_type ?? "Bearer",
      scope: tokenResponse.scope,
    };

    await this.saveTokens(serverId, tokens);

    return tokens;
  }

  /**
   * Revoke tokens (if supported by the OAuth server)
   */
  async revokeTokens(serverId: string, revocationUrl: string): Promise<void> {
    const tokens = await this.storage.getTokens(serverId);

    if (!tokens) {
      return;
    }

    const body = new URLSearchParams();
    body.set("token", tokens.accessToken);
    body.set("client_id", this.config.clientId);

    if (this.config.clientSecret) {
      body.set("client_secret", this.config.clientSecret);
    }

    try {
      await fetch(revocationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });
    } catch (error) {
      logger.warn(
        `[NeuroLinkOAuthProvider] Token revocation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Always delete local tokens
    await this.storage.deleteTokens(serverId);
  }

  /**
   * Get authorization header value for API requests
   */
  async getAuthorizationHeader(serverId: string): Promise<string | null> {
    const tokens = await this.tokens(serverId);

    if (!tokens) {
      return null;
    }

    return `${tokens.tokenType} ${tokens.accessToken}`;
  }

  /**
   * Check if a server has valid (non-expired) tokens
   */
  async hasValidTokens(serverId: string): Promise<boolean> {
    const tokens = await this.tokens(serverId);
    return tokens !== null;
  }

  /**
   * Generate a cryptographically secure state parameter
   */
  private generateState(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Generate PKCE code verifier and challenge
   * Uses SHA-256 for code challenge method (required by OAuth 2.1)
   */
  private generatePKCE(): PKCEChallenge {
    // Generate code verifier (43-128 characters, URL-safe)
    const codeVerifier = randomBytes(32).toString("base64url");

    // Generate code challenge using SHA-256
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: "S256",
    };
  }

  /**
   * Get the OAuth configuration
   */
  getConfig(): Readonly<MCPOAuthConfig> {
    return { ...this.config };
  }

  /**
   * Get the token storage instance
   */
  getStorage(): TokenStorage {
    return this.storage;
  }

  /**
   * Clean up expired pending states and challenges
   * Should be called periodically to prevent memory leaks
   */
  cleanupPendingRequests(): void {
    // Clear old pending states (older than 10 minutes)
    // Note: In a production system, you'd want to track timestamps
    // For now, we just clear all if there are too many
    if (this.pendingStates.size > 100) {
      this.pendingStates.clear();
    }

    if (this.pendingChallenges.size > 100) {
      this.pendingChallenges.clear();
    }
  }
}

/**
 * Create an OAuth provider from MCP server auth configuration
 */
export function createOAuthProviderFromConfig(
  authConfig: {
    clientId: string;
    clientSecret?: string;
    authorizationUrl: string;
    tokenUrl: string;
    redirectUrl: string;
    scope?: string;
    usePKCE?: boolean;
  },
  storage?: TokenStorage,
): NeuroLinkOAuthProvider {
  return new NeuroLinkOAuthProvider(
    {
      clientId: authConfig.clientId,
      clientSecret: authConfig.clientSecret,
      authorizationUrl: authConfig.authorizationUrl,
      tokenUrl: authConfig.tokenUrl,
      redirectUrl: authConfig.redirectUrl,
      scope: authConfig.scope,
      usePKCE: authConfig.usePKCE ?? true,
    },
    storage,
  );
}

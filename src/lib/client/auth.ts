/**
 * Authentication Utilities for NeuroLink Client SDK
 *
 * Provides authentication configuration, token management, and OAuth2 support
 * for securing API requests to NeuroLink servers.
 *
 * @module @neurolink/client/auth
 */

import type {
  Middleware,
  AuthConfig,
  ClientOAuth2Config,
  ClientTokenRefreshResult,
} from "../types/clientTypes.js";

// =============================================================================
// OAuth2 Token Manager
// =============================================================================

/**
 * OAuth2 Token Manager for client credentials flow
 *
 * Handles token acquisition, caching, and automatic refresh for OAuth2
 * client credentials authentication.
 *
 * @example Basic usage
 * ```typescript
 * const tokenManager = new OAuth2TokenManager({
 *   tokenUrl: 'https://auth.example.com/oauth/token',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   scope: 'api:read api:write',
 * });
 *
 * // Get token (automatically refreshes if needed)
 * const token = await tokenManager.getToken();
 *
 * // Use with client
 * const client = createClient({
 *   baseUrl: 'https://api.example.com',
 * });
 * client.use(createDynamicAuthInterceptor(() => tokenManager.getToken()));
 * ```
 */
export class OAuth2TokenManager {
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<string> | null = null;
  private refreshBufferMs: number;

  constructor(
    private readonly config: ClientOAuth2Config,
    options?: { refreshBufferMs?: number },
  ) {
    this.refreshBufferMs = options?.refreshBufferMs ?? 60000;
  }

  /**
   * Get a valid access token
   *
   * Returns cached token if still valid, otherwise fetches a new one.
   * Handles concurrent requests by deduplicating token refresh calls.
   */
  async getToken(): Promise<string> {
    // Check if token is still valid
    if (
      this.token &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry - this.refreshBufferMs
    ) {
      return this.token;
    }

    // Deduplicate concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Fetch new token
    this.refreshPromise = this.fetchToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Invalidate the cached token
   *
   * Call this when the token is rejected by the server to force a refresh.
   */
  invalidate(): void {
    this.token = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if the cached token is valid
   */
  isValid(): boolean {
    return !!(
      this.token &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry - this.refreshBufferMs
    );
  }

  /**
   * Get the token expiry time in milliseconds
   */
  getExpiryTime(): number | null {
    return this.tokenExpiry;
  }

  /**
   * Fetch a new token from the OAuth2 server
   */
  private async fetchToken(): Promise<string> {
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    if (this.config.scope) {
      params.set("scope", this.config.scope);
    }

    if (this.config.audience) {
      params.set("audience", this.config.audience);
    }

    const response = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new OAuth2Error(
        `OAuth2 token request failed: ${response.status}`,
        response.status,
        errorText,
      );
    }

    const data = (await response.json()) as ClientTokenRefreshResult;
    this.token =
      data.accessToken ||
      (data as unknown as { access_token?: string }).access_token ||
      "";
    const expiresIn =
      data.expiresIn ||
      (data as unknown as { expires_in?: number }).expires_in ||
      3600;
    this.tokenExpiry = Date.now() + expiresIn * 1000;

    if (!this.token) {
      throw new OAuth2Error(
        "OAuth2 response missing access token",
        200,
        JSON.stringify(data),
      );
    }

    return this.token;
  }
}

// =============================================================================
// JWT Token Manager
// =============================================================================

/**
 * JWT Token Manager with automatic refresh
 *
 * Manages JWT tokens with automatic refresh using a provided refresh function.
 *
 * @example
 * ```typescript
 * const tokenManager = new JWTTokenManager({
 *   token: 'initial-jwt-token',
 *   expiresAt: Date.now() + 3600000,
 *   refreshFn: async () => {
 *     const response = await fetch('/api/auth/refresh', {
 *       method: 'POST',
 *       credentials: 'include',
 *     });
 *     const data = await response.json();
 *     return { accessToken: data.token, expiresIn: data.expiresIn };
 *   },
 * });
 * ```
 */
export class JWTTokenManager {
  private token: string;
  private tokenExpiry: number;
  private refreshPromise: Promise<string> | null = null;
  private refreshBufferMs: number;

  constructor(
    private readonly config: {
      token: string;
      expiresAt: number;
      refreshFn: () => Promise<ClientTokenRefreshResult>;
      refreshBufferMs?: number;
    },
  ) {
    this.token = config.token;
    this.tokenExpiry = config.expiresAt;
    this.refreshBufferMs = config.refreshBufferMs ?? 60000;
  }

  /**
   * Get a valid access token
   */
  async getToken(): Promise<string> {
    if (Date.now() < this.tokenExpiry - this.refreshBufferMs) {
      return this.token;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.refreshToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Force token refresh
   */
  async forceRefresh(): Promise<string> {
    this.refreshPromise = this.refreshToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Update token manually
   */
  setToken(token: string, expiresAt: number): void {
    this.token = token;
    this.tokenExpiry = expiresAt;
  }

  /**
   * Check if token is valid
   */
  isValid(): boolean {
    return Date.now() < this.tokenExpiry - this.refreshBufferMs;
  }

  private async refreshToken(): Promise<string> {
    const result = await this.config.refreshFn();
    this.token = result.accessToken;
    this.tokenExpiry = Date.now() + result.expiresIn * 1000;
    return this.token;
  }
}

// =============================================================================
// Authentication Middleware
// =============================================================================

/**
 * Create an API key authentication middleware
 *
 * @example
 * ```typescript
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 * client.use(createApiKeyMiddleware('your-api-key'));
 * ```
 */
export function createApiKeyMiddleware(
  apiKey: string,
  headerName: string = "X-API-Key",
): Middleware {
  return async (request, next) => {
    request.headers[headerName] = apiKey;
    return next();
  };
}

/**
 * Create a Bearer token authentication middleware
 *
 * @example
 * ```typescript
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 * client.use(createBearerTokenMiddleware('your-jwt-token'));
 * ```
 */
export function createBearerTokenMiddleware(token: string): Middleware {
  return async (request, next) => {
    request.headers["Authorization"] = `Bearer ${token}`;
    return next();
  };
}

/**
 * Create a dynamic authentication middleware with token manager
 *
 * @example With OAuth2TokenManager
 * ```typescript
 * const tokenManager = new OAuth2TokenManager({
 *   tokenUrl: 'https://auth.example.com/oauth/token',
 *   clientId: 'client-id',
 *   clientSecret: 'client-secret',
 * });
 *
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 * client.use(createTokenManagerMiddleware(tokenManager));
 * ```
 */
export function createTokenManagerMiddleware(
  tokenManager: OAuth2TokenManager | JWTTokenManager,
): Middleware {
  return async (request, next) => {
    const token = await tokenManager.getToken();
    request.headers["Authorization"] = `Bearer ${token}`;
    return next();
  };
}

/**
 * Create an authentication middleware with retry on 401
 *
 * Automatically refreshes token and retries request when receiving 401.
 *
 * @example
 * ```typescript
 * const tokenManager = new OAuth2TokenManager({...});
 *
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 * client.use(createAuthWithRetryMiddleware(tokenManager));
 * ```
 */
export function createAuthWithRetryMiddleware(
  tokenManager: OAuth2TokenManager,
  maxRetries: number = 1,
): Middleware {
  return async (request, next) => {
    let retries = 0;

    while (true) {
      const token = await tokenManager.getToken();
      request.headers["Authorization"] = `Bearer ${token}`;

      const response = await next();

      if (response.status === 401 && retries < maxRetries) {
        tokenManager.invalidate();
        retries++;

        // Fetch a fresh token and update the request headers for the retry
        const freshToken = await tokenManager.getToken();
        request.headers["Authorization"] = `Bearer ${freshToken}`;
        continue;
      }

      return response;
    }
  };
}

/**
 * Create a multi-auth middleware that supports multiple authentication methods
 *
 * @example
 * ```typescript
 * const client = createClient({ baseUrl: 'https://api.example.com' });
 * client.use(createMultiAuthMiddleware({
 *   apiKey: process.env.API_KEY,
 *   token: sessionToken,
 * }));
 * ```
 */
export function createMultiAuthMiddleware(config: AuthConfig): Middleware {
  return async (request, next) => {
    // Add API key if provided
    if (config.apiKey) {
      const headerName = config.apiKeyHeaderName ?? "X-API-Key";
      request.headers[headerName] = config.apiKey;
    }

    // Add bearer token if provided
    if (config.token) {
      const headerName = config.headerName ?? "Authorization";
      request.headers[headerName] = `Bearer ${config.token}`;
    }

    // Handle dynamic token refresh
    if (config.refreshToken && config.tokenExpiresAt) {
      const bufferMs = config.refreshBufferMs ?? 60000;
      if (Date.now() > config.tokenExpiresAt - bufferMs) {
        const newToken = await config.refreshToken();
        // Persist the refreshed token back to config so subsequent requests use it
        config.token = newToken;
        config.tokenExpiresAt = Date.now() + bufferMs * 2;
        const headerName = config.headerName ?? "Authorization";
        request.headers[headerName] = `Bearer ${newToken}`;
      }
    }

    return next();
  };
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown during OAuth2 operations
 */
export class OAuth2Error extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(message: string, status: number, responseBody: string) {
    super(message);
    this.name = "OAuth2Error";
    this.status = status;
    this.responseBody = responseBody;
  }
}

/**
 * Error thrown when authentication fails
 */
export class OAuth2AuthenticationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(
    message: string,
    code: string = "AUTH_ERROR",
    status: number = 401,
  ) {
    super(message);
    this.name = "OAuth2AuthenticationError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Error thrown when token refresh fails
 */
export class TokenRefreshError extends Error {
  readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "TokenRefreshError";
    this.cause = cause;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Decode a JWT token payload without verification
 *
 * @example
 * ```typescript
 * const payload = decodeJWTPayload(token);
 * console.log('Token expires at:', new Date(payload.exp * 1000));
 * ```
 */
export function decodeJWTPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    throw new Error("Failed to decode JWT token");
  }
}

/**
 * Check if a JWT token is expired
 *
 * @example
 * ```typescript
 * if (isJWTExpired(token)) {
 *   // Refresh the token
 * }
 * ```
 */
export function isJWTExpired(token: string, bufferMs: number = 0): boolean {
  try {
    const payload = decodeJWTPayload(token);
    const exp = payload.exp as number;
    if (!exp) {
      return true;
    }
    return Date.now() > exp * 1000 - bufferMs;
  } catch {
    return true;
  }
}

/**
 * Extract expiry time from a JWT token
 *
 * @returns Expiry time in milliseconds, or null if not available
 */
export function getJWTExpiry(token: string): number | null {
  try {
    const payload = decodeJWTPayload(token);
    const exp = payload.exp as number;
    return exp ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Create an API key from environment variable with validation
 *
 * @example
 * ```typescript
 * const apiKey = getApiKeyFromEnv('NEUROLINK_API_KEY');
 * const client = createClient({
 *   baseUrl: 'https://api.example.com',
 *   apiKey,
 * });
 * ```
 */
export function getApiKeyFromEnv(
  envVar: string,
  options?: { required?: boolean },
): string | undefined {
  const value =
    typeof process !== "undefined" ? process.env[envVar] : undefined;

  if (!value && options?.required) {
    throw new Error(`Required environment variable ${envVar} is not set`);
  }

  return value;
}

// Types are already exported at their definition sites above

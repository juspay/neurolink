/**
 * Base error class for all NeuroLink-specific errors.
 * This allows for easy identification of errors thrown by the SDK.
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a provider encounters a generic error.
 */
export class ProviderError extends BaseError {
  constructor(
    message: string,
    public provider?: string,
  ) {
    super(provider ? `[${provider}] ${message}` : message);
  }
}

/**
 * Thrown for authentication-related errors, such as invalid or missing API keys.
 */
export class AuthenticationError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown for authorization errors, where the user does not have permission.
 */
export class AuthorizationError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown for network-related issues, such as connectivity problems or timeouts.
 */
export class NetworkError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown when an API rate limit has been exceeded.
 */
export class RateLimitError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown when a specified model is not found or is invalid for the provider.
 */
export class InvalidModelError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

// =============================================================================
// OAUTH ERROR CLASSES
// =============================================================================

/**
 * Base class for OAuth-specific errors
 */
export class OAuthError extends BaseError {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

/**
 * Thrown when OAuth configuration is invalid or missing
 */
export class OAuthConfigurationError extends OAuthError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "OAuthConfigurationError";
  }
}

/**
 * Thrown when authorization code exchange fails
 */
export class OAuthTokenExchangeError extends OAuthError {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message, "TOKEN_EXCHANGE_ERROR");
    this.name = "OAuthTokenExchangeError";
  }
}

/**
 * Thrown when token refresh fails
 */
export class OAuthTokenRefreshError extends OAuthError {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message, "TOKEN_REFRESH_ERROR");
    this.name = "OAuthTokenRefreshError";
  }
}

/**
 * Thrown when token validation fails
 */
export class OAuthTokenValidationError extends OAuthError {
  constructor(message: string) {
    super(message, "TOKEN_VALIDATION_ERROR");
    this.name = "OAuthTokenValidationError";
  }
}

/**
 * Thrown when token revocation fails
 */
export class OAuthTokenRevocationError extends OAuthError {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message, "TOKEN_REVOCATION_ERROR");
    this.name = "OAuthTokenRevocationError";
  }
}

/**
 * Thrown when callback server operations fail
 */
export class OAuthCallbackServerError extends OAuthError {
  constructor(message: string) {
    super(message, "CALLBACK_SERVER_ERROR");
    this.name = "OAuthCallbackServerError";
  }
}

// =============================================================================
// TOKEN STORE ERROR
// =============================================================================

/**
 * Token storage error for authentication-related failures
 */
export class TokenStoreError extends BaseError {
  constructor(
    message: string,
    public readonly code:
      | "STORAGE_ERROR"
      | "ENCRYPTION_ERROR"
      | "VALIDATION_ERROR"
      | "NOT_FOUND"
      | "REFRESH_ERROR" = "STORAGE_ERROR",
  ) {
    super(message);
    this.name = "TokenStoreError";
  }
}

// =============================================================================
// MODEL ACCESS ERROR
// =============================================================================

/**
 * Error thrown when model access is denied based on subscription tier
 */
export class ModelAccessError extends BaseError {
  public readonly model: string;
  public readonly tier: string;
  public readonly requiredTier: string;

  constructor(model: string, tier: string, requiredTier: string) {
    super(
      `Model "${model}" is not available for tier "${tier}". ` +
        `Required tier: "${requiredTier}" or higher.`,
    );
    this.name = "ModelAccessError";
    this.model = model;
    this.tier = tier;
    this.requiredTier = requiredTier;
  }
}

/**
 * Base error class for all NeuroLink-specific errors.
 * This allows for easy identification of errors thrown by the SDK.
 *
 * @deprecated Use NeuroLinkError from errorHandling.ts for new code
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * Thrown when a provider encounters a generic error.
 *
 * @deprecated Use NeuroLinkError with appropriate error codes
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
 *
 * @deprecated Use ErrorFactory.providerAuthFailed() or ErrorFactory.authError()
 */
export class AuthenticationError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown for authorization errors, where the user does not have permission.
 *
 * @deprecated Use NeuroLinkError with ERROR_CODES.AUTH_PERMISSION_DENIED
 */
export class AuthorizationError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown for network-related issues, such as connectivity problems or timeouts.
 *
 * @deprecated Use ErrorFactory.networkError()
 */
export class NetworkError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown when an API rate limit has been exceeded.
 *
 * @deprecated Use ErrorFactory.providerRateLimit()
 */
export class RateLimitError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

/**
 * Thrown when a specified model is not found or is invalid for the provider.
 *
 * @deprecated Use NeuroLinkError with ERROR_CODES.PROVIDER_MODEL_NOT_FOUND or ERROR_CODES.PROVIDER_MODEL_INVALID
 */
export class InvalidModelError extends ProviderError {
  constructor(message: string, provider?: string) {
    super(message, provider);
  }
}

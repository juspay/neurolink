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

// src/lib/auth/authErrors.ts

import { BaseError } from "../types/errors.js";
import type { AuthProviderType, AuthUser } from "../types/authTypes.js";

/**
 * Base class for all authentication-related errors
 */
export class AuthError extends BaseError {
  constructor(
    message: string,
    public provider?: AuthProviderType,
  ) {
    super(provider ? `[${provider}] ${message}` : message);
  }
}

/**
 * Thrown when authentication fails (invalid credentials, expired token, etc.)
 *
 * @example
 * ```typescript
 * throw new AuthenticationFailedError("Token has expired", "auth0");
 * ```
 */
export class AuthenticationFailedError extends AuthError {
  constructor(
    message: string,
    provider?: AuthProviderType,
    public tokenType?: string,
  ) {
    super(message, provider);
  }
}

/**
 * Thrown when a user lacks required permissions or roles
 *
 * @example
 * ```typescript
 * throw new InsufficientPermissionsError(
 *   "User lacks permission: admin:write",
 *   ["admin:write"],
 *   user
 * );
 * ```
 */
export class InsufficientPermissionsError extends AuthError {
  constructor(
    message: string,
    public missingPermissions?: string[],
    public missingRoles?: string[],
    public user?: AuthUser,
  ) {
    super(message);
  }
}

/**
 * Thrown when no authentication token is provided
 *
 * @example
 * ```typescript
 * throw new MissingTokenError("No Bearer token found in Authorization header");
 * ```
 */
export class MissingTokenError extends AuthError {
  constructor(message = "Authentication token is required") {
    super(message);
  }
}

/**
 * Thrown when a token is malformed or cannot be parsed
 *
 * @example
 * ```typescript
 * throw new InvalidTokenError("Token is not a valid JWT", "auth0");
 * ```
 */
export class InvalidTokenError extends AuthError {
  constructor(
    message: string,
    provider?: AuthProviderType,
    public reason?: string,
  ) {
    super(message, provider);
  }
}

/**
 * Thrown when a token has expired
 *
 * @example
 * ```typescript
 * throw new TokenExpiredError("Token expired at 2024-01-15T10:00:00Z", "clerk");
 * ```
 */
export class TokenExpiredError extends AuthError {
  constructor(
    message: string,
    provider?: AuthProviderType,
    public expiredAt?: Date,
  ) {
    super(message, provider);
  }
}

/**
 * Thrown when a session is not found or has expired
 *
 * @example
 * ```typescript
 * throw new SessionNotFoundError("session_abc123", "supabase");
 * ```
 */
export class SessionNotFoundError extends AuthError {
  constructor(
    public sessionId: string,
    provider?: AuthProviderType,
  ) {
    super(`Session not found: ${sessionId}`, provider);
  }
}

/**
 * Thrown when a session has expired
 *
 * @example
 * ```typescript
 * throw new SessionExpiredError("session_abc123", new Date());
 * ```
 */
export class SessionExpiredError extends AuthError {
  constructor(
    public sessionId: string,
    public expiredAt?: Date,
    provider?: AuthProviderType,
  ) {
    super(`Session expired: ${sessionId}`, provider);
  }
}

/**
 * Thrown when a user is not found
 *
 * @example
 * ```typescript
 * throw new UserNotFoundError("user_abc123", "firebase");
 * ```
 */
export class UserNotFoundError extends AuthError {
  constructor(
    public userId: string,
    provider?: AuthProviderType,
  ) {
    super(`User not found: ${userId}`, provider);
  }
}

/**
 * Thrown when provider initialization fails
 *
 * @example
 * ```typescript
 * throw new ProviderInitializationError("Failed to fetch JWKS", "auth0");
 * ```
 */
export class ProviderInitializationError extends AuthError {
  constructor(
    message: string,
    provider?: AuthProviderType,
    public cause?: Error,
  ) {
    super(message, provider);
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Thrown when provider configuration is invalid
 *
 * @example
 * ```typescript
 * throw new InvalidConfigurationError("Missing required field: domain", "auth0");
 * ```
 */
export class InvalidConfigurationError extends AuthError {
  constructor(
    message: string,
    provider?: AuthProviderType,
    public missingFields?: string[],
  ) {
    super(message, provider);
  }
}

/**
 * Thrown when the auth provider API returns an error
 *
 * @example
 * ```typescript
 * throw new ProviderAPIError("Auth0 API returned 429", "auth0", 429);
 * ```
 */
export class ProviderAPIError extends AuthError {
  constructor(
    message: string,
    provider?: AuthProviderType,
    public statusCode?: number,
    public responseBody?: unknown,
  ) {
    super(message, provider);
  }
}

/**
 * Thrown when rate limit is exceeded for authentication requests
 *
 * @example
 * ```typescript
 * throw new AuthRateLimitError("Too many authentication attempts", "clerk", 60);
 * ```
 */
export class AuthRateLimitError extends AuthError {
  constructor(
    message: string,
    provider?: AuthProviderType,
    public retryAfterSeconds?: number,
  ) {
    super(message, provider);
  }
}

/**
 * Type guard to check if an error is an auth-related error
 *
 * @param error - The error to check
 * @returns True if the error is an AuthError
 */
export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/**
 * Type guard to check if an error is an authentication failure
 *
 * @param error - The error to check
 * @returns True if the error is an AuthenticationFailedError
 */
export function isAuthenticationError(
  error: unknown,
): error is AuthenticationFailedError {
  return error instanceof AuthenticationFailedError;
}

/**
 * Type guard to check if an error is a permission error
 *
 * @param error - The error to check
 * @returns True if the error is an InsufficientPermissionsError
 */
export function isPermissionError(
  error: unknown,
): error is InsufficientPermissionsError {
  return error instanceof InsufficientPermissionsError;
}

/**
 * Type guard to check if an error is a token-related error
 *
 * @param error - The error to check
 * @returns True if the error is a token error
 */
export function isTokenError(
  error: unknown,
): error is InvalidTokenError | TokenExpiredError | MissingTokenError {
  return (
    error instanceof InvalidTokenError ||
    error instanceof TokenExpiredError ||
    error instanceof MissingTokenError
  );
}

/**
 * Type guard to check if an error is a session-related error
 *
 * @param error - The error to check
 * @returns True if the error is a session error
 */
export function isSessionError(
  error: unknown,
): error is SessionNotFoundError | SessionExpiredError {
  return (
    error instanceof SessionNotFoundError ||
    error instanceof SessionExpiredError
  );
}

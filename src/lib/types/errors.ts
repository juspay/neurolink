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

/**
 * Curator P1-1: thrown when a provider rejects a request because the
 * caller's team / API key is not whitelisted for the requested model.
 *
 * LiteLLM's `team not allowed to access model. This team can only access
 * models=['glm-latest', 'kimi-latest', ...]` is the canonical example —
 * the list is parsed off the error body so callers / fallback orchestrators
 * can choose a whitelisted alternative without scraping strings.
 */
export class ModelAccessDeniedError extends ProviderError {
  public readonly requestedModel: string | undefined;
  public readonly allowedModels: string[] | undefined;
  public readonly code = "MODEL_ACCESS_DENIED" as const;

  constructor(
    message: string,
    options: {
      provider?: string;
      requestedModel?: string;
      allowedModels?: string[];
    } = {},
  ) {
    super(message, options.provider);
    this.name = "ModelAccessDeniedError";
    this.requestedModel = options.requestedModel;
    this.allowedModels = options.allowedModels;
  }
}

/** Maximum body length we'll attempt to parse. Real provider error
 *  bodies are well under 10 KB; longer inputs are either truncated
 *  log output or a deliberate ReDoS attempt. */
const MAX_ALLOWED_MODELS_INPUT = 10_000;

/**
 * Parse the `allowed_models` array out of a provider error message body.
 * Currently targets the LiteLLM team-whitelist response shape:
 *
 *   "team not allowed to access model. This team can only access
 *    models=['glm-latest', 'kimi-latest', 'open-large']"
 *
 * Implementation note: deliberately uses `indexOf`/`slice` instead of a
 * single `/models\s*=\s*\[([^\]]*)\]/` regex. CodeQL flagged the latter
 * as `js/polynomial-redos` because the `[^\]]*` greedy quantifier on
 * library-supplied input can be exploited by a crafted long string. The
 * indexOf/slice path is O(n) with no backtracking and we additionally
 * cap the input length.
 *
 * Returns undefined when no list is found.
 */
export function parseAllowedModels(message: string): string[] | undefined {
  if (typeof message !== "string" || message.length === 0) {
    return undefined;
  }
  if (message.length > MAX_ALLOWED_MODELS_INPUT) {
    return undefined;
  }
  // Locate `models` keyword case-insensitively, then walk forward to
  // confirm `=` and `[` markers — no regex backtracking.
  const lower = message.toLowerCase();
  let idx = lower.indexOf("models", 0);
  while (idx !== -1) {
    let cursor = idx + "models".length;
    // Skip whitespace
    while (cursor < message.length && /\s/.test(message[cursor])) {
      cursor++;
    }
    if (message[cursor] !== "=") {
      idx = lower.indexOf("models", idx + 1);
      continue;
    }
    cursor++;
    while (cursor < message.length && /\s/.test(message[cursor])) {
      cursor++;
    }
    if (message[cursor] !== "[") {
      idx = lower.indexOf("models", idx + 1);
      continue;
    }
    const open = cursor;
    const close = message.indexOf("]", open + 1);
    if (close === -1) {
      return undefined;
    }
    const inside = message.slice(open + 1, close);
    const items = inside
      .split(",")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter((s) => s.length > 0);
    return items.length > 0 ? items : undefined;
  }
  return undefined;
}

/**
 * Returns true when `message` looks like a model-access-denied response
 * (LiteLLM "team not allowed", generic "not allowed to access model",
 * or "team can only access models=[...]").
 */
export function isModelAccessDeniedMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes("team") && lower.includes("not allowed")) ||
    lower.includes("team can only access") ||
    /not\s+allowed\s+to\s+access\s+(this\s+)?model/i.test(message)
  );
}

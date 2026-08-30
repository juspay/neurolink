/**
 * Shared internal types for the Anthropic-compatible proxy route.
 */

/** A deterministic upstream validation failure that must reach the caller. */
export type AnthropicInvalidRequestFailure = {
  status: number;
  body: string;
  contentType?: string;
};

/** A credential failure deferred until peer and provider fallbacks are tried. */
export type DeferredClaudeAccountFailure = {
  status: number;
  message: string;
  errorType: string;
  responseHeaders?: Record<string, string>;
};

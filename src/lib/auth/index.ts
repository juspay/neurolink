/**
 * NeuroLink Authentication Module
 *
 * Provides OAuth 2.0 authentication support for Claude Pro/Max subscriptions
 * and secure token storage.
 *
 * Key components:
 * - AnthropicOAuth: OAuth 2.0 flow implementation with PKCE support
 * - TokenStore: Secure local storage for OAuth tokens
 * - Callback Server: Local HTTP server for OAuth redirects
 */

// =============================================================================
// ANTHROPIC OAUTH - OAuth 2.0 Authentication
// =============================================================================

// OAuth Constants
export {
  ANTHROPIC_OAUTH_BASE_URL,
  DEFAULT_SCOPES,
  DEFAULT_REDIRECT_URI,
  DEFAULT_CALLBACK_PORT,
} from "./anthropicOAuth.js";

// Main OAuth class
export { AnthropicOAuth } from "./anthropicOAuth.js";

// OAuth error classes (canonical definitions in types/errors.ts)
export {
  OAuthError,
  OAuthConfigurationError,
  OAuthTokenExchangeError,
  OAuthTokenRefreshError,
  OAuthTokenValidationError,
  OAuthTokenRevocationError,
  OAuthCallbackServerError,
} from "./anthropicOAuth.js";

// OAuth helper functions
export {
  createAnthropicOAuth,
  createAnthropicOAuthConfig,
  hasAnthropicOAuthCredentials,
  startCallbackServer,
  stopCallbackServer,
  performOAuthFlow,
} from "./anthropicOAuth.js";

// OAuth types (canonical definitions in types/subscriptionTypes.ts)
export type {
  OAuthTokenResponse,
  OAuthFlowTokens,
  OAuthFlowTokens as OAuthTokens,
  TokenValidationResult,
  AnthropicOAuthConfig,
  PKCEParams,
  CallbackResult,
} from "./anthropicOAuth.js";

// =============================================================================
// TOKEN STORE - Secure Token Storage
// =============================================================================

// Main TokenStore class and instances
export { TokenStore, tokenStore, defaultTokenStore } from "./tokenStore.js";

// Token store error class (canonical definition in types/errors.ts)
export { TokenStoreError } from "./tokenStore.js";

// Token store types
export type {
  StoredOAuthTokens,
  OAuthTokens as StoredOAuthTokensLegacy,
  TokenRefresher,
} from "./tokenStore.js";

// =============================================================================
// UNIFIED AUTH INTERFACE (canonical definitions in types/subscriptionTypes.ts)
// =============================================================================

export type {
  NeuroLinkAuthOptions,
  AuthStatus,
} from "../types/subscriptionTypes.js";

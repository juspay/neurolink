/**
 * NeuroLink Authentication Module
 *
 * Exports the full multi-provider authentication system including:
 * - Anthropic OAuth 2.0 flow (PKCE, token storage, callback server)
 * - Multi-provider auth (Auth0, Clerk, Firebase, Supabase, Cognito,
 *   Keycloak, Better Auth, WorkOS, JWT, OAuth2, Custom)
 * - AuthProviderFactory / AuthProviderRegistry for lazy-loaded provider creation
 * - Auth middleware (token extraction, RBAC, rate limiting)
 * - Session management (memory, Redis)
 * - Auth context (AsyncLocalStorage-based request scoping)
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
} from "../types/index.js";

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

// =============================================================================
// TOKEN STORE - Secure Token Storage
// =============================================================================

// Main TokenStore class and instances
export { TokenStore, tokenStore, defaultTokenStore } from "./tokenStore.js";

// Token store error class (canonical definition in types/errors.ts)
export { TokenStoreError } from "../types/index.js";

// Token store types (canonical location: types/authTypes.ts)

// =============================================================================
// UNIFIED AUTH INTERFACE (canonical definitions in types/subscriptionTypes.ts)
// =============================================================================

// =============================================================================
// ACCOUNT POOL - Multi-account rotation with cooldowns
// =============================================================================

export { AccountPool } from "./accountPool.js";

// =============================================================================
// MULTI-PROVIDER AUTH SYSTEM
// =============================================================================

// Factory and Registry
export {
  AuthProviderFactory,
  createAuthProvider,
} from "./AuthProviderFactory.js";

export { AuthProviderRegistry } from "./AuthProviderRegistry.js";

// Unified error factory
export { AuthError, AuthErrorCodes } from "./errors.js";

// Base Provider
export {
  AuthProviderError,
  BaseAuthProvider,
  InMemorySessionStorage,
} from "./providers/BaseAuthProvider.js";

// Provider Implementations
// NOTE: Concrete provider classes are NOT re-exported here to preserve lazy
// loading via dynamic imports in AuthProviderFactory.  Obtain provider
// instances through the factory instead:
//   const provider = await AuthProviderFactory.create("auth0", config);

// Auth Middleware
export {
  AuthMiddlewareError,
  AuthMiddlewareErrorCodes,
  createAuthMiddleware,
  createExpressAuthMiddleware,
  createProtectedMiddleware,
  createRBACMiddleware,
  createRequestContext,
  extractToken,
} from "./middleware/AuthMiddleware.js";

// Rate Limiting Middleware
export {
  createAuthenticatedRateLimitMiddleware,
  createRateLimitByUserMiddleware,
  createRateLimitStorage,
  MemoryRateLimitStorage,
  RedisRateLimitStorage,
  UserRateLimiter,
} from "./middleware/rateLimitByUser.js";

// Session Management
export {
  createSessionStorage,
  MemorySessionStorage,
  RedisSessionStorage,
  SessionManager,
} from "./sessionManager.js";

// Auth Context
export {
  AuthContextHolder,
  createAuthenticatedContext,
  getAuthContext,
  getCurrentSession,
  getCurrentUser,
  globalAuthContext,
  hasAllPermissions,
  hasAnyRole,
  hasPermission,
  hasRole,
  isAuthenticated,
  requireAuth,
  requirePermission,
  requireRole,
  requireUser,
  runWithAuthContext,
} from "./authContext.js";

// Request Context
export {
  RequestContext,
  NEUROLINK_RESOURCE_ID_KEY,
  NEUROLINK_THREAD_ID_KEY,
} from "./RequestContext.js";

// Auth Types

// Server Bridge
export { createAuthValidatorFromProvider } from "./serverBridge.js";

// =============================================================================
// AUTH PROVIDER CLASSES — public re-exports (match the module docstring above)
// =============================================================================

export { Auth0Provider } from "./providers/auth0.js";
export { BetterAuthProvider } from "./providers/betterAuth.js";
export { ClerkProvider } from "./providers/clerk.js";
export { CognitoProvider } from "./providers/CognitoProvider.js";
export { CustomAuthProvider } from "./providers/custom.js";
export { FirebaseAuthProvider } from "./providers/firebase.js";
export { JWTProvider } from "./providers/jwt.js";
export { KeycloakProvider } from "./providers/KeycloakProvider.js";
export { OAuth2Provider } from "./providers/oauth2.js";
export { SupabaseAuthProvider } from "./providers/supabase.js";
export { WorkOSProvider } from "./providers/workos.js";

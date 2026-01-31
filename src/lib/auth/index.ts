/**
 * NeuroLink Authentication Module
 *
 * Provides a comprehensive authentication system with support for
 * multiple identity providers, session management, and RBAC.
 *
 * Supported Providers:
 * - Auth0: Enterprise identity platform
 * - Clerk: Developer-friendly authentication
 * - Firebase: Google's authentication service
 * - Supabase: Open-source Firebase alternative
 * - AWS Cognito: Amazon's user pool service
 * - Keycloak: Open-source SSO solution
 * - Better Auth: Self-hosted open-source auth
 * - WorkOS: Enterprise SSO and directory sync
 * - Custom: User-provided validation logic
 *
 * @example
 * ```typescript
 * import {
 *   createAuthProvider,
 *   createAuthMiddleware,
 *   createRBACMiddleware,
 *   getAuthProviderRegistry,
 * } from '@juspay/neurolink/auth';
 *
 * // Create a provider
 * const provider = await createAuthProvider('auth0', {
 *   type: 'auth0',
 *   domain: 'your-tenant.auth0.com',
 *   clientId: 'your-client-id',
 * });
 *
 * // Validate a token
 * const result = await provider.authenticateToken(token);
 * if (result.valid) {
 *   console.log('User:', result.user);
 * }
 *
 * // Create middleware
 * const authMiddleware = await createAuthMiddleware({
 *   provider: 'auth0',
 *   providerConfig: { type: 'auth0', domain: '...', clientId: '...' },
 * });
 * ```
 */

// =============================================================================
// FACTORY AND REGISTRY
// =============================================================================

export {
  AuthProviderFactory,
  getAuthProviderFactory,
  createAuthProvider,
  AuthFactoryError,
  AuthFactoryErrorCodes,
} from "./AuthProviderFactory.js";

export {
  AuthProviderRegistry,
  getAuthProviderRegistry,
  registerAllAuthProviders,
  AuthRegistryError,
  AuthRegistryErrorCodes,
  type AuthProviderMetadata,
  type ProviderHealthStatus,
} from "./AuthProviderRegistry.js";

// =============================================================================
// BASE PROVIDER
// =============================================================================

export {
  BaseAuthProvider,
  InMemorySessionStorage,
  AuthProviderError,
  AuthProviderErrorCodes,
} from "./providers/BaseAuthProvider.js";

// =============================================================================
// PROVIDER IMPLEMENTATIONS
// =============================================================================

// Main providers (mixed from main worktree and feat/authentication-providers)
export { Auth0Provider } from "./providers/auth0.js";
export { ClerkProvider } from "./providers/clerk.js";
export { FirebaseAuthProvider, FirebaseAuthProvider as FirebaseProvider } from "./providers/firebase.js";
export { SupabaseAuthProvider, SupabaseAuthProvider as SupabaseProvider } from "./providers/supabase.js";
export { CognitoProvider } from "./providers/CognitoProvider.js";
export { KeycloakProvider } from "./providers/KeycloakProvider.js";

// Additional providers (from feat/authentication-providers)
export { BetterAuthProvider } from "./providers/betterAuth.js";
export { WorkOSProvider } from "./providers/workos.js";
export { CustomAuthProvider } from "./providers/custom.js";

// =============================================================================
// MIDDLEWARE
// =============================================================================

export {
  createAuthMiddleware,
  createRBACMiddleware,
  createProtectedMiddleware,
  createExpressAuthMiddleware,
  createRequestContext,
  extractToken,
  AuthMiddlewareError,
  AuthMiddlewareErrorCodes,
  type MiddlewareHandler,
  type MiddlewareResult,
  type NextFunction,
  type ExpressMiddleware,
} from "./middleware/AuthMiddleware.js";

// Rate Limiting Middleware (from feat/authentication-providers)
export {
  UserRateLimiter,
  MemoryRateLimitStorage,
  RedisRateLimitStorage,
  createRateLimitByUserMiddleware,
  createAuthenticatedRateLimitMiddleware,
  createRateLimitStorage,
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitStorage,
  type RateLimitMiddlewareResult,
} from "./middleware/rateLimitByUser.js";

// =============================================================================
// SESSION MANAGEMENT (from feat/authentication-providers)
// =============================================================================

export {
  SessionManager,
  MemorySessionStorage,
  RedisSessionStorage,
  createSessionStorage,
  type SessionStorage as SessionStorageInterface,
} from "./sessionManager.js";

// =============================================================================
// AUTH CONTEXT (from feat/authentication-providers)
// =============================================================================

export {
  runWithAuthContext,
  getAuthContext,
  getCurrentUser,
  getCurrentSession,
  isAuthenticated,
  requireAuth,
  requireUser,
  hasPermission,
  hasRole,
  hasAnyRole,
  hasAllPermissions,
  requirePermission,
  requireRole,
  createAuthenticatedContext,
  AuthContextHolder,
  globalAuthContext,
} from "./authContext.js";

// =============================================================================
// AUTH ERRORS (from feat/authentication-providers)
// =============================================================================

export {
  AuthError,
  AuthenticationFailedError,
  InsufficientPermissionsError,
  MissingTokenError,
  InvalidTokenError,
  TokenExpiredError,
  SessionNotFoundError,
  SessionExpiredError,
  UserNotFoundError,
  ProviderInitializationError,
  InvalidConfigurationError,
  ProviderAPIError,
  AuthRateLimitError,
  isAuthError,
  isAuthenticationError,
  isPermissionError,
  isTokenError,
  isSessionError,
} from "./authErrors.js";

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Core types
  AuthProviderType,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  SessionValidationResult,
  AuthorizationResult,

  // Configuration types
  BaseAuthProviderConfig,
  TokenValidationConfig,
  SessionConfig,
  RBACConfig,
  AuthCacheConfig,

  // Provider-specific configurations
  Auth0Config,
  ClerkConfig,
  FirebaseConfig,
  SupabaseConfig,
  CognitoConfig,
  KeycloakConfig,
  BetterAuthConfig,
  WorkOSConfig,
  CustomAuthConfig,
  OAuth2Config,
  JWTConfig,
  AuthProviderConfig,

  // Middleware types
  AuthRequestContext,
  AuthenticatedContext,
  TokenExtractionConfig,
  AuthMiddlewareConfig,
  RBACMiddlewareConfig,

  // Session storage
  SessionStorage,

  // Error types
  AuthErrorCode,
  AuthError as AuthErrorType,

  // Event types
  AuthEventType,
  AuthEventData,
  AuthEventHandler,

  // Factory types
  AuthProviderFactoryFn,
  AuthProviderRegistration,

  // Provider interface
  MastraAuthProvider,

  // Utility types
  TokenClaims,
  JWK,
  JWKS,
  AuthProviderHealthCheck,
} from "./types/authTypes.js";

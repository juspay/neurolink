/**
 * Auth-related type definitions for NeuroLink
 *
 * Canonical location for OAuth token storage types, token refresher contracts,
 * and multi-provider authentication types.
 * All auth type imports should reference this module (or the barrel re-export
 * via src/lib/types/index.ts).
 */

import type { JsonValue, UnknownRecord } from "./common.js";
// =============================================================================
// STORED OAUTH TOKENS
// =============================================================================

/**
 * OAuth tokens structure for storage.
 * Stricter version of OAuthTokens with required fields for persistent storage.
 */
export type StoredOAuthTokens = {
  /** The access token for API authentication */
  accessToken: string;
  /** The refresh token for obtaining new access tokens (optional for some OAuth flows) */
  refreshToken?: string;
  /** Unix timestamp (ms) when the access token expires */
  expiresAt: number;
  /** Token type, typically "Bearer" */
  tokenType: string;
  /** Optional OAuth scopes granted */
  scope?: string;
};

/**
 * OAuth tokens structure (relaxed version for general use).
 * Use StoredOAuthTokens when persisting (stricter — expiresAt and tokenType required).
 */
export type OAuthTokens = {
  /** The access token for API authentication */
  accessToken: string;
  /** The refresh token for obtaining new access tokens */
  refreshToken?: string;
  /** Token expiration timestamp (Unix epoch) */
  expiresAt?: number;
  /** Token type (typically "Bearer") */
  tokenType?: string;
  /** OAuth scope granted */
  scope?: string;
};

/**
 * Token refresher function type.
 * Takes a refresh token and returns new tokens.
 */
export type TokenRefresher = (
  refreshToken: string,
) => Promise<StoredOAuthTokens>;

// =============================================================================
// TOKEN STORE TYPES
// =============================================================================

/**
 * Internal storage format for multi-provider tokens
 */
export type TokenStorageData = {
  /** Version of the storage format */
  version: string;
  /** Last modified timestamp */
  lastModified: number;
  /** Tokens indexed by provider name */
  providers: Record<string, StoredProviderTokens>;
};

/**
 * Per-provider token storage structure
 */
export type StoredProviderTokens = {
  /** The stored tokens */
  tokens: StoredOAuthTokens;
  /** When the tokens were stored */
  createdAt: number;
  /** When the tokens were last accessed */
  lastAccessed: number;
  /** Whether this provider's tokens are permanently disabled */
  disabled?: boolean;
  /** When the tokens were disabled (Unix ms) */
  disabledAt?: number;
  /** Reason the tokens were disabled (e.g., "refresh_failed") */
  disabledReason?: string;
};

// =============================================================================
// CORE AUTH TYPES
// =============================================================================

/**
 * Supported authentication provider types
 */
export type AuthProviderType =
  | "auth0"
  | "clerk"
  | "firebase"
  | "supabase"
  | "cognito"
  | "keycloak"
  | "workos"
  | "better-auth"
  | "oauth2"
  | "jwt"
  | "custom";

/**
 * Authentication token types
 */
export type TokenType = "jwt" | "session" | "api-key" | "oauth";

/**
 * User information from authentication
 */
export type AuthUser = {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name?: string;
  /** Profile picture URL */
  picture?: string;
  /** User's roles */
  roles: string[];
  /** User's permissions */
  permissions: string[];
  /** Provider-specific user data */
  providerData?: Record<string, JsonValue>;
  /** Provider-specific metadata */
  metadata?: UnknownRecord;
  /** Organization/tenant ID for multi-tenant apps */
  organizationId?: string;
  /** Email verification status */
  emailVerified?: boolean;
  /** Account creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
  /** Last login timestamp */
  lastLoginAt?: Date;
};

/**
 * Session information
 */
export type AuthSession = {
  /** Session identifier */
  id: string;
  /** Associated user */
  user: AuthUser;
  /** Session access token */
  accessToken?: string;
  /** Session refresh token */
  refreshToken?: string;
  /** Session creation time */
  createdAt: Date;
  /** Session expiration time */
  expiresAt: Date;
  /** Whether session is still valid */
  isValid: boolean;
  /** Last activity timestamp */
  lastActivityAt?: Date;
  /** IP address of session origin */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Device fingerprint */
  deviceId?: string;
  /** Session metadata */
  metadata?: UnknownRecord;
};

// =============================================================================
// TOKEN TYPES
// =============================================================================

/**
 * Token validation result
 */
export type TokenValidationResult = {
  /** Whether the token is valid */
  valid: boolean;
  /** Decoded token payload */
  payload?: UnknownRecord;
  /** Associated user if token is valid */
  user?: AuthUser;
  /** Decoded token claims */
  claims?: Record<string, JsonValue>;
  /** Error message if invalid */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: AuthErrorCode;
  /** Token expiration time */
  expiresAt?: Date;
  /** Token type */
  tokenType?: TokenType;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string | string[];
};

/**
 * Token claims extracted from JWT
 */
export type TokenClaims = {
  /** Subject (user ID) */
  sub?: string;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string | string[];
  /** Expiration time */
  exp?: number;
  /** Issued at */
  iat?: number;
  /** Not before */
  nbf?: number;
  /** JWT ID */
  jti?: string;
  /** Email */
  email?: string;
  /** Email verified */
  email_verified?: boolean;
  /** Name */
  name?: string;
  /** Picture */
  picture?: string;
  /** Custom claims */
  [key: string]: JsonValue | undefined;
};

/**
 * JWKS (JSON Web Key Set) types
 */
export type JWK = {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
};

export type JWKS = {
  keys: JWK[];
};

/**
 * Token refresh result
 */
export type TokenRefreshResult = {
  /** New access token */
  accessToken: string;
  /** New refresh token (if rotated) */
  refreshToken?: string;
  /** Token expiration in seconds */
  expiresIn: number;
};

// =============================================================================
// SESSION TYPES
// =============================================================================

/**
 * Session validation result
 */
export type SessionValidationResult = {
  /** Whether the session is valid */
  valid: boolean;
  /** Validated session if valid */
  session?: AuthSession;
  /** Error message if validation failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: AuthErrorCode;
  /** Whether session was refreshed */
  refreshed?: boolean;
};

/**
 * Session storage interface
 */
export type SessionStorage = {
  /** Get a session by ID */
  get(sessionId: string): Promise<AuthSession | null>;
  /** Save a session */
  save(session: AuthSession): Promise<void>;
  /** Delete a session */
  delete(sessionId: string): Promise<void>;
  /** Delete all sessions for a user */
  deleteAllForUser(userId: string): Promise<void>;
  /** Get all sessions for a user */
  getForUser(userId: string): Promise<AuthSession[]>;
  /** Check if a session exists */
  exists(sessionId: string): Promise<boolean>;
  /** Update session last activity */
  touch(sessionId: string): Promise<void>;
  /** Clear all sessions */
  clear(): Promise<void>;
};

// =============================================================================
// AUTHORIZATION TYPES
// =============================================================================

/**
 * Authorization check result
 */
export type AuthorizationResult = {
  /** Whether the user is authorized */
  authorized: boolean;
  /** User being authorized */
  user?: AuthUser;
  /** Required roles that were checked */
  requiredRoles?: string[];
  /** Required permissions that were checked */
  requiredPermissions?: string[];
  /** Reason for denial if not authorized */
  reason?: string;
  /** Missing permissions if denied */
  missingPermissions?: string[];
  /** Missing roles if denied */
  missingRoles?: string[];
};

// =============================================================================
// CONTEXT TYPES
// =============================================================================

/**
 * Authentication request context
 */
export type AuthRequestContext = {
  /** HTTP method */
  method?: string;
  /** Request URL/path */
  path?: string;
  /** HTTP request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Request cookies */
  cookies?: Record<string, string>;
  /** Query parameters */
  query?: Record<string, string | string[] | undefined>;
  /** Request body (if available) */
  body?: unknown;
  /** IP address */
  ip?: string;
  /** IP address (alias for session builders that expect this field) */
  ipAddress?: string;
  /** Request user agent */
  userAgent?: string;
  /** Request ID for tracing */
  requestId?: string;
};

/**
 * Enhanced request context with authenticated user.
 *
 * Extends AuthRequestContext so it can be passed wherever a plain
 * request context is expected (e.g. RBAC middleware callbacks).
 */
export type AuthenticatedContext = AuthRequestContext & {
  /** Authenticated user */
  user: AuthUser;
  /** Current session */
  session?: AuthSession;
  /** Original request context (for callers that embed it explicitly) */
  request?: AuthRequestContext;
  /** Authentication timestamp */
  authenticatedAt?: Date;
  /** Provider that performed authentication */
  provider?: AuthProviderType;
  /** Token used for authentication */
  token?: string;
  /** Token claims */
  claims?: Record<string, JsonValue>;
};

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Base authentication provider configuration.
 *
 * Contains the common fields shared by every provider-specific config variant.
 * Provider-specific fields are added via intersection in {@link AuthProviderConfig}.
 */
export type BaseAuthProviderConfig = {
  /** Provider type */
  type: AuthProviderType;
  /** Whether authentication is required */
  required?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom token validation options */
  tokenValidation?: TokenValidationConfig;
  /** Token extraction strategy */
  tokenExtraction?: TokenExtractionStrategy;
  /** Session configuration */
  session?: SessionConfig;
  /** RBAC configuration */
  rbac?: RBACConfig;
  /** Cache configuration */
  cache?: AuthCacheConfig;
  /** Provider-specific options (generic extensibility point) */
  options?: UnknownRecord;
};

/**
 * Token validation configuration
 */
export type TokenValidationConfig = {
  /** Token issuer to validate against */
  issuer?: string;
  /** Token audience to validate against */
  audience?: string | string[];
  /** Clock tolerance in seconds for expiration checks */
  clockTolerance?: number;
  /** Custom claims to extract */
  extractClaims?: string[];
  /** Whether to validate token signature */
  validateSignature?: boolean;
  /** JWKS endpoint for signature verification */
  jwksUri?: string;
  /** Cache JWKS for this duration (ms) */
  jwksCacheDuration?: number;
};

/**
 * Auth cache configuration
 */
export type AuthCacheConfig = {
  /** Enable caching */
  enabled?: boolean;
  /** Cache TTL in seconds */
  ttl?: number;
  /** Maximum cache entries */
  maxEntries?: number;
  /** Cache key prefix */
  prefix?: string;
};

/**
 * Token extraction configuration (detailed, used by middleware)
 */
export type TokenExtractionConfig = {
  /** Extract from Authorization header (Bearer token) */
  fromHeader?: {
    name?: string; // Default: 'Authorization'
    prefix?: string; // Default: 'Bearer'
  };
  /** Extract from cookie */
  fromCookie?: {
    name: string;
  };
  /** Extract from query parameter */
  fromQuery?: {
    name: string;
  };
  /** Custom extraction function */
  custom?: (
    context: AuthRequestContext,
  ) => string | null | Promise<string | null>;
};

/**
 * Token extraction configuration (simple strategy)
 */
export type TokenExtractionStrategy = {
  /** Extract from Authorization header */
  fromHeader?: {
    name: string;
    scheme?: string; // e.g., "Bearer"
  };
  /** Extract from cookie */
  fromCookie?: {
    name: string;
  };
  /** Extract from query parameter */
  fromQuery?: {
    name: string;
  };
  /** Custom extraction function (may be sync or async) */
  custom?: (
    context: AuthRequestContext,
  ) => string | null | Promise<string | null>;
};

/**
 * Session configuration
 */
export type SessionConfig = {
  /** Session storage type */
  storage?: SessionStorageType;
  /** Session duration in seconds */
  duration?: number;
  /** Auto-refresh sessions before expiration */
  autoRefresh?: boolean;
  /** Refresh threshold in seconds (refresh when this much time remains) */
  refreshThreshold?: number;
  /** Allow multiple sessions per user */
  allowMultipleSessions?: boolean;
  /** Maximum sessions per user */
  maxSessionsPerUser?: number;
  /** Session identifier prefix */
  prefix?: string;
  /** Custom session storage implementation */
  customStorage?: SessionStorage;
  /** Redis configuration for distributed sessions */
  redis?: {
    url: string;
    prefix?: string;
    ttl?: number;
  };
};

/**
 * Session storage types
 */
export type SessionStorageType = "memory" | "redis" | "custom";

/**
 * Role-Based Access Control configuration
 */
export type RBACConfig = {
  /** Enable RBAC */
  enabled?: boolean;
  /** Default roles for new users */
  defaultRoles?: string[];
  /** Role hierarchy (higher roles inherit lower role permissions) */
  roleHierarchy?: Record<string, string[]>;
  /** Permission definitions per role */
  rolePermissions?: Record<string, string[]>;
  /** Permission definitions */
  permissions?: PermissionDefinition[];
  /** Default permissions for authenticated users */
  defaultPermissions?: string[];
  /** Super admin roles (bypass all checks) */
  superAdminRoles?: string[];
};

/**
 * Permission definition
 */
export type PermissionDefinition = {
  /** Permission identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Required roles for this permission */
  requiredRoles?: string[];
};

// =============================================================================
// MIDDLEWARE TYPES
// =============================================================================

/**
 * Auth middleware options
 */
export type AuthMiddlewareOptions = {
  /** Auth provider instance */
  provider: AuthProvider;
  /** Routes to exclude from authentication */
  excludePaths?: string[];
  /** Whether auth is optional (continue if no token) */
  optional?: boolean;
  /** Custom unauthorized handler */
  onUnauthorized?: (
    context: AuthRequestContext,
  ) => Response | Promise<Response>;
  /** Custom error handler */
  onError?: (
    error: Error,
    context: AuthRequestContext,
  ) => Response | Promise<Response>;
};

/**
 * Auth middleware configuration
 */
export type AuthMiddlewareConfig = {
  /** Auth provider to use */
  provider: AuthProviderType;
  /** Provider configuration */
  providerConfig: AuthProviderConfig;
  /** Token extraction configuration */
  tokenExtraction?: TokenExtractionConfig;
  /** Routes that don't require authentication */
  publicRoutes?: string[];
  /** Whether authentication is optional (request proceeds with or without auth) */
  optional?: boolean;
  /** Custom error handler */
  onError?: (
    error: AuthErrorInfo,
    context: AuthRequestContext,
  ) => void | Promise<void>;
  /** Hook called after successful authentication */
  onAuthenticated?: (context: AuthenticatedContext) => void | Promise<void>;
};

/**
 * RBAC middleware configuration
 */
export type RBACMiddlewareConfig = {
  /** Required roles (user must have at least one) */
  roles?: string[];
  /** Required permissions (user must have all) */
  permissions?: string[];
  /** Whether all roles are required (default: false, any role matches) */
  requireAllRoles?: boolean;
  /** Super admin roles that bypass all role/permission checks */
  superAdminRoles?: string[];
  /** Mapping from role name to granted permissions */
  rolePermissions?: Record<string, string[]>;
  /** Role hierarchy: a role inherits permissions from its children */
  roleHierarchy?: Record<string, string[]>;
  /** Custom authorization function */
  custom?: (
    user: AuthUser,
    context: AuthRequestContext,
  ) => boolean | Promise<boolean>;
  /** Custom error handler */
  onDenied?: (
    result: AuthorizationResult,
    context: AuthRequestContext,
  ) => void | Promise<void>;
};

// =============================================================================
// PROVIDER-SPECIFIC CONFIGURATIONS
// =============================================================================

/**
 * Auth0 provider configuration
 */
export type Auth0Config = {
  /** Auth0 domain (e.g., 'your-tenant.auth0.com') */
  domain: string;
  /** Auth0 client ID */
  clientId: string;
  /** Auth0 client secret (for backend operations) */
  clientSecret?: string;
  /** Auth0 audience (API identifier) */
  audience?: string;
  /** Auth0 scope */
  scope?: string;
  /** Custom namespace for claims */
  claimsNamespace?: string;
  /** Management API configuration */
  managementApi?: {
    clientId: string;
    clientSecret: string;
  };
};

/**
 * Clerk provider configuration
 */
export type ClerkConfig = {
  /** Clerk publishable key */
  publishableKey?: string;
  /** Clerk secret key */
  secretKey: string;
  /** Clerk JWT key (for local validation) */
  jwtKey?: string;
  /** Clerk API version */
  apiVersion?: string;
  /** JWKS endpoint override */
  jwksUrl?: string;
  /** Allowed origins */
  allowedOrigins?: string[];
};

/**
 * Firebase provider configuration
 */
export type FirebaseConfig = {
  /** Firebase project ID */
  projectId: string;
  /** Firebase API key */
  apiKey?: string;
  /** Service account credentials */
  serviceAccount?: {
    clientEmail: string;
    privateKey: string;
  };
  /** Firebase database URL */
  databaseURL?: string;
  /** Custom claims key for roles */
  rolesClaimKey?: string;
  /** Custom claims key for permissions */
  permissionsClaimKey?: string;
};

/**
 * Supabase provider configuration
 */
export type SupabaseConfig = {
  /** Supabase project URL */
  url: string;
  /** Supabase anon key */
  anonKey: string;
  /** Supabase service role key (for backend operations) */
  serviceRoleKey?: string;
  /** JWT secret for custom token verification */
  jwtSecret?: string;
};

/**
 * AWS Cognito provider configuration
 */
export type CognitoConfig = {
  /** Cognito user pool ID */
  userPoolId: string;
  /** Cognito client ID */
  clientId: string;
  /** Cognito client secret */
  clientSecret?: string;
  /** AWS region */
  region: string;
  /** Custom attributes to extract as claims */
  customAttributes?: string[];
};

/**
 * Keycloak provider configuration
 */
export type KeycloakConfig = {
  /** Keycloak server URL */
  serverUrl: string;
  /** Keycloak realm */
  realm: string;
  /** Client ID */
  clientId: string;
  /** Client secret */
  clientSecret?: string;
  /** Verify token signature */
  verifyToken?: boolean;
};

/**
 * Generic OAuth2 provider configuration
 */
export type OAuth2Config = {
  /** Authorization endpoint URL */
  authorizationUrl: string;
  /** Token endpoint URL */
  tokenUrl: string;
  /** User info endpoint URL */
  userInfoUrl?: string;
  /** JWKS endpoint URL */
  jwksUrl?: string;
  /** Client ID */
  clientId: string;
  /** Client secret */
  clientSecret?: string;
  /** OAuth scopes */
  scopes?: string[];
  /** Redirect URL */
  redirectUrl?: string;
  /** Enable PKCE */
  usePKCE?: boolean;
};

/**
 * JWT provider configuration
 */
export type JWTConfig = {
  /** JWT secret for HMAC algorithms */
  secret?: string;
  /** Public key for RSA/EC algorithms */
  publicKey?: string;
  /** Supported algorithms */
  algorithms?: string[];
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string | string[];
};

/**
 * Better Auth provider configuration
 */
export type BetterAuthConfig = {
  /** Better Auth secret */
  secret: string;
  /** Better Auth base URL */
  baseUrl: string;
  /** Database connection string */
  databaseUrl?: string;
  /** Social providers configuration */
  socialProviders?: {
    github?: { clientId: string; clientSecret: string };
    google?: { clientId: string; clientSecret: string };
    discord?: { clientId: string; clientSecret: string };
  };
};

/**
 * WorkOS provider configuration
 */
export type WorkOSConfig = {
  /** WorkOS API key */
  apiKey: string;
  /** WorkOS client ID */
  clientId: string;
  /** Organization ID (optional for multi-tenant) */
  organizationId?: string;
};

/**
 * Custom auth provider configuration
 */
export type CustomAuthConfig = {
  /** Custom token validation function */
  validateToken: (
    token: string,
    context?: AuthRequestContext,
  ) => Promise<TokenValidationResult>;
  /** Custom user fetching function */
  getUser?: (userId: string) => Promise<AuthUser | null>;
  /** Custom session creation function */
  createSession?: (
    user: AuthUser,
    context?: AuthRequestContext,
  ) => Promise<AuthSession>;
};

// =============================================================================
// AUTH PROVIDER CONFIG (discriminated union)
// =============================================================================

/**
 * Configuration for AuthProvider.
 *
 * Discriminated union of base + each provider-specific config so that
 * provider factories receive the properly typed config without requiring
 * `as any` casts or an open index signature.
 *
 * The `type` discriminant narrows to the correct provider-specific fields.
 * The final `BaseAuthProviderConfig` branch serves as a generic fallback
 * for code that only needs the common fields.
 */
export type AuthProviderConfig =
  | (BaseAuthProviderConfig & Auth0Config & { type: "auth0" })
  | (BaseAuthProviderConfig & ClerkConfig & { type: "clerk" })
  | (BaseAuthProviderConfig & FirebaseConfig & { type: "firebase" })
  | (BaseAuthProviderConfig & SupabaseConfig & { type: "supabase" })
  | (BaseAuthProviderConfig & CognitoConfig & { type: "cognito" })
  | (BaseAuthProviderConfig & KeycloakConfig & { type: "keycloak" })
  | (BaseAuthProviderConfig & OAuth2Config & { type: "oauth2" })
  | (BaseAuthProviderConfig & JWTConfig & { type: "jwt" })
  | (BaseAuthProviderConfig & BetterAuthConfig & { type: "better-auth" })
  | (BaseAuthProviderConfig & WorkOSConfig & { type: "workos" })
  | (BaseAuthProviderConfig & CustomAuthConfig & { type: "custom" })
  | BaseAuthProviderConfig;

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Auth error codes
 */
export type AuthErrorCode =
  | "AUTH-001" // Invalid token
  | "AUTH-002" // Expired token
  | "AUTH-003" // Invalid credentials
  | "AUTH-004" // Invalid signature
  | "AUTH-005" // Missing token
  | "AUTH-006" // Token decode failed
  | "AUTH-007" // JWKS fetch failed
  | "AUTH-008" // Session not found
  | "AUTH-009" // Session expired
  | "AUTH-010" // Session revoked
  | "AUTH-011" // Insufficient permissions
  | "AUTH-012" // Insufficient roles
  | "AUTH-013" // Access denied
  | "AUTH-014" // Provider error
  | "AUTH-015" // Configuration error
  | "AUTH-016" // Rate limited
  | "AUTH-017" // User not found
  | "AUTH-018" // User disabled
  | "AUTH-019" // Email not verified
  | "AUTH-020"; // MFA required

/**
 * Auth error information with additional context.
 *
 * Renamed from `AuthError` to `AuthErrorInfo` to avoid collision with the
 * `createErrorFactory` result that is named `AuthError` in errors.ts.
 */
export type AuthErrorInfo = Error & {
  /** Error code */
  code: AuthErrorCode;
  /** Provider that threw the error */
  provider?: AuthProviderType;
  /** HTTP status code */
  statusCode?: number;
  /** Whether the error is retryable */
  retryable?: boolean;
  /** Additional error context */
  context?: Record<string, JsonValue>;
  /** Original error if wrapped */
  cause?: Error;
};

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Auth events for EventEmitter
 */
export type AuthEvents = {
  "auth:login": (user: AuthUser) => void;
  "auth:logout": (userId: string) => void;
  "auth:tokenRefresh": (session: AuthSession) => void;
  "auth:unauthorized": (context: AuthRequestContext, reason: string) => void;
  "auth:error": (error: Error, context?: AuthRequestContext) => void;
};

/**
 * Auth event types for hooks
 */
export type AuthEventType =
  | "token:validated"
  | "token:expired"
  | "token:invalid"
  | "session:created"
  | "session:refreshed"
  | "session:expired"
  | "session:revoked"
  | "auth:success"
  | "auth:failed"
  | "rbac:allowed"
  | "rbac:denied";

/**
 * Auth event data
 */
export type AuthEventData = {
  type: AuthEventType;
  timestamp: Date;
  provider?: AuthProviderType;
  user?: AuthUser;
  session?: AuthSession;
  error?: AuthErrorInfo;
  context?: Record<string, JsonValue>;
};

/**
 * Auth event handler
 */
export type AuthEventHandler = (event: AuthEventData) => void | Promise<void>;

// =============================================================================
// FACTORY TYPES
// =============================================================================

/**
 * Auth provider factory function type
 */
export type AuthProviderFactoryFn = (
  config: AuthProviderConfig,
) => Promise<AuthProvider>;

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

/**
 * Auth health check result
 */
export type AuthHealthCheck = {
  /** Overall health status */
  healthy: boolean;
  /** Provider connection status */
  providerConnected: boolean;
  /** Session storage status */
  sessionStorageHealthy: boolean;
  /** Last successful authentication */
  lastSuccessfulAuth?: Date;
  /** Error details if unhealthy */
  error?: string;
};

/**
 * Health check result for auth providers (detailed)
 */
export type AuthProviderHealthCheck = {
  /** Provider is healthy */
  healthy: boolean;
  /** Provider type */
  provider: AuthProviderType;
  /** Response time in ms */
  latency?: number;
  /** Last successful check */
  lastCheck?: Date;
  /** Error message if unhealthy */
  error?: string;
  /** Additional details */
  details?: Record<string, JsonValue>;
};

// =============================================================================
// REGISTRY TYPES (moved from AuthProviderRegistry.ts)
// =============================================================================

/**
 * Provider registration metadata used by AuthProviderRegistry.
 *
 * Previously defined in `AuthProviderRegistry.ts`; centralised here so all
 * auth-domain types live in a single canonical file.
 */
export type AuthProviderMetadata = {
  /** Provider type */
  type: AuthProviderType;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Version */
  version?: string;
  /** Documentation URL */
  documentation?: string;
  /** Provider aliases */
  aliases: string[];
  /** Features supported by the provider */
  features?: string[];
  /** Whether provider requires external dependencies */
  requiresExternalDependencies?: boolean;
  /** Whether the provider ships built-in (no extra install) */
  builtIn?: boolean;
};

/**
 * Auth-domain provider health status returned by AuthProviderRegistry.
 *
 * Not to be confused with the AI-provider `ProviderHealthStatus` union in
 * `providers.ts`; this type tracks auth-provider connectivity.
 */
export type AuthProviderHealthStatus = {
  type: AuthProviderType;
  healthy: boolean;
  lastCheck: Date;
  latency?: number;
  error?: string;
};

// =============================================================================
// PROVIDER SUB-TYPES (composed into AuthProvider)
// =============================================================================

/**
 * Token operations: validate, extract, refresh, revoke.
 */
export type AuthTokenValidator = {
  /** Validate and decode an authentication token */
  authenticateToken(
    token: string,
    context?: AuthRequestContext,
  ): Promise<TokenValidationResult>;

  /** Extract token from request context */
  extractToken(
    context: AuthRequestContext,
  ): string | null | Promise<string | null>;

  /** Refresh an authentication token (optional) */
  refreshToken?(refreshToken: string): Promise<TokenRefreshResult>;

  /** Revoke a token / logout (optional) */
  revokeToken?(token: string): Promise<void>;
};

/**
 * Authorization: check roles and permissions.
 */
export type AuthUserAuthorizer = {
  /** Check if a user is authorized to perform an action */
  authorizeUser(
    user: AuthUser,
    permission: string,
  ): Promise<AuthorizationResult>;

  /** Check if user has specific roles */
  authorizeRoles(user: AuthUser, roles: string[]): Promise<AuthorizationResult>;

  /** Check if user has all specified permissions */
  authorizePermissions(
    user: AuthUser,
    permissions: string[],
  ): Promise<AuthorizationResult>;
};

/**
 * Session management: create, read, refresh, destroy.
 */
export type AuthSessionManager = {
  /** Create a new session for a user */
  createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession>;

  /** Get an existing session by ID */
  getSession(sessionId: string): Promise<AuthSession | null>;

  /** Refresh/extend a session */
  refreshSession(sessionId: string): Promise<AuthSession | null>;

  /** Invalidate/destroy a session */
  destroySession(sessionId: string): Promise<void>;

  /** Get all active sessions for a user */
  getUserSessions(userId: string): Promise<AuthSession[]>;

  /** Invalidate all sessions for a user (global logout) */
  destroyAllUserSessions(userId: string): Promise<void>;
};

/**
 * Request-level authentication.
 */
export type AuthRequestHandler = {
  /** Authenticate a request and return full context */
  authenticateRequest(
    context: AuthRequestContext,
  ): Promise<AuthenticatedContext | null>;
};

/**
 * Optional user management operations.
 */
export type AuthUserManager = {
  /** Get user by ID */
  getUser?(userId: string): Promise<AuthUser | null>;

  /** Get user by email */
  getUserByEmail?(email: string): Promise<AuthUser | null>;

  /** Update user metadata */
  updateUserMetadata?(
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<AuthUser>;

  /** Update user roles */
  updateUserRoles?(userId: string, roles: string[]): Promise<AuthUser>;

  /** Update user permissions */
  updateUserPermissions?(
    userId: string,
    permissions: string[],
  ): Promise<AuthUser>;
};

/**
 * Provider lifecycle hooks.
 */
export type AuthLifecycle = {
  /** Check provider health */
  healthCheck?(): Promise<AuthHealthCheck>;

  /** Initialize the provider */
  initialize?(): Promise<void>;

  /** Cleanup provider resources */
  cleanup?(): Promise<void>;

  /** Clean up resources (alias for cleanup) */
  dispose?(): Promise<void>;
};

// =============================================================================
// PROVIDER INTERFACE (composed from sub-types)
// =============================================================================

/**
 * Base interface for all authentication providers.
 *
 * Composed from focused sub-types so consumers can depend on only the
 * slice they need (e.g. `AuthTokenValidator` for token-only middleware).
 *
 * Unified auth provider interface covering:
 * - Token validation  (AuthTokenValidator)
 * - User authorization (AuthUserAuthorizer)
 * - Session management (AuthSessionManager)
 * - Request context    (AuthRequestHandler)
 * - User management    (AuthUserManager)
 * - Lifecycle          (AuthLifecycle)
 */
export type AuthProvider = AuthTokenValidator &
  AuthUserAuthorizer &
  AuthSessionManager &
  AuthRequestHandler &
  AuthUserManager &
  AuthLifecycle & {
    /** Provider type identifier */
    readonly type: AuthProviderType;

    /** Provider configuration */
    readonly config: AuthProviderConfig;
  };

/**
 * Session storage interface for SessionManager
 *
 * Defines the contract for session storage backends (memory, Redis, custom).
 * Note: This is a SessionManager-specific interface that uses `set()`/`getUserSessions()`/
 * `deleteUserSessions()`/`isHealthy()` method names, which differ from the canonical
 * `SessionStorage` type in `../types/auth.js` (which uses `save()`/`getForUser()`/
 * `deleteAllForUser()`/`exists()`/`touch()`). Both interfaces coexist because
 * SessionManager and BaseAuthProvider have separate storage patterns.
 */

export type SessionManagerStorage = {
  /** Get a session by ID */
  get(sessionId: string): Promise<AuthSession | null>;

  /** Store a session */
  set(session: AuthSession): Promise<void>;

  /** Delete a session */
  delete(sessionId: string): Promise<void>;

  /** Get all sessions for a user */
  getUserSessions(userId: string): Promise<AuthSession[]>;

  /** Delete all sessions for a user */
  deleteUserSessions(userId: string): Promise<void>;

  /** Clear all sessions (for cleanup) */
  clear(): Promise<void>;

  /** Health check */
  isHealthy(): Promise<boolean>;
};

/** Cached JWKS entry with TTL. Used by Cognito and Keycloak providers. */
export type AuthJWKSCacheEntry = {
  jwks: JWKS;
  expiresAt: number;
};

// =============================================================================
// AUTH PROVIDER FACTORY (from auth/AuthProviderFactory.ts)
// =============================================================================

/** Async constructor for an auth provider given its config. */
export type AuthProviderConstructor = (
  config: AuthProviderConfig,
) => Promise<AuthProvider>;

/** Registration row for an auth provider in AuthProviderFactory. */
export type AuthProviderRegistration = {
  factory: AuthProviderConstructor;
  aliases: string[];
  metadata?: AuthProviderMetadata;
};

// =============================================================================
// CLAUDE CODE IDENTITY (from auth/anthropicOAuth.ts)
// =============================================================================

/** Synthetic Claude Code client identity used for quota + identification. */
export type ClaudeCodeIdentity = {
  deviceId: string;
  accountUuid: string;
  sessionId: string;
  metadataUserId: string;
};

// =============================================================================
// AUTH MIDDLEWARE (from auth/middleware/AuthMiddleware.ts)
// =============================================================================

/** Minimal request object accepted by the auth middleware. */
export type IncomingRequest = {
  method?: string;
  url?: string;
  path?: string;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  ip?: string;
  user?: AuthUser;
  authContext?: AuthenticatedContext;
};

/** Minimal Express-style response object used by the auth middleware. */
export type OutgoingResponse = {
  status(code: number): OutgoingResponse;
  json(body: unknown): void;
};

/** Middleware handler function type for the auth layer. */
export type AuthMiddlewareHandler<TContext = AuthRequestContext> = (
  context: TContext,
) => Promise<AuthMiddlewareResult>;

/** Result produced by an auth middleware handler. */
export type AuthMiddlewareResult = {
  proceed: boolean;
  context?: AuthenticatedContext;
  error?: {
    statusCode: number;
    message: string;
    code?: string;
  };
};

/** Next-function for Express-style middleware chaining. */
export type NextFunction = () => Promise<void>;

/** Express-style auth middleware signature. */
export type ExpressMiddleware = (
  req: IncomingRequest,
  res: OutgoingResponse,
  next: NextFunction,
) => Promise<void>;

// =============================================================================
// RATE LIMIT (from auth/middleware/rateLimitByUser.ts)
// =============================================================================

/** Token bucket state for a single user. */
export type TokenBucket = {
  tokens: number;
  lastRefill: number;
  userId: string;
};

/** Rate limit configuration per user or role. */
export type AuthRateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  roleLimits?: Record<string, number>;
  userLimits?: Record<string, number>;
  skipRoles?: string[];
  message?: string;
};

/** Rate limit result. */
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  limit: number;
  error?: string;
};

/** Result of an atomic consume operation against a token bucket. */
export type AtomicConsumeResult = {
  bucket: TokenBucket;
  consumed: boolean;
};

/** Storage contract for rate-limit buckets (memory or Redis). */
export type RateLimitStorage = {
  getBucket(userId: string): Promise<TokenBucket | null>;
  setBucket(userId: string, bucket: TokenBucket): Promise<void>;
  deleteBucket(userId: string): Promise<void>;
  healthCheck(): Promise<boolean>;
  cleanup(): Promise<void>;
  atomicConsume?(
    userId: string,
    limit: number,
    windowMs: number,
    nowMs: number,
  ): Promise<AtomicConsumeResult | null>;
};

/**
 * Minimal Redis client shape used by the rate-limiter to avoid a hard
 * dependency on the full `RedisClientType`. Named with an Auth prefix to
 * avoid collision with `RedisClientType` from the redis package.
 */
export type AuthRateLimitRedisClient = {
  connect(): Promise<void>;
  quit(): Promise<void>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  setEx(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<number>;
  eval(script: string, numkeys: number, ...args: string[]): Promise<unknown>;
};

/** Middleware-level outcome returned by the rate limiter. */
export type RateLimitMiddlewareResult = {
  proceed: boolean;
  rateLimitResult: RateLimitResult;
  response?: Response;
};

// =============================================================================
// AUTH0 (from auth/providers/auth0.ts)
// =============================================================================

/** Auth0 JWT payload structure. */
export type Auth0TokenPayload = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  roles?: string[];
  permissions?: string[];
  iat: number;
  exp: number;
  aud: string | string[];
  iss: string;
};

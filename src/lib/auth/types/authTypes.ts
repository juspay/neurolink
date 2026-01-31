/**
 * Authentication Types for NeuroLink
 * Comprehensive type definitions for the authentication provider system
 */

import type { JsonValue } from "../../types/common.js";

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
 * Authentication user representation
 */
export type AuthUser = {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email?: string;
  /** User display name */
  name?: string;
  /** User profile picture URL */
  picture?: string;
  /** User roles for RBAC */
  roles: string[];
  /** User permissions for fine-grained access control */
  permissions: string[];
  /** Provider-specific user data */
  providerData?: Record<string, JsonValue>;
  /** User metadata */
  metadata?: Record<string, JsonValue>;
  /** Whether the email is verified */
  emailVerified?: boolean;
  /** User creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
};

/**
 * Authentication session
 */
export type AuthSession = {
  /** Session identifier */
  id: string;
  /** Associated user */
  user: AuthUser;
  /** Session access token */
  accessToken: string;
  /** Session refresh token */
  refreshToken?: string;
  /** Session validity flag */
  isValid: boolean;
  /** Session expiration timestamp */
  expiresAt: Date;
  /** Session creation timestamp */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivityAt?: Date;
  /** Session metadata */
  metadata?: Record<string, JsonValue>;
  /** IP address that created the session */
  ipAddress?: string;
  /** User agent that created the session */
  userAgent?: string;
};

/**
 * Token validation result
 */
export type TokenValidationResult = {
  /** Whether the token is valid */
  valid: boolean;
  /** Validated user if token is valid */
  user?: AuthUser;
  /** Decoded token claims */
  claims?: Record<string, JsonValue>;
  /** Token expiration timestamp */
  expiresAt?: Date;
  /** Error message if validation failed */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: AuthErrorCode;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string | string[];
};

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
 * Authorization result
 */
export type AuthorizationResult = {
  /** Whether authorization was successful */
  authorized: boolean;
  /** User being authorized */
  user?: AuthUser;
  /** Required roles that were checked */
  requiredRoles?: string[];
  /** Required permissions that were checked */
  requiredPermissions?: string[];
  /** Roles the user is missing */
  missingRoles?: string[];
  /** Permissions the user is missing */
  missingPermissions?: string[];
  /** Authorization denial reason */
  reason?: string;
};

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Base authentication provider configuration
 */
export type BaseAuthProviderConfig = {
  /** Provider type */
  type: AuthProviderType;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom token validation options */
  tokenValidation?: TokenValidationConfig;
  /** Session configuration */
  session?: SessionConfig;
  /** RBAC configuration */
  rbac?: RBACConfig;
  /** Cache configuration */
  cache?: AuthCacheConfig;
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
 * Session configuration
 */
export type SessionConfig = {
  /** Session storage type */
  storage?: "memory" | "redis" | "custom";
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
};

/**
 * RBAC (Role-Based Access Control) configuration
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
  /** Super admin roles (bypass all checks) */
  superAdminRoles?: string[];
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

// =============================================================================
// PROVIDER-SPECIFIC CONFIGURATIONS
// =============================================================================

/**
 * Auth0 provider configuration
 */
export type Auth0Config = BaseAuthProviderConfig & {
  type: "auth0";
  /** Auth0 domain (e.g., 'your-tenant.auth0.com') */
  domain: string;
  /** Auth0 client ID */
  clientId: string;
  /** Auth0 client secret (for backend operations) */
  clientSecret?: string;
  /** Auth0 audience (API identifier) */
  audience?: string;
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
export type ClerkConfig = BaseAuthProviderConfig & {
  type: "clerk";
  /** Clerk publishable key */
  publishableKey?: string;
  /** Clerk secret key */
  secretKey: string;
  /** Clerk API version */
  apiVersion?: string;
  /** JWKS endpoint override */
  jwksUrl?: string;
};

/**
 * Firebase provider configuration
 */
export type FirebaseConfig = BaseAuthProviderConfig & {
  type: "firebase";
  /** Firebase project ID */
  projectId: string;
  /** Firebase service account credentials (JSON or path) */
  serviceAccount?: string | Record<string, unknown>;
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
export type SupabaseConfig = BaseAuthProviderConfig & {
  type: "supabase";
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
export type CognitoConfig = BaseAuthProviderConfig & {
  type: "cognito";
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
export type KeycloakConfig = BaseAuthProviderConfig & {
  type: "keycloak";
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
export type OAuth2Config = BaseAuthProviderConfig & {
  type: "oauth2";
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
export type JWTConfig = BaseAuthProviderConfig & {
  type: "jwt";
  /** JWT secret for HS256/HS384/HS512 */
  secret?: string;
  /** Public key for RS256/RS384/RS512/ES256/ES384/ES512 */
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
export type BetterAuthConfig = BaseAuthProviderConfig & {
  type: "better-auth";
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
export type WorkOSConfig = BaseAuthProviderConfig & {
  type: "workos";
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
export type CustomAuthConfig = BaseAuthProviderConfig & {
  type: "custom";
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

/**
 * Union type for all provider configurations
 */
export type AuthProviderConfig =
  | Auth0Config
  | ClerkConfig
  | FirebaseConfig
  | SupabaseConfig
  | CognitoConfig
  | KeycloakConfig
  | BetterAuthConfig
  | WorkOSConfig
  | CustomAuthConfig
  | OAuth2Config
  | JWTConfig
  | BaseAuthProviderConfig;

// =============================================================================
// MIDDLEWARE TYPES
// =============================================================================

/**
 * Auth request context
 */
export type AuthRequestContext = {
  /** HTTP method */
  method: string;
  /** Request URL/path */
  path: string;
  /** Request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Request cookies */
  cookies?: Record<string, string>;
  /** Query parameters */
  query?: Record<string, string | string[] | undefined>;
  /** Request body (if available) */
  body?: unknown;
  /** IP address */
  ip?: string;
  /** User agent */
  userAgent?: string;
  /** Request ID for tracing */
  requestId?: string;
};

/**
 * Authenticated request context (after successful auth)
 */
export type AuthenticatedContext = AuthRequestContext & {
  /** Authenticated user */
  user: AuthUser;
  /** Current session */
  session?: AuthSession;
  /** Token used for authentication */
  token?: string;
  /** Token claims */
  claims?: Record<string, JsonValue>;
};

/**
 * Token extraction configuration
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
  custom?: (context: AuthRequestContext) => string | null | Promise<string | null>;
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
  onError?: (error: AuthError, context: AuthRequestContext) => void | Promise<void>;
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
  /** Custom authorization function */
  custom?: (user: AuthUser, context: AuthRequestContext) => boolean | Promise<boolean>;
  /** Custom error handler */
  onDenied?: (result: AuthorizationResult, context: AuthRequestContext) => void | Promise<void>;
};

// =============================================================================
// SESSION STORAGE TYPES
// =============================================================================

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
 * Auth error with additional context
 */
export type AuthError = Error & {
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
  error?: AuthError;
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
) => Promise<MastraAuthProvider>;

/**
 * Auth provider registration entry
 */
export type AuthProviderRegistration = {
  /** Provider type */
  type: AuthProviderType;
  /** Factory function */
  factory: AuthProviderFactoryFn;
  /** Provider aliases */
  aliases: string[];
  /** Provider metadata */
  metadata?: {
    name: string;
    description: string;
    version?: string;
    documentation?: string;
  };
};

// =============================================================================
// PROVIDER INTERFACE
// =============================================================================

/**
 * Main authentication provider interface
 * All auth providers must implement this interface
 */
export type MastraAuthProvider = {
  /** Provider type identifier */
  readonly type: AuthProviderType;

  /** Provider configuration */
  readonly config: AuthProviderConfig;

  /**
   * Validate and authenticate a token
   * @param token - JWT or access token to validate
   * @returns Validation result with user data if valid
   */
  authenticateToken(token: string): Promise<TokenValidationResult>;

  /**
   * Create a new session for an authenticated user
   * @param user - Authenticated user
   * @param options - Session creation options
   * @returns Created session
   */
  createSession(
    user: AuthUser,
    options?: {
      expiresIn?: number;
      metadata?: Record<string, JsonValue>;
    },
  ): Promise<AuthSession>;

  /**
   * Validate an existing session
   * @param sessionId - Session ID to validate
   * @returns Validation result with session if valid
   */
  validateSession(sessionId: string): Promise<SessionValidationResult>;

  /**
   * Refresh a session (extend expiration)
   * @param sessionId - Session ID to refresh
   * @returns Updated session
   */
  refreshSession(sessionId: string): Promise<AuthSession>;

  /**
   * Revoke a session
   * @param sessionId - Session ID to revoke
   */
  revokeSession(sessionId: string): Promise<void>;

  /**
   * Revoke all sessions for a user
   * @param userId - User ID
   */
  revokeAllSessions(userId: string): Promise<void>;

  /**
   * Check if a user is authorized for specific roles/permissions
   * @param user - User to authorize
   * @param options - Authorization requirements
   * @returns Authorization result
   */
  authorize(
    user: AuthUser,
    options: {
      roles?: string[];
      permissions?: string[];
      requireAllRoles?: boolean;
    },
  ): Promise<AuthorizationResult>;

  /**
   * Get user by ID (provider-specific)
   * @param userId - User ID
   * @returns User if found
   */
  getUser?(userId: string): Promise<AuthUser | null>;

  /**
   * Update user roles
   * @param userId - User ID
   * @param roles - New roles
   */
  updateUserRoles?(userId: string, roles: string[]): Promise<void>;

  /**
   * Update user permissions
   * @param userId - User ID
   * @param permissions - New permissions
   */
  updateUserPermissions?(userId: string, permissions: string[]): Promise<void>;

  /**
   * Clean up resources
   */
  dispose?(): Promise<void>;
};

// =============================================================================
// UTILITY TYPES
// =============================================================================

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
 * Health check result for auth providers
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

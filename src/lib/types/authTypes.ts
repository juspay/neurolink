// src/lib/types/authTypes.ts

import type { UnknownRecord } from "./common.js";

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
  /** Provider-specific metadata */
  metadata?: UnknownRecord;
  /** Organization/tenant ID for multi-tenant apps */
  organizationId?: string;
  /** Email verification status */
  emailVerified?: boolean;
  /** Account creation timestamp */
  createdAt?: Date;
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
  /** Session creation time */
  createdAt: Date;
  /** Session expiration time */
  expiresAt: Date;
  /** Whether session is still valid */
  isValid: boolean;
  /** IP address of session origin */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Device fingerprint */
  deviceId?: string;
  /** Session metadata */
  metadata?: UnknownRecord;
};

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
  /** Error message if invalid */
  error?: string;
  /** Token expiration time */
  expiresAt?: Date;
  /** Token type */
  tokenType?: TokenType;
};

/**
 * Authorization check result
 */
export type AuthorizationResult = {
  /** Whether the user is authorized */
  authorized: boolean;
  /** Reason for denial if not authorized */
  reason?: string;
  /** Missing permissions if denied */
  missingPermissions?: string[];
  /** Missing roles if denied */
  missingRoles?: string[];
};

/**
 * Authentication request context
 */
export type AuthRequestContext = {
  /** HTTP request headers */
  headers: Record<string, string | string[] | undefined>;
  /** Request cookies */
  cookies?: Record<string, string>;
  /** Request IP address */
  ipAddress?: string;
  /** Request user agent */
  userAgent?: string;
  /** Request path */
  path?: string;
  /** Request method */
  method?: string;
};

/**
 * Enhanced request context with authenticated user
 */
export type AuthenticatedContext = {
  /** Authenticated user */
  user: AuthUser;
  /** Current session */
  session: AuthSession;
  /** Original request context */
  request: AuthRequestContext;
  /** Authentication timestamp */
  authenticatedAt: Date;
  /** Provider that performed authentication */
  provider: AuthProviderType;
};

/**
 * Configuration for MastraAuthProvider
 */
export type AuthProviderConfig = {
  /** Provider type */
  type: AuthProviderType;
  /** Whether authentication is required */
  required?: boolean;
  /** Token extraction strategy */
  tokenExtraction?: TokenExtractionStrategy;
  /** Session configuration */
  session?: SessionConfig;
  /** RBAC configuration */
  rbac?: RBACConfig;
  /** Provider-specific options */
  options?: UnknownRecord;
};

/**
 * Token extraction configuration
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
  /** Custom extraction function */
  custom?: (context: AuthRequestContext) => string | null;
};

/**
 * Session configuration
 */
export type SessionConfig = {
  /** Session duration in seconds */
  duration?: number;
  /** Whether to refresh sessions automatically */
  autoRefresh?: boolean;
  /** Refresh threshold in seconds before expiry */
  refreshThreshold?: number;
  /** Session storage backend */
  storage?: SessionStorageType;
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
  enabled: boolean;
  /** Role hierarchy (higher roles inherit lower role permissions) */
  roleHierarchy?: Record<string, string[]>;
  /** Permission definitions */
  permissions?: PermissionDefinition[];
  /** Default permissions for authenticated users */
  defaultPermissions?: string[];
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

/**
 * Auth middleware options
 */
export type AuthMiddlewareOptions = {
  /** Auth provider instance */
  provider: MastraAuthProvider;
  /** Routes to exclude from authentication */
  excludePaths?: string[];
  /** Whether auth is optional (continue if no token) */
  optional?: boolean;
  /** Custom unauthorized handler */
  onUnauthorized?: (context: AuthRequestContext) => Response | Promise<Response>;
  /** Custom error handler */
  onError?: (error: Error, context: AuthRequestContext) => Response | Promise<Response>;
};

/**
 * Provider-specific configuration types
 */

export type BetterAuthConfig = {
  /** Better Auth secret */
  secret: string;
  /** Better Auth base URL */
  baseUrl: string;
  /** Database connection string */
  databaseUrl?: string;
  /** Social providers */
  socialProviders?: {
    github?: { clientId: string; clientSecret: string };
    google?: { clientId: string; clientSecret: string };
    discord?: { clientId: string; clientSecret: string };
  };
};

export type Auth0Config = {
  /** Auth0 domain */
  domain: string;
  /** Auth0 client ID */
  clientId: string;
  /** Auth0 client secret */
  clientSecret?: string;
  /** Auth0 audience */
  audience?: string;
  /** Auth0 scope */
  scope?: string;
};

export type ClerkConfig = {
  /** Clerk publishable key */
  publishableKey: string;
  /** Clerk secret key */
  secretKey: string;
  /** Clerk JWT key (for local validation) */
  jwtKey?: string;
  /** Allowed origins */
  allowedOrigins?: string[];
};

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
};

export type SupabaseConfig = {
  /** Supabase URL */
  url: string;
  /** Supabase anon key */
  anonKey: string;
  /** Supabase service role key */
  serviceRoleKey?: string;
  /** JWT secret for local validation */
  jwtSecret?: string;
};

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
  validateToken: (token: string, context?: AuthRequestContext) => Promise<TokenValidationResult>;
  /** Custom user fetching function */
  getUser?: (userId: string) => Promise<AuthUser | null>;
  /** Custom session creation function */
  createSession?: (user: AuthUser, context?: AuthRequestContext) => Promise<AuthSession>;
};

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

/**
 * Base interface for all authentication providers
 *
 * Implements Mastra-style auth provider pattern with unified methods for:
 * - Token validation
 * - User authorization
 * - Session management
 * - Request context integration
 */
export type MastraAuthProvider = {
  /**
   * Get the provider type identifier
   */
  readonly type: AuthProviderType;

  /**
   * Get the provider configuration
   */
  readonly config: AuthProviderConfig;

  // ===================
  // Token Validation
  // ===================

  /**
   * Validate and decode an authentication token
   */
  authenticateToken(token: string, context?: AuthRequestContext): Promise<TokenValidationResult>;

  /**
   * Extract token from request context
   */
  extractToken(context: AuthRequestContext): string | null;

  /**
   * Refresh an authentication token (optional)
   */
  refreshToken?(refreshToken: string): Promise<TokenRefreshResult>;

  /**
   * Revoke a token (logout) (optional)
   */
  revokeToken?(token: string): Promise<void>;

  // ===================
  // User Authorization
  // ===================

  /**
   * Check if a user is authorized to perform an action
   */
  authorizeUser(user: AuthUser, permission: string): Promise<AuthorizationResult>;

  /**
   * Check if user has specific roles
   */
  authorizeRoles(user: AuthUser, roles: string[]): Promise<AuthorizationResult>;

  /**
   * Check if user has all specified permissions
   */
  authorizePermissions(user: AuthUser, permissions: string[]): Promise<AuthorizationResult>;

  // ===================
  // Session Management
  // ===================

  /**
   * Create a new session for a user
   */
  createSession(user: AuthUser, context?: AuthRequestContext): Promise<AuthSession>;

  /**
   * Get an existing session by ID
   */
  getSession(sessionId: string): Promise<AuthSession | null>;

  /**
   * Refresh/extend a session
   */
  refreshSession(sessionId: string): Promise<AuthSession | null>;

  /**
   * Invalidate/destroy a session
   */
  destroySession(sessionId: string): Promise<void>;

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): Promise<AuthSession[]>;

  /**
   * Invalidate all sessions for a user (global logout)
   */
  destroyAllUserSessions(userId: string): Promise<void>;

  // ===================
  // Request Context
  // ===================

  /**
   * Authenticate a request and return full context
   */
  authenticateRequest(context: AuthRequestContext): Promise<AuthenticatedContext | null>;

  // ===================
  // User Management (Optional)
  // ===================

  /**
   * Get user by ID (optional)
   */
  getUser?(userId: string): Promise<AuthUser | null>;

  /**
   * Get user by email (optional)
   */
  getUserByEmail?(email: string): Promise<AuthUser | null>;

  /**
   * Update user metadata (optional)
   */
  updateUserMetadata?(userId: string, metadata: Record<string, unknown>): Promise<void>;

  // ===================
  // Health & Lifecycle
  // ===================

  /**
   * Check provider health
   */
  healthCheck(): Promise<AuthHealthCheck>;

  /**
   * Initialize the provider (optional)
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup provider resources (optional)
   */
  cleanup?(): Promise<void>;
};

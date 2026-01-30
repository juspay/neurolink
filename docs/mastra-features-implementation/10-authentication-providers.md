# Authentication Providers Implementation Guide

## Executive Summary

This document provides a comprehensive implementation guide for adding Mastra-style authentication providers to NeuroLink. The authentication system enables secure, flexible authentication for NeuroLink server deployments, supporting multiple auth providers (Better Auth, Auth0, Clerk, Firebase Auth, Supabase Auth, WorkOS) through a unified interface.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Design](#architecture-design)
3. [Type Definitions](#type-definitions)
4. [Auth Provider Interface](#auth-provider-interface)
5. [Provider Implementations](#provider-implementations)
6. [Server Integration](#server-integration)
7. [Middleware Patterns](#middleware-patterns)
8. [Step-by-Step Implementation Plan](#step-by-step-implementation-plan)
9. [Usage Examples](#usage-examples)
10. [Migration Guide](#migration-guide)

---

## Overview

### Goals

1. **Unified Auth Interface** - Single `MastraAuthProvider` interface for all auth providers
2. **Multiple Provider Support** - Support for 6+ popular auth providers
3. **Token Validation** - Secure JWT/session token validation
4. **User Authorization** - Role-based and permission-based access control
5. **Session Management** - Session lifecycle with Redis support
6. **Request Context** - User context propagation through request pipeline

### Design Principles

Following NeuroLink's architecture patterns:

- **Factory Pattern** - Auth provider creation via `AuthProviderFactory`
- **Registry Pattern** - Provider registration with dynamic imports
- **Composition** - Auth middleware composable with existing middleware
- **Type Safety** - Comprehensive TypeScript types
- **Graceful Degradation** - Continue operating when auth is optional

---

## Architecture Design

### Directory Structure

```
src/lib/
├── auth/                           # Authentication system
│   ├── authProvider.ts            # Base MastraAuthProvider interface
│   ├── authProviderFactory.ts     # Factory for creating auth providers
│   ├── authProviderRegistry.ts    # Registry for auth providers
│   ├── authContext.ts             # User context management
│   ├── authErrors.ts              # Auth-specific errors
│   ├── sessionManager.ts          # Session lifecycle management
│   ├── providers/                 # Provider implementations
│   │   ├── betterAuth.ts          # Better Auth (self-hosted)
│   │   ├── auth0.ts               # Auth0 provider
│   │   ├── clerk.ts               # Clerk provider
│   │   ├── firebase.ts            # Firebase Auth provider
│   │   ├── supabase.ts            # Supabase Auth provider
│   │   ├── workos.ts              # WorkOS provider
│   │   └── custom.ts              # Custom auth adapter
│   ├── middleware/                # Auth middleware
│   │   ├── authMiddleware.ts      # Main auth middleware
│   │   ├── rbacMiddleware.ts      # Role-based access control
│   │   └── rateLimitByUser.ts     # User-based rate limiting
│   └── index.ts                   # Public exports
├── types/
│   └── authTypes.ts               # Auth type definitions
└── server/
    └── neuroLinkServer.ts         # Server with auth integration
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                        NeuroLink Server                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   Auth Middleware │────│  AuthProvider    │                   │
│  │                   │    │  (Factory)       │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Request Context │    │  Auth Registry   │                   │
│  │  (User, Session) │    │  (Providers)     │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  RBAC Middleware │    │  Provider Impl   │                   │
│  │  (Permissions)   │    │  (Auth0, Clerk)  │                   │
│  └──────────────────┘    └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Type Definitions

### Core Auth Types (`src/lib/types/authTypes.ts`)

```typescript
// src/lib/types/authTypes.ts

import type { JsonValue, UnknownRecord } from "./common.js";

/**
 * Supported authentication provider types
 */
export type AuthProviderType =
  | "better-auth"
  | "auth0"
  | "clerk"
  | "firebase"
  | "supabase"
  | "workos"
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
```

---

## Auth Provider Interface

### MastraAuthProvider Base Interface (`src/lib/auth/authProvider.ts`)

````typescript
// src/lib/auth/authProvider.ts

import type {
  AuthProviderConfig,
  AuthProviderType,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthorizationResult,
  AuthRequestContext,
  AuthenticatedContext,
  AuthHealthCheck,
} from "../types/authTypes.js";
import { EventEmitter } from "events";

/**
 * Base interface for all authentication providers
 *
 * Implements Mastra-style auth provider pattern with unified methods for:
 * - Token validation
 * - User authorization
 * - Session management
 * - Request context integration
 *
 * @example
 * ```typescript
 * const authProvider = await AuthProviderFactory.create("auth0", {
 *   domain: "your-domain.auth0.com",
 *   clientId: "your-client-id",
 *   audience: "your-api-audience"
 * });
 *
 * const result = await authProvider.authenticateToken(token);
 * if (result.valid) {
 *   console.log("Authenticated user:", result.user);
 * }
 * ```
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
   *
   * @param token - The token to validate (JWT, session token, API key)
   * @param context - Optional request context for additional validation
   * @returns Token validation result with user info if valid
   *
   * @example
   * ```typescript
   * const result = await provider.authenticateToken(bearerToken);
   * if (result.valid) {
   *   // Token is valid, user is authenticated
   *   console.log("User:", result.user);
   * } else {
   *   // Token is invalid
   *   console.log("Error:", result.error);
   * }
   * ```
   */
  authenticateToken(
    token: string,
    context?: AuthRequestContext,
  ): Promise<TokenValidationResult>;

  /**
   * Extract token from request context
   * Uses configured extraction strategy
   *
   * @param context - The request context
   * @returns Extracted token or null if not found
   */
  extractToken(context: AuthRequestContext): string | null;

  /**
   * Refresh an authentication token
   *
   * @param refreshToken - The refresh token
   * @returns New token pair or error
   */
  refreshToken?(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  }>;

  /**
   * Revoke a token (logout)
   *
   * @param token - Token to revoke
   */
  revokeToken?(token: string): Promise<void>;

  // ===================
  // User Authorization
  // ===================

  /**
   * Check if a user is authorized to perform an action
   *
   * @param user - The authenticated user
   * @param permission - Required permission
   * @returns Authorization result
   *
   * @example
   * ```typescript
   * const authResult = await provider.authorizeUser(user, "tools:execute");
   * if (!authResult.authorized) {
   *   throw new AuthorizationError(authResult.reason);
   * }
   * ```
   */
  authorizeUser(
    user: AuthUser,
    permission: string,
  ): Promise<AuthorizationResult>;

  /**
   * Check if user has specific roles
   *
   * @param user - The authenticated user
   * @param roles - Required roles (any of)
   * @returns Authorization result
   */
  authorizeRoles(user: AuthUser, roles: string[]): Promise<AuthorizationResult>;

  /**
   * Check if user has all specified permissions
   *
   * @param user - The authenticated user
   * @param permissions - Required permissions (all of)
   * @returns Authorization result
   */
  authorizePermissions(
    user: AuthUser,
    permissions: string[],
  ): Promise<AuthorizationResult>;

  // ===================
  // Session Management
  // ===================

  /**
   * Create a new session for a user
   *
   * @param user - The authenticated user
   * @param context - Request context for session metadata
   * @returns Created session
   */
  createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession>;

  /**
   * Get an existing session by ID
   *
   * @param sessionId - Session identifier
   * @returns Session if found and valid, null otherwise
   */
  getSession(sessionId: string): Promise<AuthSession | null>;

  /**
   * Refresh/extend a session
   *
   * @param sessionId - Session to refresh
   * @returns Updated session
   */
  refreshSession(sessionId: string): Promise<AuthSession | null>;

  /**
   * Invalidate/destroy a session
   *
   * @param sessionId - Session to invalidate
   */
  destroySession(sessionId: string): Promise<void>;

  /**
   * Get all active sessions for a user
   *
   * @param userId - User identifier
   * @returns List of active sessions
   */
  getUserSessions(userId: string): Promise<AuthSession[]>;

  /**
   * Invalidate all sessions for a user (global logout)
   *
   * @param userId - User identifier
   */
  destroyAllUserSessions(userId: string): Promise<void>;

  // ===================
  // Request Context
  // ===================

  /**
   * Authenticate a request and return full context
   * Combines token extraction, validation, and session management
   *
   * @param context - Request context
   * @returns Authenticated context with user and session
   *
   * @example
   * ```typescript
   * const authContext = await provider.authenticateRequest(requestContext);
   * if (authContext) {
   *   // Request is authenticated
   *   console.log("User:", authContext.user);
   *   console.log("Session:", authContext.session);
   * }
   * ```
   */
  authenticateRequest(
    context: AuthRequestContext,
  ): Promise<AuthenticatedContext | null>;

  // ===================
  // User Management (Optional)
  // ===================

  /**
   * Get user by ID
   *
   * @param userId - User identifier
   * @returns User if found
   */
  getUser?(userId: string): Promise<AuthUser | null>;

  /**
   * Get user by email
   *
   * @param email - User email
   * @returns User if found
   */
  getUserByEmail?(email: string): Promise<AuthUser | null>;

  /**
   * Update user metadata
   *
   * @param userId - User identifier
   * @param metadata - Metadata to update
   */
  updateUserMetadata?(
    userId: string,
    metadata: Record<string, unknown>,
  ): Promise<void>;

  // ===================
  // Health & Lifecycle
  // ===================

  /**
   * Check provider health
   *
   * @returns Health check result
   */
  healthCheck(): Promise<AuthHealthCheck>;

  /**
   * Initialize the provider
   * Called automatically by factory
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup provider resources
   */
  cleanup?(): Promise<void>;
};

/**
 * Abstract base class implementing common auth provider functionality
 */
export abstract class BaseAuthProvider implements MastraAuthProvider {
  abstract readonly type: AuthProviderType;
  readonly config: AuthProviderConfig;
  protected emitter = new EventEmitter();

  constructor(config: AuthProviderConfig) {
    this.config = {
      required: true,
      tokenExtraction: {
        fromHeader: { name: "Authorization", scheme: "Bearer" },
      },
      ...config,
    };
  }

  /**
   * Extract token using configured strategy
   */
  extractToken(context: AuthRequestContext): string | null {
    const strategy = this.config.tokenExtraction;

    // Try header extraction
    if (strategy?.fromHeader) {
      const headerValue =
        context.headers[strategy.fromHeader.name.toLowerCase()];
      if (typeof headerValue === "string") {
        if (strategy.fromHeader.scheme) {
          const prefix = `${strategy.fromHeader.scheme} `;
          if (headerValue.startsWith(prefix)) {
            return headerValue.slice(prefix.length);
          }
        } else {
          return headerValue;
        }
      }
    }

    // Try cookie extraction
    if (strategy?.fromCookie && context.cookies) {
      const cookieValue = context.cookies[strategy.fromCookie.name];
      if (cookieValue) {
        return cookieValue;
      }
    }

    // Try query parameter extraction
    if (strategy?.fromQuery && context.path) {
      const url = new URL(context.path, "http://localhost");
      const queryValue = url.searchParams.get(strategy.fromQuery.name);
      if (queryValue) {
        return queryValue;
      }
    }

    // Try custom extraction
    if (strategy?.custom) {
      return strategy.custom(context);
    }

    return null;
  }

  /**
   * Default authorization by permission
   * Can be overridden by providers
   */
  async authorizeUser(
    user: AuthUser,
    permission: string,
  ): Promise<AuthorizationResult> {
    // Check if user has the permission directly
    if (user.permissions.includes(permission)) {
      return { authorized: true };
    }

    // Check if user has wildcard permission
    if (user.permissions.includes("*")) {
      return { authorized: true };
    }

    // Check permission hierarchy (e.g., "tools:*" includes "tools:execute")
    const permissionParts = permission.split(":");
    for (let i = permissionParts.length - 1; i > 0; i--) {
      const wildcardPermission = [...permissionParts.slice(0, i), "*"].join(
        ":",
      );
      if (user.permissions.includes(wildcardPermission)) {
        return { authorized: true };
      }
    }

    return {
      authorized: false,
      reason: `User lacks permission: ${permission}`,
      missingPermissions: [permission],
    };
  }

  /**
   * Authorization by roles
   */
  async authorizeRoles(
    user: AuthUser,
    roles: string[],
  ): Promise<AuthorizationResult> {
    const hasRole = roles.some((role) => user.roles.includes(role));

    if (hasRole) {
      return { authorized: true };
    }

    // Check role hierarchy if configured
    if (this.config.rbac?.roleHierarchy) {
      for (const userRole of user.roles) {
        const inheritedRoles = this.config.rbac.roleHierarchy[userRole] || [];
        if (roles.some((role) => inheritedRoles.includes(role))) {
          return { authorized: true };
        }
      }
    }

    return {
      authorized: false,
      reason: `User lacks required role(s): ${roles.join(", ")}`,
      missingRoles: roles.filter((r) => !user.roles.includes(r)),
    };
  }

  /**
   * Authorization by multiple permissions (all required)
   */
  async authorizePermissions(
    user: AuthUser,
    permissions: string[],
  ): Promise<AuthorizationResult> {
    const missing: string[] = [];

    for (const permission of permissions) {
      const result = await this.authorizeUser(user, permission);
      if (!result.authorized) {
        missing.push(permission);
      }
    }

    if (missing.length === 0) {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: `User lacks permissions: ${missing.join(", ")}`,
      missingPermissions: missing,
    };
  }

  /**
   * Full request authentication flow
   */
  async authenticateRequest(
    context: AuthRequestContext,
  ): Promise<AuthenticatedContext | null> {
    // Extract token
    const token = this.extractToken(context);

    if (!token) {
      if (!this.config.required) {
        return null;
      }
      this.emitter.emit("auth:unauthorized", context, "No token provided");
      return null;
    }

    // Validate token
    const validation = await this.authenticateToken(token, context);

    if (!validation.valid || !validation.user) {
      this.emitter.emit(
        "auth:unauthorized",
        context,
        validation.error || "Invalid token",
      );
      return null;
    }

    // Get or create session
    const session = await this.createSession(validation.user, context);

    return {
      user: validation.user,
      session,
      request: context,
      authenticatedAt: new Date(),
      provider: this.type,
    };
  }

  /**
   * Default health check implementation
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    return {
      healthy: true,
      providerConnected: true,
      sessionStorageHealthy: true,
    };
  }

  // Abstract methods that providers must implement
  abstract authenticateToken(
    token: string,
    context?: AuthRequestContext,
  ): Promise<TokenValidationResult>;

  abstract createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession>;

  abstract getSession(sessionId: string): Promise<AuthSession | null>;

  abstract refreshSession(sessionId: string): Promise<AuthSession | null>;

  abstract destroySession(sessionId: string): Promise<void>;

  abstract getUserSessions(userId: string): Promise<AuthSession[]>;

  abstract destroyAllUserSessions(userId: string): Promise<void>;
}
````

---

## Provider Implementations

### Auth Provider Factory (`src/lib/auth/authProviderFactory.ts`)

````typescript
// src/lib/auth/authProviderFactory.ts

import type { MastraAuthProvider } from "./authProvider.js";
import type {
  AuthProviderType,
  AuthProviderConfig,
  BetterAuthConfig,
  Auth0Config,
  ClerkConfig,
  FirebaseConfig,
  SupabaseConfig,
  WorkOSConfig,
} from "../types/authTypes.js";
import { logger } from "../utils/logger.js";

type ProviderConstructor = (
  config: AuthProviderConfig & Record<string, unknown>,
) => Promise<MastraAuthProvider>;

type ProviderRegistration = {
  constructor: ProviderConstructor;
  configSchema?: Record<string, unknown>;
};

/**
 * Factory for creating authentication provider instances
 *
 * Uses dynamic imports to avoid loading unused provider dependencies.
 * Follows NeuroLink's factory pattern with lazy loading.
 *
 * @example
 * ```typescript
 * // Create an Auth0 provider
 * const auth = await AuthProviderFactory.create("auth0", {
 *   domain: "your-domain.auth0.com",
 *   clientId: "your-client-id"
 * });
 *
 * // Create a Clerk provider
 * const auth = await AuthProviderFactory.create("clerk", {
 *   publishableKey: "pk_test_...",
 *   secretKey: "sk_test_..."
 * });
 * ```
 */
export class AuthProviderFactory {
  private static providers: Map<string, ProviderRegistration> = new Map();
  private static initialized = false;

  /**
   * Register an auth provider with the factory
   */
  static registerProvider(
    type: AuthProviderType,
    constructor: ProviderConstructor,
    configSchema?: Record<string, unknown>,
  ): void {
    this.providers.set(type, { constructor, configSchema });
    logger.debug(`Auth provider registered: ${type}`);
  }

  /**
   * Create an auth provider instance
   *
   * @param type - Provider type
   * @param config - Provider configuration
   * @returns Configured auth provider instance
   */
  static async create<T extends AuthProviderType>(
    type: T,
    config: T extends "auth0"
      ? Auth0Config
      : T extends "clerk"
        ? ClerkConfig
        : T extends "firebase"
          ? FirebaseConfig
          : T extends "supabase"
            ? SupabaseConfig
            : T extends "workos"
              ? WorkOSConfig
              : T extends "better-auth"
                ? BetterAuthConfig
                : Record<string, unknown>,
  ): Promise<MastraAuthProvider> {
    // Ensure providers are registered
    if (!this.initialized) {
      await this.registerAllProviders();
    }

    const registration = this.providers.get(type);

    if (!registration) {
      throw new Error(
        `Unknown auth provider: ${type}. ` +
          `Available: ${this.getAvailableProviders().join(", ")}`,
      );
    }

    const fullConfig: AuthProviderConfig & Record<string, unknown> = {
      type,
      ...config,
    };

    try {
      const provider = await registration.constructor(fullConfig);

      // Initialize if method exists
      if (provider.initialize) {
        await provider.initialize();
      }

      logger.info(`Auth provider created: ${type}`);
      return provider;
    } catch (error) {
      logger.error(`Failed to create auth provider ${type}:`, error);
      throw error;
    }
  }

  /**
   * Register all built-in auth providers
   * Uses dynamic imports to avoid loading unnecessary dependencies
   */
  private static async registerAllProviders(): Promise<void> {
    if (this.initialized) return;

    // Better Auth (self-hosted)
    this.registerProvider("better-auth", async (config) => {
      const { BetterAuthProvider } = await import("./providers/betterAuth.js");
      return new BetterAuthProvider(
        config as AuthProviderConfig & BetterAuthConfig,
      );
    });

    // Auth0
    this.registerProvider("auth0", async (config) => {
      const { Auth0Provider } = await import("./providers/auth0.js");
      return new Auth0Provider(config as AuthProviderConfig & Auth0Config);
    });

    // Clerk
    this.registerProvider("clerk", async (config) => {
      const { ClerkProvider } = await import("./providers/clerk.js");
      return new ClerkProvider(config as AuthProviderConfig & ClerkConfig);
    });

    // Firebase Auth
    this.registerProvider("firebase", async (config) => {
      const { FirebaseAuthProvider } = await import("./providers/firebase.js");
      return new FirebaseAuthProvider(
        config as AuthProviderConfig & FirebaseConfig,
      );
    });

    // Supabase Auth
    this.registerProvider("supabase", async (config) => {
      const { SupabaseAuthProvider } = await import("./providers/supabase.js");
      return new SupabaseAuthProvider(
        config as AuthProviderConfig & SupabaseConfig,
      );
    });

    // WorkOS
    this.registerProvider("workos", async (config) => {
      const { WorkOSProvider } = await import("./providers/workos.js");
      return new WorkOSProvider(config as AuthProviderConfig & WorkOSConfig);
    });

    // Custom adapter
    this.registerProvider("custom", async (config) => {
      const { CustomAuthProvider } = await import("./providers/custom.js");
      return new CustomAuthProvider(config);
    });

    this.initialized = true;
    logger.debug("All auth providers registered");
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  static hasProvider(type: string): boolean {
    return this.providers.has(type);
  }

  /**
   * Clear all registrations (for testing)
   */
  static clearRegistrations(): void {
    this.providers.clear();
    this.initialized = false;
  }
}
````

### Auth0 Provider Implementation (`src/lib/auth/providers/auth0.ts`)

````typescript
// src/lib/auth/providers/auth0.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  Auth0Config,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import * as jose from "jose";

type Auth0TokenPayload = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  "https://your-namespace/roles"?: string[];
  "https://your-namespace/permissions"?: string[];
  iat: number;
  exp: number;
  aud: string | string[];
  iss: string;
};

/**
 * Auth0 Authentication Provider
 *
 * Supports JWT validation with JWKS for Auth0-issued tokens.
 *
 * @example
 * ```typescript
 * const auth0 = new Auth0Provider({
 *   type: "auth0",
 *   domain: "your-tenant.auth0.com",
 *   clientId: "your-client-id",
 *   audience: "https://your-api.example.com"
 * });
 *
 * const result = await auth0.authenticateToken(bearerToken);
 * ```
 */
export class Auth0Provider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "auth0" as const;

  private domain: string;
  private clientId: string;
  private audience?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & Auth0Config) {
    super(config);

    if (!config.domain) {
      throw new Error("Auth0 domain is required");
    }
    if (!config.clientId) {
      throw new Error("Auth0 clientId is required");
    }

    this.domain = config.domain;
    this.clientId = config.clientId;
    this.audience = config.audience;
  }

  /**
   * Initialize JWKS for JWT verification
   */
  async initialize(): Promise<void> {
    const jwksUrl = new URL(`https://${this.domain}/.well-known/jwks.json`);
    this.jwks = jose.createRemoteJWKSet(jwksUrl);
    logger.debug(`Auth0 provider initialized for domain: ${this.domain}`);
  }

  /**
   * Validate Auth0 JWT token
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    if (!this.jwks) {
      await this.initialize();
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.jwks!, {
        issuer: `https://${this.domain}/`,
        audience: this.audience,
      });

      const auth0Payload = payload as unknown as Auth0TokenPayload;

      // Extract user information from token
      const user: AuthUser = {
        id: auth0Payload.sub,
        email: auth0Payload.email,
        name: auth0Payload.name,
        picture: auth0Payload.picture,
        emailVerified: auth0Payload.email_verified,
        roles: auth0Payload["https://your-namespace/roles"] || [],
        permissions: auth0Payload["https://your-namespace/permissions"] || [],
        metadata: {
          iss: auth0Payload.iss,
          aud: auth0Payload.aud,
        },
      };

      return {
        valid: true,
        payload: payload as unknown as Record<string, unknown>,
        user,
        expiresAt: new Date(auth0Payload.exp * 1000),
        tokenType: "jwt",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("Auth0 token validation failed:", message);

      return {
        valid: false,
        error: message,
      };
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const duration = this.config.session?.duration || 3600; // 1 hour default

    const session: AuthSession = {
      id: sessionId,
      user,
      createdAt: now,
      expiresAt: new Date(now.getTime() + duration * 1000),
      isValid: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    // Store session
    this.sessions.set(sessionId, session);

    // Track user's sessions
    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);

    this.emitter.emit("auth:login", user);
    logger.debug(`Session created for user: ${user.id}`);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await this.destroySession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Refresh session
   */
  async refreshSession(sessionId: string): Promise<AuthSession | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const duration = this.config.session?.duration || 3600;
    session.expiresAt = new Date(Date.now() + duration * 1000);

    this.sessions.set(sessionId, session);
    this.emitter.emit("auth:tokenRefresh", session);

    return session;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      // Remove from user's sessions
      const userSessionSet = this.userSessions.get(session.user.id);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
      }

      this.sessions.delete(sessionId);
      this.emitter.emit("auth:logout", session.user.id);
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return [];
    }

    const sessions: AuthSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);

    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
      this.emitter.emit("auth:logout", userId);
    }
  }

  /**
   * Fetch user profile from Auth0 Management API
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    // Note: Requires Management API access token
    // This is a simplified implementation
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://${this.domain}/api/v2/users/${encodeURIComponent(userId)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.AUTH0_MANAGEMENT_TOKEN}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        id: data.user_id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        emailVerified: data.email_verified,
        roles: data.app_metadata?.roles || [],
        permissions: data.app_metadata?.permissions || [],
        createdAt: new Date(data.created_at),
        lastLoginAt: data.last_login ? new Date(data.last_login) : undefined,
        metadata: data.user_metadata,
      };
    } catch (error) {
      logger.error("Failed to fetch Auth0 user:", error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://${this.domain}/.well-known/openid-configuration`,
      );

      return {
        healthy: response.ok,
        providerConnected: response.ok,
        sessionStorageHealthy: true,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        providerConnected: false,
        sessionStorageHealthy: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
    logger.debug("Auth0 provider cleaned up");
  }
}
````

### Clerk Provider Implementation (`src/lib/auth/providers/clerk.ts`)

````typescript
// src/lib/auth/providers/clerk.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  ClerkConfig,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import * as jose from "jose";

/**
 * Clerk Authentication Provider
 *
 * Supports Clerk's session-based and JWT authentication.
 *
 * @example
 * ```typescript
 * const clerk = new ClerkProvider({
 *   type: "clerk",
 *   publishableKey: "pk_test_...",
 *   secretKey: "sk_test_..."
 * });
 *
 * const result = await clerk.authenticateToken(sessionToken);
 * ```
 */
export class ClerkProvider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "clerk" as const;

  private secretKey: string;
  private jwtKey?: string;
  private jwks: jose.JWTVerifyGetKey | null = null;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & ClerkConfig) {
    super(config);

    if (!config.secretKey) {
      throw new Error("Clerk secretKey is required");
    }

    this.secretKey = config.secretKey;
    this.jwtKey = config.jwtKey;
  }

  /**
   * Initialize Clerk JWKS
   */
  async initialize(): Promise<void> {
    // Clerk's JWKS endpoint
    const jwksUrl = new URL("https://api.clerk.com/.well-known/jwks.json");
    this.jwks = jose.createRemoteJWKSet(jwksUrl);
    logger.debug("Clerk provider initialized");
  }

  /**
   * Validate Clerk session token or JWT
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    // First try JWT validation
    if (token.includes(".")) {
      return this.validateJWT(token);
    }

    // Otherwise treat as session token
    return this.validateSessionToken(token);
  }

  /**
   * Validate JWT using JWKS
   */
  private async validateJWT(token: string): Promise<TokenValidationResult> {
    if (!this.jwks) {
      await this.initialize();
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.jwks!);

      const user: AuthUser = {
        id: payload.sub as string,
        email: payload.email as string | undefined,
        name: payload.name as string | undefined,
        picture: payload.picture as string | undefined,
        emailVerified: payload.email_verified as boolean | undefined,
        roles: (payload["https://clerk.dev/roles"] as string[]) || [],
        permissions:
          (payload["https://clerk.dev/permissions"] as string[]) || [],
        organizationId: payload.org_id as string | undefined,
      };

      return {
        valid: true,
        payload: payload as unknown as Record<string, unknown>,
        user,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
        tokenType: "jwt",
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate session token via Clerk API
   */
  private async validateSessionToken(
    token: string,
  ): Promise<TokenValidationResult> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        "https://api.clerk.com/v1/sessions/verify",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          valid: false,
          error: error.errors?.[0]?.message || "Session validation failed",
        };
      }

      const session = await response.json();

      const user: AuthUser = {
        id: session.user_id,
        email: session.user?.email_addresses?.[0]?.email_address,
        name: session.user?.first_name
          ? `${session.user.first_name} ${session.user.last_name || ""}`.trim()
          : undefined,
        picture: session.user?.image_url,
        roles: session.user?.public_metadata?.roles || [],
        permissions: session.user?.public_metadata?.permissions || [],
        organizationId: session.active_organization_id,
      };

      return {
        valid: true,
        payload: session,
        user,
        expiresAt: new Date(session.expire_at),
        tokenType: "session",
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a new session
   */
  async createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const duration = this.config.session?.duration || 86400; // 24 hours default

    const session: AuthSession = {
      id: sessionId,
      user,
      createdAt: now,
      expiresAt: new Date(now.getTime() + duration * 1000),
      isValid: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);

    this.emitter.emit("auth:login", user);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await this.destroySession(sessionId);
      }
      return null;
    }

    return session;
  }

  /**
   * Refresh session
   */
  async refreshSession(sessionId: string): Promise<AuthSession | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const duration = this.config.session?.duration || 86400;
    session.expiresAt = new Date(Date.now() + duration * 1000);

    this.sessions.set(sessionId, session);
    this.emitter.emit("auth:tokenRefresh", session);

    return session;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      const userSessionSet = this.userSessions.get(session.user.id);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
      }
      this.sessions.delete(sessionId);
      this.emitter.emit("auth:logout", session.user.id);
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return [];
    }

    const sessions: AuthSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);

    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
      this.emitter.emit("auth:logout", userId);
    }
  }

  /**
   * Get user by ID from Clerk API
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `https://api.clerk.com/v1/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        id: data.id,
        email: data.email_addresses?.[0]?.email_address,
        name: data.first_name
          ? `${data.first_name} ${data.last_name || ""}`.trim()
          : undefined,
        picture: data.image_url,
        emailVerified:
          data.email_addresses?.[0]?.verification?.status === "verified",
        roles: data.public_metadata?.roles || [],
        permissions: data.public_metadata?.permissions || [],
        createdAt: new Date(data.created_at),
        lastLoginAt: data.last_sign_in_at
          ? new Date(data.last_sign_in_at)
          : undefined,
        metadata: data.private_metadata,
      };
    } catch (error) {
      logger.error("Failed to fetch Clerk user:", error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch("https://api.clerk.com/v1/health", {
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
        },
      });

      return {
        healthy: response.ok,
        providerConnected: response.ok,
        sessionStorageHealthy: true,
      };
    } catch (error) {
      return {
        healthy: false,
        providerConnected: false,
        sessionStorageHealthy: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
    logger.debug("Clerk provider cleaned up");
  }
}
````

### Supabase Provider Implementation (`src/lib/auth/providers/supabase.ts`)

````typescript
// src/lib/auth/providers/supabase.ts

import { BaseAuthProvider, type MastraAuthProvider } from "../authProvider.js";
import type {
  AuthProviderConfig,
  SupabaseConfig,
  AuthUser,
  AuthSession,
  TokenValidationResult,
  AuthRequestContext,
  AuthHealthCheck,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import * as jose from "jose";

/**
 * Supabase Authentication Provider
 *
 * Supports Supabase JWT validation and user management.
 *
 * @example
 * ```typescript
 * const supabase = new SupabaseAuthProvider({
 *   type: "supabase",
 *   url: "https://your-project.supabase.co",
 *   anonKey: "your-anon-key",
 *   jwtSecret: "your-jwt-secret"
 * });
 *
 * const result = await supabase.authenticateToken(accessToken);
 * ```
 */
export class SupabaseAuthProvider
  extends BaseAuthProvider
  implements MastraAuthProvider
{
  readonly type = "supabase" as const;

  private supabaseUrl: string;
  private anonKey: string;
  private serviceRoleKey?: string;
  private jwtSecret?: string;
  private sessions: Map<string, AuthSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  constructor(config: AuthProviderConfig & SupabaseConfig) {
    super(config);

    if (!config.url) {
      throw new Error("Supabase URL is required");
    }
    if (!config.anonKey) {
      throw new Error("Supabase anon key is required");
    }

    this.supabaseUrl = config.url;
    this.anonKey = config.anonKey;
    this.serviceRoleKey = config.serviceRoleKey;
    this.jwtSecret = config.jwtSecret;
  }

  /**
   * Validate Supabase JWT
   */
  async authenticateToken(
    token: string,
    _context?: AuthRequestContext,
  ): Promise<TokenValidationResult> {
    try {
      // If JWT secret is provided, verify locally
      if (this.jwtSecret) {
        const secret = new TextEncoder().encode(this.jwtSecret);
        const { payload } = await jose.jwtVerify(token, secret);

        const user = this.payloadToUser(payload);

        return {
          valid: true,
          payload: payload as unknown as Record<string, unknown>,
          user,
          expiresAt: payload.exp ? new Date(payload.exp * 1000) : undefined,
          tokenType: "jwt",
        };
      }

      // Otherwise, validate via Supabase API
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(`${this.supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.anonKey,
        },
      });

      if (!response.ok) {
        return {
          valid: false,
          error: "Invalid token",
        };
      }

      const userData = await response.json();
      const user = this.supabaseUserToAuthUser(userData);

      return {
        valid: true,
        payload: userData,
        user,
        tokenType: "jwt",
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Convert JWT payload to AuthUser
   */
  private payloadToUser(payload: jose.JWTPayload): AuthUser {
    return {
      id: payload.sub as string,
      email: payload.email as string | undefined,
      name: payload.name as string | undefined,
      emailVerified: payload.email_confirmed as boolean | undefined,
      roles: (payload.user_role as string)
        ? [payload.user_role as string]
        : ((payload.app_metadata as Record<string, unknown>)
            ?.roles as string[]) || [],
      permissions:
        ((payload.app_metadata as Record<string, unknown>)
          ?.permissions as string[]) || [],
      metadata: payload.user_metadata as Record<string, unknown>,
    };
  }

  /**
   * Convert Supabase user to AuthUser
   */
  private supabaseUserToAuthUser(userData: Record<string, unknown>): AuthUser {
    return {
      id: userData.id as string,
      email: userData.email as string | undefined,
      name: (userData.user_metadata as Record<string, unknown>)?.full_name as
        | string
        | undefined,
      picture: (userData.user_metadata as Record<string, unknown>)
        ?.avatar_url as string | undefined,
      emailVerified: userData.email_confirmed_at !== null,
      roles:
        ((userData.app_metadata as Record<string, unknown>)
          ?.roles as string[]) || [],
      permissions:
        ((userData.app_metadata as Record<string, unknown>)
          ?.permissions as string[]) || [],
      createdAt: userData.created_at
        ? new Date(userData.created_at as string)
        : undefined,
      lastLoginAt: userData.last_sign_in_at
        ? new Date(userData.last_sign_in_at as string)
        : undefined,
      metadata: userData.user_metadata as Record<string, unknown>,
    };
  }

  /**
   * Create a new session
   */
  async createSession(
    user: AuthUser,
    context?: AuthRequestContext,
  ): Promise<AuthSession> {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const duration = this.config.session?.duration || 3600;

    const session: AuthSession = {
      id: sessionId,
      user,
      createdAt: now,
      expiresAt: new Date(now.getTime() + duration * 1000),
      isValid: true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    };

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(user.id)) {
      this.userSessions.set(user.id, new Set());
    }
    this.userSessions.get(user.id)!.add(sessionId);

    this.emitter.emit("auth:login", user);
    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await this.destroySession(sessionId);
      }
      return null;
    }

    return session;
  }

  /**
   * Refresh session
   */
  async refreshSession(sessionId: string): Promise<AuthSession | null> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return null;
    }

    const duration = this.config.session?.duration || 3600;
    session.expiresAt = new Date(Date.now() + duration * 1000);

    this.sessions.set(sessionId, session);
    this.emitter.emit("auth:tokenRefresh", session);

    return session;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      const userSessionSet = this.userSessions.get(session.user.id);
      if (userSessionSet) {
        userSessionSet.delete(sessionId);
      }
      this.sessions.delete(sessionId);
      this.emitter.emit("auth:logout", session.user.id);
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<AuthSession[]> {
    const sessionIds = this.userSessions.get(userId);

    if (!sessionIds) {
      return [];
    }

    const sessions: AuthSession[] = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userSessions.get(userId);

    if (sessionIds) {
      for (const sessionId of sessionIds) {
        this.sessions.delete(sessionId);
      }
      this.userSessions.delete(userId);
      this.emitter.emit("auth:logout", userId);
    }
  }

  /**
   * Get user by ID via Supabase Admin API
   */
  async getUser(userId: string): Promise<AuthUser | null> {
    if (!this.serviceRoleKey) {
      logger.warn("Service role key required for user lookup");
      return null;
    }

    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(
        `${this.supabaseUrl}/auth/v1/admin/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${this.serviceRoleKey}`,
            apikey: this.anonKey,
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      const userData = await response.json();
      return this.supabaseUserToAuthUser(userData);
    } catch (error) {
      logger.error("Failed to fetch Supabase user:", error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<AuthHealthCheck> {
    try {
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(`${this.supabaseUrl}/auth/v1/health`, {
        headers: {
          apikey: this.anonKey,
        },
      });

      return {
        healthy: response.ok,
        providerConnected: response.ok,
        sessionStorageHealthy: true,
      };
    } catch (error) {
      return {
        healthy: false,
        providerConnected: false,
        sessionStorageHealthy: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.sessions.clear();
    this.userSessions.clear();
    logger.debug("Supabase provider cleaned up");
  }
}
````

---

## Server Integration

### Auth Middleware (`src/lib/auth/middleware/authMiddleware.ts`)

````typescript
// src/lib/auth/middleware/authMiddleware.ts

import type { MastraAuthProvider } from "../authProvider.js";
import type {
  AuthMiddlewareOptions,
  AuthRequestContext,
  AuthenticatedContext,
} from "../../types/authTypes.js";
import { logger } from "../../utils/logger.js";
import { AuthenticationError, AuthorizationError } from "../../types/errors.js";

/**
 * Result of middleware processing
 */
export type MiddlewareResult = {
  /** Continue processing the request */
  proceed: boolean;
  /** Authenticated context if successful */
  context?: AuthenticatedContext;
  /** Error response if failed */
  response?: Response;
};

/**
 * Create authentication middleware for NeuroLink server
 *
 * @param options - Middleware configuration options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const authMiddleware = createAuthMiddleware({
 *   provider: auth0Provider,
 *   excludePaths: ["/health", "/public"],
 *   optional: false
 * });
 *
 * // Use in server
 * app.use(async (request, next) => {
 *   const result = await authMiddleware(request);
 *   if (!result.proceed) {
 *     return result.response;
 *   }
 *   // request.authContext = result.context
 *   return next();
 * });
 * ```
 */
export function createAuthMiddleware(
  options: AuthMiddlewareOptions,
): (request: Request) => Promise<MiddlewareResult> {
  const {
    provider,
    excludePaths = [],
    optional = false,
    onUnauthorized,
    onError,
  } = options;

  return async (request: Request): Promise<MiddlewareResult> => {
    const url = new URL(request.url);
    const path = url.pathname;

    // Check if path is excluded
    if (shouldExcludePath(path, excludePaths)) {
      return { proceed: true };
    }

    // Build request context
    const context = buildRequestContext(request);

    try {
      // Authenticate request
      const authContext = await provider.authenticateRequest(context);

      if (!authContext) {
        if (optional) {
          return { proceed: true };
        }

        const response = onUnauthorized
          ? await onUnauthorized(context)
          : createUnauthorizedResponse("Authentication required");

        return { proceed: false, response };
      }

      return { proceed: true, context: authContext };
    } catch (error) {
      logger.error("Auth middleware error:", error);

      const errorResponse = onError
        ? await onError(error as Error, context)
        : createErrorResponse(error as Error);

      return { proceed: false, response: errorResponse };
    }
  };
}

/**
 * Create RBAC (Role-Based Access Control) middleware
 *
 * @param provider - Auth provider instance
 * @param requiredPermissions - Permissions required for the route
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const rbacMiddleware = createRBACMiddleware(
 *   auth0Provider,
 *   ["tools:execute", "agents:create"]
 * );
 * ```
 */
export function createRBACMiddleware(
  provider: MastraAuthProvider,
  requiredPermissions: string[],
): (context: AuthenticatedContext) => Promise<MiddlewareResult> {
  return async (context: AuthenticatedContext): Promise<MiddlewareResult> => {
    const result = await provider.authorizePermissions(
      context.user,
      requiredPermissions,
    );

    if (!result.authorized) {
      return {
        proceed: false,
        response: createForbiddenResponse(
          result.reason || "Insufficient permissions",
        ),
      };
    }

    return { proceed: true, context };
  };
}

/**
 * Create role-based middleware
 *
 * @param provider - Auth provider instance
 * @param requiredRoles - Roles required (any of)
 * @returns Middleware function
 */
export function createRoleMiddleware(
  provider: MastraAuthProvider,
  requiredRoles: string[],
): (context: AuthenticatedContext) => Promise<MiddlewareResult> {
  return async (context: AuthenticatedContext): Promise<MiddlewareResult> => {
    const result = await provider.authorizeRoles(context.user, requiredRoles);

    if (!result.authorized) {
      return {
        proceed: false,
        response: createForbiddenResponse(result.reason || "Insufficient role"),
      };
    }

    return { proceed: true, context };
  };
}

// ===================
// Helper Functions
// ===================

/**
 * Check if path should be excluded from auth
 */
function shouldExcludePath(path: string, excludePaths: string[]): boolean {
  return excludePaths.some((pattern) => {
    if (pattern.endsWith("*")) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern;
  });
}

/**
 * Build request context from Request object
 */
function buildRequestContext(request: Request): AuthRequestContext {
  const headers: Record<string, string | undefined> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // Extract cookies
  const cookieHeader = request.headers.get("cookie");
  const cookies: Record<string, string> = {};
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookies[name] = value;
      }
    });
  }

  return {
    headers,
    cookies,
    ipAddress:
      headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      headers["x-real-ip"] ||
      undefined,
    userAgent: headers["user-agent"],
    path: new URL(request.url).pathname,
    method: request.method,
  };
}

/**
 * Create 401 Unauthorized response
 */
function createUnauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message,
      statusCode: 401,
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="NeuroLink API"',
      },
    },
  );
}

/**
 * Create 403 Forbidden response
 */
function createForbiddenResponse(message: string): Response {
  return new Response(
    JSON.stringify({
      error: "Forbidden",
      message,
      statusCode: 403,
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Create error response
 */
function createErrorResponse(error: Error): Response {
  const isAuthError =
    error instanceof AuthenticationError || error instanceof AuthorizationError;

  return new Response(
    JSON.stringify({
      error: isAuthError ? error.name : "Internal Server Error",
      message: error.message,
      statusCode: isAuthError ? 401 : 500,
    }),
    {
      status: isAuthError ? 401 : 500,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
````

### NeuroLink Server with Auth (`src/lib/server/neuroLinkServer.ts`)

````typescript
// src/lib/server/neuroLinkServer.ts

import type { MastraAuthProvider } from "../auth/authProvider.js";
import type {
  AuthenticatedContext,
  AuthMiddlewareOptions,
} from "../types/authTypes.js";
import {
  createAuthMiddleware,
  createRBACMiddleware,
} from "../auth/middleware/authMiddleware.js";
import { logger } from "../utils/logger.js";

/**
 * Server configuration with authentication
 */
export type NeuroLinkServerConfig = {
  /** Port to listen on */
  port?: number;
  /** Host to bind to */
  host?: string;
  /** Authentication provider */
  auth?: MastraAuthProvider;
  /** Auth middleware options */
  authOptions?: Omit<AuthMiddlewareOptions, "provider">;
  /** Route definitions with permissions */
  routes?: RouteDefinition[];
};

/**
 * Route definition with optional auth requirements
 */
export type RouteDefinition = {
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Route path pattern */
  path: string;
  /** Handler function */
  handler: RouteHandler;
  /** Required permissions for this route */
  permissions?: string[];
  /** Required roles for this route (any of) */
  roles?: string[];
  /** Skip auth for this route */
  public?: boolean;
};

/**
 * Route handler function type
 */
export type RouteHandler = (
  request: Request,
  context?: AuthenticatedContext,
) => Response | Promise<Response>;

/**
 * NeuroLink HTTP Server with built-in authentication support
 *
 * @example
 * ```typescript
 * const server = new NeuroLinkServer({
 *   port: 3000,
 *   auth: auth0Provider,
 *   authOptions: {
 *     excludePaths: ["/health", "/docs/*"],
 *   },
 *   routes: [
 *     {
 *       method: "POST",
 *       path: "/api/generate",
 *       handler: generateHandler,
 *       permissions: ["ai:generate"],
 *     },
 *     {
 *       method: "GET",
 *       path: "/health",
 *       handler: healthHandler,
 *       public: true,
 *     },
 *   ],
 * });
 *
 * await server.start();
 * ```
 */
export class NeuroLinkServer {
  private config: Required<NeuroLinkServerConfig>;
  private authMiddleware?: ReturnType<typeof createAuthMiddleware>;
  private routes: Map<string, RouteDefinition> = new Map();

  constructor(config: NeuroLinkServerConfig) {
    this.config = {
      port: config.port || 3000,
      host: config.host || "0.0.0.0",
      auth: config.auth!,
      authOptions: config.authOptions || {},
      routes: config.routes || [],
    };

    // Setup auth middleware if provider is configured
    if (config.auth) {
      this.authMiddleware = createAuthMiddleware({
        provider: config.auth,
        ...config.authOptions,
      });
    }

    // Register routes
    for (const route of this.config.routes) {
      const key = `${route.method}:${route.path}`;
      this.routes.set(key, route);
    }
  }

  /**
   * Handle incoming request
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const routeKey = `${request.method}:${url.pathname}`;

    // Find matching route
    const route = this.findRoute(request.method, url.pathname);

    if (!route) {
      return new Response(
        JSON.stringify({ error: "Not Found", statusCode: 404 }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    // Skip auth for public routes
    if (route.public) {
      return route.handler(request);
    }

    // Run auth middleware
    let authContext: AuthenticatedContext | undefined;

    if (this.authMiddleware) {
      const authResult = await this.authMiddleware(request);

      if (!authResult.proceed) {
        return authResult.response!;
      }

      authContext = authResult.context;
    }

    // Check route-specific permissions
    if (route.permissions && route.permissions.length > 0 && authContext) {
      const rbacMiddleware = createRBACMiddleware(
        this.config.auth,
        route.permissions,
      );
      const rbacResult = await rbacMiddleware(authContext);

      if (!rbacResult.proceed) {
        return rbacResult.response!;
      }
    }

    // Check route-specific roles
    if (route.roles && route.roles.length > 0 && authContext) {
      const hasRole = route.roles.some((role) =>
        authContext!.user.roles.includes(role),
      );

      if (!hasRole) {
        return new Response(
          JSON.stringify({
            error: "Forbidden",
            message: `Required roles: ${route.roles.join(", ")}`,
            statusCode: 403,
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Execute handler
    try {
      return await route.handler(request, authContext);
    } catch (error) {
      logger.error("Route handler error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : String(error),
          statusCode: 500,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  /**
   * Find matching route (supports path parameters)
   */
  private findRoute(method: string, path: string): RouteDefinition | undefined {
    // First try exact match
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey);
    }

    // Try pattern matching
    for (const [key, route] of this.routes) {
      if (!key.startsWith(`${method}:`)) continue;

      const routePath = key.slice(method.length + 1);
      if (this.pathMatches(routePath, path)) {
        return route;
      }
    }

    return undefined;
  }

  /**
   * Check if path matches pattern (supports :param and *)
   */
  private pathMatches(pattern: string, path: string): boolean {
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) {
      // Check for wildcard at end
      if (patternParts[patternParts.length - 1] === "*") {
        return (
          pathParts.slice(0, patternParts.length - 1).join("/") ===
          patternParts.slice(0, -1).join("/")
        );
      }
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(":")) continue;
      if (patternPart === "*") continue;
      if (patternPart !== pathPart) return false;
    }

    return true;
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    logger.info(
      `NeuroLink server starting on ${this.config.host}:${this.config.port}`,
    );

    // Use Bun.serve, Node.js http, or other server implementation
    // This is a placeholder for the actual server start logic
    // Implementation depends on the runtime environment
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    logger.info("NeuroLink server stopping");

    // Cleanup auth provider
    if (this.config.auth?.cleanup) {
      await this.config.auth.cleanup();
    }
  }
}
````

---

## Step-by-Step Implementation Plan

### Phase 1: Core Types and Interfaces (Week 1)

1. **Create auth types file**

   ```bash
   touch src/lib/types/authTypes.ts
   ```

   - Define all TypeScript interfaces
   - Export from types/index.ts

2. **Create auth directory structure**

   ```bash
   mkdir -p src/lib/auth/providers
   mkdir -p src/lib/auth/middleware
   touch src/lib/auth/authProvider.ts
   touch src/lib/auth/authProviderFactory.ts
   touch src/lib/auth/authErrors.ts
   touch src/lib/auth/index.ts
   ```

3. **Implement base auth provider interface**
   - MastraAuthProvider interface
   - BaseAuthProvider abstract class
   - Common authentication logic

### Phase 2: Auth Provider Implementations (Week 2)

1. **Implement Auth0 provider**

   ```bash
   touch src/lib/auth/providers/auth0.ts
   ```

   - JWT validation with JWKS
   - User profile fetching
   - Session management

2. **Implement Clerk provider**

   ```bash
   touch src/lib/auth/providers/clerk.ts
   ```

   - Session token validation
   - JWT validation
   - Organization support

3. **Implement Supabase provider**

   ```bash
   touch src/lib/auth/providers/supabase.ts
   ```

   - JWT validation
   - API-based user management

### Phase 3: Additional Providers (Week 3)

1. **Implement Firebase Auth provider**

   ```bash
   touch src/lib/auth/providers/firebase.ts
   ```

2. **Implement Better Auth provider**

   ```bash
   touch src/lib/auth/providers/betterAuth.ts
   ```

3. **Implement WorkOS provider**

   ```bash
   touch src/lib/auth/providers/workos.ts
   ```

4. **Implement custom adapter**
   ```bash
   touch src/lib/auth/providers/custom.ts
   ```

### Phase 4: Server Integration (Week 4)

1. **Create auth middleware**

   ```bash
   touch src/lib/auth/middleware/authMiddleware.ts
   touch src/lib/auth/middleware/rbacMiddleware.ts
   ```

2. **Integrate with NeuroLink server**
   - Update server configuration
   - Add protected routes support
   - Add user context propagation

3. **Add session management**

   ```bash
   touch src/lib/auth/sessionManager.ts
   ```

   - In-memory sessions
   - Redis session support

### Phase 5: Testing and Documentation (Week 5)

1. **Write unit tests**

   ```bash
   touch test/auth/auth0.test.ts
   touch test/auth/clerk.test.ts
   touch test/auth/middleware.test.ts
   ```

2. **Write integration tests**

   ```bash
   touch test/integration/auth.test.ts
   ```

3. **Update documentation**
   - API reference
   - Usage examples
   - Provider configuration guides

---

## Usage Examples

### Basic Auth0 Setup

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { AuthProviderFactory } from "@juspay/neurolink/auth";

// Create auth provider
const authProvider = await AuthProviderFactory.create("auth0", {
  domain: "your-tenant.auth0.com",
  clientId: "your-client-id",
  audience: "https://your-api.example.com",
});

// Create NeuroLink instance
const neurolink = new NeuroLink();

// Use in server
const server = new NeuroLinkServer({
  port: 3000,
  auth: authProvider,
  routes: [
    {
      method: "POST",
      path: "/api/generate",
      handler: async (request, context) => {
        console.log("User:", context?.user);

        const body = await request.json();
        const result = await neurolink.generate({
          prompt: body.prompt,
          provider: "anthropic",
        });

        return Response.json(result);
      },
      permissions: ["ai:generate"],
    },
  ],
});

await server.start();
```

### Multi-Provider Setup

```typescript
import { AuthProviderFactory } from "@juspay/neurolink/auth";

// Create multiple providers for different use cases
const auth0 = await AuthProviderFactory.create("auth0", {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
});

const supabase = await AuthProviderFactory.create("supabase", {
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!,
});

// Use based on request headers
async function getAuthProvider(request: Request) {
  const provider = request.headers.get("X-Auth-Provider");

  switch (provider) {
    case "supabase":
      return supabase;
    default:
      return auth0;
  }
}
```

### Custom RBAC Example

```typescript
import {
  createAuthMiddleware,
  createRBACMiddleware,
} from "@juspay/neurolink/auth";

// Define permission hierarchy
const permissions = {
  "ai:generate": ["user", "admin"],
  "ai:stream": ["user", "admin"],
  "tools:execute": ["power-user", "admin"],
  "admin:*": ["admin"],
};

// Create auth middleware with RBAC
const authMiddleware = createAuthMiddleware({
  provider: authProvider,
  excludePaths: ["/health", "/docs/*"],
});

// Create permission-checking middleware
const requirePermission = (permission: string) =>
  createRBACMiddleware(authProvider, [permission]);

// Use in routes
app.post(
  "/api/generate",
  authMiddleware,
  requirePermission("ai:generate"),
  async (request, context) => {
    // Handle generation
  },
);

app.post(
  "/api/tools/execute",
  authMiddleware,
  requirePermission("tools:execute"),
  async (request, context) => {
    // Handle tool execution
  },
);
```

### Session Management with Redis

```typescript
import { AuthProviderFactory } from "@juspay/neurolink/auth";

const authProvider = await AuthProviderFactory.create("auth0", {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  session: {
    duration: 3600, // 1 hour
    autoRefresh: true,
    refreshThreshold: 300, // 5 minutes before expiry
    storage: "redis",
    redis: {
      url: process.env.REDIS_URL!,
      prefix: "neurolink:sessions:",
      ttl: 3600,
    },
  },
});

// Sessions are now persisted in Redis
const session = await authProvider.createSession(user);

// Later, get session from any server instance
const existingSession = await authProvider.getSession(sessionId);
```

---

## Migration Guide

### From Custom Auth Implementation

**Before:**

```typescript
// Custom auth checking
async function authenticate(request: Request) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    throw new Error("Unauthorized");
  }

  // Custom JWT validation
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload;
}
```

**After:**

```typescript
import {
  AuthProviderFactory,
  createAuthMiddleware,
} from "@juspay/neurolink/auth";

const authProvider = await AuthProviderFactory.create("auth0", {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
});

const authMiddleware = createAuthMiddleware({ provider: authProvider });

// Use in routes
app.use(authMiddleware);
```

### Adding Auth to Existing NeuroLink Server

```typescript
import { NeuroLinkServer } from "@juspay/neurolink/server";
import { AuthProviderFactory } from "@juspay/neurolink/auth";

// 1. Create auth provider
const authProvider = await AuthProviderFactory.create("clerk", {
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// 2. Update server configuration
const server = new NeuroLinkServer({
  port: 3000,
  auth: authProvider, // Add auth provider
  authOptions: {
    excludePaths: ["/health", "/api/public/*"],
    optional: false,
  },
  routes: existingRoutes.map((route) => ({
    ...route,
    // Add permissions to existing routes
    permissions: route.path.includes("/admin") ? ["admin:*"] : undefined,
  })),
});
```

---

## Conclusion

This implementation guide provides a comprehensive plan for adding Mastra-style authentication providers to NeuroLink. The auth system offers:

1. **Unified Interface** - Single `MastraAuthProvider` interface for all providers
2. **Multiple Providers** - Support for Auth0, Clerk, Firebase, Supabase, WorkOS, and Better Auth
3. **Token Validation** - Secure JWT and session token validation
4. **Authorization** - Flexible RBAC with roles and permissions
5. **Session Management** - In-memory and Redis session support
6. **Server Integration** - Middleware patterns for protected routes

The implementation follows NeuroLink's established patterns:

- Factory pattern with dynamic imports
- Registry pattern for provider registration
- Composition for middleware chains
- Comprehensive TypeScript types
- Graceful error handling

**File Locations Summary:**

| File                                        | Purpose                           |
| ------------------------------------------- | --------------------------------- |
| `src/lib/types/authTypes.ts`                | All auth type definitions         |
| `src/lib/auth/authProvider.ts`              | Base MastraAuthProvider interface |
| `src/lib/auth/authProviderFactory.ts`       | Factory for creating providers    |
| `src/lib/auth/providers/auth0.ts`           | Auth0 implementation              |
| `src/lib/auth/providers/clerk.ts`           | Clerk implementation              |
| `src/lib/auth/providers/supabase.ts`        | Supabase implementation           |
| `src/lib/auth/providers/firebase.ts`        | Firebase Auth implementation      |
| `src/lib/auth/providers/betterAuth.ts`      | Better Auth implementation        |
| `src/lib/auth/providers/workos.ts`          | WorkOS implementation             |
| `src/lib/auth/middleware/authMiddleware.ts` | Auth middleware                   |
| `src/lib/server/neuroLinkServer.ts`         | Server with auth integration      |
| `src/lib/auth/index.ts`                     | Public exports                    |

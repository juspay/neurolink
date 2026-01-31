/**
 * AuthProviderRegistry - Registry pattern for authentication providers
 *
 * Provides centralized registration and discovery of auth providers.
 * Works with AuthProviderFactory for lazy loading and instance creation.
 */

import { createErrorFactory } from "../core/infrastructure/baseError.js";
import { BaseRegistry, type RegistryEntry } from "../core/infrastructure/baseRegistry.js";
import { logger } from "../utils/logger.js";
import { AuthProviderFactory } from "./AuthProviderFactory.js";
import type { AuthProviderConfig, AuthProviderType, MastraAuthProvider } from "./types/authTypes.js";

// =============================================================================
// ERROR FACTORY
// =============================================================================

/**
 * Auth registry error codes
 */
export const AuthRegistryErrorCodes = {
  PROVIDER_NOT_FOUND: "AUTH_REGISTRY-001",
  REGISTRATION_FAILED: "AUTH_REGISTRY-002",
  INITIALIZATION_FAILED: "AUTH_REGISTRY-003",
  DUPLICATE_REGISTRATION: "AUTH_REGISTRY-004",
} as const;

/**
 * Auth registry error factory
 */
export const AuthRegistryError = createErrorFactory("AuthRegistry", AuthRegistryErrorCodes);

// =============================================================================
// REGISTRY TYPES
// =============================================================================

/**
 * Provider registration metadata
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
};

/**
 * Provider health status
 */
export type ProviderHealthStatus = {
  type: AuthProviderType;
  healthy: boolean;
  lastCheck: Date;
  latency?: number;
  error?: string;
};

// =============================================================================
// REGISTRY IMPLEMENTATION
// =============================================================================

/**
 * AuthProviderRegistry - Centralized registry for auth providers
 *
 * Responsibilities:
 * - Register provider factories with AuthProviderFactory
 * - Track provider metadata and capabilities
 * - Provide discovery APIs for available providers
 * - Support provider health checks
 *
 * @example
 * ```typescript
 * // Get registry instance
 * const registry = AuthProviderRegistry.getInstance();
 *
 * // List available providers
 * const providers = registry.list();
 *
 * // Get provider info
 * const auth0Info = await registry.get('auth0');
 *
 * // Check if provider is available
 * const hasAuth0 = registry.has('auth0');
 * ```
 */
export class AuthProviderRegistry extends BaseRegistry<MastraAuthProvider, AuthProviderMetadata> {
  private static instance: AuthProviderRegistry | null = null;
  private healthCache = new Map<string, ProviderHealthStatus>();
  private factory: AuthProviderFactory;

  private constructor() {
    super();
    this.factory = AuthProviderFactory.getInstance();
  }

  /**
   * Get singleton registry instance
   */
  static getInstance(): AuthProviderRegistry {
    if (!AuthProviderRegistry.instance) {
      AuthProviderRegistry.instance = new AuthProviderRegistry();
    }
    return AuthProviderRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (AuthProviderRegistry.instance) {
      AuthProviderRegistry.instance.clear();
      AuthProviderRegistry.instance = null;
    }
    AuthProviderFactory.resetInstance();
  }

  /**
   * Register all providers
   * Called automatically when registry is first used
   */
  protected async registerAll(): Promise<void> {
    logger.debug("[AuthProviderRegistry] Registering all providers");

    // Ensure factory is initialized
    await this.factory.ensureInitialized();

    // Register provider metadata in registry
    this.registerProviderMetadata("auth0", {
      type: "auth0",
      name: "Auth0",
      description: "Auth0 identity platform with JWT validation, session management, and RBAC",
      version: "1.0.0",
      documentation: "https://auth0.com/docs",
      aliases: ["auth0-jwt", "auth0-oauth"],
      features: ["jwt-validation", "session-management", "rbac", "user-management"],
      requiresExternalDependencies: false,
    });

    this.registerProviderMetadata("clerk", {
      type: "clerk",
      name: "Clerk",
      description: "Clerk authentication platform with seamless developer experience",
      version: "1.0.0",
      documentation: "https://clerk.com/docs",
      aliases: ["clerk-jwt"],
      features: ["jwt-validation", "session-management", "rbac"],
      requiresExternalDependencies: true,
    });

    this.registerProviderMetadata("firebase", {
      type: "firebase",
      name: "Firebase Authentication",
      description: "Firebase Auth with custom claims and multi-provider support",
      version: "1.0.0",
      documentation: "https://firebase.google.com/docs/auth",
      aliases: ["firebase-auth", "google-firebase"],
      features: ["jwt-validation", "session-management", "custom-claims"],
      requiresExternalDependencies: true,
    });

    this.registerProviderMetadata("supabase", {
      type: "supabase",
      name: "Supabase Auth",
      description: "Supabase authentication with PostgreSQL-based user management",
      version: "1.0.0",
      documentation: "https://supabase.com/docs/guides/auth",
      aliases: ["supabase-auth"],
      features: ["jwt-validation", "session-management", "row-level-security"],
      requiresExternalDependencies: true,
    });

    this.registerProviderMetadata("cognito", {
      type: "cognito",
      name: "AWS Cognito",
      description: "Amazon Cognito User Pools with AWS integration",
      version: "1.0.0",
      documentation: "https://docs.aws.amazon.com/cognito",
      aliases: ["aws-cognito", "amazon-cognito"],
      features: ["jwt-validation", "session-management", "mfa", "user-pools"],
      requiresExternalDependencies: false,
    });

    this.registerProviderMetadata("keycloak", {
      type: "keycloak",
      name: "Keycloak",
      description: "Keycloak OpenID Connect with enterprise SSO support",
      version: "1.0.0",
      documentation: "https://www.keycloak.org/documentation",
      aliases: ["keycloak-oidc"],
      features: ["jwt-validation", "session-management", "rbac", "sso", "ldap"],
      requiresExternalDependencies: false,
    });

    this.registerProviderMetadata("better-auth", {
      type: "better-auth",
      name: "Better Auth",
      description: "Self-hosted open-source authentication solution with JWT and session support",
      version: "1.0.0",
      documentation: "https://better-auth.com/docs",
      aliases: ["betterauth", "better_auth"],
      features: ["jwt-validation", "session-management", "social-auth"],
      requiresExternalDependencies: false,
    });

    this.registerProviderMetadata("workos", {
      type: "workos",
      name: "WorkOS",
      description: "Enterprise SSO and user management with directory integration",
      version: "1.0.0",
      documentation: "https://workos.com/docs",
      aliases: ["workos-sso", "work-os"],
      features: ["jwt-validation", "session-management", "sso", "directory-sync", "enterprise"],
      requiresExternalDependencies: false,
    });

    this.registerProviderMetadata("custom", {
      type: "custom",
      name: "Custom",
      description: "Custom authentication with user-provided validation logic",
      version: "1.0.0",
      aliases: ["custom-auth"],
      features: ["custom-validation", "session-management"],
      requiresExternalDependencies: false,
    });

    logger.debug("[AuthProviderRegistry] All providers registered");
  }

  /**
   * Register provider metadata
   */
  private registerProviderMetadata(type: string, metadata: AuthProviderMetadata): void {
    // Register with base registry
    this.register(
      type,
      async () => {
        throw new Error(`Direct provider creation not supported. Use AuthProviderFactory.create() with config.`);
      },
      metadata,
    );

    // Register aliases
    for (const alias of metadata.aliases) {
      if (!this.items.has(alias)) {
        this.register(
          alias,
          async () => {
            throw new Error(`Direct provider creation not supported. Use AuthProviderFactory.create() with config.`);
          },
          { ...metadata, type: type as AuthProviderType },
        );
      }
    }
  }

  /**
   * Create a provider instance using the factory
   *
   * @param type - Provider type or alias
   * @param config - Provider configuration
   * @returns Created provider instance
   */
  async createProvider(type: AuthProviderType | string, config: AuthProviderConfig): Promise<MastraAuthProvider> {
    await this.ensureInitialized();

    if (!this.has(type)) {
      throw AuthRegistryError.create(
        "PROVIDER_NOT_FOUND",
        `Auth provider not found: ${type}. Available: ${this.getAvailableTypes().join(", ")}`,
        {
          details: {
            requestedProvider: type,
            availableProviders: this.getAvailableTypes(),
          },
        },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.factory.create(type, config as any) as any;
  }

  /**
   * Get available provider types
   */
  getAvailableTypes(): AuthProviderType[] {
    return Array.from(new Set(this.list().map((p) => p.metadata.type)));
  }

  /**
   * Get provider metadata by type or alias
   */
  async getMetadata(type: string): Promise<AuthProviderMetadata | undefined> {
    await this.ensureInitialized();

    const entry = this.items.get(type.toLowerCase());
    return entry?.metadata;
  }

  /**
   * Get all providers with a specific feature
   */
  getProvidersByFeature(feature: string): AuthProviderMetadata[] {
    return this.list()
      .filter((p) => p.metadata.features?.includes(feature))
      .map((p) => p.metadata);
  }

  /**
   * Get providers that don't require external dependencies
   */
  getBuiltInProviders(): AuthProviderMetadata[] {
    return this.list()
      .filter((p) => !p.metadata.requiresExternalDependencies)
      .map((p) => p.metadata);
  }

  /**
   * Check provider health
   * Note: This creates a temporary provider instance to check connectivity
   */
  async checkProviderHealth(type: AuthProviderType, config: AuthProviderConfig): Promise<ProviderHealthStatus> {
    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      const provider = await this.createProvider(type, config);

      // Simple health check - try to access config
      const healthy = provider.type === type;

      // Clean up if provider has dispose method
      if (provider.dispose) {
        await provider.dispose();
      }

      const status: ProviderHealthStatus = {
        type,
        healthy,
        lastCheck: new Date(),
        latency: Date.now() - startTime,
      };

      this.healthCache.set(type, status);
      return status;
    } catch (error) {
      const status: ProviderHealthStatus = {
        type,
        healthy: false,
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };

      this.healthCache.set(type, status);
      return status;
    }
  }

  /**
   * Get cached health status for a provider
   */
  getCachedHealthStatus(type: AuthProviderType): ProviderHealthStatus | undefined {
    return this.healthCache.get(type);
  }

  /**
   * Clear all registrations and caches
   */
  clear(): void {
    super.clear();
    this.healthCache.clear();
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get the singleton AuthProviderRegistry instance
 */
export function getAuthProviderRegistry(): AuthProviderRegistry {
  return AuthProviderRegistry.getInstance();
}

/**
 * Register all auth providers
 * Call this during application initialization
 */
export async function registerAllAuthProviders(): Promise<void> {
  const registry = AuthProviderRegistry.getInstance();
  await registry.ensureInitialized();
}

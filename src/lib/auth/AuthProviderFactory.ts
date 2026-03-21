/**
 * AuthProviderFactory - Factory pattern for authentication providers
 *
 * Extends BaseFactory to provide dynamic registration and creation
 * of authentication providers with lazy loading via dynamic imports.
 */

import { createErrorFactory } from "../core/infrastructure/baseError.js";
import { BaseFactory } from "../core/infrastructure/baseFactory.js";
import type {
  AuthProviderConfig,
  AuthProviderType,
  MastraAuthProvider,
} from "../types/authTypes.js";
import { logger } from "../utils/logger.js";

// =============================================================================
// ERROR FACTORY
// =============================================================================

/**
 * Auth error codes for factory operations
 */
export const AuthFactoryErrorCodes = {
  PROVIDER_NOT_FOUND: "AUTH_FACTORY-001",
  PROVIDER_CREATION_FAILED: "AUTH_FACTORY-002",
  INVALID_CONFIG: "AUTH_FACTORY-003",
  REGISTRATION_FAILED: "AUTH_FACTORY-004",
  INITIALIZATION_FAILED: "AUTH_FACTORY-005",
} as const;

/**
 * Auth factory error factory
 */
export const AuthFactoryError = createErrorFactory(
  "AuthFactory",
  AuthFactoryErrorCodes,
);

// =============================================================================
// FACTORY IMPLEMENTATION
// =============================================================================

/**
 * Factory registration type for auth providers
 */
type AuthFactoryRegistration = {
  factory: (config: AuthProviderConfig) => Promise<MastraAuthProvider>;
  aliases: string[];
  metadata?: {
    name: string;
    description: string;
    version?: string;
    documentation?: string;
  };
};

/**
 * AuthProviderFactory - Creates and manages authentication provider instances
 *
 * Uses the factory pattern with lazy loading to:
 * - Avoid circular dependencies
 * - Enable dynamic provider registration
 * - Support provider aliases
 * - Provide consistent error handling
 *
 * @example
 * ```typescript
 * // Get factory instance
 * const factory = AuthProviderFactory.getInstance();
 *
 * // Create a provider
 * const auth0Provider = await factory.create('auth0', {
 *   type: 'auth0',
 *   domain: 'your-tenant.auth0.com',
 *   clientId: 'your-client-id',
 * });
 *
 * // Validate a token
 * const result = await auth0Provider.authenticateToken(token);
 * ```
 */
export class AuthProviderFactory extends BaseFactory<
  MastraAuthProvider,
  AuthProviderConfig
> {
  private static instance: AuthProviderFactory | null = null;
  private registrations = new Map<string, AuthFactoryRegistration>();

  private constructor() {
    super();
  }

  /**
   * Get singleton factory instance
   */
  static getInstance(): AuthProviderFactory {
    if (!AuthProviderFactory.instance) {
      AuthProviderFactory.instance = new AuthProviderFactory();
    }
    return AuthProviderFactory.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (AuthProviderFactory.instance) {
      AuthProviderFactory.instance.clear();
      AuthProviderFactory.instance = null;
    }
  }

  /**
   * Static convenience method to create an auth provider.
   * Delegates to the singleton instance's create method.
   *
   * @param type - Provider type or alias
   * @param config - Provider configuration
   * @returns Created provider instance
   */
  static async create(
    type: string,
    config: AuthProviderConfig,
  ): Promise<MastraAuthProvider> {
    const factory = AuthProviderFactory.getInstance();
    return factory.create(type, config);
  }

  /**
   * Static convenience method to list available provider types.
   * Delegates to the singleton instance's getAvailableProviders method.
   *
   * @returns Array of registered provider type names
   */
  static getAvailableProviders(): string[] {
    const factory = AuthProviderFactory.getInstance();
    return factory.getAvailableProviders();
  }

  /**
   * Register all default providers
   * Called automatically when factory is first used
   */
  protected async registerAll(): Promise<void> {
    logger.debug("[AuthProviderFactory] Registering all providers");

    // Auth0 Provider
    this.registerProvider(
      "auth0",
      async (config) => {
        const { Auth0Provider } = await import("./providers/auth0.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Auth0Provider(config as any) as MastraAuthProvider;
      },
      ["auth0-jwt", "auth0-oauth"],
      {
        name: "Auth0",
        description: "Auth0 identity platform integration",
        documentation: "https://auth0.com/docs",
      },
    );

    // Clerk Provider
    this.registerProvider(
      "clerk",
      async (config) => {
        const { ClerkProvider } = await import("./providers/clerk.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new ClerkProvider(config as any) as MastraAuthProvider;
      },
      ["clerk-jwt"],
      {
        name: "Clerk",
        description: "Clerk authentication platform integration",
        documentation: "https://clerk.com/docs",
      },
    );

    // Firebase Provider
    this.registerProvider(
      "firebase",
      async (config) => {
        const { FirebaseAuthProvider } =
          await import("./providers/firebase.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new FirebaseAuthProvider(config as any) as MastraAuthProvider;
      },
      ["firebase-auth", "google-firebase"],
      {
        name: "Firebase",
        description: "Firebase Authentication integration",
        documentation: "https://firebase.google.com/docs/auth",
      },
    );

    // Supabase Provider
    this.registerProvider(
      "supabase",
      async (config) => {
        const { SupabaseAuthProvider } =
          await import("./providers/supabase.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new SupabaseAuthProvider(config as any) as MastraAuthProvider;
      },
      ["supabase-auth"],
      {
        name: "Supabase",
        description: "Supabase Auth integration",
        documentation: "https://supabase.com/docs/guides/auth",
      },
    );

    // AWS Cognito Provider
    this.registerProvider(
      "cognito",
      async (config) => {
        const { CognitoProvider } =
          await import("./providers/CognitoProvider.js");

        return new CognitoProvider(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config as any,
        ) as unknown as MastraAuthProvider;
      },
      ["aws-cognito", "amazon-cognito"],
      {
        name: "AWS Cognito",
        description: "Amazon Cognito User Pools integration",
        documentation: "https://docs.aws.amazon.com/cognito",
      },
    );

    // Keycloak Provider
    this.registerProvider(
      "keycloak",
      async (config) => {
        const { KeycloakProvider } =
          await import("./providers/KeycloakProvider.js");

        return new KeycloakProvider(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config as any,
        ) as unknown as MastraAuthProvider;
      },
      ["keycloak-oidc"],
      {
        name: "Keycloak",
        description: "Keycloak OpenID Connect integration",
        documentation: "https://www.keycloak.org/documentation",
      },
    );

    // Better Auth Provider
    this.registerProvider(
      "better-auth",
      async (config) => {
        const { BetterAuthProvider } =
          await import("./providers/betterAuth.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new BetterAuthProvider(config as any) as MastraAuthProvider;
      },
      ["betterauth", "better_auth"],
      {
        name: "Better Auth",
        description: "Self-hosted open-source authentication solution",
        documentation: "https://better-auth.com/docs",
      },
    );

    // WorkOS Provider
    this.registerProvider(
      "workos",
      async (config) => {
        const { WorkOSProvider } = await import("./providers/workos.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new WorkOSProvider(config as any) as MastraAuthProvider;
      },
      ["workos-sso", "work-os"],
      {
        name: "WorkOS",
        description: "Enterprise SSO and user management",
        documentation: "https://workos.com/docs",
      },
    );

    // Custom Provider
    this.registerProvider(
      "custom",
      async (config) => {
        const { CustomAuthProvider } = await import("./providers/custom.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new CustomAuthProvider(config as any) as MastraAuthProvider;
      },
      ["custom-auth"],
      {
        name: "Custom",
        description:
          "Custom authentication with user-provided validation logic",
      },
    );

    // OAuth2 Provider
    this.registerProvider(
      "oauth2",
      async (config) => {
        const { OAuth2Provider } = await import("./providers/oauth2.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new OAuth2Provider(config as any) as MastraAuthProvider;
      },
      ["oauth", "oidc", "openid-connect"],
      {
        name: "OAuth2",
        description:
          "Generic OAuth2/OIDC provider with JWKS and userinfo support",
        documentation: "https://oauth.net/2/",
      },
    );

    // JWT Provider
    this.registerProvider(
      "jwt",
      async (config) => {
        const { JWTProvider } = await import("./providers/jwt.js");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new JWTProvider(config as any) as MastraAuthProvider;
      },
      ["jwt-auth", "jwt-token"],
      {
        name: "JWT",
        description:
          "Generic JWT token validation with symmetric/asymmetric keys",
        documentation: "https://jwt.io/",
      },
    );

    logger.debug("[AuthProviderFactory] All providers registered");
  }

  /**
   * Register a provider with the factory
   *
   * @param type - Provider type identifier
   * @param factory - Async factory function to create provider instance
   * @param aliases - Alternative names for the provider
   * @param metadata - Provider metadata
   */
  registerProvider(
    type: AuthProviderType | string,
    factory: (config?: AuthProviderConfig) => Promise<MastraAuthProvider>,
    aliases: string[] = [],
    metadata?: AuthFactoryRegistration["metadata"],
  ): void {
    const normalizedType = type.toLowerCase();

    const registration: AuthFactoryRegistration = {
      factory: factory as (
        config: AuthProviderConfig,
      ) => Promise<MastraAuthProvider>,
      aliases,
      metadata,
    };

    // Register main type
    this.registrations.set(normalizedType, registration);

    // Register using BaseFactory for alias resolution
    this.register(normalizedType, factory, aliases, metadata);

    logger.debug(
      `[AuthProviderFactory] Registered provider: ${type} with aliases: ${aliases.join(", ")}`,
    );
  }

  /**
   * Create a provider instance
   *
   * @param typeOrAlias - Provider type or alias
   * @param config - Provider configuration
   * @returns Created provider instance
   */
  async create(
    typeOrAlias: string,
    config?: AuthProviderConfig,
  ): Promise<MastraAuthProvider> {
    await this.ensureInitialized();

    const normalizedName = this.resolveName(typeOrAlias);
    const registration = this.registrations.get(normalizedName);

    if (!registration) {
      const available = this.getAvailableProviders();
      throw AuthFactoryError.create(
        "PROVIDER_NOT_FOUND",
        `Unknown auth provider: ${typeOrAlias}. Available providers: ${available.join(", ")}`,
        {
          details: {
            requestedProvider: typeOrAlias,
            availableProviders: available,
          },
        },
      );
    }

    if (!config) {
      throw AuthFactoryError.create(
        "INVALID_CONFIG",
        `Configuration is required for provider: ${typeOrAlias}`,
        {
          details: { provider: typeOrAlias },
        },
      );
    }

    try {
      const provider = await registration.factory(config);
      logger.debug(`[AuthProviderFactory] Created provider: ${typeOrAlias}`);
      return provider;
    } catch (error) {
      throw AuthFactoryError.create(
        "PROVIDER_CREATION_FAILED",
        `Failed to create auth provider ${typeOrAlias}: ${error instanceof Error ? error.message : String(error)}`,
        {
          cause: error instanceof Error ? error : undefined,
          details: { provider: typeOrAlias },
        },
      );
    }
  }

  /**
   * Get list of available provider types
   */
  getAvailableProviders(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Get all aliases for a provider
   */
  getProviderAliases(type: string): string[] {
    const registration = this.registrations.get(type.toLowerCase());
    return registration?.aliases ?? [];
  }

  /**
   * Get provider metadata
   */
  getProviderMetadata(
    type: string,
  ): AuthFactoryRegistration["metadata"] | undefined {
    const registration = this.registrations.get(type.toLowerCase());
    return registration?.metadata;
  }

  /**
   * Check if a provider is registered
   */
  hasProvider(typeOrAlias: string): boolean {
    const resolved = this.resolveName(typeOrAlias);
    return this.registrations.has(resolved);
  }

  /**
   * Get all registered providers with their metadata
   */
  getAllProviderInfo(): Array<{
    type: string;
    aliases: string[];
    metadata?: AuthFactoryRegistration["metadata"];
  }> {
    return Array.from(this.registrations.entries()).map(([type, reg]) => ({
      type,
      aliases: reg.aliases,
      metadata: reg.metadata,
    }));
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    super.clear();
    this.registrations.clear();
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Get the singleton AuthProviderFactory instance
 */
export function getAuthProviderFactory(): AuthProviderFactory {
  return AuthProviderFactory.getInstance();
}

/**
 * Create an auth provider using the factory
 *
 * @param type - Provider type or alias
 * @param config - Provider configuration
 * @returns Created provider instance
 */
export async function createAuthProvider(
  type: AuthProviderType | string,
  config: AuthProviderConfig,
): Promise<MastraAuthProvider> {
  const factory = AuthProviderFactory.getInstance();
  return factory.create(type, config);
}

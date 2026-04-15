/**
 * AuthProviderFactory - Static factory for authentication providers
 *
 * Matches the ProviderFactory pattern: all-static class, no BaseFactory
 * extension, no singleton instance. Providers are registered by
 * AuthProviderRegistry using dynamic imports to avoid circular dependencies.
 */

import { logger } from "../utils/logger.js";
import { AuthError } from "./errors.js";
import type {
  AuthProviderConfig,
  AuthProviderConstructor,
  AuthProviderMetadata,
  AuthProviderRegistration,
  AuthProvider,
} from "../types/index.js";

// =============================================================================
// FACTORY IMPLEMENTATION
// =============================================================================

/**
 * AuthProviderFactory - Creates authentication provider instances
 *
 * Pure static factory with no hardcoded imports. All providers are
 * registered dynamically by AuthProviderRegistry to avoid circular
 * dependencies and enable lazy loading.
 *
 * @example
 * ```typescript
 * // Create a provider (after AuthProviderRegistry.registerAllProviders())
 * const provider = await AuthProviderFactory.createProvider("auth0", {
 *   type: "auth0",
 *   domain: "your-tenant.auth0.com",
 *   clientId: "your-client-id",
 * });
 * ```
 */
export class AuthProviderFactory {
  private static readonly providers = new Map<
    string,
    AuthProviderRegistration
  >();
  private static readonly aliasMap = new Map<string, string>();

  /**
   * Register a provider with the factory
   */
  static registerProvider(
    type: string,
    factory: AuthProviderConstructor,
    aliases: string[] = [],
    metadata?: AuthProviderMetadata,
  ): void {
    AuthProviderFactory.providers.set(type, { factory, aliases, metadata });

    for (const alias of aliases) {
      AuthProviderFactory.aliasMap.set(alias.toLowerCase(), type);
    }

    logger.debug(`Registered auth provider: ${type}`);
  }

  /**
   * Create a provider instance
   */
  static async createProvider(
    typeOrAlias: string,
    config: AuthProviderConfig,
  ): Promise<AuthProvider> {
    const resolvedType = AuthProviderFactory.resolveType(typeOrAlias);
    const registration = AuthProviderFactory.providers.get(resolvedType);

    if (!registration) {
      throw AuthError.create(
        "PROVIDER_NOT_FOUND",
        `Auth provider not found: ${typeOrAlias}. Available: ${AuthProviderFactory.getAvailableProviders().join(", ")}`,
      );
    }

    try {
      return await registration.factory(config);
    } catch (error) {
      throw AuthError.create(
        "CREATION_FAILED",
        `Failed to create auth provider ${typeOrAlias}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  /**
   * Check if a provider is registered
   */
  static hasProvider(typeOrAlias: string): boolean {
    return (
      AuthProviderFactory.providers.has(typeOrAlias) ||
      AuthProviderFactory.aliasMap.has(typeOrAlias.toLowerCase())
    );
  }

  /**
   * Get list of available provider types (excludes aliases)
   */
  static getAvailableProviders(): string[] {
    return Array.from(AuthProviderFactory.providers.keys());
  }

  /**
   * Get provider metadata
   */
  static getProviderMetadata(
    typeOrAlias: string,
  ): AuthProviderMetadata | undefined {
    const resolvedType = AuthProviderFactory.resolveType(typeOrAlias);
    return AuthProviderFactory.providers.get(resolvedType)?.metadata;
  }

  /**
   * Get all registered providers with their metadata
   */
  static getAllProviderInfo(): Array<{
    type: string;
    aliases: string[];
    metadata?: AuthProviderMetadata;
  }> {
    return Array.from(AuthProviderFactory.providers.entries()).map(
      ([type, reg]) => ({
        type,
        aliases: reg.aliases,
        metadata: reg.metadata,
      }),
    );
  }

  /**
   * Clear all registrations (for testing)
   */
  static clearRegistrations(): void {
    AuthProviderFactory.providers.clear();
    AuthProviderFactory.aliasMap.clear();
  }

  /**
   * Resolve an alias to its canonical provider type
   */
  private static resolveType(typeOrAlias: string): string {
    return (
      AuthProviderFactory.aliasMap.get(typeOrAlias.toLowerCase()) || typeOrAlias
    );
  }
}

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * Create an auth provider using the factory
 */
export async function createAuthProvider(
  type: string,
  config: AuthProviderConfig,
): Promise<AuthProvider> {
  return AuthProviderFactory.createProvider(type, config);
}

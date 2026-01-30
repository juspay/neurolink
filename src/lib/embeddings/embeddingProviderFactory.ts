/**
 * Factory for creating embedding provider instances
 * Follows NeuroLink's ProviderFactory pattern with dynamic registration
 */

import type {
  EmbeddingProviderConfig,
  EmbeddingProviderName,
} from "../types/embeddingTypes.js";
import { logger } from "../utils/logger.js";
import type { BaseEmbeddingProvider } from "./baseEmbeddingProvider.js";

/**
 * Embedding provider constructor type
 */
type EmbeddingProviderConstructor<TConfig extends EmbeddingProviderConfig> = (
  config: TConfig,
) => Promise<BaseEmbeddingProvider<TConfig>>;

/**
 * Provider registration entry
 */
type ProviderRegistration = {
  factory: EmbeddingProviderConstructor<EmbeddingProviderConfig>;
  aliases: string[];
};

/**
 * Factory for creating embedding provider instances
 * Follows NeuroLink's ProviderFactory pattern with dynamic registration
 */
export class EmbeddingProviderFactory {
  private static readonly providers = new Map<string, ProviderRegistration>();
  private static registered = false;

  /**
   * Register an embedding provider with the factory
   * @param name The provider name (from EmbeddingProviderName enum)
   * @param factory Async factory function that creates the provider instance
   * @param aliases Additional names that can be used to reference this provider
   */
  static registerProvider<TConfig extends EmbeddingProviderConfig>(
    name: EmbeddingProviderName | string,
    factory: EmbeddingProviderConstructor<TConfig>,
    aliases: string[] = [],
  ): void {
    const registration: ProviderRegistration = {
      factory:
        factory as unknown as EmbeddingProviderConstructor<EmbeddingProviderConfig>,
      aliases,
    };

    // Register main name (lowercase for case-insensitive lookup)
    EmbeddingProviderFactory.providers.set(name.toLowerCase(), registration);

    // Register aliases
    for (const alias of aliases) {
      EmbeddingProviderFactory.providers.set(alias.toLowerCase(), registration);
    }

    logger.debug(`Registered embedding provider: ${name}`, {
      aliases: aliases.join(", ") || "none",
    });
  }

  /**
   * Create an embedding provider instance
   * @param name Provider name or alias
   * @param config Provider configuration
   * @returns Promise resolving to the provider instance
   */
  static async createProvider<TConfig extends EmbeddingProviderConfig>(
    name: EmbeddingProviderName | string,
    config: TConfig = {} as TConfig,
  ): Promise<BaseEmbeddingProvider<TConfig>> {
    // Ensure providers are registered
    await EmbeddingProviderFactory.ensureRegistered();

    const normalizedName = name.toLowerCase();
    const registration = EmbeddingProviderFactory.providers.get(normalizedName);

    if (!registration) {
      const available =
        EmbeddingProviderFactory.getAvailableProviders().join(", ");
      throw new Error(
        `Unknown embedding provider: ${name}. Available providers: ${available}`,
      );
    }

    // Create the provider instance
    const provider = await registration.factory(config);
    return provider as BaseEmbeddingProvider<TConfig>;
  }

  /**
   * Get list of available provider names
   * @returns Array of unique provider names (excluding aliases)
   */
  static getAvailableProviders(): string[] {
    const uniqueNames = new Set<string>();
    const seenRegistrations = new Set<ProviderRegistration>();

    for (const [name, registration] of Array.from(
      EmbeddingProviderFactory.providers.entries(),
    )) {
      // Only include once per unique registration
      if (!seenRegistrations.has(registration)) {
        uniqueNames.add(name);
        seenRegistrations.add(registration);
      }
    }

    return Array.from(uniqueNames).sort();
  }

  /**
   * Get all registered provider names including aliases
   * @returns Array of all registered names
   */
  static getAllRegisteredNames(): string[] {
    return Array.from(EmbeddingProviderFactory.providers.keys()).sort();
  }

  /**
   * Check if a provider is registered
   * @param name Provider name or alias
   * @returns True if the provider is registered
   */
  static hasProvider(name: string): boolean {
    return EmbeddingProviderFactory.providers.has(name.toLowerCase());
  }

  /**
   * Get provider aliases
   * @param name Provider name
   * @returns Array of aliases for the provider
   */
  static getProviderAliases(name: string): string[] {
    const registration = EmbeddingProviderFactory.providers.get(
      name.toLowerCase(),
    );
    return registration?.aliases || [];
  }

  /**
   * Unregister a provider
   * @param name Provider name
   */
  static unregisterProvider(name: string): void {
    const normalizedName = name.toLowerCase();
    const registration = EmbeddingProviderFactory.providers.get(normalizedName);

    if (registration) {
      // Remove main entry
      EmbeddingProviderFactory.providers.delete(normalizedName);

      // Remove alias entries
      for (const alias of registration.aliases) {
        EmbeddingProviderFactory.providers.delete(alias.toLowerCase());
      }

      logger.debug(`Unregistered embedding provider: ${name}`);
    }
  }

  /**
   * Clear all registrations
   * Useful for testing
   */
  static clearRegistrations(): void {
    EmbeddingProviderFactory.providers.clear();
    EmbeddingProviderFactory.registered = false;
    logger.debug("Cleared all embedding provider registrations");
  }

  /**
   * Check if providers have been registered
   */
  static isRegistered(): boolean {
    return EmbeddingProviderFactory.registered;
  }

  /**
   * Ensure all providers are registered
   * Lazy-loads the registry to avoid circular dependencies
   */
  private static async ensureRegistered(): Promise<void> {
    if (EmbeddingProviderFactory.registered) {
      return;
    }

    // Dynamically import the registry to register all providers
    const { EmbeddingProviderRegistry } = await import(
      "./embeddingProviderRegistry.js"
    );
    await EmbeddingProviderRegistry.registerAllProviders();
    EmbeddingProviderFactory.registered = true;
  }

  /**
   * Mark as registered (called by EmbeddingProviderRegistry)
   */
  static markAsRegistered(): void {
    EmbeddingProviderFactory.registered = true;
  }
}

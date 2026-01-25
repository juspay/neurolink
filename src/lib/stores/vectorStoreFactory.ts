/**
 * Factory for creating vector store instances
 * Follows NeuroLink's ProviderFactory pattern with dynamic registration
 */

import type {
  VectorStoreConfig,
  VectorStoreName,
} from "../types/vectorTypes.js";
import { logger } from "../utils/logger.js";
import type { BaseVectorStore } from "./baseVectorStore.js";

/**
 * Vector store constructor type
 */
type VectorStoreConstructor<TConfig extends VectorStoreConfig> = (
  config: TConfig,
) => Promise<BaseVectorStore<TConfig>>;

/**
 * Store registration entry
 */
type StoreRegistration = {
  factory: VectorStoreConstructor<VectorStoreConfig>;
  aliases: string[];
};

/**
 * Factory for creating vector store instances
 * Follows NeuroLink's ProviderFactory pattern with dynamic registration
 */
export class VectorStoreFactory {
  private static readonly stores = new Map<string, StoreRegistration>();
  private static registered = false;

  /**
   * Register a vector store with the factory
   * @param name The store name (from VectorStoreName enum)
   * @param factory Async factory function that creates the store instance
   * @param aliases Additional names that can be used to reference this store
   */
  static registerStore<TConfig extends VectorStoreConfig>(
    name: VectorStoreName | string,
    factory: VectorStoreConstructor<TConfig>,
    aliases: string[] = [],
  ): void {
    const registration: StoreRegistration = {
      factory: factory as unknown as VectorStoreConstructor<VectorStoreConfig>,
      aliases,
    };

    // Register main name (lowercase for case-insensitive lookup)
    VectorStoreFactory.stores.set(name.toLowerCase(), registration);

    // Register aliases
    for (const alias of aliases) {
      VectorStoreFactory.stores.set(alias.toLowerCase(), registration);
    }

    logger.debug(`Registered vector store: ${name}`, {
      aliases: aliases.join(", ") || "none",
    });
  }

  /**
   * Create a vector store instance
   * @param name Store name or alias
   * @param config Store configuration
   * @returns Promise resolving to the store instance
   */
  static async createStore<TConfig extends VectorStoreConfig>(
    name: VectorStoreName | string,
    config: TConfig,
  ): Promise<BaseVectorStore<TConfig>> {
    // Ensure stores are registered
    await VectorStoreFactory.ensureRegistered();

    const normalizedName = name.toLowerCase();
    const registration = VectorStoreFactory.stores.get(normalizedName);

    if (!registration) {
      const available = VectorStoreFactory.getAvailableStores().join(", ");
      throw new Error(
        `Unknown vector store: ${name}. Available stores: ${available}`,
      );
    }

    // Create the store instance
    const store = await registration.factory(config);
    return store as BaseVectorStore<TConfig>;
  }

  /**
   * Get list of available store names
   * @returns Array of unique store names (excluding aliases)
   */
  static getAvailableStores(): string[] {
    const uniqueNames = new Set<string>();

    for (const [name, registration] of Array.from(
      VectorStoreFactory.stores.entries(),
    )) {
      // Only include if it's not an alias
      if (!registration.aliases.includes(name)) {
        uniqueNames.add(name);
      }
    }

    return Array.from(uniqueNames).sort();
  }

  /**
   * Get all registered store names including aliases
   * @returns Array of all registered names
   */
  static getAllRegisteredNames(): string[] {
    return Array.from(VectorStoreFactory.stores.keys()).sort();
  }

  /**
   * Check if a store is registered
   * @param name Store name or alias
   * @returns True if the store is registered
   */
  static hasStore(name: string): boolean {
    return VectorStoreFactory.stores.has(name.toLowerCase());
  }

  /**
   * Get store aliases
   * @param name Store name
   * @returns Array of aliases for the store
   */
  static getStoreAliases(name: string): string[] {
    const registration = VectorStoreFactory.stores.get(name.toLowerCase());
    return registration?.aliases || [];
  }

  /**
   * Unregister a store
   * @param name Store name
   */
  static unregisterStore(name: string): void {
    const normalizedName = name.toLowerCase();
    const registration = VectorStoreFactory.stores.get(normalizedName);

    if (registration) {
      // Remove main entry
      VectorStoreFactory.stores.delete(normalizedName);

      // Remove alias entries
      for (const alias of registration.aliases) {
        VectorStoreFactory.stores.delete(alias.toLowerCase());
      }

      logger.debug(`Unregistered vector store: ${name}`);
    }
  }

  /**
   * Clear all registrations
   * Useful for testing
   */
  static clearRegistrations(): void {
    VectorStoreFactory.stores.clear();
    VectorStoreFactory.registered = false;
    logger.debug("Cleared all vector store registrations");
  }

  /**
   * Check if stores have been registered
   */
  static isRegistered(): boolean {
    return VectorStoreFactory.registered;
  }

  /**
   * Ensure all stores are registered
   * Lazy-loads the registry to avoid circular dependencies
   */
  private static async ensureRegistered(): Promise<void> {
    if (VectorStoreFactory.registered) {
      return;
    }

    // Dynamically import the registry to register all stores
    const { VectorStoreRegistry } = await import("./vectorStoreRegistry.js");
    await VectorStoreRegistry.registerAllStores();
    VectorStoreFactory.registered = true;
  }

  /**
   * Mark as registered (called by VectorStoreRegistry)
   */
  static markAsRegistered(): void {
    VectorStoreFactory.registered = true;
  }
}

import type { AIProvider, AIProviderName } from "../core/types.js";
import type { UnknownRecord } from "../types/common.js";
import { logger } from "../utils/logger.js";

// Pure factory pattern with no hardcoded imports
// All providers loaded dynamically via registry to avoid circular dependencies

/**
 * Provider constructor interface - supports both sync constructors and async factory functions
 */
type ProviderConstructor =
  | {
      new (
        modelName?: string,
        providerName?: string,
        sdk?: UnknownRecord,
      ): AIProvider;
    }
  | ((
      modelName?: string,
      providerName?: string,
      sdk?: UnknownRecord,
    ) => Promise<AIProvider>);

/**
 * Provider registration entry
 */
interface ProviderRegistration {
  constructor: ProviderConstructor;
  defaultModel?: string; // Optional - provider can read from env
  aliases?: string[];
}

/**
 * True Factory Pattern implementation for AI Providers
 * Uses registration-based approach to eliminate switch statements
 * and enable dynamic provider registration
 */
export class ProviderFactory {
  private static readonly providers = new Map<string, ProviderRegistration>();
  private static initialized = false;

  /**
   * Register a provider with the factory
   */
  static registerProvider(
    name: AIProviderName | string,
    constructor: ProviderConstructor,
    defaultModel?: string, // Optional - provider can read from env
    aliases: string[] = [],
  ): void {
    const registration: ProviderRegistration = {
      constructor,
      defaultModel,
      aliases,
    };

    // Register main name
    this.providers.set(name.toLowerCase(), registration);

    // Register aliases
    aliases.forEach((alias) => {
      this.providers.set(alias.toLowerCase(), registration);
    });

    logger.debug(
      `Registered provider: ${name} with model ${defaultModel || "from-env"}`,
    );
  }
  /**
   * Create a provider instance
   */
  static async createProvider(
    providerName: AIProviderName | string,
    modelName?: string,
    sdk?: UnknownRecord,
  ): Promise<AIProvider> {
    // Note: Providers are registered explicitly by ProviderRegistry to avoid circular dependencies

    const normalizedName = providerName.toLowerCase();
    const registration = this.providers.get(normalizedName);

    if (!registration) {
      throw new Error(
        `Unknown provider: ${providerName}. Available providers: ${this.getAvailableProviders().join(", ")}`,
      );
    }

    const model = modelName || registration.defaultModel;

    try {
      // Try calling as factory function first, then fallback to constructor
      let result: AIProvider | Promise<AIProvider>;

      try {
        // Try as factory function
        result = (
          registration.constructor as (
            modelName?: string,
            providerName?: string,
            sdk?: UnknownRecord,
          ) => Promise<AIProvider> | AIProvider
        )(model, providerName, sdk);
      } catch (factoryError) {
        // Fallback to constructor
        result = new (registration.constructor as new (
          modelName?: string,
          providerName?: string,
          sdk?: UnknownRecord,
        ) => AIProvider)(model, providerName, sdk);
      }

      // Only await if result is actually a Promise
      if (
        result &&
        typeof result === "object" &&
        typeof (result as Promise<AIProvider>).then === "function"
      ) {
        return await result;
      }

      return result as AIProvider;
    } catch (error) {
      logger.error(`Failed to create provider ${providerName}:`, error);
      throw new Error(`Failed to create provider ${providerName}: ${error}`);
    }
  }

  /**
   * Check if a provider is registered
   */
  static hasProvider(providerName: string): boolean {
    return this.providers.has(providerName.toLowerCase());
  }
  /**
   * Get list of available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys()).filter(
      (name, index, arr) => arr.indexOf(name) === index, // Remove duplicates from aliases
    );
  }

  /**
   * Get provider registration info
   */
  static getProviderInfo(
    providerName: string,
  ): ProviderRegistration | undefined {
    return this.providers.get(providerName.toLowerCase());
  }

  /**
   * Normalize provider names using aliases (PHASE 1: Factory Pattern)
   */
  static normalizeProviderName(providerName: string): string | null {
    const normalized = providerName.toLowerCase();

    // Check direct registration
    if (this.providers.has(normalized)) {
      return normalized;
    }

    // Check aliases from all registrations
    for (const [name, registration] of this.providers.entries()) {
      if (registration.aliases?.includes(normalized)) {
        return name;
      }
    }

    return null;
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  static clearRegistrations(): void {
    this.providers.clear();
    this.initialized = false;
  }

  /**
   * Ensure providers are initialized
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initializeDefaultProviders();
      this.initialized = true;
    }
  }

  /**
   * Initialize default providers
   * NOTE: Providers are now registered by ProviderRegistry to avoid circular dependencies
   */
  private static initializeDefaultProviders(): void {
    logger.debug(
      "BaseProvider factory pattern ready - providers registered by ProviderRegistry",
    );
    // No hardcoded registrations - all done dynamically by ProviderRegistry
  }

  /**
   * Create the best available provider for the given name
   * Used by NeuroLink SDK for streaming and generation
   */
  static async createBestProvider(
    providerName: AIProviderName | string,
    modelName?: string,
    enableMCP?: boolean,
    sdk?: UnknownRecord,
  ): Promise<AIProvider> {
    return await this.createProvider(providerName, modelName, sdk);
  }
}

/**
 * Helper function to create providers with backward compatibility
 */
export async function createAIProvider(
  providerName: AIProviderName | string,
  modelName?: string,
): Promise<AIProvider> {
  return await ProviderFactory.createProvider(providerName, modelName);
}

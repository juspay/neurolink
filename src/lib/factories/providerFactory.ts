import type { AIProviderName } from "../constants/enums.js";
import type { UnknownRecord } from "../types/common.js";
import type { AIProvider } from "../types/index.js";
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
        region?: string,
      ): AIProvider;
    }
  | ((
      modelName?: string,
      providerName?: string,
      sdk?: UnknownRecord,
      region?: string,
    ) => Promise<AIProvider>);

/**
 * Provider registration entry
 */
type ProviderRegistration = {
  constructor: ProviderConstructor;
  defaultModel?: string; // Optional - provider can read from env
  aliases?: string[];
};

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
    ProviderFactory.providers.set(name.toLowerCase(), registration);

    // Register aliases
    aliases.forEach((alias) => {
      ProviderFactory.providers.set(alias.toLowerCase(), registration);
    });

    logger.debug(
      `Registered provider: ${name} with model ${defaultModel || "from-env"}`,
    );
  }
  /**
   * Create a provider instance
   * @param providerName - Provider name (optional, uses NEUROLINK_PROVIDER env var or 'vertex' as default)
   * @param modelName - Model name (optional, uses provider-specific env var or registry default)
   */
  static async createProvider(
    providerName?: AIProviderName | string,
    modelName?: string,
    sdk?: UnknownRecord,
    region?: string,
  ): Promise<AIProvider> {
    // Note: Providers are registered explicitly by ProviderRegistry to avoid circular dependencies

    // Use environment variable or default if not specified
    const resolvedProviderName =
      providerName ||
      process.env.NEUROLINK_PROVIDER ||
      process.env.AI_PROVIDER ||
      "vertex";

    const normalizedName = resolvedProviderName.toLowerCase();
    const registration = ProviderFactory.providers.get(normalizedName);

    if (!registration) {
      throw new Error(
        `Unknown provider: ${resolvedProviderName}. Available providers: ${ProviderFactory.getAvailableProviders().join(", ")}`,
      );
    }

    // Respect environment variables before falling back to registry default
    let model = modelName;
    if (!model) {
      // Check for provider-specific environment variables
      if (resolvedProviderName.toLowerCase().includes("vertex")) {
        // Use gemini-2.5-flash as default - latest GA model with best price-performance
        model = process.env.VERTEX_MODEL || "gemini-2.5-flash";
      } else if (resolvedProviderName.toLowerCase().includes("bedrock")) {
        model = process.env.BEDROCK_MODEL || process.env.BEDROCK_MODEL_ID;
      }
      // Fallback to registry default if no env var
      model = model || registration.defaultModel;
    }

    try {
      if (typeof registration.constructor !== "function") {
        throw new Error(
          `Invalid constructor for provider ${providerName}: not a function`,
        );
      }

      let result: AIProvider;

      try {
        const factoryResult = (
          registration.constructor as (
            modelName?: string,
            providerName?: string,
            sdk?: UnknownRecord,
            region?: string,
          ) => Promise<AIProvider> | AIProvider
        )(model, resolvedProviderName, sdk, region);

        // Handle both sync and async results
        result =
          factoryResult instanceof Promise
            ? await factoryResult
            : factoryResult;
      } catch (factoryError) {
        if (
          registration.constructor.prototype &&
          registration.constructor.prototype.constructor ===
            registration.constructor
        ) {
          try {
            result = new (registration.constructor as new (
              modelName?: string,
              providerName?: string,
              sdk?: UnknownRecord,
              region?: string,
            ) => AIProvider)(model, resolvedProviderName, sdk, region);
          } catch (constructorError) {
            throw new Error(
              `Both factory function and constructor failed. Factory error: ${factoryError}. Constructor error: ${constructorError}`,
            );
          }
        } else {
          throw factoryError;
        }
      }

      return result;
    } catch (error) {
      logger.error(`Failed to create provider ${resolvedProviderName}:`, error);
      throw new Error(
        `Failed to create provider ${resolvedProviderName}: ${error}`,
      );
    }
  }

  /**
   * Check if a provider is registered
   */
  static hasProvider(providerName: string): boolean {
    return ProviderFactory.providers.has(providerName.toLowerCase());
  }
  /**
   * Get list of available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(ProviderFactory.providers.keys()).filter(
      (name, index, arr) => arr.indexOf(name) === index, // Remove duplicates from aliases
    );
  }

  /**
   * Get provider registration info
   */
  static getProviderInfo(
    providerName: string,
  ): ProviderRegistration | undefined {
    return ProviderFactory.providers.get(providerName.toLowerCase());
  }

  /**
   * Normalize provider names using aliases (PHASE 1: Factory Pattern)
   */
  static normalizeProviderName(providerName: string): string | null {
    const normalized = providerName.toLowerCase();

    // Check direct registration
    if (ProviderFactory.providers.has(normalized)) {
      return normalized;
    }

    // Check aliases from all registrations
    for (const [name, registration] of ProviderFactory.providers.entries()) {
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
    ProviderFactory.providers.clear();
    ProviderFactory.initialized = false;
  }

  /**
   * Ensure providers are initialized
   */
  private static ensureInitialized(): void {
    if (!ProviderFactory.initialized) {
      ProviderFactory.initializeDefaultProviders();
      ProviderFactory.initialized = true;
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
    return await ProviderFactory.createProvider(providerName, modelName, sdk);
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

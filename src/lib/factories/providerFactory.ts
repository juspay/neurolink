import type { NeuroLink } from "../neurolink.js";
import type { AIProviderName } from "../constants/enums.js";
import type {
  AIProvider,
  NeurolinkCredentials,
  ProviderConstructor,
  ProviderDescriptor,
  ProviderRegistration,
} from "../types/index.js";

import { logger } from "../utils/logger.js";
import { suggestClosest } from "../utils/stringDistance.js";
import {
  PROVIDER_DESCRIPTORS,
  PROVIDER_DESCRIPTORS_BY_NAME,
  PROVIDER_ALIAS_INDEX,
} from "./providerDescriptors.js";

// Pure factory pattern with no hardcoded imports
// All providers loaded dynamically via registry to avoid circular dependencies

/**
 * Resolve a registered provider name (or alias) to its NeurolinkCredentials
 * key. Backed by ProviderFactory.getDescriptor() — PROVIDER_DESCRIPTORS is
 * the single source of truth for provider identity — instead of a
 * hand-maintained map, so this can no longer drift out of sync with the
 * descriptors, and it correctly resolves aliases (e.g. "hf") through
 * PROVIDER_ALIAS_INDEX, not just canonical names. Falls back to the
 * lowercased input when no descriptor is found, matching the retired
 * map's behavior for unknown provider names.
 *
 * Referencing ProviderFactory here (defined further down this file) is
 * safe: this function's body only runs when called, by which point the
 * module has finished evaluating and ProviderFactory is fully defined —
 * there is no temporal-dead-zone hazard from the declaration order.
 */
export function resolveCredentialKey(providerName: string): string {
  const normalized = providerName.toLowerCase();
  return (
    ProviderFactory.getDescriptor(normalized)?.credentialsKey ?? normalized
  );
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
    descriptor?: ProviderDescriptor,
  ): void {
    const registration: ProviderRegistration = {
      constructor,
      defaultModel,
      aliases,
      descriptor,
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
    sdk?: NeuroLink,
    region?: string,
    credentials?: NeurolinkCredentials,
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
        ProviderFactory.describeUnresolvableProvider(resolvedProviderName),
      );
    }

    // Respect environment variables before falling back to registry default
    let model = modelName;
    if (model) {
      // #337: the model registry has always carried aliases ("gpt4o" ->
      // "gpt-4o"), and capability lookups resolve through them, but the id
      // actually sent to the provider did not — so `generate({ model:
      // "gpt4o" })` put the alias on the wire and the provider 404'd.
      // Imported lazily: the registry is a large module and this is the only
      // thing on the construction path that needs it.
      const { resolveProviderModelAlias } =
        await import("../models/modelRegistry.js");
      const canonicalProvider =
        ProviderFactory.getDescriptor(normalizedName)?.name ?? normalizedName;
      const canonicalModel = resolveProviderModelAlias(
        canonicalProvider,
        model,
      );
      if (canonicalModel) {
        logger.debug("[ProviderFactory] Resolved model alias", {
          provider: canonicalProvider,
          requested: model,
          resolved: canonicalModel,
        });
        model = canonicalModel;
      }
    }
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

    const credKey = resolveCredentialKey(normalizedName);

    // Extract provider-scoped credential slice (e.g. credentials.openai for OpenAI)
    const scopedCredentials = credentials
      ? ((credentials as Record<string, unknown>)[credKey] as
          | Record<string, unknown>
          | undefined)
      : undefined;

    try {
      if (typeof registration.constructor !== "function") {
        throw new Error(
          `Invalid constructor for provider ${providerName}: not a function`,
        );
      }

      const factoryResult = (
        registration.constructor as (
          modelName?: string,
          providerName?: string,
          sdk?: NeuroLink,
          region?: string,
          credentials?: Record<string, unknown>,
        ) => Promise<AIProvider> | AIProvider
      )(model, resolvedProviderName, sdk, region, scopedCredentials);

      const result =
        factoryResult instanceof Promise ? await factoryResult : factoryResult;

      return result;
    } catch (error) {
      logger.error(`Failed to create provider ${resolvedProviderName}:`, error);
      throw new Error(
        `Failed to create provider ${resolvedProviderName}: ${error}`,
        { cause: error },
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
  /**
   * Explain why a provider name did not resolve, usefully (#354).
   *
   * Three distinct situations used to share one generic message:
   *
   * - The registry is empty, because `ProviderRegistry.registerAllProviders()`
   *   has not run yet. Every name is unresolvable, and listing zero available
   *   providers tells the reader nothing about why.
   * - The name IS a known provider but has no registration — recognised,
   *   unavailable. Distinct from a typo and worth saying so.
   * - The name is not a provider at all, in which case a near-miss is almost
   *   always a typo and is worth naming: "opennai" -> "openai".
   *
   * Canonical names are offered as suggestions ahead of aliases, so a typo
   * resolves to the name the docs use.
   *
   * @param requested - The provider name as the caller supplied it
   * @returns A message naming the situation and what to do about it
   */
  private static describeUnresolvableProvider(requested: string): string {
    const registered = ProviderFactory.getAvailableProviders();
    if (registered.length === 0) {
      return (
        `Cannot resolve provider "${requested}": no providers are registered yet. ` +
        `ProviderRegistry.registerAllProviders() has not completed, so every name ` +
        `is unresolvable at this point — this is a lifecycle problem, not a bad name.`
      );
    }

    const canonical = Array.from(
      new Set(
        PROVIDER_DESCRIPTORS.map((descriptor) => String(descriptor.name)),
      ),
    ).sort();
    const canonicalSet = new Set(canonical);
    const aliases = registered.filter((name) => !canonicalSet.has(name)).sort();

    const known = PROVIDER_ALIAS_INDEX.get(requested.toLowerCase());
    if (known) {
      return (
        `Provider "${requested}" is a recognised provider (${known}) but is not registered ` +
        `in this factory, so it cannot be constructed. Registered providers: ${canonical.join(", ")}.`
      );
    }

    // Canonical names first so a tie resolves to the documented spelling.
    const suggestions = suggestClosest(requested, [...canonical, ...aliases]);
    const didYouMean =
      suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}?` : "";
    return (
      `Unknown provider: "${requested}".${didYouMean} ` +
      `Valid providers: ${canonical.join(", ")}. Accepted aliases: ${aliases.join(", ")}.`
    );
  }

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
   * Look up a provider's static descriptor. Checks the built-in
   * PROVIDER_DESCRIPTORS first (works even before registerAllProviders()
   * has run, and resolves aliases via PROVIDER_ALIAS_INDEX), then falls
   * back to whatever descriptor a live custom registration attached via
   * registerProvider()'s 5th parameter.
   */
  static getDescriptor(name: string): ProviderDescriptor | undefined {
    const normalized = name.toLowerCase();
    const canonical = PROVIDER_ALIAS_INDEX.get(normalized);
    if (canonical) {
      const builtIn = PROVIDER_DESCRIPTORS_BY_NAME.get(canonical);
      if (builtIn) {
        return builtIn;
      }
    }
    return ProviderFactory.providers.get(normalized)?.descriptor;
  }

  /** All built-in provider descriptors (does not include custom-registered providers that lack a descriptor). */
  static getAllDescriptors(): readonly ProviderDescriptor[] {
    return PROVIDER_DESCRIPTORS;
  }

  /**
   * Normalize provider names using aliases (PHASE 1: Factory Pattern)
   */
  static normalizeProviderName(providerName: string): string | null {
    const normalized = providerName.toLowerCase();
    if (ProviderFactory.providers.has(normalized)) {
      return normalized;
    }
    const canonical = PROVIDER_ALIAS_INDEX.get(normalized);
    if (canonical && ProviderFactory.providers.has(canonical)) {
      return canonical;
    }
    // Fallback for providers registered without a built-in descriptor
    // (e.g. TTS/STT/media handlers registered outside PROVIDER_DESCRIPTORS).
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
    sdk?: NeuroLink,
    credentials?: NeurolinkCredentials,
  ): Promise<AIProvider> {
    return await ProviderFactory.createProvider(
      providerName,
      modelName,
      sdk,
      undefined,
      credentials,
    );
  }
}

/**
 * Helper function to create providers with backward compatibility
 */
export async function createAIProvider(
  providerName: AIProviderName | string,
  modelName?: string,
  credentials?: NeurolinkCredentials,
): Promise<AIProvider> {
  return await ProviderFactory.createProvider(
    providerName,
    modelName,
    undefined,
    undefined,
    credentials,
  );
}

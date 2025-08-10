/**
 * Universal Provider Options Interface (Phase 1: Factory Pattern)
 * Based on TypeScript factory pattern best practices for AI provider abstraction
 */

import type { BaseContext, ContextConfig } from "./contextTypes.js";

/**
 * Base configuration interface for all AI providers
 * Uses Parameter Object Pattern for flexible, extensible configuration
 */
export interface UniversalProviderOptions {
  // Core parameters (common across all providers)
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // System configuration
  systemPrompt?: string;
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;

  // Context and metadata (type-safe context integration)
  context?: BaseContext;
  contextConfig?: Partial<ContextConfig>;
  metadata?: Record<string, unknown>;

  // Provider-specific extensions (type-safe extensibility)
  extensionOptions?: Record<string, unknown>;
}

/**
 * Generic provider options (without providerType)
 */
export type GenericProviderOptions = Omit<
  UniversalProviderOptions,
  "providerType"
>;

/**
 * Provider-specific configuration extensions
 * Discriminated union pattern for type-safe provider configs
 */
export interface OpenAIProviderOptions extends UniversalProviderOptions {
  providerType: "openai";
  organization?: string;
  seed?: number;
  topP?: number;
}

export interface GoogleAIProviderOptions extends UniversalProviderOptions {
  providerType: "google-ai";
  topK?: number;
  candidateCount?: number;
  stopSequences?: string[];
}

export interface AnthropicProviderOptions extends UniversalProviderOptions {
  providerType: "anthropic";
  topK?: number;
  stopSequences?: string[];
}

export interface BedrockProviderOptions extends UniversalProviderOptions {
  providerType: "bedrock";
  inferenceProfileArn?: string;
  region?: string;
}

/**
 * Discriminated union for type-safe provider configuration
 * Enables compile-time type checking for provider-specific options
 */
export type ProviderSpecificOptions =
  | OpenAIProviderOptions
  | GoogleAIProviderOptions
  | AnthropicProviderOptions
  | BedrockProviderOptions;

/**
 * Factory configuration interface
 * Supports both universal and provider-specific parameters
 */
export interface ProviderFactoryConfig {
  providerName: string;
  modelName?: string;
  options?: UniversalProviderOptions | ProviderSpecificOptions;
  enableMCP?: boolean;
}

/**
 * Parameter normalization utilities
 * Converts between different parameter formats for backward compatibility
 */
export class ParameterNormalizer {
  /**
   * Normalize legacy parameter formats to universal format
   */
  static normalizeToUniversal(
    optionsOrPrompt: UniversalProviderOptions | string,
  ): UniversalProviderOptions {
    if (typeof optionsOrPrompt === "string") {
      return { prompt: optionsOrPrompt };
    }
    return optionsOrPrompt;
  }

  /**
   * Retrieve the provider type if it exists, otherwise return null
   */
  private static getProviderType(
    options: UniversalProviderOptions | ProviderSpecificOptions,
  ): string | null {
    return "providerType" in options ? options.providerType : null;
  }

  /**
   * Extract provider-specific parameters safely
   */
  static extractProviderOptions<T extends ProviderSpecificOptions>(
    options: UniversalProviderOptions | ProviderSpecificOptions,
    providerType: T["providerType"],
  ): T | GenericProviderOptions {
    const currentProviderType = ParameterNormalizer.getProviderType(options);

    if (currentProviderType === providerType) {
      return options as T;
    }
    // Handle case where options has providerType but doesn't match
    if (currentProviderType !== null) {
      const { providerType: _providerType, ...genericOptions } =
        options as ProviderSpecificOptions;
      return genericOptions as GenericProviderOptions;
    }
    // Options don't have providerType, return as generic
    return options as GenericProviderOptions;
  }

  /**
   * Merge default values with user-provided options
   */
  static mergeWithDefaults(
    options: UniversalProviderOptions,
    defaults: Partial<UniversalProviderOptions>,
  ): UniversalProviderOptions {
    return {
      ...defaults,
      ...options,
      // Merge nested objects (type-safe context merging)
      context: { ...defaults.context, ...options.context } as
        | BaseContext
        | undefined,
      contextConfig: { ...defaults.contextConfig, ...options.contextConfig },
      metadata: { ...defaults.metadata, ...options.metadata },
    };
  }
}

/**
 * Type conversion utilities between GenerateOptions and StreamOptions
 *
 * 🔧 FIX: Addresses Issue #2 - Type System Mismatch
 * Factory patterns need to work with both generate() and stream() methods
 */

import type { GenerateOptions } from "../types/generateTypes.js";
import type { StreamOptions } from "../types/streamTypes.js";
import type { UnknownRecord } from "../types/common.js";

/**
 * Convert GenerateOptions to StreamOptions
 * Preserves all factory configuration and enhancement data
 */
export function convertGenerateToStreamOptions(
  generateOptions: GenerateOptions,
): StreamOptions {
  const streamOptions: StreamOptions = {
    // Core input mapping
    input: generateOptions.input,

    // Provider and model settings
    provider: generateOptions.provider,
    model: generateOptions.model,
    temperature: generateOptions.temperature,
    maxTokens: generateOptions.maxTokens,
    systemPrompt: generateOptions.systemPrompt,

    // Tool configuration
    tools: generateOptions.tools,
    disableTools: generateOptions.disableTools,
    // maxSteps only exists in StreamOptions, not GenerateOptions

    // Analytics and evaluation
    enableEvaluation: generateOptions.enableEvaluation,
    enableAnalytics: generateOptions.enableAnalytics,
    context: generateOptions.context as UnknownRecord,

    // Domain-aware evaluation
    evaluationDomain: generateOptions.evaluationDomain,
    toolUsageContext: generateOptions.toolUsageContext,
    conversationHistory: generateOptions.conversationHistory,

    // 🔧 FIX: Factory configuration (critical for issue #2)
    factoryConfig: generateOptions.factoryConfig,

    // 🔧 FIX: Streaming configuration
    streaming: generateOptions.streaming,
  };

  return streamOptions;
}

/**
 * Convert StreamOptions to GenerateOptions
 * Useful for fallback scenarios and unified processing
 */
export function convertStreamToGenerateOptions(
  streamOptions: StreamOptions,
): GenerateOptions {
  const generateOptions: GenerateOptions = {
    // Core input mapping
    input: { text: (streamOptions.input && streamOptions.input.text) || "" },

    // Provider and model settings
    provider: streamOptions.provider,
    model: streamOptions.model,
    temperature: streamOptions.temperature,
    maxTokens: streamOptions.maxTokens,
    systemPrompt: streamOptions.systemPrompt,

    // Tool configuration
    tools: streamOptions.tools,
    disableTools: streamOptions.disableTools,
    // Note: maxSteps exists in StreamOptions but not in GenerateOptions

    // Analytics and evaluation
    enableEvaluation: streamOptions.enableEvaluation,
    enableAnalytics: streamOptions.enableAnalytics,
    context: streamOptions.context as Record<string, unknown>,

    // Domain-aware evaluation
    evaluationDomain: streamOptions.evaluationDomain,
    toolUsageContext: streamOptions.toolUsageContext,
    conversationHistory: streamOptions.conversationHistory,

    // 🔧 FIX: Factory configuration (critical for issue #2)
    factoryConfig: streamOptions.factoryConfig,

    // 🔧 FIX: Streaming configuration
    streaming: streamOptions.streaming,
  };

  return generateOptions;
}

/**
 * Check if options object has factory configuration
 * Useful for determining if enhanced processing is needed
 */
export function hasFactoryConfig(
  options: GenerateOptions | StreamOptions | UnknownRecord,
): boolean {
  return !!(options as UnknownRecord)?.factoryConfig;
}

/**
 * Extract factory configuration from either options type
 * Returns null if no factory config is present
 */
export function extractFactoryConfig(
  options: GenerateOptions | StreamOptions | UnknownRecord,
): GenerateOptions["factoryConfig"] | null {
  const config = (options as UnknownRecord)?.factoryConfig;
  return config ? (config as GenerateOptions["factoryConfig"]) : null;
}

/**
 * Check if options object has streaming configuration
 * Useful for determining if streaming enhancements are needed
 */
export function hasStreamingConfig(
  options: GenerateOptions | StreamOptions | UnknownRecord,
): boolean {
  return !!(options as UnknownRecord)?.streaming;
}

/**
 * Extract streaming configuration from either options type
 * Returns null if no streaming config is present
 */
export function extractStreamingConfig(
  options: GenerateOptions | StreamOptions | UnknownRecord,
): GenerateOptions["streaming"] | null {
  const config = (options as UnknownRecord)?.streaming;
  return config ? (config as GenerateOptions["streaming"]) : null;
}

/**
 * Create factory-enhanced StreamOptions from domain configuration
 * This is the key function that addresses Issue #2
 */
export function createFactoryAwareStreamOptions(
  baseOptions: Partial<StreamOptions>,
  factoryConfig: GenerateOptions["factoryConfig"],
): StreamOptions {
  return {
    input: baseOptions.input || { text: "" },
    ...baseOptions,
    factoryConfig,
    enableEvaluation: true, // Enable evaluation when using factory patterns
  };
}

/**
 * Create factory-enhanced GenerateOptions from domain configuration
 * Parallel function for generate() method
 */
export function createFactoryAwareGenerateOptions(
  baseOptions: Partial<GenerateOptions>,
  factoryConfig: GenerateOptions["factoryConfig"],
): GenerateOptions {
  return {
    input: baseOptions.input || { text: "" },
    ...baseOptions,
    factoryConfig,
    enableEvaluation: true, // Enable evaluation when using factory patterns
  };
}

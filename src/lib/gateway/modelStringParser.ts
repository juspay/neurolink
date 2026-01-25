/**
 * Model String Parser
 *
 * Parses and normalizes model strings in "provider/model" format.
 * Handles provider inference for model-only strings.
 */

import { logger } from "../utils/logger.js";
import { ALL_PROVIDER_CONFIGS, MODEL_INFERENCE_PATTERNS } from "./constants.js";
import type { ParsedModel } from "./types.js";

/**
 * Parse a model string into provider and model name components
 *
 * @param modelString - Model string to parse (e.g., "anthropic/claude-3-5-sonnet" or "gpt-4o")
 * @returns Parsed model components
 *
 * @example
 * ```typescript
 * parseModelString("anthropic/claude-3-5-sonnet")
 * // { provider: "anthropic", modelName: "claude-3-5-sonnet" }
 *
 * parseModelString("meta-llama/llama-3.1-70b-instruct")
 * // { provider: "meta-llama", modelName: "llama-3.1-70b-instruct" }
 *
 * parseModelString("gpt-4o")
 * // { provider: "openai", modelName: "gpt-4o" }
 * ```
 */
export function parseModelString(modelString: string): ParsedModel {
  const trimmed = modelString.trim();

  if (!trimmed) {
    logger.warn("Empty model string provided, using default");
    return { provider: "openai", modelName: "gpt-4o" };
  }

  // Check for provider/model format
  const slashIndex = trimmed.indexOf("/");

  if (slashIndex > 0) {
    // Has provider prefix
    const provider = trimmed.substring(0, slashIndex);
    const modelName = trimmed.substring(slashIndex + 1);

    // Validate we got meaningful values
    if (provider && modelName) {
      return {
        provider: normalizeProviderName(provider),
        modelName: normalizeModelName(modelName),
      };
    }
  }

  // No provider specified - infer from model name
  return inferProvider(trimmed);
}

/**
 * Infer provider from model name patterns
 *
 * @param modelName - Model name without provider prefix
 * @returns Parsed model with inferred provider
 *
 * @example
 * ```typescript
 * inferProvider("gpt-4o")
 * // { provider: "openai", modelName: "gpt-4o" }
 *
 * inferProvider("claude-3-5-sonnet")
 * // { provider: "anthropic", modelName: "claude-3-5-sonnet" }
 * ```
 */
export function inferProvider(modelName: string): ParsedModel {
  const normalized = modelName.toLowerCase();

  // Try pattern matching
  for (const { pattern, provider } of MODEL_INFERENCE_PATTERNS) {
    if (pattern.test(normalized)) {
      logger.debug(`Inferred provider "${provider}" for model "${modelName}"`);
      return {
        provider,
        modelName: normalizeModelName(modelName),
      };
    }
  }

  // No pattern matched - default to openrouter for unknown models
  logger.warn(
    `Could not infer provider for model "${modelName}", defaulting to openrouter`,
  );
  return {
    provider: "openrouter",
    modelName: normalizeModelName(modelName),
  };
}

/**
 * Normalize provider name to standard format
 *
 * @param provider - Provider name to normalize
 * @returns Normalized provider name
 */
export function normalizeProviderName(provider: string): string {
  const lower = provider.toLowerCase().trim();

  // Handle common aliases
  const aliases: Record<string, string> = {
    // OpenAI
    gpt: "openai",
    chatgpt: "openai",
    "openai-chat": "openai",

    // Anthropic
    claude: "anthropic",

    // Google
    google: "google",
    "google-ai": "google",
    "google-ai-studio": "google",
    gemini: "google",
    googleai: "google",

    // Mistral
    mistralai: "mistral",

    // Meta
    meta: "meta-llama",
    llama: "meta-llama",
    "meta-ai": "meta-llama",

    // xAI
    grok: "x",
    xai: "x",
  };

  return aliases[lower] || lower;
}

/**
 * Normalize model name to standard format
 *
 * @param modelName - Model name to normalize
 * @returns Normalized model name
 */
export function normalizeModelName(modelName: string): string {
  // Keep original casing for model names, just trim whitespace
  return modelName.trim();
}

/**
 * Check if a model string contains a provider prefix
 *
 * @param modelString - Model string to check
 * @returns True if the string has provider prefix
 */
export function hasProviderPrefix(modelString: string): boolean {
  return modelString.includes("/");
}

/**
 * Create a full model string from provider and model name
 *
 * @param provider - Provider name
 * @param modelName - Model name
 * @returns Full model string in "provider/model" format
 */
export function createModelString(provider: string, modelName: string): string {
  return `${normalizeProviderName(provider)}/${normalizeModelName(modelName)}`;
}

/**
 * Check if a provider is known/supported
 *
 * @param provider - Provider name to check
 * @returns True if provider is known
 */
export function isKnownProvider(provider: string): boolean {
  const normalized = normalizeProviderName(provider);
  return normalized in ALL_PROVIDER_CONFIGS;
}

/**
 * Get provider configuration if available
 *
 * @param provider - Provider name
 * @returns Provider configuration or undefined
 */
export function getProviderConfig(
  provider: string,
): (typeof ALL_PROVIDER_CONFIGS)[string] | undefined {
  const normalized = normalizeProviderName(provider);
  return ALL_PROVIDER_CONFIGS[normalized];
}

/**
 * Validate a model string format
 *
 * @param modelString - Model string to validate
 * @returns Validation result with any issues
 */
export function validateModelString(modelString: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!modelString || typeof modelString !== "string") {
    issues.push("Model string must be a non-empty string");
    return { valid: false, issues };
  }

  const trimmed = modelString.trim();

  if (trimmed !== modelString) {
    issues.push("Model string has leading/trailing whitespace");
  }

  if (trimmed.length === 0) {
    issues.push("Model string is empty");
    return { valid: false, issues };
  }

  // Check for multiple slashes (malformed)
  const slashCount = (trimmed.match(/\//g) || []).length;
  if (slashCount > 1) {
    // Some models like "meta-llama/llama-3.1-70b-instruct" have nested names
    // This is allowed, just parse provider as first segment
    logger.debug(
      `Model string "${trimmed}" has ${slashCount} slashes, using first segment as provider`,
    );
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Anthropic Models - Subscription Tier Access and Capabilities
 *
 * This module defines Anthropic Claude models, their availability by subscription tier,
 * model capabilities, and provides helper functions for tier-based access control.
 */

import type {
  ClaudeSubscriptionTier,
  AnthropicModelMetadata,
} from "../types/index.js";
import { ModelAccessError } from "../types/index.js";

// Re-export runtime value for convenience
export { ModelAccessError };

// ============================================================================
// ANTHROPIC MODEL ENUM
// ============================================================================

/**
 * Anthropic Claude model identifiers
 *
 * @description Enum of all available Claude models with their exact API identifiers.
 * Models are organized by family (Haiku, Sonnet, Opus) and version.
 */
export enum AnthropicModel {
  // Claude 3 Haiku (Legacy - Fast, efficient)
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",

  // Claude 3.5 Haiku (Current fast model)
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3.5 Sonnet (Balanced performance)
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",

  // Claude 3.5 Sonnet V2 (Updated version)
  CLAUDE_3_5_SONNET_V2 = "claude-3-5-sonnet-v2-20241022",

  // Claude Sonnet 4 (Latest Sonnet)
  CLAUDE_SONNET_4 = "claude-sonnet-4-20250514",

  // Claude Sonnet 4.6
  CLAUDE_SONNET_4_6 = "claude-sonnet-4-6",

  // Claude 3 Opus (Legacy flagship)
  CLAUDE_3_OPUS = "claude-3-opus-20240229",

  // Claude Opus 4 (Latest flagship)
  CLAUDE_OPUS_4 = "claude-opus-4-20250514",

  // Claude Opus 4.6
  CLAUDE_OPUS_4_6 = "claude-opus-4-6",
}

// ============================================================================
// MODEL TIER ACCESS DEFINITIONS
// ============================================================================

/**
 * Model access mapping by subscription tier
 *
 * Each tier includes progressively more models:
 * - free: Basic models for casual use (Haiku only)
 * - pro: Professional tier with Sonnet models
 * - max: All models including the latest flagship Opus
 * - api: Full API access to all models (based on API access)
 */
export const MODEL_TIER_ACCESS: Record<ClaudeSubscriptionTier, string[]> = {
  // Free tier: Basic/older Haiku models only
  free: [AnthropicModel.CLAUDE_3_HAIKU, AnthropicModel.CLAUDE_3_5_HAIKU],

  // Pro tier: Haiku + Sonnet models
  pro: [
    // Haiku models
    AnthropicModel.CLAUDE_3_HAIKU,
    AnthropicModel.CLAUDE_3_5_HAIKU,
    // Sonnet models
    AnthropicModel.CLAUDE_3_5_SONNET,
    AnthropicModel.CLAUDE_3_5_SONNET_V2,
    AnthropicModel.CLAUDE_SONNET_4,
    AnthropicModel.CLAUDE_SONNET_4_6,
  ],

  // Max tier: All models including Opus
  max: ["*"], // All models

  // Max 5x tier: Same access as max tier (5x usage multiplier)
  max_5: ["*"], // All models

  // Max 20x tier: Same access as max tier (20x usage multiplier)
  max_20: ["*"], // All models

  // API tier: Full access to all models (based on API access)
  api: ["*"], // All models
};

// ============================================================================
// MODEL METADATA
// ============================================================================

/**
 * Model metadata by model ID
 *
 * Comprehensive mapping of each Anthropic model's metadata,
 * including display names, context windows, vision support, and extended thinking.
 */
export const MODEL_METADATA: Record<string, AnthropicModelMetadata> = {
  // Claude 3 Haiku (Legacy)
  [AnthropicModel.CLAUDE_3_HAIKU]: {
    displayName: "Claude 3 Haiku",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsExtendedThinking: false,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: true,
    family: "haiku",
    description: "Fast and efficient model for simple tasks",
  },

  // Claude 3.5 Haiku
  [AnthropicModel.CLAUDE_3_5_HAIKU]: {
    displayName: "Claude 3.5 Haiku",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsVision: false,
    supportsExtendedThinking: false,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: false,
    family: "haiku",
    description: "Improved fast model with better performance",
  },

  // Claude 3.5 Sonnet
  [AnthropicModel.CLAUDE_3_5_SONNET]: {
    displayName: "Claude 3.5 Sonnet",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsExtendedThinking: false,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: false,
    family: "sonnet",
    description: "Balanced model for most tasks",
  },

  // Claude 3.5 Sonnet V2
  [AnthropicModel.CLAUDE_3_5_SONNET_V2]: {
    displayName: "Claude 3.5 Sonnet V2",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsVision: true,
    supportsExtendedThinking: false,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: false,
    family: "sonnet",
    description: "Updated Sonnet with improved capabilities",
  },

  // Claude Sonnet 4
  [AnthropicModel.CLAUDE_SONNET_4]: {
    displayName: "Claude Sonnet 4",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    supportsVision: true,
    supportsExtendedThinking: true,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: false,
    family: "sonnet",
    description: "Latest Sonnet with extended thinking support",
  },

  // Claude 3 Opus (Legacy)
  [AnthropicModel.CLAUDE_3_OPUS]: {
    displayName: "Claude 3 Opus",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsVision: true,
    supportsExtendedThinking: false,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: true,
    family: "opus",
    description: "Legacy flagship model for complex tasks",
  },

  // Claude Opus 4
  [AnthropicModel.CLAUDE_OPUS_4]: {
    displayName: "Claude Opus 4",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    supportsVision: true,
    supportsExtendedThinking: true,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: false,
    family: "opus",
    description: "Latest flagship model with advanced reasoning",
  },

  // Claude Sonnet 4.6
  [AnthropicModel.CLAUDE_SONNET_4_6]: {
    displayName: "Claude Sonnet 4.6",
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    supportsVision: true,
    supportsExtendedThinking: true,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: false,
    family: "sonnet",
    description: "Claude 4.6 Sonnet with 1M context window",
  },

  // Claude Opus 4.6
  [AnthropicModel.CLAUDE_OPUS_4_6]: {
    displayName: "Claude Opus 4.6",
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    supportsVision: true,
    supportsExtendedThinking: true,
    supportsToolUse: true,
    supportsStreaming: true,
    deprecated: false,
    family: "opus",
    description: "Claude 4.6 Opus flagship with 1M context window",
  },
};

// ============================================================================
// DEFAULT MODELS BY TIER
// ============================================================================

/**
 * Default model for each subscription tier
 *
 * These are the recommended default models that provide the best
 * balance of capability and cost for each tier level.
 */
export const DEFAULT_MODELS_BY_TIER: Record<ClaudeSubscriptionTier, string> = {
  free: AnthropicModel.CLAUDE_3_5_HAIKU,
  pro: AnthropicModel.CLAUDE_SONNET_4,
  max: AnthropicModel.CLAUDE_OPUS_4,
  max_5: AnthropicModel.CLAUDE_OPUS_4,
  max_20: AnthropicModel.CLAUDE_OPUS_4,
  api: AnthropicModel.CLAUDE_SONNET_4, // Sonnet is often best balance for API usage
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all available model IDs
 *
 * @returns Array of all model ID strings
 */
function getAllModelIds(): string[] {
  return Object.values(AnthropicModel);
}

/**
 * Check if a model is available for a given subscription tier
 *
 * @param model - The model ID to check (can be enum value or string)
 * @param tier - The subscription tier to check against
 * @returns true if the model is available for the tier
 *
 * @example
 * ```typescript
 * if (isModelAvailableForTier(AnthropicModel.CLAUDE_OPUS_4, "pro")) {
 *   // Model not available for pro tier
 * }
 *
 * if (isModelAvailableForTier(AnthropicModel.CLAUDE_OPUS_4, "max")) {
 *   // Model available for max tier
 * }
 * ```
 */
export function isModelAvailableForTier(
  model: string,
  tier: ClaudeSubscriptionTier,
): boolean {
  const availableModels = MODEL_TIER_ACCESS[tier];

  // Check for wildcard access (all models)
  if (availableModels.includes("*")) {
    // Verify model is a valid Anthropic model
    return getAllModelIds().includes(model);
  }

  return availableModels.includes(model);
}

/**
 * Get all models available for a given subscription tier
 *
 * @param tier - The subscription tier
 * @returns Array of model IDs available for the tier
 *
 * @example
 * ```typescript
 * const models = getAvailableModelsForTier("pro");
 * console.log(models);
 * // ["claude-3-haiku-20240307", "claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", ...]
 * ```
 */
export function getAvailableModelsForTier(
  tier: ClaudeSubscriptionTier,
): string[] {
  const availableModels = MODEL_TIER_ACCESS[tier];

  // If wildcard, return all models
  if (availableModels.includes("*")) {
    return getAllModelIds();
  }

  return [...availableModels];
}

/**
 * Get the human-readable display name for a model
 *
 * @param model - The model ID
 * @returns The display name, or the model ID if not found
 *
 * @example
 * ```typescript
 * const name = getModelDisplayName(AnthropicModel.CLAUDE_OPUS_4);
 * console.log(name); // "Claude Opus 4"
 *
 * const unknown = getModelDisplayName("unknown-model");
 * console.log(unknown); // "unknown-model"
 * ```
 */
export function getModelDisplayName(model: string): string {
  const metadata = MODEL_METADATA[model];
  return metadata?.displayName ?? model;
}

/**
 * Get the default/recommended model for a given subscription tier
 *
 * Returns the best default model that should be used for each tier.
 *
 * @param tier - The subscription tier
 * @returns The default model ID for the tier
 *
 * @example
 * ```typescript
 * const model = getDefaultModelForTier("max");
 * console.log(model); // "claude-opus-4-20250514"
 *
 * const proModel = getDefaultModelForTier("pro");
 * console.log(proModel); // "claude-sonnet-4-20250514"
 * ```
 */
export function getDefaultModelForTier(tier: ClaudeSubscriptionTier): string {
  return DEFAULT_MODELS_BY_TIER[tier];
}

/**
 * Get metadata for a specific model
 *
 * @param model - The model ID
 * @returns The model metadata, or undefined if not found
 *
 * @example
 * ```typescript
 * const metadata = getModelMetadata(AnthropicModel.CLAUDE_OPUS_4);
 * if (metadata?.supportsExtendedThinking) {
 *   // Enable extended thinking mode
 * }
 * ```
 */
export function getModelMetadata(
  model: string,
): AnthropicModelMetadata | undefined {
  return MODEL_METADATA[model];
}

/**
 * Check if a model supports a specific capability
 *
 * @param model - The model ID
 * @param capability - The capability to check
 * @returns true if the model supports the capability
 *
 * @example
 * ```typescript
 * if (modelSupportsCapability(AnthropicModel.CLAUDE_OPUS_4, "supportsExtendedThinking")) {
 *   // Use extended thinking
 * }
 * ```
 */
export function modelSupportsCapability(
  model: string,
  capability: keyof Omit<
    AnthropicModelMetadata,
    "displayName" | "description" | "family"
  >,
): boolean {
  const metadata = MODEL_METADATA[model];
  if (!metadata) {
    return false;
  }

  const value = metadata[capability];
  // For boolean capabilities, return the value directly
  // For numeric capabilities, check if truthy (> 0)
  return typeof value === "boolean" ? value : Boolean(value);
}

/**
 * Get the minimum subscription tier required for a model
 *
 * @param model - The model ID to check
 * @returns The minimum tier required, or "api" if model not found
 *
 * @example
 * ```typescript
 * const tier = getMinimumTierForModel(AnthropicModel.CLAUDE_OPUS_4);
 * console.log(tier); // "max"
 *
 * const haikuTier = getMinimumTierForModel(AnthropicModel.CLAUDE_3_HAIKU);
 * console.log(haikuTier); // "free"
 * ```
 */
export function getMinimumTierForModel(model: string): ClaudeSubscriptionTier {
  // Check tiers in order from lowest to highest
  const tierOrder: ClaudeSubscriptionTier[] = [
    "free",
    "pro",
    "max",
    "max_5",
    "max_20",
    "api",
  ];

  for (const tier of tierOrder) {
    if (isModelAvailableForTier(model, tier)) {
      return tier;
    }
  }

  // Default to API tier if model not found (for custom/unknown models)
  return "api";
}

/**
 * Get all models that support a specific capability
 *
 * @param capability - The capability to filter by
 * @returns Array of model IDs that have the capability
 *
 * @example
 * ```typescript
 * const thinkingModels = getModelsWithCapability("supportsExtendedThinking");
 * console.log(thinkingModels);
 * // ["claude-sonnet-4-20250514", "claude-opus-4-20250514"]
 * ```
 */
export function getModelsWithCapability(
  capability: keyof Omit<
    AnthropicModelMetadata,
    "displayName" | "description" | "family"
  >,
): string[] {
  return Object.entries(MODEL_METADATA)
    .filter(([_, metadata]) => {
      const value = metadata[capability];
      return typeof value === "boolean" ? value : Boolean(value);
    })
    .map(([modelId]) => modelId);
}

/**
 * Get models filtered by family (haiku, sonnet, opus)
 *
 * @param family - The model family to filter by
 * @returns Array of model IDs in the specified family
 *
 * @example
 * ```typescript
 * const opusModels = getModelsByFamily("opus");
 * // ["claude-3-opus-20240229", "claude-opus-4-20250514"]
 * ```
 */
export function getModelsByFamily(
  family: AnthropicModelMetadata["family"],
): string[] {
  return Object.entries(MODEL_METADATA)
    .filter(([_, metadata]) => metadata.family === family)
    .map(([modelId]) => modelId);
}

/**
 * Get the latest (non-deprecated) model in each family
 *
 * @returns Object mapping family name to the latest model in that family
 *
 * @example
 * ```typescript
 * const latest = getLatestModelsByFamily();
 * console.log(latest.opus); // "claude-opus-4-20250514"
 * console.log(latest.sonnet); // "claude-sonnet-4-20250514"
 * ```
 */
export function getLatestModelsByFamily(): Record<
  AnthropicModelMetadata["family"],
  string | undefined
> {
  const result: Record<AnthropicModelMetadata["family"], string | undefined> = {
    haiku: undefined,
    sonnet: undefined,
    opus: undefined,
  };

  // Priority order for each family (latest first based on model version)
  const familyPriority: Record<AnthropicModelMetadata["family"], string[]> = {
    haiku: [AnthropicModel.CLAUDE_3_5_HAIKU, AnthropicModel.CLAUDE_3_HAIKU],
    sonnet: [
      AnthropicModel.CLAUDE_SONNET_4_6,
      AnthropicModel.CLAUDE_SONNET_4,
      AnthropicModel.CLAUDE_3_5_SONNET_V2,
      AnthropicModel.CLAUDE_3_5_SONNET,
    ],
    opus: [
      AnthropicModel.CLAUDE_OPUS_4_6,
      AnthropicModel.CLAUDE_OPUS_4,
      AnthropicModel.CLAUDE_3_OPUS,
    ],
  };

  for (const family of Object.keys(familyPriority) as Array<
    AnthropicModelMetadata["family"]
  >) {
    for (const model of familyPriority[family]) {
      const metadata = MODEL_METADATA[model];
      if (metadata && !metadata.deprecated) {
        result[family] = model;
        break;
      }
    }
  }

  return result;
}

/**
 * Validate that a model is accessible for a given tier, throwing if not
 *
 * @param model - The model ID to validate
 * @param tier - The subscription tier to validate against
 * @throws {ModelAccessError} If the model is not available for the tier
 *
 * @example
 * ```typescript
 * try {
 *   validateModelAccess(AnthropicModel.CLAUDE_OPUS_4, "free");
 * } catch (error) {
 *   if (error instanceof ModelAccessError) {
 *     console.log(`Upgrade to ${error.requiredTier} to use this model`);
 *   }
 * }
 * ```
 */
export function validateModelAccess(
  model: string,
  tier: ClaudeSubscriptionTier,
): void {
  if (!isModelAvailableForTier(model, tier)) {
    const requiredTier = getMinimumTierForModel(model);
    throw new ModelAccessError(model, tier, requiredTier);
  }
}

/**
 * Compare subscription tiers
 *
 * @param tier1 - First tier to compare
 * @param tier2 - Second tier to compare
 * @returns Negative if tier1 < tier2, positive if tier1 > tier2, 0 if equal
 */
export function compareTiers(
  tier1: ClaudeSubscriptionTier,
  tier2: ClaudeSubscriptionTier,
): number {
  const tierOrder: ClaudeSubscriptionTier[] = [
    "free",
    "pro",
    "max",
    "max_5",
    "max_20",
    "api",
  ];
  return tierOrder.indexOf(tier1) - tierOrder.indexOf(tier2);
}

/**
 * Get context window size for a model
 *
 * @param model - The model ID
 * @returns The context window size in tokens, or 0 if model not found
 */
export function getContextWindow(model: string): number {
  return MODEL_METADATA[model]?.contextWindow ?? 0;
}

/**
 * Get max output tokens for a model
 *
 * @param model - The model ID
 * @returns The max output tokens, or 0 if model not found
 */
export function getMaxOutputTokens(model: string): number {
  return MODEL_METADATA[model]?.maxOutputTokens ?? 0;
}

/**
 * Check if a model supports vision/image input
 *
 * @param model - The model ID
 * @returns true if the model supports vision
 */
export function supportsVision(model: string): boolean {
  return MODEL_METADATA[model]?.supportsVision ?? false;
}

/**
 * Check if a model supports extended thinking
 *
 * @param model - The model ID
 * @returns true if the model supports extended thinking
 */
export function supportsExtendedThinking(model: string): boolean {
  return MODEL_METADATA[model]?.supportsExtendedThinking ?? false;
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

/**
 * Alias for getDefaultModelForTier for backward compatibility
 * @deprecated Use getDefaultModelForTier instead
 */
export const getRecommendedModelForTier = getDefaultModelForTier;

/**
 * Alias for getModelMetadata for backward compatibility
 * @deprecated Use getModelMetadata instead
 */
export const getModelCapabilities = getModelMetadata;

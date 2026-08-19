/**
 * Model-related type definitions for NeuroLink
 * Consolidates all model configuration, dynamic model, and provider model types
 */

import { z } from "zod";
import type { JsonValue } from "./common.js";
import { AIProviderName } from "../constants/enums.js";
import type { TaskType } from "./taskClassification.js";

/**
 * Model performance tier definition
 */
export type ModelTier = "fast" | "balanced" | "quality";

/**
 * Model configuration source type
 */
export type ConfigSource = "default" | "environment" | "file" | "dynamic";

/**
 * Model configuration for a specific provider
 */
export type ModelConfig = {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Performance tier */
  tier: ModelTier;
  /** Cost per 1K tokens */
  cost: {
    input: number;
    output: number;
  };
  /** Model capabilities */
  capabilities: string[];
  /** Model-specific options */
  options?: Record<string, JsonValue>;
};

/**
 * Provider configuration for model management
 */
export type ProviderConfiguration = {
  /** Provider name */
  provider: string;
  /** Available models by tier */
  models: Record<ModelTier, string>;
  /** Default cost per token (fallback) */
  defaultCost: {
    input: number;
    output: number;
  };
  /** Required environment variables */
  requiredEnvVars: string[];
  /** Provider-specific performance metrics */
  performance: {
    speed: number; // 1-3 scale
    quality: number; // 1-3 scale
    cost: number; // 1-3 scale
  };
  /** Provider-specific model configurations */
  modelConfigs?: Record<string, ModelConfig>;
  /** Provider-specific model behavior configurations */
  modelBehavior?: {
    /** Models that have issues with maxTokens parameter */
    maxTokensIssues?: string[];
    /** Models that require special handling */
    specialHandling?: Record<string, JsonValue>;
    /** Models that support tool calling (Ollama-specific) */
    toolCapableModels?: string[];
  };
};

/**
 * Zod schema for model configuration validation
 */
export const ModelConfigSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  capabilities: z.array(z.string()),
  deprecated: z.boolean(),
  pricing: z.object({
    input: z.number(),
    output: z.number(),
  }),
  contextWindow: z.number(),
  releaseDate: z.string(),
});

/**
 * Zod schema for model registry validation
 */
export const ModelRegistrySchema = z.object({
  version: z.string(),
  lastUpdated: z.string(),
  models: z.record(z.string(), z.record(z.string(), ModelConfigSchema)),
  aliases: z.record(z.string(), z.string()).optional(),
  defaults: z.record(z.string(), z.string()).optional(),
});

/**
 * Dynamic model configuration type
 */
export type DynamicModelConfig = z.infer<typeof ModelConfigSchema>;

/**
 * Dynamic model registry type
 */
export type ModelRegistry = z.infer<typeof ModelRegistrySchema>;

/**
 * Model capabilities interface
 */
export type ModelCapabilities = {
  vision: boolean;
  functionCalling: boolean;
  codeGeneration: boolean;
  reasoning: boolean;
  multimodal: boolean;
  streaming: boolean;
  jsonMode: boolean;
  /**
   * Whether the model accepts classic sampling parameters
   * (`temperature` / `topP`). Reasoning-effort models (Claude Sonnet 5,
   * Opus 4.7+, Fable 5 families) reject them. Optional: unset means
   * supported, and `modelSupportsSamplingParams` falls back to the known
   * family patterns.
   */
  samplingParams?: boolean;
};

/**
 * Model pricing information
 */
export type ModelPricingInfo = {
  inputCostPer1K: number; // Cost per 1K input tokens in USD
  outputCostPer1K: number; // Cost per 1K output tokens in USD
  currency: string; // Always USD for now
};

/**
 * Model performance characteristics
 */
export type ModelPerformance = {
  speed: "fast" | "medium" | "slow"; // Response speed
  quality: "high" | "medium" | "low"; // Output quality
  accuracy: "high" | "medium" | "low"; // Factual accuracy
};

/**
 * Model limitations and constraints
 */
export type ModelLimits = {
  maxContextTokens: number;
  maxOutputTokens: number;
  maxRequestsPerMinute?: number;
  maxRequestsPerDay?: number;
};

/**
 * Use case suitability scores (1-10 scale)
 */
export type UseCaseSuitability = {
  coding: number;
  creative: number;
  analysis: number;
  conversation: number;
  reasoning: number;
  translation: number;
  summarization: number;
};

/**
 * Complete model information
 */
export type ModelInfo = {
  id: string;
  name: string;
  provider: AIProviderName;
  description: string;
  capabilities: ModelCapabilities;
  pricing: ModelPricingInfo;
  performance: ModelPerformance;
  limits: ModelLimits;
  useCases: UseCaseSuitability;
  aliases: string[];
  deprecated: boolean;
  isLocal: boolean; // Whether the model runs locally (e.g., Ollama)
  releaseDate?: string;
  category: "general" | "coding" | "creative" | "vision" | "reasoning";
};

/**
 * Model search filters
 */
export type ModelSearchFilters = {
  provider?: AIProviderName | AIProviderName[];
  capability?: keyof ModelCapabilities | (keyof ModelCapabilities)[];
  useCase?: keyof UseCaseSuitability;
  maxCost?: number; // Max cost per 1K tokens
  minContextSize?: number;
  maxContextSize?: number;
  performance?: ModelPerformance["speed"] | ModelPerformance["quality"];
  category?: ModelInfo["category"] | ModelInfo["category"][];
};

/**
 * Model search result with ranking
 */
export type ModelSearchResult = {
  model: ModelInfo;
  score: number; // Relevance score 0-1
  matchReasons: string[];
};

/**
 * Model recommendation context
 */
export type RecommendationContext = {
  useCase?: keyof UseCaseSuitability;
  maxCost?: number;
  minQuality?: "low" | "medium" | "high";
  requireCapabilities?: (keyof ModelCapabilities)[];
  excludeProviders?: AIProviderName[];
  contextSize?: number;
  preferLocal?: boolean;
};

/**
 * Model recommendation result
 */
export type ModelRecommendation = {
  model: ModelInfo;
  score: number;
  reasoning: string[];
  alternatives: ModelInfo[];
};

/**
 * Model comparison result
 */
export type ModelComparison = {
  models: ModelInfo[];
  comparison: {
    capabilities: Record<keyof ModelCapabilities, ModelInfo[]>;
    pricing: { cheapest: ModelInfo; mostExpensive: ModelInfo };
    performance: Record<string, ModelInfo[]>;
    contextSize: { largest: ModelInfo; smallest: ModelInfo };
  };
};

export type ModelRoute = {
  provider: string;
  model: string;
  reasoning: string;
  confidence: number;
};

export type ModelRoutingOptions = {
  /** Override the task classification */
  forceTaskType?: TaskType;
  /** Require specific performance characteristics */
  requireFast?: boolean;
  /** Require specific capability (reasoning, creativity, etc.) */
  requireCapability?: string;
  /** Fallback strategy if primary choice fails */
  fallbackStrategy?: "fast" | "reasoning" | "auto";
};

/**
 * A single model's metadata inside a provider's manifest. This is the one
 * canonical shape every model-metadata consumer (context windows, pricing,
 * MODEL_REGISTRY, vision capability, output-token ceilings) is intended to
 * migrate onto — this PR is purely additive and does not yet move any
 * consumer over.
 *
 * `pricingPerMTok` is optional by design: a model with no verified price
 * (e.g. a just-announced model pricing.ts hasn't priced yet) must not report
 * a fabricated rate. Absence here means "unknown", not "free" — callers that
 * need to distinguish "free" from "unknown" already have `hasPricing()`
 * (src/lib/utils/pricing.ts) for that.
 */
export type ProviderModelManifestEntry = {
  /** Alternate identifiers that resolve to this canonical model id. */
  aliases: string[];
  /** Human-readable name. Falls back to a mechanical id-derived name when absent. */
  displayName?: string;
  contextWindow: number;
  maxOutputTokens: number;
  pricingPerMTok?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
  };
  vision: boolean;
  nativeAudio?: boolean;
  functionCalling: boolean;
  reasoning?: boolean;
  jsonMode?: boolean;
  /**
   * Whether the model accepts classic sampling parameters (temperature/topP).
   * Mirrors ModelCapabilities.samplingParams (src/lib/types/model.ts:131) —
   * unset means supported.
   */
  samplingParams?: boolean;
  /**
   * Hand-tuned ModelInfo.performance/useCases/category values, carried
   * forward verbatim for the ids that already had a MODEL_REGISTRY entry
   * before this migration. Absent for every id that never had one — those
   * get performance/useCases/category derived mechanically instead (see
   * Task 9's buildModelRegistryFromManifests). Never populate this for a
   * genuinely new model: mechanical derivation is the correct default, and
   * a fabricated "curated" value would be worse than an honestly-derived one.
   */
  curated?: {
    performance?: ModelPerformance;
    useCases?: UseCaseSuitability;
    category?: ModelInfo["category"];
  };
};

/**
 * A regex-driven patch applied to an unlisted, gateway-shaped model id that
 * matches `pattern` (e.g. "vertex_ai/claude-sonnet-5@20260203"). Generalizes
 * the pattern VISION_FAMILY_RULES (src/lib/adapters/providerImageAdapter.ts)
 * and SAMPLING_PARAM_REJECTING_FAMILIES (src/lib/models/modelRegistry.ts)
 * already use independently, keyed per-provider instead of globally.
 */
export type ManifestFamilyRule = {
  pattern: RegExp;
  patch: Partial<ProviderModelManifestEntry>;
};

/**
 * One provider's complete model manifest: every model NeuroLink knows about
 * for that provider, plus the provider-wide fallback used when a caller
 * passes a model id the manifest has never seen (a symbolic/local provider
 * model, or a brand-new release the manifest hasn't been updated for yet).
 */
export type ProviderModelManifest = {
  /** Used for `_default`-key lookups and providers with no named-model list. */
  defaultContextWindow: number;
  /** Applied, in order, to the resolved entry (see manifestRegistry.ts). */
  familyRules?: ManifestFamilyRule[];
  /** Keyed by canonical model id (the same id `ModelInfo.id` / AIProvider calls use). */
  models: Record<string, ProviderModelManifestEntry>;
};

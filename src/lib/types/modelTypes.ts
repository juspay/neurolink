/**
 * Model-related type definitions for NeuroLink
 * Consolidates all model configuration, dynamic model, and provider model types
 */

import { z } from "zod";
import type { JsonValue } from "./common.js";
import { AIProviderName } from "../constants/enums.js";
import type { TaskType } from "./taskClassificationTypes.js";

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
  models: z.record(z.record(ModelConfigSchema)),
  aliases: z.record(z.string()).optional(),
  defaults: z.record(z.string()).optional(),
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

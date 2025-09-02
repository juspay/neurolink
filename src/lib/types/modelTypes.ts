/**
 * Model-related type definitions for NeuroLink
 * Consolidates all model configuration, dynamic model, and provider model types
 */

import { z } from "zod";
import type { JsonValue } from "./common.js";

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
 * Model name constants structure
 */
export type ModelNameConstants = {
  readonly [provider: string]: {
    readonly FAST: string;
    readonly BALANCED: string;
    readonly QUALITY: string;
  };
};

/**
 * Model metadata for registry
 */
export type ModelMetadata = {
  version: string;
  lastUpdated: string;
  modelCount: number;
};

/**
 * Model search options
 */
export type ModelSearchOptions = {
  provider?: string;
  maxPrice?: number;
  excludeDeprecated?: boolean;
};

/**
 * Model search result
 */
export type ModelSearchResult = {
  provider: string;
  model: string;
  config: DynamicModelConfig;
};

/**
 * Cost information structure
 */
export type CostInfo = {
  input: number;
  output: number;
};

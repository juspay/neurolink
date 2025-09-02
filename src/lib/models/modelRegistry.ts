/**
 * Model Registry for NeuroLink CLI Commands
 * Provides centralized model data for models command system
 * Part of Phase 4.1 - Models Command System
 */

import { AIProviderName } from "../types/index.js";
import type { JsonValue } from "../types/common.js";

/**
 * Model capabilities interface
 */
export interface ModelCapabilities {
  vision: boolean;
  functionCalling: boolean;
  codeGeneration: boolean;
  reasoning: boolean;
  multimodal: boolean;
  streaming: boolean;
  jsonMode: boolean;
}

/**
 * Model pricing information
 */
export interface ModelPricing {
  inputCostPer1K: number; // Cost per 1K input tokens in USD
  outputCostPer1K: number; // Cost per 1K output tokens in USD
  currency: string; // Always USD for now
}

/**
 * Model performance characteristics
 */
export interface ModelPerformance {
  speed: "fast" | "medium" | "slow"; // Response speed
  quality: "high" | "medium" | "low"; // Output quality
  accuracy: "high" | "medium" | "low"; // Factual accuracy
}

/**
 * Model limitations and constraints
 */
export interface ModelLimits {
  maxContextTokens: number;
  maxOutputTokens: number;
  maxRequestsPerMinute?: number;
  maxRequestsPerDay?: number;
}

/**
 * Use case suitability scores (1-10 scale)
 */
export interface UseCaseSuitability {
  coding: number;
  creative: number;
  analysis: number;
  conversation: number;
  reasoning: number;
  translation: number;
  summarization: number;
}

/**
 * Complete model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: AIProviderName;
  description: string;
  capabilities: ModelCapabilities;
  pricing: ModelPricing;
  performance: ModelPerformance;
  limits: ModelLimits;
  useCases: UseCaseSuitability;
  aliases: string[];
  deprecated: boolean;
  isLocal: boolean; // Whether the model runs locally (e.g., Ollama)
  releaseDate?: string;
  category: "general" | "coding" | "creative" | "vision" | "reasoning";
}

/**
 * Model search filters
 */
export interface ModelSearchFilters {
  provider?: AIProviderName | AIProviderName[];
  capability?: keyof ModelCapabilities | (keyof ModelCapabilities)[];
  useCase?: keyof UseCaseSuitability;
  maxCost?: number; // Max cost per 1K tokens
  minContextSize?: number;
  maxContextSize?: number;
  performance?: ModelPerformance["speed"] | ModelPerformance["quality"];
  category?: ModelInfo["category"] | ModelInfo["category"][];
}

/**
 * Model search result with ranking
 */
export interface ModelSearchResult {
  model: ModelInfo;
  score: number; // Relevance score 0-1
  matchReasons: string[];
}

/**
 * Comprehensive model registry
 */
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  // OpenAI Models
  "gpt-4o": {
    id: "gpt-4o",
    name: "GPT-4 Omni",
    provider: AIProviderName.OPENAI,
    description: "Most capable OpenAI model with vision and advanced reasoning",
    capabilities: {
      vision: true,
      functionCalling: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.005,
      outputCostPer1K: 0.015,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 128000,
      maxOutputTokens: 4096,
      maxRequestsPerMinute: 500,
    },
    useCases: {
      coding: 9,
      creative: 8,
      analysis: 9,
      conversation: 9,
      reasoning: 9,
      translation: 8,
      summarization: 8,
    },
    aliases: ["gpt4o", "gpt-4-omni", "openai-flagship"],
    deprecated: false,
    isLocal: false, // Cloud-based model
    releaseDate: "2024-05-13",
    category: "general",
  },

  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    name: "GPT-4 Omni Mini",
    provider: AIProviderName.OPENAI,
    description: "Fast and cost-effective model with strong performance",
    capabilities: {
      vision: true,
      functionCalling: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.00015,
      outputCostPer1K: 0.0006,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 128000,
      maxOutputTokens: 16384,
      maxRequestsPerMinute: 1000,
    },
    useCases: {
      coding: 8,
      creative: 7,
      analysis: 8,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 9,
    },
    aliases: ["gpt4o-mini", "gpt-4-mini", "fastest", "cheap"],
    deprecated: false,
    isLocal: false, // Cloud-based model
    releaseDate: "2024-07-18",
    category: "general",
  },

  // Google AI Studio Models
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: AIProviderName.GOOGLE_AI,
    description:
      "Google's most capable multimodal model with large context window",
    capabilities: {
      vision: true,
      functionCalling: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.00125,
      outputCostPer1K: 0.005,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 2097152, // 2M tokens
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 360,
    },
    useCases: {
      coding: 9,
      creative: 8,
      analysis: 10,
      conversation: 8,
      reasoning: 9,
      translation: 9,
      summarization: 9,
    },
    aliases: ["gemini-pro", "google-flagship", "best-analysis"],
    deprecated: false,
    isLocal: false, // Cloud-based model
    releaseDate: "2024-12-11",
    category: "reasoning",
  },

  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: AIProviderName.GOOGLE_AI,
    description: "Fast and efficient multimodal model with large context",
    capabilities: {
      vision: true,
      functionCalling: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.000075,
      outputCostPer1K: 0.0003,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 1048576, // 1M tokens
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 1000,
    },
    useCases: {
      coding: 8,
      creative: 7,
      analysis: 9,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 9,
    },
    aliases: ["gemini-flash", "google-fast", "best-value"],
    deprecated: false,
    isLocal: false, // Cloud-based model
    releaseDate: "2024-12-11",
    category: "general",
  },

  // Anthropic Models
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: AIProviderName.ANTHROPIC,
    description:
      "Anthropic's most capable model with excellent reasoning and coding",
    capabilities: {
      vision: true,
      functionCalling: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: true,
      streaming: true,
      jsonMode: false,
    },
    pricing: {
      inputCostPer1K: 0.003,
      outputCostPer1K: 0.015,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 9,
      analysis: 9,
      conversation: 9,
      reasoning: 10,
      translation: 8,
      summarization: 8,
    },
    aliases: [
      "claude-3.5-sonnet",
      "claude-sonnet",
      "best-coding",
      "claude-latest",
    ],
    deprecated: false,
    isLocal: false, // Cloud-based model
    releaseDate: "2024-10-22",
    category: "coding",
  },

  "claude-3-5-haiku-20241022": {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    provider: AIProviderName.ANTHROPIC,
    description: "Fast and efficient Claude model for quick tasks",
    capabilities: {
      vision: false,
      functionCalling: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: false,
      streaming: true,
      jsonMode: false,
    },
    pricing: {
      inputCostPer1K: 0.001,
      outputCostPer1K: 0.005,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 8,
      creative: 7,
      analysis: 8,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 9,
    },
    aliases: ["claude-3.5-haiku", "claude-haiku", "claude-fast"],
    deprecated: false,
    isLocal: false, // Cloud-based model
    releaseDate: "2024-10-22",
    category: "general",
  },

  // Mistral Models
  "mistral-small-latest": {
    id: "mistral-small-latest",
    name: "Mistral Small",
    provider: AIProviderName.MISTRAL,
    description:
      "Efficient model for simple tasks and cost-sensitive applications",
    capabilities: {
      vision: false,
      functionCalling: true,
      codeGeneration: true,
      reasoning: true,
      multimodal: false,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.001,
      outputCostPer1K: 0.003,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "medium",
      accuracy: "medium",
    },
    limits: {
      maxContextTokens: 32768,
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 6,
      creative: 6,
      analysis: 7,
      conversation: 7,
      reasoning: 6,
      translation: 7,
      summarization: 7,
    },
    aliases: ["mistral-small", "mistral-cheap"],
    deprecated: false,
    isLocal: false, // Cloud-based model
    releaseDate: "2024-02-26",
    category: "general",
  },

  // Ollama Models (local)
  "llama3.2:latest": {
    id: "llama3.2:latest",
    name: "Llama 3.2 Latest",
    provider: AIProviderName.OLLAMA,
    description: "Local Llama model for private, offline AI generation",
    capabilities: {
      vision: false,
      functionCalling: false,
      codeGeneration: true,
      reasoning: true,
      multimodal: false,
      streaming: true,
      jsonMode: false,
    },
    pricing: {
      inputCostPer1K: 0, // Local execution
      outputCostPer1K: 0,
      currency: "USD",
    },
    performance: {
      speed: "slow", // Depends on hardware
      quality: "medium",
      accuracy: "medium",
    },
    limits: {
      maxContextTokens: 4096,
      maxOutputTokens: 2048,
    },
    useCases: {
      coding: 6,
      creative: 7,
      analysis: 6,
      conversation: 7,
      reasoning: 6,
      translation: 6,
      summarization: 6,
    },
    aliases: ["llama3.2", "llama", "local", "offline"],
    deprecated: false,
    isLocal: true, // Ollama runs locally
    releaseDate: "2024-09-25",
    category: "general",
  },
};

/**
 * Model aliases registry for quick resolution
 */
export const MODEL_ALIASES: Record<string, string> = {};

// Build aliases from model data
Object.values(MODEL_REGISTRY).forEach((model) => {
  model.aliases.forEach((alias) => {
    MODEL_ALIASES[alias.toLowerCase()] = model.id;
  });
});

// Add common aliases
Object.assign(MODEL_ALIASES, {
  latest: "gpt-4o", // Default latest model
  fastest: "gpt-4o-mini",
  cheapest: "gemini-2.5-flash",
  "best-coding": "claude-3-5-sonnet-20241022",
  "best-analysis": "gemini-2.5-pro",
  "best-creative": "claude-3-5-sonnet-20241022",
  "best-value": "gemini-2.5-flash",
  local: "llama3.2:latest",
});

/**
 * Use case to model mappings
 */
export const USE_CASE_RECOMMENDATIONS: Record<string, string[]> = {
  coding: ["claude-3-5-sonnet-20241022", "gpt-4o", "gemini-2.5-pro"],
  creative: ["claude-3-5-sonnet-20241022", "gpt-4o", "gemini-2.5-pro"],
  analysis: ["gemini-2.5-pro", "claude-3-5-sonnet-20241022", "gpt-4o"],
  conversation: [
    "gpt-4o",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ],
  reasoning: ["claude-3-5-sonnet-20241022", "gemini-2.5-pro", "gpt-4o"],
  translation: ["gemini-2.5-pro", "gpt-4o", "claude-3-5-haiku-20241022"],
  summarization: [
    "gemini-2.5-flash",
    "gpt-4o-mini",
    "claude-3-5-haiku-20241022",
  ],
  "cost-effective": ["gemini-2.5-flash", "gpt-4o-mini", "mistral-small-latest"],
  "high-quality": ["claude-3-5-sonnet-20241022", "gpt-4o", "gemini-2.5-pro"],
  fast: ["gpt-4o-mini", "gemini-2.5-flash", "claude-3-5-haiku-20241022"],
};

/**
 * Get all models
 */
export function getAllModels(): ModelInfo[] {
  return Object.values(MODEL_REGISTRY);
}

/**
 * Get model by ID
 */
export function getModelById(id: string): ModelInfo | undefined {
  return MODEL_REGISTRY[id];
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: AIProviderName): ModelInfo[] {
  return Object.values(MODEL_REGISTRY).filter(
    (model) => model.provider === provider,
  );
}

/**
 * Get available providers
 */
export function getAvailableProviders(): AIProviderName[] {
  const providers = new Set<AIProviderName>();
  Object.values(MODEL_REGISTRY).forEach((model) => {
    providers.add(model.provider);
  });
  return Array.from(providers);
}

/**
 * Calculate estimated cost for a request
 */
export function calculateCost(
  model: ModelInfo,
  input: number,
  output: number,
): number {
  const inputCost = (input / 1000) * model.pricing.inputCostPer1K;
  const outputCost = (output / 1000) * model.pricing.outputCostPer1K;
  return inputCost + outputCost;
}

/**
 * Format model for display
 */
export function formatModelForDisplay(model: ModelInfo): JsonValue {
  const result: Record<string, JsonValue> = {
    id: model.id,
    name: model.name,
    provider: model.provider,
    description: model.description,
    category: model.category,
    capabilities: Object.entries(model.capabilities)
      .filter(([_, supported]) => supported)
      .map(([capability]) => capability),
    pricing: {
      input: `$${model.pricing.inputCostPer1K.toFixed(6)}/1K tokens`,
      output: `$${model.pricing.outputCostPer1K.toFixed(6)}/1K tokens`,
    },
    performance: {
      speed: model.performance.speed,
      quality: model.performance.quality,
      accuracy: model.performance.accuracy,
    },
    contextSize: `${(model.limits.maxContextTokens / 1000).toFixed(0)}K tokens`,
    maxOutput: `${(model.limits.maxOutputTokens / 1000).toFixed(0)}K tokens`,
    aliases: model.aliases,
  };

  if (model.releaseDate) {
    result.releaseDate = model.releaseDate;
  }

  return result;
}

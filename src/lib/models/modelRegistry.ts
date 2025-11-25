/**
 * Model Registry for NeuroLink CLI Commands
 * Provides centralized model data for models command system
 * Part of Phase 4.1 - Models Command System
 */

import { DEFAULT_MODEL_ALIASES } from "../types/providers.js";
import {
  AIProviderName,
  OpenAIModels,
  GoogleAIModels,
  AnthropicModels,
} from "../constants/enums.js";
import type { JsonValue } from "../types/common.js";
import type { ModelInfo } from "../types/modelTypes.js";

/**
 * Comprehensive model registry
 */
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  // OpenAI Models
  [OpenAIModels.GPT_4O]: {
    id: OpenAIModels.GPT_4O,
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

  [OpenAIModels.GPT_4O_MINI]: {
    id: OpenAIModels.GPT_4O_MINI,
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
  [GoogleAIModels.GEMINI_2_5_PRO]: {
    id: GoogleAIModels.GEMINI_2_5_PRO,
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

  [GoogleAIModels.GEMINI_2_5_FLASH]: {
    id: GoogleAIModels.GEMINI_2_5_FLASH,
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
  [AnthropicModels.CLAUDE_4_5_OPUS]: {
    id: AnthropicModels.CLAUDE_4_5_OPUS,
    name: "Claude Opus 4.5",
    provider: AIProviderName.ANTHROPIC,
    description:
      "Anthropic's most intelligent and capable flagship for advanced coding, agentic workflows, and enterprise automation",
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
      inputCostPer1K: 0.005,
      outputCostPer1K: 0.025,
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
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 8,
      summarization: 8,
    },
    aliases: [
      "claude-opus-4.5",
      "claude-opus-4-5",
      "opus-4.5",
      "opus-4-5",
      "claude-flagship",
      "anthropic-flagship",
    ],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-11-24",
    category: "coding",
  },

  [AnthropicModels.CLAUDE_3_5_SONNET]: {
    id: AnthropicModels.CLAUDE_3_5_SONNET,
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

  [AnthropicModels.CLAUDE_3_5_HAIKU]: {
    id: AnthropicModels.CLAUDE_3_5_HAIKU,
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

// Pull canonical alias recommendations from core/types
Object.entries(DEFAULT_MODEL_ALIASES).forEach(([k, v]) => {
  MODEL_ALIASES[k.toLowerCase().replace(/_/g, "-")] = v;
});

MODEL_ALIASES.local = "llama3.2:latest";

/**
 * Use case to model mappings
 */
export const USE_CASE_RECOMMENDATIONS: Record<string, string[]> = {
  coding: [
    AnthropicModels.CLAUDE_4_5_OPUS,
    AnthropicModels.CLAUDE_3_5_SONNET,
    OpenAIModels.GPT_4O,
    GoogleAIModels.GEMINI_2_5_PRO,
  ],
  creative: [
    AnthropicModels.CLAUDE_4_5_OPUS,
    AnthropicModels.CLAUDE_3_5_SONNET,
    OpenAIModels.GPT_4O,
    GoogleAIModels.GEMINI_2_5_PRO,
  ],
  analysis: [
    GoogleAIModels.GEMINI_2_5_PRO,
    AnthropicModels.CLAUDE_4_5_OPUS,
    AnthropicModels.CLAUDE_3_5_SONNET,
    OpenAIModels.GPT_4O,
  ],
  conversation: [
    OpenAIModels.GPT_4O,
    AnthropicModels.CLAUDE_4_5_OPUS,
    AnthropicModels.CLAUDE_3_5_SONNET,
    AnthropicModels.CLAUDE_3_5_HAIKU,
  ],
  reasoning: [
    AnthropicModels.CLAUDE_4_5_OPUS,
    AnthropicModels.CLAUDE_3_5_SONNET,
    GoogleAIModels.GEMINI_2_5_PRO,
    OpenAIModels.GPT_4O,
  ],
  translation: [
    GoogleAIModels.GEMINI_2_5_PRO,
    OpenAIModels.GPT_4O,
    AnthropicModels.CLAUDE_3_5_HAIKU,
  ],
  summarization: [
    GoogleAIModels.GEMINI_2_5_FLASH,
    OpenAIModels.GPT_4O_MINI,
    AnthropicModels.CLAUDE_3_5_HAIKU,
  ],
  "cost-effective": [
    GoogleAIModels.GEMINI_2_5_FLASH,
    OpenAIModels.GPT_4O_MINI,
    "mistral-small-latest",
  ],
  "high-quality": [
    AnthropicModels.CLAUDE_4_5_OPUS,
    AnthropicModels.CLAUDE_3_5_SONNET,
    OpenAIModels.GPT_4O,
    GoogleAIModels.GEMINI_2_5_PRO,
  ],
  fast: [
    OpenAIModels.GPT_4O_MINI,
    GoogleAIModels.GEMINI_2_5_FLASH,
    AnthropicModels.CLAUDE_3_5_HAIKU,
  ],
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

/**
 * Model Registry for NeuroLink CLI Commands
 * Provides centralized model data for models command system
 * Part of Phase 4.1 - Models Command System
 */

import { DEFAULT_MODEL_ALIASES } from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  AIProviderName,
  OpenAIModels,
  AzureOpenAIModels,
  GoogleAIModels,
  AnthropicModels,
  BedrockModels,
  MistralModels,
  OllamaModels,
} from "../constants/enums.js";
import type {
  JsonValue,
  ModelCapabilities,
  ModelInfo,
  ModelPerformance,
  ProviderModelManifestEntry,
} from "../types/index.js";
import {
  getAllManifestProviders,
  getManifestForProvider,
} from "./manifestRegistry.js";

/**
 * Comprehensive model registry — hand-authored base. Every id defined here
 * that the manifest doesn't also carry a priced entry for stays exactly as
 * authored below; see buildManifestDerivedEntries()/MODEL_REGISTRY's
 * docblock further down for how the two are merged and why (Task 9, model
 * metadata consolidation plan).
 */
const LEGACY_MODEL_REGISTRY: Record<string, ModelInfo> = {
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

  // OpenAI GPT-5 Series
  [OpenAIModels.GPT_5]: {
    id: OpenAIModels.GPT_5,
    name: "GPT-5",
    provider: AIProviderName.OPENAI,
    description:
      "OpenAI's most advanced model with breakthrough reasoning and multimodal capabilities",
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
      inputCostPer1K: 0.01,
      outputCostPer1K: 0.03,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 256000,
      maxOutputTokens: 32768,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 10,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["gpt5", "gpt-5-flagship", "openai-latest"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-08-07",
    category: "reasoning",
  },

  [OpenAIModels.GPT_5_MINI]: {
    id: OpenAIModels.GPT_5_MINI,
    name: "GPT-5 Mini",
    provider: AIProviderName.OPENAI,
    description: "Fast and efficient GPT-5 variant for everyday tasks",
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
      inputCostPer1K: 0.002,
      outputCostPer1K: 0.006,
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
      maxRequestsPerMinute: 500,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 8,
      conversation: 9,
      reasoning: 8,
      translation: 8,
      summarization: 9,
    },
    aliases: ["gpt5-mini", "gpt-5-fast"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-08-07",
    category: "general",
  },

  // OpenAI O-Series Reasoning Models
  [OpenAIModels.O3]: {
    id: OpenAIModels.O3,
    name: "O3",
    provider: AIProviderName.OPENAI,
    description:
      "Advanced reasoning model with extended thinking capabilities for complex tasks",
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
      inputCostPer1K: 0.015,
      outputCostPer1K: 0.06,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 100000,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 10,
      creative: 8,
      analysis: 10,
      conversation: 7,
      reasoning: 10,
      translation: 7,
      summarization: 8,
    },
    aliases: ["o3-reasoning", "o3-thinking"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-01-31",
    category: "reasoning",
  },

  [OpenAIModels.O3_MINI]: {
    id: OpenAIModels.O3_MINI,
    name: "O3 Mini",
    provider: AIProviderName.OPENAI,
    description:
      "Cost-effective reasoning model with strong logical capabilities",
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
      inputCostPer1K: 0.003,
      outputCostPer1K: 0.012,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 65536,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 9,
      creative: 6,
      analysis: 9,
      conversation: 7,
      reasoning: 9,
      translation: 6,
      summarization: 7,
    },
    aliases: ["o3-mini-reasoning"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-01-31",
    category: "reasoning",
  },

  [OpenAIModels.GPT_5_NANO]: {
    id: OpenAIModels.GPT_5_NANO,
    name: "GPT-5 Nano",
    provider: AIProviderName.OPENAI,
    description:
      "Fastest and most cost-effective GPT-5 variant for simple tasks",
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
      inputCostPer1K: 0.00005,
      outputCostPer1K: 0.0004,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "medium",
      accuracy: "medium",
    },
    limits: {
      maxContextTokens: 272000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 2000,
    },
    useCases: {
      coding: 6,
      creative: 6,
      analysis: 6,
      conversation: 8,
      reasoning: 6,
      translation: 7,
      summarization: 8,
    },
    aliases: ["gpt5-nano", "gpt-5-cheapest"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-08-07",
    category: "general",
  },

  // OpenAI GPT-5.2 Series (Released December 11, 2025) - Latest flagship models
  [OpenAIModels.GPT_5_2]: {
    id: OpenAIModels.GPT_5_2,
    name: "GPT-5.2 Thinking",
    provider: AIProviderName.OPENAI,
    description:
      "OpenAI's latest flagship model with deep reasoning capabilities, 100% on AIME 2025, 80% SWE-bench Verified",
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
      inputCostPer1K: 0.00175,
      outputCostPer1K: 0.014,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 256000,
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 150,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["gpt52", "gpt-5.2-thinking", "openai-latest-reasoning"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-11",
    category: "reasoning",
  },

  [OpenAIModels.GPT_5_2_CHAT_LATEST]: {
    id: OpenAIModels.GPT_5_2_CHAT_LATEST,
    name: "GPT-5.2 Instant",
    provider: AIProviderName.OPENAI,
    description:
      "Fast everyday model for quick tasks with excellent performance across all domains",
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
      inputCostPer1K: 0.00175,
      outputCostPer1K: 0.014,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 256000,
      maxOutputTokens: 32000,
      maxRequestsPerMinute: 300,
    },
    useCases: {
      coding: 9,
      creative: 9,
      analysis: 9,
      conversation: 10,
      reasoning: 9,
      translation: 9,
      summarization: 9,
    },
    aliases: ["gpt52-chat", "gpt-5.2-instant", "gpt52-fast"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-11",
    category: "general",
  },

  [OpenAIModels.GPT_5_2_PRO]: {
    id: OpenAIModels.GPT_5_2_PRO,
    name: "GPT-5.2 Pro",
    provider: AIProviderName.OPENAI,
    description:
      "Highest quality model for science, math, and complex problem-solving with 92.4% GPQA Diamond performance",
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
      inputCostPer1K: 0.021,
      outputCostPer1K: 0.168,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 256000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 9,
      analysis: 10,
      conversation: 8,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["gpt52-pro", "gpt-5.2-professional", "openai-science"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-11",
    category: "reasoning",
  },

  // OpenAI GPT-4.1 Series (1M context window)
  [OpenAIModels.GPT_4_1]: {
    id: OpenAIModels.GPT_4_1,
    name: "GPT-4.1",
    provider: AIProviderName.OPENAI,
    description: "Advanced coding model with 1 million token context window",
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
      inputCostPer1K: 0.002,
      outputCostPer1K: 0.008,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 10,
      creative: 8,
      analysis: 9,
      conversation: 8,
      reasoning: 9,
      translation: 8,
      summarization: 9,
    },
    aliases: ["gpt-4.1", "gpt41", "million-context"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-04-14",
    category: "coding",
  },

  [OpenAIModels.GPT_4_1_MINI]: {
    id: OpenAIModels.GPT_4_1_MINI,
    name: "GPT-4.1 Mini",
    provider: AIProviderName.OPENAI,
    description: "Fast GPT-4.1 variant with 1M context for efficient coding",
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
      inputCostPer1K: 0.0004,
      outputCostPer1K: 0.0016,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 500,
    },
    useCases: {
      coding: 9,
      creative: 7,
      analysis: 8,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 9,
    },
    aliases: ["gpt-4.1-mini", "gpt41-mini"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-04-14",
    category: "coding",
  },

  [OpenAIModels.GPT_4_1_NANO]: {
    id: OpenAIModels.GPT_4_1_NANO,
    name: "GPT-4.1 Nano",
    provider: AIProviderName.OPENAI,
    description: "Most cost-effective GPT-4.1 variant with 1M context",
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
      inputCostPer1K: 0.0001,
      outputCostPer1K: 0.0004,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "medium",
      accuracy: "medium",
    },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 1000,
    },
    useCases: {
      coding: 7,
      creative: 6,
      analysis: 7,
      conversation: 7,
      reasoning: 7,
      translation: 7,
      summarization: 8,
    },
    aliases: ["gpt-4.1-nano", "gpt41-nano"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-04-14",
    category: "coding",
  },

  // OpenAI O-Series Additional Models
  [OpenAIModels.O3_PRO]: {
    id: OpenAIModels.O3_PRO,
    name: "O3 Pro",
    provider: AIProviderName.OPENAI,
    description:
      "Most powerful reasoning model for complex scientific and coding tasks",
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
      inputCostPer1K: 0.03,
      outputCostPer1K: 0.12,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 100000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 7,
      analysis: 10,
      conversation: 6,
      reasoning: 10,
      translation: 6,
      summarization: 7,
    },
    aliases: ["o3-pro", "o3-professional"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-04-16",
    category: "reasoning",
  },

  [OpenAIModels.O4_MINI]: {
    id: OpenAIModels.O4_MINI,
    name: "O4 Mini",
    provider: AIProviderName.OPENAI,
    description:
      "Fast reasoning model optimized for math, coding, and visual tasks",
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
      inputCostPer1K: 0.003,
      outputCostPer1K: 0.012,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 100000,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 9,
      creative: 6,
      analysis: 9,
      conversation: 7,
      reasoning: 10,
      translation: 6,
      summarization: 7,
    },
    aliases: ["o4-mini", "o4-fast"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-04-16",
    category: "reasoning",
  },

  [OpenAIModels.O1]: {
    id: OpenAIModels.O1,
    name: "O1",
    provider: AIProviderName.OPENAI,
    description:
      "Premium reasoning model with highest capability for mission-critical tasks",
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
      inputCostPer1K: 0.15,
      outputCostPer1K: 0.6,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 128000,
      maxOutputTokens: 32768,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 7,
      analysis: 10,
      conversation: 6,
      reasoning: 10,
      translation: 6,
      summarization: 7,
    },
    aliases: ["o1-full", "o1-premium"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2024-09-12",
    category: "reasoning",
  },

  [OpenAIModels.O1_PREVIEW]: {
    id: OpenAIModels.O1_PREVIEW,
    name: "O1 Preview",
    provider: AIProviderName.OPENAI,
    description: "Preview version of O1 reasoning model",
    capabilities: {
      vision: false,
      functionCalling: false,
      codeGeneration: true,
      reasoning: true,
      multimodal: false,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.015,
      outputCostPer1K: 0.06,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 128000,
      maxOutputTokens: 32768,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 9,
      creative: 6,
      analysis: 9,
      conversation: 6,
      reasoning: 9,
      translation: 5,
      summarization: 6,
    },
    aliases: ["o1-preview"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2024-09-12",
    category: "reasoning",
  },

  [OpenAIModels.O1_MINI]: {
    id: OpenAIModels.O1_MINI,
    name: "O1 Mini",
    provider: AIProviderName.OPENAI,
    description: "Cost-effective O1 variant with strong reasoning capabilities",
    capabilities: {
      vision: false,
      functionCalling: false,
      codeGeneration: true,
      reasoning: true,
      multimodal: false,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.003,
      outputCostPer1K: 0.012,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 128000,
      maxOutputTokens: 65536,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 8,
      creative: 5,
      analysis: 8,
      conversation: 6,
      reasoning: 8,
      translation: 5,
      summarization: 6,
    },
    aliases: ["o1-mini", "o1-budget"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2024-09-12",
    category: "reasoning",
  },

  // OpenAI Legacy Models
  [OpenAIModels.GPT_4]: {
    id: OpenAIModels.GPT_4,
    name: "GPT-4",
    provider: AIProviderName.OPENAI,
    description: "Previous generation flagship model (legacy)",
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
      inputCostPer1K: 0.03,
      outputCostPer1K: 0.06,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 8192,
      maxOutputTokens: 4096,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 8,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 8,
    },
    aliases: ["gpt4", "gpt-4-base"],
    deprecated: true,
    isLocal: false,
    releaseDate: "2023-03-14",
    category: "general",
  },

  [OpenAIModels.GPT_4_TURBO]: {
    id: OpenAIModels.GPT_4_TURBO,
    name: "GPT-4 Turbo",
    provider: AIProviderName.OPENAI,
    description: "Faster GPT-4 variant with extended context (legacy)",
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
      inputCostPer1K: 0.01,
      outputCostPer1K: 0.03,
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
      coding: 8,
      creative: 8,
      analysis: 9,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 8,
    },
    aliases: ["gpt4-turbo", "gpt-4-turbo-preview"],
    deprecated: true,
    isLocal: false,
    releaseDate: "2024-04-09",
    category: "general",
  },

  [OpenAIModels.GPT_3_5_TURBO]: {
    id: OpenAIModels.GPT_3_5_TURBO,
    name: "GPT-3.5 Turbo",
    provider: AIProviderName.OPENAI,
    description: "Fast and cost-effective model for simpler tasks (legacy)",
    capabilities: {
      vision: false,
      functionCalling: true,
      codeGeneration: true,
      reasoning: false,
      multimodal: false,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputCostPer1K: 0.0005,
      outputCostPer1K: 0.0015,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "medium",
      accuracy: "medium",
    },
    limits: {
      maxContextTokens: 16385,
      maxOutputTokens: 4096,
      maxRequestsPerMinute: 3500,
    },
    useCases: {
      coding: 6,
      creative: 6,
      analysis: 6,
      conversation: 7,
      reasoning: 5,
      translation: 7,
      summarization: 7,
    },
    aliases: ["gpt35", "gpt-3.5", "chatgpt"],
    deprecated: true,
    isLocal: false,
    releaseDate: "2023-03-01",
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
  [AnthropicModels.CLAUDE_OPUS_4_5]: {
    id: AnthropicModels.CLAUDE_OPUS_4_5,
    name: "Claude Opus 4.5",
    provider: AIProviderName.ANTHROPIC,
    description:
      "Anthropic's most capable model with exceptional reasoning, coding, and multimodal capabilities",
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
      // $5 / $25 per MTok. Was 0.015/0.075 — Claude 3 Opus's rate, left
      // behind when the entry was updated to 4.5, so every cost estimate
      // for this model came out 3x high.
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
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: [
      "claude-4.5-opus",
      // "claude-opus-latest" now belongs to CLAUDE_OPUS_5. An alias declared
      // on two entries silently resolves to whichever appears later in this
      // object, so a "latest" pointer must live on exactly one model.
      "opus-4.5",
      "anthropic-flagship",
    ],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-11-24",
    category: "reasoning",
  },

  // Claude 5 and 4.7/4.8. Limits and pricing from Anthropic's models
  // overview comparison tables. All current Claude models take image input;
  // these use adaptive thinking rather than the older `thinking.type`
  // extended-thinking switch, which the overview marks "No" for each.
  [AnthropicModels.CLAUDE_OPUS_5]: {
    id: AnthropicModels.CLAUDE_OPUS_5,
    name: "Claude Opus 5",
    provider: AIProviderName.ANTHROPIC,
    description: "For complex agentic coding and enterprise work",
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
    performance: { speed: "medium", quality: "high", accuracy: "high" },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["opus-5", "claude-opus-latest"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2026-07-24",
    category: "reasoning",
  },

  [AnthropicModels.CLAUDE_SONNET_5]: {
    id: AnthropicModels.CLAUDE_SONNET_5,
    name: "Claude Sonnet 5",
    provider: AIProviderName.ANTHROPIC,
    description: "The best combination of speed and intelligence",
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
      inputCostPer1K: 0.002,
      outputCostPer1K: 0.01,
      currency: "USD",
    },
    performance: { speed: "fast", quality: "high", accuracy: "high" },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 9,
      creative: 9,
      analysis: 9,
      conversation: 9,
      reasoning: 9,
      translation: 9,
      summarization: 9,
    },
    aliases: ["sonnet-5", "claude-sonnet-latest"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2026-06-30",
    category: "general",
  },

  [AnthropicModels.CLAUDE_FABLE_5]: {
    id: AnthropicModels.CLAUDE_FABLE_5,
    name: "Claude Fable 5",
    provider: AIProviderName.ANTHROPIC,
    description: "Next-generation intelligence for long-running agents",
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
      inputCostPer1K: 0.01,
      outputCostPer1K: 0.05,
      currency: "USD",
    },
    performance: { speed: "slow", quality: "high", accuracy: "high" },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["fable-5"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2026-06-09",
    category: "reasoning",
  },

  [AnthropicModels.CLAUDE_OPUS_4_8]: {
    id: AnthropicModels.CLAUDE_OPUS_4_8,
    name: "Claude Opus 4.8",
    provider: AIProviderName.ANTHROPIC,
    description: "Anthropic Opus 4.8, superseded by Claude Opus 5",
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
    performance: { speed: "medium", quality: "high", accuracy: "high" },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 9,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["opus-4.8"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2026-05-28",
    category: "reasoning",
  },

  [AnthropicModels.CLAUDE_OPUS_4_7]: {
    id: AnthropicModels.CLAUDE_OPUS_4_7,
    name: "Claude Opus 4.7",
    provider: AIProviderName.ANTHROPIC,
    description: "Anthropic Opus 4.7, superseded by Claude Opus 4.8",
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
    performance: { speed: "medium", quality: "high", accuracy: "high" },
    limits: {
      maxContextTokens: 1000000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 9,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["opus-4.7"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2026-04-16",
    category: "reasoning",
  },

  [AnthropicModels.CLAUDE_SONNET_4_5]: {
    id: AnthropicModels.CLAUDE_SONNET_4_5,
    name: "Claude Sonnet 4.5",
    provider: AIProviderName.ANTHROPIC,
    description:
      "Balanced Claude model with excellent performance across all tasks including vision and reasoning",
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
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 100,
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
    // "claude-sonnet-latest" now belongs to CLAUDE_SONNET_5 — see the note
    // on CLAUDE_OPUS_4_5's aliases.
    aliases: ["claude-4.5-sonnet", "sonnet-4.5"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-09-29",
    category: "coding",
  },

  [AnthropicModels.CLAUDE_4_5_HAIKU]: {
    id: AnthropicModels.CLAUDE_4_5_HAIKU,
    name: "Claude 4.5 Haiku",
    provider: AIProviderName.ANTHROPIC,
    description: "Latest fast and efficient Claude model with vision support",
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
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 8,
      conversation: 9,
      reasoning: 8,
      translation: 8,
      summarization: 9,
    },
    aliases: ["claude-4.5-haiku", "claude-haiku-latest", "haiku-4.5"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-10-15",
    category: "general",
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
  [MistralModels.MISTRAL_LARGE_LATEST]: {
    id: MistralModels.MISTRAL_LARGE_LATEST,
    name: "Mistral Large",
    provider: AIProviderName.MISTRAL,
    description:
      "Mistral's flagship model with excellent reasoning and multilingual capabilities",
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
      inputCostPer1K: 0.002,
      outputCostPer1K: 0.006,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 9,
      creative: 8,
      analysis: 9,
      conversation: 8,
      reasoning: 9,
      translation: 9,
      summarization: 8,
    },
    aliases: ["mistral-large", "mistral-flagship"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-01",
    category: "reasoning",
  },

  [MistralModels.MISTRAL_SMALL_LATEST]: {
    id: MistralModels.MISTRAL_SMALL_LATEST,
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
    isLocal: false,
    releaseDate: "2024-02-26",
    category: "general",
  },

  [MistralModels.CODESTRAL_LATEST]: {
    id: MistralModels.CODESTRAL_LATEST,
    name: "Codestral",
    provider: AIProviderName.MISTRAL,
    description:
      "Specialized code generation model trained on 80+ programming languages",
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
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 32768,
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 10,
      creative: 5,
      analysis: 7,
      conversation: 5,
      reasoning: 8,
      translation: 5,
      summarization: 6,
    },
    aliases: ["codestral", "mistral-code"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2024-05-29",
    category: "coding",
  },

  [MistralModels.PIXTRAL_LARGE]: {
    id: MistralModels.PIXTRAL_LARGE,
    name: "Pixtral Large",
    provider: AIProviderName.MISTRAL,
    description: "Multimodal vision-language model for image understanding",
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
      inputCostPer1K: 0.002,
      outputCostPer1K: 0.006,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 9,
      conversation: 7,
      reasoning: 8,
      translation: 7,
      summarization: 8,
    },
    aliases: ["pixtral", "mistral-vision"],
    // Retired by Mistral on 2026-05-31. Kept so exact-id and alias lookups
    // still resolve for existing callers; `deprecated` removes it from
    // `models list` and the recommendation paths.
    deprecated: true,
    isLocal: false,
    releaseDate: "2024-09-01",
    category: "vision",
  },

  // Ollama Models (local)
  [OllamaModels.LLAMA4_LATEST]: {
    id: OllamaModels.LLAMA4_LATEST,
    name: "Llama 4",
    provider: AIProviderName.OLLAMA,
    description:
      "Latest Llama 4 with multimodal vision and tool capabilities, runs locally",
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
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
    },
    useCases: {
      coding: 9,
      creative: 8,
      analysis: 9,
      conversation: 8,
      reasoning: 9,
      translation: 8,
      summarization: 8,
    },
    aliases: ["llama4", "llama4-local"],
    deprecated: false,
    isLocal: true,
    releaseDate: "2025-04-01",
    category: "reasoning",
  },

  [OllamaModels.LLAMA3_3_LATEST]: {
    id: OllamaModels.LLAMA3_3_LATEST,
    name: "Llama 3.3",
    provider: AIProviderName.OLLAMA,
    description: "High-performance Llama 3.3 for local inference",
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
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 8,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 8,
    },
    aliases: ["llama3.3", "llama3.3-local"],
    deprecated: false,
    isLocal: true,
    releaseDate: "2024-12-01",
    category: "general",
  },

  [OllamaModels.LLAMA3_2_LATEST]: {
    id: OllamaModels.LLAMA3_2_LATEST,
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
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "medium",
      accuracy: "medium",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
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
    isLocal: true,
    releaseDate: "2024-09-25",
    category: "general",
  },

  [OllamaModels.DEEPSEEK_R1_70B]: {
    id: OllamaModels.DEEPSEEK_R1_70B,
    name: "DeepSeek-R1 70B",
    provider: AIProviderName.OLLAMA,
    description:
      "State-of-the-art reasoning model rivaling OpenAI O1, runs locally",
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
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 65536,
      maxOutputTokens: 8192,
    },
    useCases: {
      coding: 10,
      creative: 7,
      analysis: 10,
      conversation: 6,
      reasoning: 10,
      translation: 7,
      summarization: 7,
    },
    aliases: ["deepseek-r1", "deepseek-reasoning", "local-reasoning"],
    deprecated: false,
    isLocal: true,
    releaseDate: "2025-01-20",
    category: "reasoning",
  },

  [OllamaModels.QWEN3_72B]: {
    id: OllamaModels.QWEN3_72B,
    name: "Qwen 3 72B",
    provider: AIProviderName.OLLAMA,
    description: "Advanced reasoning and multilingual model from Alibaba",
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
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
    },
    useCases: {
      coding: 9,
      creative: 8,
      analysis: 9,
      conversation: 8,
      reasoning: 9,
      translation: 9,
      summarization: 8,
    },
    aliases: ["qwen3", "qwen3-72b-local"],
    deprecated: false,
    isLocal: true,
    releaseDate: "2025-04-01",
    category: "reasoning",
  },

  [OllamaModels.MISTRAL_LARGE_LATEST]: {
    id: OllamaModels.MISTRAL_LARGE_LATEST,
    name: "Mistral Large (Local)",
    provider: AIProviderName.OLLAMA,
    description: "Mistral Large model for local inference",
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
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 8,
      conversation: 8,
      reasoning: 8,
      translation: 9,
      summarization: 8,
    },
    aliases: ["mistral-large-local"],
    deprecated: false,
    isLocal: true,
    releaseDate: "2024-02-26",
    category: "general",
  },

  // Bedrock Models
  [BedrockModels.NOVA_PREMIER]: {
    id: BedrockModels.NOVA_PREMIER,
    name: "Amazon Nova Premier",
    provider: AIProviderName.BEDROCK,
    description:
      "Amazon's most capable foundation model with advanced multimodal capabilities",
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
      inputCostPer1K: 0.0025,
      outputCostPer1K: 0.0125,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 300000,
      maxOutputTokens: 5000,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 9,
      creative: 9,
      analysis: 10,
      conversation: 8,
      reasoning: 9,
      translation: 8,
      summarization: 9,
    },
    aliases: ["nova-premier", "aws-flagship"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-01-01",
    category: "reasoning",
  },

  [BedrockModels.NOVA_PRO]: {
    id: BedrockModels.NOVA_PRO,
    name: "Amazon Nova Pro",
    provider: AIProviderName.BEDROCK,
    description: "Highly capable multimodal model balancing accuracy and speed",
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
      inputCostPer1K: 0.0008,
      outputCostPer1K: 0.0032,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 300000,
      maxOutputTokens: 5000,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 9,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 9,
    },
    aliases: ["nova-pro", "aws-balanced"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2024-12-03",
    category: "general",
  },

  [BedrockModels.NOVA_LITE]: {
    id: BedrockModels.NOVA_LITE,
    name: "Amazon Nova Lite",
    provider: AIProviderName.BEDROCK,
    description:
      "Fast and cost-effective multimodal model optimized for everyday tasks",
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
      inputCostPer1K: 0.00006,
      outputCostPer1K: 0.00024,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 300000,
      maxOutputTokens: 5000,
      maxRequestsPerMinute: 500,
    },
    useCases: {
      coding: 7,
      creative: 7,
      analysis: 8,
      conversation: 8,
      reasoning: 7,
      translation: 8,
      summarization: 9,
    },
    aliases: ["nova-lite", "aws-lite", "aws-cheap"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2024-12-03",
    category: "general",
  },

  [BedrockModels.CLAUDE_4_5_OPUS]: {
    id: BedrockModels.CLAUDE_4_5_OPUS,
    name: "Claude 4.5 Opus (Bedrock)",
    provider: AIProviderName.BEDROCK,
    description:
      "Anthropic's most capable model available on Bedrock for enterprise workloads",
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
      inputCostPer1K: 0.015,
      outputCostPer1K: 0.075,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["bedrock-claude-4.5-opus", "bedrock-claude-flagship"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-11-24",
    category: "reasoning",
  },

  [BedrockModels.LLAMA_4_MAVERICK_17B]: {
    id: BedrockModels.LLAMA_4_MAVERICK_17B,
    name: "Llama 4 Maverick (Bedrock)",
    provider: AIProviderName.BEDROCK,
    description: "Meta's latest Llama 4 model with vision on Bedrock",
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
      inputCostPer1K: 0.00019,
      outputCostPer1K: 0.00055,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 131072,
      maxOutputTokens: 8192,
      maxRequestsPerMinute: 200,
    },
    useCases: {
      coding: 8,
      creative: 8,
      analysis: 8,
      conversation: 8,
      reasoning: 8,
      translation: 8,
      summarization: 8,
    },
    aliases: ["bedrock-llama4", "bedrock-llama-maverick"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-04-01",
    category: "general",
  },

  // Azure OpenAI GPT-5.1 Series (Latest - December 2025)
  [AzureOpenAIModels.GPT_5_1]: {
    id: AzureOpenAIModels.GPT_5_1,
    name: "GPT-5.1 (Azure)",
    provider: AIProviderName.AZURE,
    description:
      "Azure's latest GPT-5.1 flagship model with enhanced reasoning and multimodal capabilities",
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
      inputCostPer1K: 0.015,
      outputCostPer1K: 0.045,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 300000,
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 10,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["azure-gpt-5.1", "gpt51-azure", "azure-flagship"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-01",
    category: "reasoning",
  },

  [AzureOpenAIModels.GPT_5_1_CHAT]: {
    id: AzureOpenAIModels.GPT_5_1_CHAT,
    name: "GPT-5.1 Chat (Azure)",
    provider: AIProviderName.AZURE,
    description: "Azure GPT-5.1 optimized for conversational interactions",
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
      inputCostPer1K: 0.012,
      outputCostPer1K: 0.036,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 300000,
      maxOutputTokens: 32000,
      maxRequestsPerMinute: 150,
    },
    useCases: {
      coding: 8,
      creative: 9,
      analysis: 9,
      conversation: 10,
      reasoning: 9,
      translation: 9,
      summarization: 9,
    },
    aliases: ["azure-gpt-5.1-chat", "gpt51-chat-azure"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-01",
    category: "general",
  },

  [AzureOpenAIModels.GPT_5_1_CODEX]: {
    id: AzureOpenAIModels.GPT_5_1_CODEX,
    name: "GPT-5.1 Codex (Azure)",
    provider: AIProviderName.AZURE,
    description:
      "Azure GPT-5.1 specialized for code generation and software development",
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
      inputCostPer1K: 0.012,
      outputCostPer1K: 0.036,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 300000,
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 10,
      creative: 7,
      analysis: 9,
      conversation: 7,
      reasoning: 10,
      translation: 7,
      summarization: 8,
    },
    aliases: ["azure-gpt-5.1-codex", "gpt51-codex-azure", "azure-code"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-01",
    category: "coding",
  },

  [AzureOpenAIModels.GPT_5_1_CODEX_MINI]: {
    id: AzureOpenAIModels.GPT_5_1_CODEX_MINI,
    name: "GPT-5.1 Codex Mini (Azure)",
    provider: AIProviderName.AZURE,
    description:
      "Fast and efficient Azure code model for quick development tasks",
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
      inputCostPer1K: 0.003,
      outputCostPer1K: 0.009,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 32000,
      maxRequestsPerMinute: 300,
    },
    useCases: {
      coding: 9,
      creative: 6,
      analysis: 8,
      conversation: 7,
      reasoning: 8,
      translation: 6,
      summarization: 7,
    },
    aliases: ["azure-gpt-5.1-codex-mini", "gpt51-codex-mini-azure"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-01",
    category: "coding",
  },

  [AzureOpenAIModels.GPT_5_1_CODEX_MAX]: {
    id: AzureOpenAIModels.GPT_5_1_CODEX_MAX,
    name: "GPT-5.1 Codex Max (Azure)",
    provider: AIProviderName.AZURE,
    description:
      "Azure's most powerful code model for complex enterprise development",
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
      inputCostPer1K: 0.025,
      outputCostPer1K: 0.075,
      currency: "USD",
    },
    performance: {
      speed: "slow",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 500000,
      maxOutputTokens: 128000,
      maxRequestsPerMinute: 50,
    },
    useCases: {
      coding: 10,
      creative: 8,
      analysis: 10,
      conversation: 7,
      reasoning: 10,
      translation: 7,
      summarization: 8,
    },
    aliases: [
      "azure-gpt-5.1-codex-max",
      "gpt51-codex-max-azure",
      "azure-enterprise",
    ],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-12-01",
    category: "coding",
  },

  // Azure OpenAI GPT-5.0 Series (Azure-unique variants only)
  [AzureOpenAIModels.GPT_5_PRO]: {
    id: AzureOpenAIModels.GPT_5_PRO,
    name: "GPT-5 Pro (Azure)",
    provider: AIProviderName.AZURE,
    description: "Azure GPT-5 Pro with enhanced enterprise features",
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
      inputCostPer1K: 0.02,
      outputCostPer1K: 0.06,
      currency: "USD",
    },
    performance: {
      speed: "medium",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 256000,
      maxOutputTokens: 64000,
      maxRequestsPerMinute: 100,
    },
    useCases: {
      coding: 10,
      creative: 10,
      analysis: 10,
      conversation: 9,
      reasoning: 10,
      translation: 9,
      summarization: 9,
    },
    aliases: ["azure-gpt-5-pro", "gpt5-pro-azure"],
    deprecated: false,
    isLocal: false,
    releaseDate: "2025-08-07",
    category: "reasoning",
  },

  [AzureOpenAIModels.GPT_5_TURBO]: {
    id: AzureOpenAIModels.GPT_5_TURBO,
    name: "GPT-5 Turbo (Azure)",
    provider: AIProviderName.AZURE,
    description: "Azure GPT-5 Turbo optimized for fast responses",
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
      inputCostPer1K: 0.008,
      outputCostPer1K: 0.024,
      currency: "USD",
    },
    performance: {
      speed: "fast",
      quality: "high",
      accuracy: "high",
    },
    limits: {
      maxContextTokens: 200000,
      maxOutputTokens: 32768,
      maxRequestsPerMinute: 300,
    },
    useCases: {
      coding: 9,
      creative: 9,
      analysis: 9,
      conversation: 9,
      reasoning: 9,
      translation: 9,
      summarization: 9,
    },
    aliases: ["azure-gpt-5-turbo", "gpt5-turbo-azure"],
    // Azure OpenAI has never published a "gpt-5-turbo"; the id cannot be
    // deployed. Flagged so it stops being offered as a live choice.
    deprecated: true,
    isLocal: false,
    releaseDate: "2025-08-07",
    category: "general",
  },
  // Note: Azure models like O3, O4-mini, GPT-4o share IDs with OpenAI and use the OpenAI registry entries
};

function deriveSpeed(id: string): ModelPerformance["speed"] {
  if (/mini|nano|haiku|flash|lite/i.test(id)) {
    return "fast";
  }
  if (/opus|^o1|^o3|-pro$/i.test(id)) {
    return "slow";
  }
  return "medium";
}

function deriveQuality(
  entry: ProviderModelManifestEntry,
): ModelPerformance["quality"] {
  return entry.reasoning ? "high" : "medium";
}

/**
 * Builds the manifest-derived slice of MODEL_REGISTRY: every manifest model
 * that carries pricingPerMTok (ModelInfo.pricing is a required field, and
 * the manifest's pricingPerMTok is deliberately optional for un-priced
 * models like claude-sonnet-5 — see ProviderModelManifestEntry's docblock),
 * excluding each provider's synthetic "_default" entry.
 *
 * performance/useCases/category use entry.curated verbatim when present —
 * the ids that already had a hand-tuned LEGACY_MODEL_REGISTRY row before
 * this migration (5 Anthropic, 20 OpenAI) carry that exact triple forward
 * unchanged. Every other entry has no curated block and falls back to
 * mechanical derivation from the tracked capability flags.
 */
function buildManifestDerivedEntries(): Record<string, ModelInfo> {
  const entries: Record<string, ModelInfo> = {};
  for (const provider of getAllManifestProviders()) {
    const manifest = getManifestForProvider(provider);
    if (!manifest) {
      continue;
    }
    for (const [id, entry] of Object.entries(manifest.models)) {
      if (id === "_default" || !entry.pricingPerMTok) {
        continue;
      }
      // Keep-first on cross-manifest id collisions (Azure/OpenAI share ids):
      // getAllManifestProviders() order is deterministic, and silently
      // overwriting an earlier provider's row would make "which provider owns
      // this id" depend on iteration order.
      if (entries[id]) {
        logger.debug(
          `[modelRegistry] Manifest id collision: "${id}" already derived from ${entries[id].provider}; keeping first, skipping ${provider}`,
        );
        continue;
      }
      const reasoningScore = entry.reasoning ? 9 : 6;
      const legacyRow = LEGACY_MODEL_REGISTRY[id];
      entries[id] = {
        id,
        name: entry.displayName ?? id,
        provider: provider as AIProviderName,
        description: entry.displayName ?? id,
        capabilities: {
          vision: entry.vision,
          functionCalling: entry.functionCalling,
          codeGeneration: true,
          reasoning: entry.reasoning ?? false,
          multimodal: entry.vision || entry.nativeAudio === true,
          streaming: true,
          jsonMode: entry.jsonMode ?? false,
          samplingParams: entry.samplingParams,
        },
        pricing: {
          inputCostPer1K: entry.pricingPerMTok.input / 1000,
          outputCostPer1K: entry.pricingPerMTok.output / 1000,
          currency: "USD",
        },
        performance: entry.curated?.performance ?? {
          speed: deriveSpeed(id),
          quality: deriveQuality(entry),
          accuracy: deriveQuality(entry),
        },
        limits: {
          maxContextTokens: entry.contextWindow,
          maxOutputTokens: entry.maxOutputTokens,
          // Rate limits are operational knowledge the manifests don't track;
          // carry the hand-authored value forward rather than dropping it.
          ...(legacyRow?.limits?.maxRequestsPerMinute !== undefined
            ? { maxRequestsPerMinute: legacyRow.limits.maxRequestsPerMinute }
            : {}),
        },
        useCases: entry.curated?.useCases ?? {
          coding: entry.functionCalling ? 8 : 5,
          creative: entry.vision ? 7 : 6,
          analysis: reasoningScore,
          conversation: 7,
          reasoning: reasoningScore,
          translation: 6,
          summarization: 7,
        },
        aliases: entry.aliases,
        // Deprecation and release dates are editorial facts the manifests do
        // not track — a manifest-priced model must not silently un-deprecate
        // a row the hand-authored registry explicitly flagged.
        deprecated: legacyRow?.deprecated ?? false,
        ...(legacyRow?.releaseDate !== undefined
          ? { releaseDate: legacyRow.releaseDate }
          : {}),
        isLocal:
          provider === "ollama" ||
          provider === "lm-studio" ||
          provider === "llamacpp",
        category:
          entry.curated?.category ??
          (entry.reasoning ? "reasoning" : "general"),
      };
    }
  }
  return entries;
}

/**
 * Public MODEL_REGISTRY: the manifest-derived entries merged over the
 * hand-authored LEGACY_MODEL_REGISTRY base. Spread order matters — manifest
 * entries are spread last, so a manifest-priced model wins outright
 * (whole-entry replacement, not a per-field merge) over a legacy row with
 * the same id. Any legacy id the manifest doesn't also price (no
 * pricingPerMTok, or no manifest entry at all — e.g. AnthropicModels.
 * CLAUDE_OPUS_5/CLAUDE_FABLE_5, which have no manifest counterpart yet)
 * passes through unchanged, which is what keeps resolveSamplingParams/
 * modelSupportsSamplingParams behaviour identical for those "non-manifest"
 * models: their capabilities.samplingParams (or absence of it) is untouched.
 */
export const MODEL_REGISTRY: Record<string, ModelInfo> = {
  ...LEGACY_MODEL_REGISTRY,
  ...buildManifestDerivedEntries(),
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

MODEL_ALIASES.local = OllamaModels.LLAMA3_2_LATEST;

/**
 * Use case to model mappings
 */
export const USE_CASE_RECOMMENDATIONS: Record<string, string[]> = {
  coding: [
    OpenAIModels.GPT_5_2_PRO,
    AnthropicModels.CLAUDE_OPUS_4_5,
    OpenAIModels.GPT_5_2,
    MistralModels.CODESTRAL_LATEST,
    AnthropicModels.CLAUDE_SONNET_4_5,
  ],
  creative: [
    OpenAIModels.GPT_5_2,
    AnthropicModels.CLAUDE_OPUS_4_5,
    OpenAIModels.GPT_5,
    GoogleAIModels.GEMINI_2_5_PRO,
  ],
  analysis: [
    OpenAIModels.GPT_5_2_PRO,
    GoogleAIModels.GEMINI_2_5_PRO,
    AnthropicModels.CLAUDE_OPUS_4_5,
    OpenAIModels.O3,
    BedrockModels.NOVA_PREMIER,
  ],
  conversation: [
    OpenAIModels.GPT_5_2_CHAT_LATEST,
    OpenAIModels.GPT_5,
    AnthropicModels.CLAUDE_SONNET_4_5,
    OpenAIModels.GPT_4O,
  ],
  reasoning: [
    OpenAIModels.GPT_5_2_PRO,
    OpenAIModels.GPT_5_2,
    OpenAIModels.O3,
    AnthropicModels.CLAUDE_OPUS_4_5,
    GoogleAIModels.GEMINI_2_5_PRO,
    OllamaModels.DEEPSEEK_R1_70B,
  ],
  translation: [
    GoogleAIModels.GEMINI_2_5_PRO,
    MistralModels.MISTRAL_LARGE_LATEST,
    OpenAIModels.GPT_5,
  ],
  summarization: [
    GoogleAIModels.GEMINI_2_5_FLASH,
    OpenAIModels.GPT_5_MINI,
    AnthropicModels.CLAUDE_4_5_HAIKU,
  ],
  "cost-effective": [
    GoogleAIModels.GEMINI_2_5_FLASH,
    OpenAIModels.GPT_4O_MINI,
    MistralModels.MISTRAL_SMALL_LATEST,
    BedrockModels.NOVA_LITE,
  ],
  "high-quality": [
    OpenAIModels.GPT_5_2_PRO,
    OpenAIModels.GPT_5_2,
    AnthropicModels.CLAUDE_OPUS_4_5,
    GoogleAIModels.GEMINI_2_5_PRO,
  ],
  fast: [
    OpenAIModels.GPT_5_2_CHAT_LATEST,
    OpenAIModels.GPT_5_MINI,
    GoogleAIModels.GEMINI_2_5_FLASH,
    AnthropicModels.CLAUDE_4_5_HAIKU,
    OpenAIModels.O3_MINI,
  ],
  local: [
    OllamaModels.LLAMA4_LATEST,
    OllamaModels.DEEPSEEK_R1_70B,
    OllamaModels.QWEN3_72B,
    OllamaModels.LLAMA3_3_LATEST,
  ],
  multimodal: [
    OpenAIModels.GPT_5_2,
    OpenAIModels.GPT_5_2_PRO,
    AnthropicModels.CLAUDE_OPUS_4_5,
    GoogleAIModels.GEMINI_2_5_PRO,
    // Mistral's Pixtral Large sat here until it was retired on 2026-05-31.
    // Left without a substitute rather than guessing at a replacement's
    // vision support.
    BedrockModels.NOVA_PREMIER,
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
 * Check whether a model supports a registered capability.
 *
 * Aliases resolve to their canonical model ID before the provider is
 * cross-checked. Unknown provider/model pairs default to supported so new or
 * custom models retain the existing behavior until capability data is added.
 */
export function modelSupports(
  capability: keyof ModelCapabilities,
  provider: string,
  model: string,
): boolean {
  const normalizedModel = model.toLowerCase();
  const modelId = MODEL_ALIASES[normalizedModel] ?? normalizedModel;
  const modelInfo = MODEL_REGISTRY[modelId];

  if (!modelInfo || modelInfo.provider !== provider.toLowerCase()) {
    return true;
  }

  // Optional capabilities (e.g. samplingParams) default to supported.
  return modelInfo.capabilities[capability] ?? true;
}

/**
 * Model families known to reject classic sampling parameters
 * (`temperature` / `topP`) in favour of reasoning-effort controls:
 * Claude Sonnet 5, Opus 4.7+ (including Opus 5), and the Fable/Mythos 5
 * tier — notably as served through Vertex. Kept as patterns because gateway
 * model ids carry arbitrary prefixes/suffixes
 * (`vertex_ai/claude-sonnet-5@20260203`) that exact registry ids can't cover.
 */
const SAMPLING_PARAM_REJECTING_FAMILIES: RegExp[] = [
  /sonnet[-_.]?5(?![0-9])/i,
  /opus[-_.]?4[-_.]?(?:[7-9]|\d{2,})(?![0-9])/i,
  /opus[-_.]?5(?![0-9])/i,
  /fable/i,
  /mythos/i,
];

/**
 * Whether a model accepts classic sampling parameters
 * (`temperature` / `topP`).
 *
 * Resolution order: an explicit `capabilities.samplingParams` on a matching
 * registry entry wins; otherwise the known rejecting-family patterns decide.
 * Unknown models default to supported (same fail-open contract as
 * `modelSupports`). Providers strip the parameters — including on
 * retry/fallback request rebuilds — when this returns false.
 */
export function modelSupportsSamplingParams(
  provider: string,
  model: string | undefined,
): boolean {
  const normalizedModel = (model ?? "").toLowerCase();
  if (!normalizedModel) {
    return true;
  }
  const modelId = MODEL_ALIASES[normalizedModel] ?? normalizedModel;
  const modelInfo = MODEL_REGISTRY[modelId];
  if (
    modelInfo &&
    modelInfo.provider === provider.toLowerCase() &&
    modelInfo.capabilities.samplingParams !== undefined
  ) {
    return modelInfo.capabilities.samplingParams;
  }
  return !SAMPLING_PARAM_REJECTING_FAMILIES.some(
    (family) => family.test(modelId) || family.test(normalizedModel),
  );
}

/**
 * Sampling params to actually send for a model: passthrough when supported,
 * `{}` (with a debug log) when the model rejects them. Apply at every
 * request-build site, including retry/fallback rebuilds.
 */
export function resolveSamplingParams(
  provider: string,
  model: string | undefined,
  params: { temperature?: number; topP?: number },
  site: string,
): { temperature?: number; topP?: number } {
  if (modelSupportsSamplingParams(provider, model)) {
    return params;
  }
  if (params.temperature !== undefined || params.topP !== undefined) {
    logger.debug(
      `[ModelRegistry] Stripping sampling params for ${provider}/${model} at ${site} — model rejects temperature/topP`,
      {
        provider,
        model,
        site,
        hadTemperature: params.temperature !== undefined,
        hadTopP: params.topP !== undefined,
      },
    );
  }
  return {};
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
 * Get available providers.
 *
 * Deliberately does NOT derive from MODEL_REGISTRY membership: a registry
 * keyed only by "real, priced, named models" under-reports providers whose
 * manifest carries only a `_default` entry (the minimal-tier providers —
 * e.g. voyage, jina, stability — have no priced named model and so
 * contribute zero MODEL_REGISTRY rows). Reading getAllManifestProviders()
 * directly gives every provider NeuroLink actually knows a manifest for,
 * decoupled from MODEL_REGISTRY membership entirely. Manifest keys are
 * literally the AIProviderName enum's kebab-case values by construction
 * (see manifestRegistry.ts), so the cast is a same-value relabel, not a
 * narrowing assumption.
 */
export function getAvailableProviders(): AIProviderName[] {
  return getAllManifestProviders() as AIProviderName[];
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

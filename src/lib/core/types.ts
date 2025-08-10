import type { ZodType, ZodTypeDef } from "zod";
import type { Schema, Tool } from "ai";
import type { GenerateResult } from "../types/generateTypes.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { JsonValue } from "../types/common.js";

export interface TextGenerationResult {
  content: string;
  provider?: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  responseTime?: number;
  toolsUsed?: string[];
  toolExecutions?: Array<{
    toolName: string;
    executionTime: number;
    success: boolean;
    serverId?: string;
  }>;
  enhancedWithTools?: boolean;
  availableTools?: Array<{
    name: string;
    description: string;
    server: string;
    category?: string;
  }>;
  // Analytics and evaluation data
  analytics?: AnalyticsData;
  evaluation?: {
    relevance: number;
    accuracy: number;
    completeness: number;
    overall: number;
    reasoning?: string;
  };
}

/**
 * Supported AI Provider Names
 */
export enum AIProviderName {
  BEDROCK = "bedrock",
  OPENAI = "openai",
  OPENAI_COMPATIBLE = "openai-compatible",
  VERTEX = "vertex",
  ANTHROPIC = "anthropic",
  AZURE = "azure",
  GOOGLE_AI = "google-ai",
  HUGGINGFACE = "huggingface",
  OLLAMA = "ollama",
  MISTRAL = "mistral",
  LITELLM = "litellm",
  AUTO = "auto",
}

/**
 * Supported Models for Amazon Bedrock
 */
export enum BedrockModels {
  CLAUDE_3_SONNET = "anthropic.claude-3-sonnet-20240229-v1:0",
  CLAUDE_3_HAIKU = "anthropic.claude-3-haiku-20240307-v1:0",
  CLAUDE_3_5_SONNET = "anthropic.claude-3-5-sonnet-20240620-v1:0",
  CLAUDE_3_7_SONNET = "arn:aws:bedrock:us-east-2:225681119357:inference-profile/us.anthropic.claude-3-7-sonnet-20250219-v1:0",
}

/**
 * Supported Models for OpenAI
 */
export enum OpenAIModels {
  GPT_4 = "gpt-4",
  GPT_4_TURBO = "gpt-4-turbo",
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_3_5_TURBO = "gpt-3.5-turbo",
}

/**
 * Supported Models for Google Vertex AI
 */
export enum VertexModels {
  CLAUDE_4_0_SONNET = "claude-sonnet-4@20250514",
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",
}

/**
 * Supported Models for Google AI Studio
 */
export enum GoogleAIModels {
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_1_5_FLASH_LITE = "gemini-2.5-flash-lite",
}

/**
 * Union type of all supported model names
 */
export type SupportedModelName =
  | BedrockModels
  | OpenAIModels
  | VertexModels
  | GoogleAIModels;

/**
 * Provider configuration specifying provider and its available models
 */
export interface ProviderConfig {
  provider: AIProviderName;
  models: SupportedModelName[];
}

/**
 * Options for AI requests with unified provider configuration
 */
export interface StreamingOptions {
  providers: ProviderConfig[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/**
 * Text generation options interface
 */
export interface TextGenerationOptions {
  prompt?: string;
  input?: { text: string }; // Alternative to prompt for SDK compatibility
  provider?: AIProviderName;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>;
  tools?: Record<string, Tool>; // Enable MCP tools integration
  timeout?: number | string; // Optional timeout (e.g., 30000, '30s', '2m', '1h')
  disableTools?: boolean; // Disable tools (tools are enabled by default)
  maxSteps?: number; // Maximum tool execution steps (default: 5)
  // NEW: Analytics and Evaluation Support
  enableEvaluation?: boolean; // Default: false - AI quality scoring
  enableAnalytics?: boolean; // Default: false - Usage tracking
  context?: Record<string, JsonValue>; // Default: undefined - Custom context

  // NEW: Domain-Aware Evaluation
  evaluationDomain?: string; // Domain expertise (e.g., "general AI assistant", "D2C analytics expert")
  toolUsageContext?: string; // Tools/MCPs used in this interaction
  conversationHistory?: Array<{ role: string; content: string }>; // Previous conversation context
}

/**
 * Analytics data for usage tracking
 */
export interface AnalyticsData {
  provider: string;
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number; // Optional cost calculation
  responseTime: number; // Milliseconds
  timestamp: string; // ISO timestamp
  context?: Record<string, JsonValue>; // User context
}

/**
 * Response quality evaluation scores
 * Comprehensive evaluation interface for response quality assessment
 */
export interface EvaluationData {
  // Core scores (1-10 scale) - Compatible with GenerateResult format
  relevance: number; // How well response addresses query intent and domain alignment
  accuracy: number; // Factual correctness and terminological accuracy
  completeness: number; // How completely the response addresses the query
  overall: number; // Overall quality (derived from above scores)
  domainAlignment?: number;
  terminologyAccuracy?: number;
  toolEffectiveness?: number;

  // Advanced insights
  isOffTopic: boolean; // True if response significantly deviates from query/domain
  alertSeverity: "low" | "medium" | "high" | "none"; // Quality alert level
  reasoning: string; // Brief justification for scores (max 150 words)
  suggestedImprovements?: string; // How to improve the response (max 100 words)

  // Metadata
  evaluationModel: string; // Model used for evaluation
  evaluationTime: number; // Time taken for evaluation (ms)
  evaluationDomain?: string; // Domain for evaluation (e.g., "healthcare", "analytics")

  // Enhanced metadata (Universal Evaluation System)
  evaluationProvider?: string; // Provider used for evaluation
  evaluationAttempt?: number; // Attempt number (for retry logic)
  evaluationConfig?: {
    // Evaluation configuration details
    mode: string;
    fallbackUsed: boolean;
    costEstimate: number;
  };

  // NEW: Domain configuration support
  domainConfig?: {
    domainName: string;
    domainDescription: string;
    keyTerms: string[];
    failurePatterns: string[];
    successPatterns: string[];
    evaluationCriteria?: Record<string, unknown>;
  };

  // NEW: Domain-specific evaluation metadata
  domainEvaluation?: {
    domainRelevance: number;
    terminologyAccuracy: number;
    domainExpertise: number;
    domainSpecificInsights: string[];
  };
}

/**
 * BACKWARD COMPATIBILITY: Legacy evaluation interface
 * Maintains existing field names for backward compatibility
 */
export interface LegacyEvaluationData {
  relevance: number; // Legacy field name
  accuracy: number; // Legacy field name
  completeness: number; // Legacy field name
  overall: number;
  isOffTopic: boolean;
  alertSeverity: "low" | "medium" | "high" | "none";
  reasoning: string;
  suggestedImprovements?: string;
  evaluationModel: string;
  evaluationTime: number;
}

/**
 * Evaluation system configuration for multi-provider support
 */
export interface EvaluationConfig {
  provider: string;
  model: string;
  mode: "fast" | "balanced" | "quality";
  fallbackEnabled: boolean;
  fallbackProviders: string[];
  timeout: number;
  maxTokens: number;
  temperature: number;
  preferCheap: boolean;
  maxCostPerEval: number;
  retryAttempts: number;
}

/**
 * Provider model configuration for evaluation
 */
export interface ProviderModelConfig {
  provider: string;
  models: {
    fast: string;
    balanced: string;
    quality: string;
  };
  costPerToken: {
    input: number;
    output: number;
  };
  requiresApiKey: string[];
  performance: {
    speed: number; // 1-3 scale
    quality: number; // 1-3 scale
    cost: number; // 1-3 scale (higher = cheaper)
  };
}

/**
 * Enhanced result interfaces with optional analytics/evaluation
 */
export interface EnhancedGenerateResult extends GenerateResult {
  analytics?: AnalyticsData;
  evaluation?: EvaluationData;
}

/**
 * Phase 2: Enhanced Streaming Infrastructure
 * Progress tracking and metadata for streaming operations
 */
export interface StreamingProgressData {
  chunkCount: number;
  totalBytes: number;
  chunkSize: number;
  elapsedTime: number;
  estimatedRemaining?: number;
  streamId?: string;
  phase: "initializing" | "streaming" | "processing" | "complete" | "error";
}

export interface StreamingMetadata {
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  averageChunkSize: number;
  maxChunkSize: number;
  minChunkSize: number;
  throughputBytesPerSecond?: number;
  streamingProvider: string;
  modelUsed: string;
}

export type ProgressCallback = (progress: StreamingProgressData) => void;

/**
 * AI Provider interface with flexible parameter support
 */
export interface AIProvider {
  // NEW: Primary streaming method
  stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult>;

  generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null>;

  gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null>;
}

/**
 * Provider attempt result for iteration tracking
 */
export interface ProviderAttempt {
  provider: AIProviderName;
  model: SupportedModelName;
  success: boolean;
  error?: string;
  stack?: string;
}

/**
 * Default provider configurations
 */
export const DEFAULT_PROVIDER_CONFIGS: ProviderConfig[] = [
  {
    provider: AIProviderName.BEDROCK,
    models: [BedrockModels.CLAUDE_3_7_SONNET, BedrockModels.CLAUDE_3_5_SONNET],
  },
  {
    provider: AIProviderName.VERTEX,
    models: [VertexModels.CLAUDE_4_0_SONNET, VertexModels.GEMINI_2_5_FLASH],
  },
  {
    provider: AIProviderName.OPENAI,
    models: [OpenAIModels.GPT_4O, OpenAIModels.GPT_4O_MINI],
  },
];

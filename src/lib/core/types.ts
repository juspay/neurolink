import type { Tool, Schema } from "ai";
import type {
  ZodUnknownSchema,
  ValidationSchema,
} from "../types/typeAliases.js";
import type { GenerateResult } from "../types/generateTypes.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { JsonValue } from "../types/common.js";
import type {
  ChatMessage,
  ConversationMemoryConfig,
} from "../types/conversationTypes.js";
import type { TokenUsage, AnalyticsData } from "../types/providers.js";
import type { EvaluationData } from "../index.js";

// Re-export EvaluationData for use in other modules
export type { EvaluationData };
import type { MiddlewareFactoryOptions } from "../types/middlewareTypes.js";

export interface TextGenerationResult {
  content: string;
  provider?: string;
  model?: string;
  usage?: TokenUsage;
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
  evaluation?: EvaluationData;
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
  SAGEMAKER = "sagemaker",
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
  // Claude 4 Series (Latest - May 2025)
  CLAUDE_4_0_SONNET = "claude-sonnet-4@20250514",
  CLAUDE_4_0_OPUS = "claude-opus-4@20250514",

  // Claude 3.5 Series (Still supported)
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy support)
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",

  // Gemini 2.5 Series (Latest - 2025)
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",

  // Gemini 2.0 Series
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",

  // Gemini 1.5 Series (Legacy support)
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
}

/**
 * Supported Models for Google AI Studio
 */
export enum GoogleAIModels {
  // Gemini 2.5 Series (Latest - 2025)
  GEMINI_2_5_PRO = "gemini-2.5-pro",
  GEMINI_2_5_FLASH = "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE = "gemini-2.5-flash-lite",

  // Gemini 2.0 Series
  GEMINI_2_0_FLASH_001 = "gemini-2.0-flash-001",

  // Gemini 1.5 Series (Legacy support)
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
  GEMINI_1_5_FLASH_LITE = "gemini-1.5-flash-lite",
}

/**
 * Supported Models for Anthropic (Direct API)
 */
export enum AnthropicModels {
  // Claude 3.5 Series (Latest)
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20241022",
  CLAUDE_3_5_HAIKU = "claude-3-5-haiku-20241022",

  // Claude 3 Series (Legacy support)
  CLAUDE_3_SONNET = "claude-3-sonnet-20240229",
  CLAUDE_3_OPUS = "claude-3-opus-20240229",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",
}

/**
 * Union type of all supported model names
 */
export type SupportedModelName =
  | BedrockModels
  | OpenAIModels
  | VertexModels
  | GoogleAIModels
  | AnthropicModels;

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
  schema?: ZodUnknownSchema | Schema<unknown>;
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

  // NEW: Message Array Support for Conversation Memory
  conversationMessages?: ChatMessage[]; // Previous conversation as message array

  // NEW: Conversation Memory Configuration
  conversationMemoryConfig?: Partial<ConversationMemoryConfig>;
  originalPrompt?: string; // Original prompt for context summarization

  // NEW: Middleware related configs
  middleware?: MiddlewareFactoryOptions;

  // NEW: Evaluation Context Parameters
  expectedOutcome?: string; // Expected outcome for evaluation
  evaluationCriteria?: string[]; // Criteria for evaluation
}

export type { AnalyticsData } from "../types/providers.js";

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
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null>;

  gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null>;

  // Tool execution setup - consolidated from NeuroLink SDK
  setupToolExecutor(
    sdk: {
      customTools: Map<string, unknown>;
      executeTool: (toolName: string, params: unknown) => Promise<unknown>;
    },
    functionTag: string,
  ): void;
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

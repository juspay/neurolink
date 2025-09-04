/**
 * Provider-specific type definitions for NeuroLink
 */

import type { UnknownRecord, JsonValue } from "./common.js";
import type { Tool } from "ai";
import type { ValidationSchema } from "./typeAliases.js";
import type {
  EnhancedGenerateResult,
  GenerateResult,
  TextGenerationOptions,
} from "./generateTypes.js";
import type { StreamOptions, StreamResult } from "./streamTypes.js";
import type { ExternalMCPToolInfo } from "./externalMcp.js";

/**
 * Generic AI SDK model interface
 */
export type AISDKModel = {
  // This will be refined based on actual AI SDK types
  [key: string]: unknown;
};

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
  O1_PREVIEW = "o1-preview",
  O1_MINI = "o1-mini",
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
 * API Versions for various providers
 */
export enum APIVersions {
  // Azure OpenAI API versions
  AZURE_LATEST = "2025-04-01-preview",
  AZURE_STABLE = "2024-10-21",
  AZURE_LEGACY = "2023-12-01-preview",

  // OpenAI API versions
  OPENAI_CURRENT = "v1",
  OPENAI_BETA = "v1-beta",

  // Google AI API versions
  GOOGLE_AI_CURRENT = "v1",
  GOOGLE_AI_BETA = "v1beta",

  // Anthropic API versions
  ANTHROPIC_CURRENT = "2023-06-01",

  // Other provider versions can be added here
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
 * Extract provider names from enum
 */
export type ProviderName = keyof typeof AIProviderName;

/**
 * Provider error information
 */
export type ProviderError = Error & {
  code?: string | number;
  statusCode?: number;
  provider?: string;
  originalError?: unknown;
};

/**
 * AWS Credential Configuration for Bedrock provider
 */
export type AWSCredentialConfig = {
  region?: string;
  profile?: string;
  roleArn?: string;
  roleSessionName?: string;
  timeout?: number;
  /** @deprecated Prefer maxAttempts to match AWS SDK v3 config */
  maxRetries?: number;
  /** Number of attempts as per AWS SDK v3 ("retry-mode") */
  maxAttempts?: number;
  enableDebugLogging?: boolean;
  /** Optional service endpoint override (e.g., VPC/Gov endpoints) */
  endpoint?: string;
};

/**
 * AWS Credential Validation Result
 */
export type CredentialValidationResult = {
  isValid: boolean;
  credentialSource: string;
  region: string;
  hasExpiration: boolean;
  expirationTime?: Date;
  error?: string;
  debugInfo: {
    accessKeyId: string;
    hasSessionToken: boolean;
    providerConfig: Readonly<Required<AWSCredentialConfig>>;
  };
};

/**
 * Service Connectivity Test Result
 */
export type ServiceConnectivityResult = {
  bedrockAccessible: boolean;
  availableModels: number;
  responseTimeMs: number;
  error?: string;
  sampleModels: string[];
};

/**
 * Model Capabilities - Maximally Reusable
 */
export type ModelCapability =
  | "text"
  | "vision"
  | "function-calling"
  | "embedding"
  | "audio"
  | "video"
  | "code"
  | "reasoning"
  | "multimodal";

/**
 * Model Use Cases - High Reusability
 */
export type ModelUseCase =
  | "chat"
  | "completion"
  | "analysis"
  | "coding"
  | "creative"
  | "reasoning"
  | "translation"
  | "summarization"
  | "classification";

/**
 * Provider health status
 */
export type ProviderHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";

/**
 * Stream processing phases
 */
export type StreamPhase =
  | "initializing"
  | "streaming"
  | "processing"
  | "complete"
  | "error";

/**
 * Model Filter Configuration - High Reusability
 */
export type ModelFilter = {
  provider?: string;
  capability?: ModelCapability;
  useCase?: ModelUseCase;
  requireVision?: boolean;
  requireFunctionCalling?: boolean;
  maxTokens?: number;
  costLimit?: number;
};

/**
 * Model Resolution Context - High Reusability
 */
export type ModelResolutionContext = {
  requireCapabilities?: ModelCapability[];
  preferredProviders?: string[];
  useCase?: ModelUseCase;
  budgetConstraints?: {
    maxCostPerRequest?: number;
    maxTokens?: number;
  };
  performance?: {
    maxLatency?: number;
    minQuality?: number;
  };
};

/**
 * Model Statistics Object - High Reusability
 */
export type ModelStats = {
  name: string;
  provider: string;
  capabilities: ModelCapability[];
  useCases: ModelUseCase[];
  performance: {
    avgLatency?: number;
    avgTokensPerSecond?: number;
    reliability?: number;
  };
  pricing?: ModelPricing;
  metadata: {
    [key: string]: JsonValue;
  } & {
    version?: string;
    lastUpdated?: Date;
  };
};

/**
 * Model Pricing Information - High Reusability
 */
export type ModelPricing = {
  inputTokens?: {
    price: number;
    currency: string;
    per: number;
  };
  outputTokens?: {
    price: number;
    currency: string;
    per: number;
  };
  requestPrice?: {
    price: number;
    currency: string;
  };
  tier?: "free" | "basic" | "premium" | "enterprise";
  // Additional properties for models command compatibility
  average?: number;
  min?: number;
  max?: number;
  free?: boolean;
};

/**
 * Provider capabilities
 */
export type ProviderCapabilities = {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  maxTokens?: number;
  supportedModels: string[];
};

/**
 * Provider configuration specifying provider and its available models (from core types)
 */
export type ProviderConfig = {
  provider: AIProviderName;
  models: SupportedModelName[];
};

/**
 * Provider configuration for individual providers
 */
export type IndividualProviderConfig = {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  model?: string;
  [key: string]: unknown;
};

/**
 * AI Provider interface with flexible parameter support (converted from interface)
 */
export type AIProvider = {
  // Primary streaming method
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
};

/**
 * Provider attempt result for iteration tracking (converted from interface)
 */
export type ProviderAttempt = {
  provider: AIProviderName;
  model: SupportedModelName;
  success: boolean;
  error?: string;
  stack?: string;
};

/**
 * Error types for provider creation
 */
export type ProviderCreationError = {
  code: "INVALID_PROVIDER" | "CONFIGURATION_ERROR" | "INSTANTIATION_ERROR";
  message: string;
  provider: string;
  details?: Record<string, unknown>;
};

/**
 * Amazon Bedrock specific types
 */
export namespace BedrockTypes {
  export interface Client {
    // Based on AWS SDK Bedrock types
    send(command: unknown): Promise<unknown>;
    config: {
      region?: string;
      credentials?: unknown;
    };
  }

  export interface InvokeModelCommand {
    // Based on AWS SDK types
    input: {
      modelId: string;
      body: string;
      contentType?: string;
    };
  }
}

/**
 * Mistral specific types
 */
export namespace MistralTypes {
  export interface Client {
    // Based on Mistral SDK types
    chat?: {
      complete?: (options: unknown) => Promise<unknown>;
      stream?: (options: unknown) => AsyncIterable<unknown>;
    };
  }
}

/**
 * OpenTelemetry specific types (for telemetry service)
 */
export namespace TelemetryTypes {
  export interface Meter {
    createCounter(name: string, options?: unknown): Counter;
    createHistogram(name: string, options?: unknown): Histogram;
  }

  export interface Tracer {
    startSpan(name: string, options?: unknown): Span;
  }

  export interface Counter {
    add(value: number, attributes?: UnknownRecord): void;
  }

  export interface Histogram {
    record(value: number, attributes?: UnknownRecord): void;
  }

  export interface Span {
    end(): void;
    setStatus(status: unknown): void;
    recordException(exception: unknown): void;
  }
}

/**
 * Provider factory function type
 */
export type ProviderFactory = (
  modelName?: string,
  providerName?: string,
  sdk?: unknown,
) => Promise<unknown>;

/**
 * Provider constructor type
 */
export type ProviderConstructor = {
  new (modelName?: string, providerName?: string, sdk?: unknown): unknown;
};

/**
 * Provider registration entry
 */
export type ProviderRegistration = {
  name: string;
  constructor: ProviderConstructor | ProviderFactory;
  capabilities?: ProviderCapabilities;
  defaultConfig?: IndividualProviderConfig;
};

/**
 * Provider metadata type
 */
export type ProviderMetadata = {
  name: string;
  version: string;
  capabilities: ProviderCapability[];
  models: string[];
  healthStatus: ProviderHealthStatus;
};

/**
 * Provider capability type
 */
export type ProviderCapability =
  | "text-generation"
  | "streaming"
  | "tool-calling"
  | "image-generation"
  | "embeddings";

/**
 * Extended tool type that combines AI SDK tools with external MCP tool info
 */
export type ExtendedTool = Tool & Partial<ExternalMCPToolInfo>;

/**
 * AI SDK generate result with steps support (extends GenerateResult)
 */
export type AISDKGenerateResult = GenerateResult & {
  steps?: Array<{
    toolCalls?: Array<{
      toolName?: string;
      name?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

// ============================================================================
// Provider-Specific Type Definitions
// ============================================================================

// ============================================================================
// Amazon Bedrock Provider Types
// ============================================================================

/**
 * Bedrock tool usage structure
 */
export type BedrockToolUse = {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
};

/**
 * Bedrock tool result structure
 */
export type BedrockToolResult = {
  toolUseId: string;
  content: Array<{ text: string }>;
  status: string;
};

/**
 * Bedrock content block structure
 */
export type BedrockContentBlock = {
  text?: string;
  toolUse?: BedrockToolUse;
  toolResult?: BedrockToolResult;
};

/**
 * Bedrock message structure
 */
export type BedrockMessage = {
  role: "user" | "assistant";
  content: BedrockContentBlock[];
};

// ============================================================================
// Google AI Studio Provider Types (Live API)
// ============================================================================

/**
 * Google AI Live media configuration
 */
export type GenAILiveMedia = {
  data: string;
  mimeType: string;
};

/**
 * Live server message inline data
 */
export type LiveServerMessagePartInlineData = {
  data?: string;
};

/**
 * Live server message model turn
 */
export type LiveServerMessageModelTurn = {
  parts?: Array<{ inlineData?: LiveServerMessagePartInlineData }>;
};

/**
 * Live server content structure
 */
export type LiveServerContent = {
  modelTurn?: LiveServerMessageModelTurn;
  interrupted?: boolean;
};

/**
 * Live server message structure
 */
export type LiveServerMessage = {
  serverContent?: LiveServerContent;
};

/**
 * Live connection callbacks
 */
export type LiveConnectCallbacks = {
  onopen?: () => void;
  onmessage?: (message: LiveServerMessage) => void;
  onerror?: (e: { message?: string }) => void;
  onclose?: (e: { code?: number; reason?: string }) => void;
};

/**
 * Live connection configuration
 */
export type LiveConnectConfig = {
  model: string;
  callbacks: LiveConnectCallbacks;
  config: {
    responseModalities: string[];
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: string } };
    };
  };
};

/**
 * Google AI Live session interface
 */
export type GenAILiveSession = {
  sendRealtimeInput?: (payload: {
    media?: GenAILiveMedia;
    event?: string;
  }) => Promise<void> | void;
  sendInput?: (payload: {
    event?: string;
    media?: GenAILiveMedia;
  }) => Promise<void> | void;
  close?: (code?: number, reason?: string) => Promise<void> | void;
};

/**
 * Google AI client interface
 */
export type GenAIClient = {
  live: { connect: (config: LiveConnectConfig) => Promise<GenAILiveSession> };
};

/**
 * Google GenAI constructor type
 */
export type GoogleGenAIClass = new (cfg: { apiKey: string }) => GenAIClient;

// ============================================================================
// OpenAI Compatible Provider Types
// ============================================================================

/**
 * OpenAI-compatible models endpoint response structure
 */
export type ModelsResponse = {
  data: Array<{
    id: string;
    object: string;
    created?: number;
    owned_by?: string;
  }>;
};

/**
 * Default model aliases for easy reference
 */
export const DEFAULT_MODEL_ALIASES = {
  // Latest recommended models per provider
  LATEST_OPENAI: OpenAIModels.GPT_4O,
  FASTEST_OPENAI: OpenAIModels.GPT_4O_MINI,
  LATEST_ANTHROPIC: AnthropicModels.CLAUDE_3_5_SONNET,
  FASTEST_ANTHROPIC: AnthropicModels.CLAUDE_3_5_HAIKU,
  LATEST_GOOGLE: GoogleAIModels.GEMINI_2_5_PRO,
  FASTEST_GOOGLE: GoogleAIModels.GEMINI_2_5_FLASH,

  // Best models by use case
  BEST_CODING: AnthropicModels.CLAUDE_3_5_SONNET,
  BEST_ANALYSIS: GoogleAIModels.GEMINI_2_5_PRO,
  BEST_CREATIVE: AnthropicModels.CLAUDE_3_5_SONNET,
  BEST_VALUE: GoogleAIModels.GEMINI_2_5_FLASH,
} as const;

/**
 * @deprecated Use DEFAULT_MODEL_ALIASES instead. Will be removed in future version.
 */
export const ModelAliases = DEFAULT_MODEL_ALIASES;

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

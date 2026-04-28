/**
 * Provider-specific type definitions for NeuroLink
 */

import type {
  UnknownRecord,
  JsonValue,
  StreamingCapability,
} from "./common.js";
import type { ProviderError } from "./errors.js";
import {
  AIProviderName,
  AnthropicModels,
  BedrockModels,
  DeepSeekModels,
  GoogleAIModels,
  LlamaCppModels,
  LMStudioModels,
  NvidiaNimModels,
  OpenAIModels,
  VertexModels,
} from "../constants/enums.js";
import type { Tool } from "ai";
import type { ValidationSchema } from "./aliases.js";
import type {
  EnhancedGenerateResult,
  GenerateResult,
  TextGenerationOptions,
} from "./generate.js";
import type { StreamOptions, StreamResult } from "./stream.js";
import type { ExternalMCPToolInfo } from "./externalMcp.js";

// Subscription types for Claude/Anthropic authentication and tier management
import type {
  ClaudeSubscriptionTier,
  AnthropicAuthMethod,
  AnthropicAuthConfig,
  SubscriptionInfo,
  OAuthToken,
} from "./subscription.js";

// Re-export subscription types for convenience
export type {
  ClaudeSubscriptionTier,
  AnthropicAuthMethod,
  AnthropicAuthConfig,
  SubscriptionInfo,
} from "./subscription.js";

// ============================================================================
// TYPE ALIASES
// ============================================================================

/**
 * Generic AI SDK model interface
 */
export type AISDKModel = {
  // This will be refined based on actual AI SDK types
  [key: string]: unknown;
};

/**
 * Union type of all supported model names
 */
export type SupportedModelName =
  | BedrockModels
  | DeepSeekModels
  | OpenAIModels
  | VertexModels
  | GoogleAIModels
  | AnthropicModels
  | NvidiaNimModels
  | LMStudioModels
  | LlamaCppModels;

/**
 * Extract provider names from enum
 */
export type ProviderName = (typeof AIProviderName)[keyof typeof AIProviderName];

/**
 * Provider status information
 */
export type ProviderStatus = {
  provider: string;
  status: "working" | "failed" | "not-configured";
  configured: boolean;
  authenticated: boolean;
  error?: string;
  responseTime?: number;
  model?: string;
  /**
   * Subscription information for providers that support subscription tiers
   * (e.g., Anthropic Claude with Pro/Max/Team/Enterprise subscriptions)
   */
  subscription?: SubscriptionInfo;
  /**
   * The authentication method currently in use for this provider
   */
  authMethod?: AnthropicAuthMethod;
};

/**
 * Structural type for provider errors from external sources.
 * For throwing errors, use the ProviderError class from errors.ts.
 */
export type ProviderErrorLike = Error & {
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
 * Per-provider credential overrides for generate() / stream() calls.
 *
 * When set on `NeurolinkConstructorConfig.credentials`, applies as the default
 * for all calls from that NeuroLink instance. When set on
 * `GenerateOptions.credentials` or `StreamOptions.credentials`, overrides the
 * instance default for that single call.
 *
 * Unset providers fall through to environment variables (existing behaviour).
 */
export type NeurolinkCredentials = {
  openai?: { apiKey?: string; baseURL?: string };
  anthropic?: { apiKey?: string; oauthToken?: string };
  googleAiStudio?: { apiKey?: string };
  vertex?: {
    projectId?: string;
    location?: string;
    /** Vertex Express Mode — simplified API-key auth */
    apiKey?: string;
    /** Full service-account JSON string */
    serviceAccountKey?: string;
    /** Inline service-account fields (alternative to serviceAccountKey) */
    clientEmail?: string;
    privateKey?: string;
  };
  bedrock?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
  };
  sagemaker?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    sessionToken?: string;
    region?: string;
    endpoint?: string;
  };
  azure?: {
    apiKey?: string;
    resourceName?: string;
    deploymentName?: string;
    apiVersion?: string;
  };
  mistral?: { apiKey?: string };
  huggingFace?: { apiKey?: string; baseURL?: string };
  openrouter?: { apiKey?: string; baseURL?: string };
  litellm?: { apiKey?: string; baseURL?: string };
  openaiCompatible?: { apiKey?: string; baseURL?: string };
  ollama?: { baseURL?: string };
  deepseek?: { apiKey?: string; baseURL?: string };
  nvidiaNim?: { apiKey?: string; baseURL?: string };
  // apiKey is optional for LM Studio / llama.cpp; use only when running them
  // behind an auth-proxying reverse-proxy.
  lmStudio?: { apiKey?: string; baseURL?: string };
  llamacpp?: { apiKey?: string; baseURL?: string };
};

/**
 * NVIDIA NIM extra request body parameters passed via `providerOptions.openai.body`.
 * Lives here (not in providers/nvidiaNim.ts) per CLAUDE.md rule 2.
 */
export type NvidiaNimExtraBody = {
  top_k?: number;
  min_p?: number;
  repetition_penalty?: number;
  min_tokens?: number;
  chat_template?: string;
  request_id?: string;
  ignore_eos?: boolean;
  chat_template_kwargs?: {
    thinking?: boolean;
    enable_thinking?: boolean;
    reasoning_budget?: number;
  };
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
  /**
   * Whether the provider supports subscription-based features and tier management
   * When true, the provider can adapt behavior based on subscription tier
   */
  subscriptionAware?: boolean;
  /**
   * List of authentication methods supported by this provider
   * e.g., ["api_key", "oauth", "session_token", "environment"]
   */
  supportedAuthMethods?: string[];
};

/**
 * Provider configuration specifying provider and its available models (from core types)
 */
export type AIModelProviderConfig = {
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
  /**
   * The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
   * Used to determine rate limits, available features, and pricing
   */
  subscriptionTier?: ClaudeSubscriptionTier;
  /**
   * The authentication method to use for the provider
   * Supports API key, OAuth, session token, or environment variable
   */
  authMethod?: AnthropicAuthMethod;
  /**
   * Detailed authentication configuration including credentials and options
   */
  authConfig?: AnthropicAuthConfig;
  /**
   * Whether to enable beta features for the provider
   * Beta features may be unstable or subject to change
   */
  enableBetaFeatures?: boolean;
  [key: string]: unknown;
};

/**
 * Anthropic-specific provider configuration
 *
 * @description Extends the base provider configuration with Anthropic-specific
 * options for OAuth, subscription management, and beta features.
 */
export type AnthropicProviderConfig = IndividualProviderConfig & {
  /**
   * The subscription tier for Claude access
   */
  subscriptionTier?: ClaudeSubscriptionTier;

  /**
   * The authentication method to use
   */
  authMethod?: AnthropicAuthMethod;

  /**
   * Whether to enable beta features
   */
  enableBetaFeatures?: boolean;

  /**
   * OAuth token for OAuth authentication.
   * Required when authMethod is "oauth".
   */
  oauthToken?: OAuthToken;

  /**
   * OAuth configuration for OAuth-based authentication
   */
  oauthConfig?: {
    /**
     * OAuth client ID for the application
     */
    clientId?: string;

    /**
     * OAuth redirect URI for the callback
     */
    redirectUri?: string;

    /**
     * OAuth scopes to request
     */
    scopes?: string[];

    /**
     * OAuth authorization endpoint URL
     */
    authorizationEndpoint?: string;

    /**
     * OAuth token endpoint URL
     */
    tokenEndpoint?: string;
  };
};

/**
 * Type guard to check if a configuration is an AnthropicProviderConfig
 *
 * @param config - The configuration object to check
 * @returns True if the configuration is an AnthropicProviderConfig
 *
 * @example
 * ```typescript
 * const config = getProviderConfig();
 * if (isAnthropicConfig(config)) {
 *   // TypeScript knows config is AnthropicProviderConfig here
 *   console.log(config.subscriptionTier);
 *   console.log(config.oauthConfig?.clientId);
 * }
 * ```
 */
export function isAnthropicConfig(
  config: unknown,
): config is AnthropicProviderConfig {
  if (config === null || config === undefined) {
    return false;
  }

  if (typeof config !== "object") {
    return false;
  }

  const configObj = config as Record<string, unknown>;

  // Check for Anthropic-specific properties
  // A config is considered Anthropic if it has:
  // 1. An authMethod that is a valid AnthropicAuthMethod, OR
  // 2. A subscriptionTier that is a valid ClaudeSubscriptionTier, OR
  // 3. An oauthConfig object

  const validAuthMethods = ["api_key", "oauth"];
  const validSubscriptionTiers = [
    "free",
    "pro",
    "max",
    "max_5",
    "max_20",
    "api",
  ];

  // Check for authMethod
  if (
    configObj.authMethod !== undefined &&
    typeof configObj.authMethod === "string" &&
    validAuthMethods.includes(configObj.authMethod)
  ) {
    return true;
  }

  // Check for subscriptionTier
  if (
    configObj.subscriptionTier !== undefined &&
    typeof configObj.subscriptionTier === "string" &&
    validSubscriptionTiers.includes(configObj.subscriptionTier)
  ) {
    return true;
  }

  // Check for oauthConfig
  if (
    configObj.oauthConfig !== undefined &&
    typeof configObj.oauthConfig === "object" &&
    configObj.oauthConfig !== null
  ) {
    return true;
  }

  // Check for authConfig (AnthropicAuthConfig)
  if (
    configObj.authConfig !== undefined &&
    typeof configObj.authConfig === "object" &&
    configObj.authConfig !== null
  ) {
    const authConfig = configObj.authConfig as Record<string, unknown>;
    if (
      authConfig.method !== undefined &&
      typeof authConfig.method === "string" &&
      validAuthMethods.includes(authConfig.method)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Configuration options for provider validation
 */
export type ProviderConfigOptions = {
  providerName: string;
  envVarName: string;
  setupUrl: string;
  description: string;
  instructions: string[];
  fallbackEnvVars?: string[]; // For providers with multiple possible env vars
  // For local providers (LM Studio, llama.cpp) where the envVarName points at
  // a base URL with a working default rather than a required credential.
  // When true, validateApiKey()/validateApiKeyEnhanced() return the env value
  // (or empty string) instead of throwing when it's unset.
  optional?: boolean;
};

// ============================================================================
// CORE PROVIDER INTERFACES
// ============================================================================

/**
 * AI Provider type with flexible parameter support
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

  embed(text: string, modelName?: string): Promise<number[]>;

  embedMany(texts: string[], modelName?: string): Promise<number[][]>;

  // Tool execution setup - consolidated from NeuroLink SDK
  setupToolExecutor(
    sdk: {
      customTools: Map<string, unknown>;
      executeTool: (toolName: string, params: unknown) => Promise<unknown>;
    },
    functionTag: string,
  ): void;

  /**
   * Propagate trace context from NeuroLink SDK for parent-child span hierarchy.
   * Use this method instead of accessing `_traceContext` directly.
   */
  setTraceContext(ctx: { traceId: string; parentSpanId: string } | null): void;
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
 * Provider factory function type
 */
export type ProviderFactory = (
  modelName?: string,
  providerName?: string,
  sdk?: unknown,
) => Promise<unknown>;

/**
 * Configuration options for the provider registry
 */
export type ProviderRegistryOptions = {
  /**
   * Enable loading of manual MCP configurations from .mcp-config.json
   * Should only be true for CLI mode, false for SDK mode
   */
  enableManualMCP?: boolean;
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
  image?: {
    format: "png" | "jpeg" | "gif" | "webp";
    source: {
      bytes?: Uint8Array | Buffer;
    };
  };
  document?: {
    format:
      | "pdf"
      | "csv"
      | "doc"
      | "docx"
      | "xls"
      | "xlsx"
      | "html"
      | "txt"
      | "md";
    name: string;
    source: {
      bytes?: Uint8Array | Buffer;
    };
  };
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
    responseModalities: ("TEXT" | "IMAGE" | "AUDIO")[];
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
 * Google AI generateContentStream response chunk
 */
export type GenAIStreamChunk = {
  text?: string;
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
};

/**
 * Google AI generate content response
 */
export type GenAIGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
};

/**
 * Google AI models API interface
 */
export type GenAIModelsAPI = {
  generateContentStream: (params: {
    model: string;
    contents: Array<{ role: string; parts: unknown[] }>;
    config?: Record<string, unknown>;
  }) => Promise<AsyncIterable<GenAIStreamChunk>>;
  generateContent: (params: {
    model: string;
    contents: Array<{ role: string; parts: unknown[] }>;
    config?: Record<string, unknown>;
  }) => Promise<GenAIGenerateContentResponse>;
};

/**
 * Google AI client interface
 */
export type GenAIClient = {
  live: { connect: (config: LiveConnectConfig) => Promise<GenAILiveSession> };
  models: GenAIModelsAPI;
};

/**
 * Google GenAI constructor type
 * Supports both API key (Google AI Studio) and Vertex AI configurations
 */
export type GoogleGenAIClass = new (
  cfg:
    | { apiKey: string }
    | { vertexai: boolean; project: string; location: string },
) => GenAIClient;

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

// ============================================================================
// Ollama Provider Types
// ============================================================================

/**
 * Ollama tool call structure
 */
export type OllamaToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

/**
 * Ollama tool result structure
 */
export type OllamaToolResult = {
  tool_call_id: string;
  content: string;
};

/**
 * Ollama message structure for conversation and tool execution
 */
export type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content:
    | string
    | Array<{ type: string; text?: string; [key: string]: unknown }>;
  tool_calls?: OllamaToolCall[];
  images?: string[];
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
export const DEFAULT_PROVIDER_CONFIGS: AIModelProviderConfig[] = [
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

// ============================================================================
// Amazon SageMaker Provider Types
// ============================================================================

/**
 * Adaptive semaphore configuration for concurrency management
 */
export type AdaptiveSemaphoreConfig = {
  initialConcurrency: number;
  maxConcurrency: number;
  minConcurrency: number;
};

/**
 * Metrics for adaptive semaphore performance tracking
 */
export type AdaptiveSemaphoreMetrics = {
  activeRequests: number;
  currentConcurrency: number;
  completedCount: number;
  errorCount: number;
  averageResponseTime: number;
  waitingCount: number;
};

/**
 * AWS configuration options for SageMaker client
 */
export type SageMakerConfig = {
  /** AWS region for SageMaker service */
  region: string;
  /** AWS access key ID */
  accessKeyId: string;
  /** AWS secret access key */
  secretAccessKey: string;
  /** AWS session token (optional, for temporary credentials) */
  sessionToken?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Custom SageMaker endpoint URL (optional) */
  endpoint?: string;
};

/**
 * Model-specific configuration for SageMaker endpoints
 */
export type SageMakerModelConfig = {
  /** SageMaker endpoint name */
  endpointName: string;
  /** Model type for request/response formatting */
  modelType?:
    | "llama"
    | "mistral"
    | "claude"
    | "huggingface"
    | "jumpstart"
    | "custom";
  /** Content type for requests */
  contentType?: string;
  /** Accept header for responses */
  accept?: string;
  /** Custom attributes for the endpoint */
  customAttributes?: string;
  /** Input format specification */
  inputFormat?: "huggingface" | "jumpstart" | "custom";
  /** Output format specification */
  outputFormat?: "huggingface" | "jumpstart" | "custom";
  /** Maximum tokens for generation */
  maxTokens?: number;
  /** Temperature parameter */
  temperature?: number;
  /** Top-p parameter */
  topP?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Initial concurrency for batch processing */
  initialConcurrency?: number;
  /** Maximum concurrency for batch processing */
  maxConcurrency?: number;
  /** Minimum concurrency for batch processing */
  minConcurrency?: number;
  /** Maximum concurrent detection tests */
  maxConcurrentDetectionTests?: number;
};

/**
 * SageMaker endpoint information and metadata
 */
export type SageMakerEndpointInfo = {
  /** Endpoint name */
  endpointName: string;
  /** Endpoint ARN */
  endpointArn: string;
  /** Associated model name */
  modelName: string;
  /** EC2 instance type */
  instanceType: string;
  /** Endpoint creation timestamp */
  creationTime: string; // ISO 8601 date string
  /** Last modification timestamp */
  lastModifiedTime: string; // ISO 8601 date string
  /** Current endpoint status */
  endpointStatus:
    | "InService"
    | "Creating"
    | "Updating"
    | "SystemUpdating"
    | "RollingBack"
    | "Deleting"
    | "Failed";
  /** Current instance count */
  currentInstanceCount?: number;
  /** Variant weights for A/B testing */
  productionVariants?: Array<{
    variantName: string;
    modelName: string;
    initialInstanceCount: number;
    instanceType: string;
    currentWeight?: number;
  }>;
};

/**
 * Token usage and billing information
 */
export type SageMakerUsage = {
  /** Number of prompt tokens */
  promptTokens: number;
  /** Number of completion tokens */
  completionTokens: number;
  /** Total tokens used */
  total: number;
  /** Request processing time in milliseconds */
  requestTime?: number;
  /** Model inference time in milliseconds */
  inferenceTime?: number;
  /** Estimated cost in USD */
  estimatedCost?: number;
};

/**
 * Parameters for SageMaker endpoint invocation
 */
export type InvokeEndpointParams = {
  /** Endpoint name to invoke */
  EndpointName: string;
  /** Request body as string or Uint8Array */
  Body: string | Uint8Array;
  /** Content type of the request */
  ContentType?: string;
  /** Accept header for response format */
  Accept?: string;
  /** Custom attributes for the request */
  CustomAttributes?: string;
  /** Target model for multi-model endpoints */
  TargetModel?: string;
  /** Target variant for A/B testing */
  TargetVariant?: string;
  /** Inference ID for request tracking */
  InferenceId?: string;
};

/**
 * Response from SageMaker endpoint invocation
 */
export type InvokeEndpointResponse = {
  /** Response body */
  Body?: Uint8Array;
  /** Content type of the response */
  ContentType?: string;
  /** Invoked production variant */
  InvokedProductionVariant?: string;
  /** Custom attributes in the response */
  CustomAttributes?: string;
};

/**
 * Streaming response chunk from SageMaker
 */
export type SageMakerStreamChunk = {
  /** Text content in the chunk */
  content?: string;
  /** Indicates if this is the final chunk */
  done?: boolean;
  /** Usage information (only in final chunk) */
  usage?: SageMakerUsage;
  /** Error information if chunk contains error */
  error?: string;
  /** Finish reason for generation */
  finishReason?:
    | "stop"
    | "length"
    | "tool-calls"
    | "content-filter"
    | "unknown";
  /** Tool call in progress (Phase 2.3) */
  toolCall?: SageMakerStreamingToolCall;
  /** Tool result chunk (Phase 2.3) */
  toolResult?: SageMakerStreamingToolResult;
  /** Structured output streaming (Phase 2.3) */
  structuredOutput?: SageMakerStructuredOutput;
};

/**
 * Tool call information for function calling
 */
export type SageMakerToolCall = {
  /** Tool call identifier */
  id: string;
  /** Tool/function name */
  name: string;
  /** Tool arguments as JSON object */
  arguments: Record<string, unknown>;
  /** Tool call type */
  type: "function";
};

/**
 * Tool result information
 */
export type SageMakerToolResult = {
  /** Tool call identifier */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Tool result data */
  result: unknown;
  /** Execution status */
  status: "success" | "error";
  /** Error message if status is error */
  error?: string;
};

/**
 * Streaming tool call information (Phase 2.3)
 */
export type SageMakerStreamingToolCall = {
  /** Tool call identifier */
  id: string;
  /** Tool/function name */
  name?: string;
  /** Partial or complete arguments as JSON string */
  arguments?: string;
  /** Tool call type */
  type: "function";
  /** Indicates if this tool call is complete */
  complete?: boolean;
  /** Delta text for incremental argument building */
  argumentsDelta?: string;
};

/**
 * Streaming tool result information (Phase 2.3)
 */
export type SageMakerStreamingToolResult = {
  /** Tool call identifier */
  toolCallId: string;
  /** Tool name */
  toolName: string;
  /** Partial or complete result data */
  result?: unknown;
  /** Result delta for incremental responses */
  resultDelta?: string;
  /** Execution status */
  status: "pending" | "running" | "success" | "error";
  /** Error message if status is error */
  error?: string;
  /** Indicates if this result is complete */
  complete?: boolean;
};

/**
 * Structured output streaming information (Phase 2.3)
 */
export type SageMakerStructuredOutput = {
  /** Partial JSON object being built */
  partialObject?: Record<string, unknown>;
  /** JSON delta text */
  jsonDelta?: string;
  /** Current parsing path (e.g., "user.name") */
  currentPath?: string;
  /** Schema validation errors */
  validationErrors?: string[];
  /** Indicates if JSON is complete and valid */
  complete?: boolean;
  /** JSON schema being validated against */
  schema?: Record<string, unknown>;
};

/**
 * Enhanced generation request options
 */
export type SageMakerGenerationOptions = {
  /** Input prompt text */
  prompt: string;
  /** System prompt for context */
  systemPrompt?: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for randomness (0-1) */
  temperature?: number;
  /** Top-p nucleus sampling (0-1) */
  topP?: number;
  /** Top-k sampling */
  topK?: number;
  /** Stop sequences to end generation */
  stopSequences?: string[];
  /** Enable streaming response */
  stream?: boolean;
  /** Tools available for function calling */
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  /** Tool choice mode */
  toolChoice?: "auto" | "none" | { type: "tool"; name: string };
};

/**
 * Generation response from SageMaker
 */
export type SageMakerGenerationResponse = {
  /** Generated text content */
  text: string;
  /** Token usage information */
  usage: SageMakerUsage;
  /** Finish reason for generation */
  finishReason: "stop" | "length" | "tool-calls" | "content-filter" | "unknown";
  /** Tool calls made during generation */
  toolCalls?: SageMakerToolCall[];
  /** Tool results if tools were executed */
  toolResults?: SageMakerToolResult[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Model version or identifier */
  modelVersion?: string;
};

/**
 * Error codes specific to SageMaker operations
 */
export type SageMakerErrorCode =
  | "VALIDATION_ERROR"
  | "MODEL_ERROR"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "CREDENTIALS_ERROR"
  | "NETWORK_ERROR"
  | "ENDPOINT_NOT_FOUND"
  | "THROTTLING_ERROR"
  | "UNKNOWN_ERROR";

/**
 * SageMaker-specific error information
 */
export type SageMakerErrorInfo = {
  /** Error code */
  code: SageMakerErrorCode;
  /** Human-readable error message */
  message: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Original error from AWS SDK */
  cause?: Error;
  /** Endpoint name where error occurred */
  endpoint?: string;
  /** Request ID for debugging */
  requestId?: string;
  /** Retry suggestion */
  retryable?: boolean;
};

/**
 * Batch inference job configuration
 */
export type BatchInferenceConfig = {
  /** Input S3 location */
  inputS3Uri: string;
  /** Output S3 location */
  outputS3Uri: string;
  /** SageMaker model name */
  modelName: string;
  /** Instance type for batch job */
  instanceType: string;
  /** Instance count for batch job */
  instanceCount: number;
  /** Maximum payload size in MB */
  maxPayloadInMB?: number;
  /** Batch strategy */
  batchStrategy?: "MultiRecord" | "SingleRecord";
};

/**
 * Model deployment configuration
 */
export type ModelDeploymentConfig = {
  /** Model name */
  modelName: string;
  /** Endpoint name */
  endpointName: string;
  /** EC2 instance type */
  instanceType: string;
  /** Initial instance count */
  initialInstanceCount: number;
  /** Model data S3 location */
  modelDataUrl: string;
  /** Container image URI */
  image: string;
  /** IAM execution role ARN */
  executionRoleArn: string;
  /** Resource tags */
  tags?: Record<string, string>;
  /** Auto scaling configuration */
  autoScaling?: {
    minCapacity: number;
    maxCapacity: number;
    targetValue: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
};

/**
 * Endpoint metrics and monitoring data
 */
export type EndpointMetrics = {
  /** Endpoint name */
  endpointName: string;
  /** Total invocations */
  invocations: number;
  /** Average latency in milliseconds */
  averageLatency: number;
  /** Error rate percentage */
  errorRate: number;
  /** CPU utilization percentage */
  cpuUtilization?: number;
  /** Memory utilization percentage */
  memoryUtilization?: number;
  /** Instance count */
  instanceCount: number;
  /** Timestamp of metrics as ISO 8601 date string */
  timestamp: string;
};

/**
 * Cost estimation data
 */
export type CostEstimate = {
  /** Estimated cost in USD */
  estimatedCost: number;
  /** Currency code */
  currency: string;
  /** Cost breakdown */
  breakdown: {
    /** Instance hours cost */
    instanceCost: number;
    /** Request-based cost */
    requestCost: number;
    /** Total processing hours */
    totalHours: number;
  };
  /** Time period for estimate */
  period?: {
    start: string; // ISO 8601 date string
    end: string; // ISO 8601 date string
  };
};

/**
 * SageMaker generation result type for better type safety
 */
export type SageMakerGenerateResult = {
  text?: string;
  reasoning?:
    | string
    | Array<
        | { type: "text"; text: string; signature?: string }
        | { type: "redacted"; data: string }
      >;
  files?: Array<{ data: string | Uint8Array; mimeType: string }>;
  logprobs?: Array<{
    token: string;
    logprob: number;
    topLogprobs: Array<{ token: string; logprob: number }>;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens?: number;
  };
  finishReason:
    | "stop"
    | "length"
    | "content-filter"
    | "tool-calls"
    | "error"
    | "unknown";
  warnings?: Array<{ type: "other"; message: string }>;
  rawCall: { rawPrompt: unknown; rawSettings: Record<string, unknown> };
  rawResponse?: { headers?: Record<string, string> };
  request?: { body?: string };
  toolCalls?: SageMakerToolCall[];
  object?: unknown;
};

export type ProviderHealthStatusOptions = {
  provider: AIProviderName;
  isHealthy: boolean;
  isConfigured: boolean;
  hasApiKey: boolean;
  lastChecked: Date;
  error?: string;
  warning?: string;
  responseTime?: number;
  configurationIssues: string[];
  recommendations: string[];
};

// ============================================================================
// Language Model Adapter Types
// ============================================================================

/**
 * Structural adapter type capturing what AI SDK's `streamText` / `generateText`
 * actually invoke at runtime on a model object.
 *
 * `OllamaLanguageModel` satisfies this type. The provider can cast
 * `new OllamaLanguageModel(...)` to `LanguageModel` via this
 * intermediate type, avoiding `as unknown as LanguageModel`.
 */
export type OllamaAsLanguageModel = {
  readonly specificationVersion: string;
  readonly provider: string;
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]>;
  doGenerate(options: Record<string, unknown>): Promise<unknown>;
  doStream(options: Record<string, unknown>): Promise<unknown>;
};

/**
 * Structural type that captures what AI SDK's `streamText` / `generateText`
 * actually invoke at runtime on a model object.
 *
 * `SageMakerLanguageModel` satisfies this type. Consumers can cast
 * `new SageMakerLanguageModel(...)` to `LanguageModel` via this
 * intermediate type, avoiding `as unknown as LanguageModel`.
 */
export type SageMakerAsLanguageModel = {
  readonly specificationVersion: string;
  readonly provider: string;
  readonly modelId: string;
  readonly supportedUrls: Record<string, RegExp[]>;
  doGenerate(options: Record<string, unknown>): Promise<unknown>;
  doStream(options: Record<string, unknown>): Promise<unknown>;
};

export type ProviderHealthCheckOptions = {
  timeout?: number;
  includeConnectivityTest?: boolean;
  includeModelValidation?: boolean;
  cacheResults?: boolean;
  maxCacheAge?: number;
};

// ============================================================================
// Provider-Specific Namespace Types
// ============================================================================

/**
 * Amazon Bedrock specific types
 */
export namespace BedrockTypes {
  // Based on AWS SDK Bedrock types
  export type Client = {
    send(command: unknown): Promise<unknown>;
    config: {
      region?: string;
      credentials?: unknown;
    };
  };

  // Based on AWS SDK types
  export type InvokeModelCommand = {
    input: {
      modelId: string;
      body: string;
      contentType?: string;
    };
  };
}

/**
 * Mistral specific types
 */
export namespace MistralTypes {
  // Based on Mistral SDK types
  export type Client = {
    chat?: {
      complete?: (options: unknown) => Promise<unknown>;
      stream?: (options: unknown) => AsyncIterable<unknown>;
    };
  };
}

/**
 * OpenTelemetry specific types (for telemetry service)
 */
export namespace TelemetryTypes {
  export type Meter = {
    createCounter(name: string, options?: unknown): Counter;
    createHistogram(name: string, options?: unknown): Histogram;
  };

  export type Tracer = {
    startSpan(name: string, options?: unknown): Span;
  };

  export type Counter = {
    add(value: number, attributes?: UnknownRecord): void;
  };

  export type Histogram = {
    record(value: number, attributes?: UnknownRecord): void;
  };

  export type Span = {
    end(): void;
    setStatus(status: unknown): void;
    recordException(exception: unknown): void;
  };
}

// ============================================================================
// OpenRouter Provider Types
// ============================================================================

/**
 * OpenRouter provider configuration
 */
export type OpenRouterConfig = {
  /** OpenRouter API key */
  apiKey: string;
  /** HTTP Referer header for attribution on openrouter.ai/activity */
  referer?: string;
  /** App name for X-Title header attribution */
  appName?: string;
};

/**
 * OpenRouter model information from /api/v1/models endpoint
 */
export type OpenRouterModelInfo = {
  /** Model ID in format 'provider/model-name' */
  id: string;
  /** Supported parameters (e.g., 'tools', 'temperature') */
  supported_parameters?: string[];
  /** Model name */
  name?: string;
  /** Model description */
  description?: string;
  /** Pricing information */
  pricing?: {
    prompt?: string;
    completion?: string;
  };
  /** Context length */
  context_length?: number;
};

/**
 * OpenRouter models API response
 */
export type OpenRouterModelsResponse = {
  data: OpenRouterModelInfo[];
};

/**
 * OpenRouter provider static cache properties (for testing/internal use)
 */
export type OpenRouterProviderCache = {
  modelsCache: string[];
  modelsCacheTime: number;
  toolCapableModels: Set<string>;
  capabilitiesCached: boolean;
};

// =============================================================================
// GOOGLE NATIVE GEMINI 3 TYPES (moved from providers/googleNativeGemini3.ts)
// =============================================================================

/** A single function declaration for the Gemini native SDK. */
export type NativeFunctionDeclaration = {
  name: string;
  description: string;
  parametersJsonSchema?: Record<string, unknown>;
};

/** The tools config array expected by the @google/genai SDK. */
export type NativeToolsConfig = Array<{
  functionDeclarations: NativeFunctionDeclaration[];
}>;

/** Return value of buildNativeToolDeclarations. */
export type NativeToolDeclarationsResult = {
  toolsConfig: NativeToolsConfig;
  executeMap: Map<string, Tool["execute"]>;
};

/** A single function call returned by the Gemini model. */
export type NativeFunctionCall = {
  name: string;
  args: Record<string, unknown>;
};

/** A single function response to feed back into the conversation. */
export type NativeFunctionResponse = {
  functionResponse: { name: string; response: unknown };
};

/** Result from collectStreamChunks. */
export type CollectedChunkResult = {
  rawResponseParts: unknown[];
  stepFunctionCalls: NativeFunctionCall[];
  inputTokens: number;
  outputTokens: number;
};

/** Push-based text channel for incremental streaming. */
export type TextChannel = {
  /** Push a text chunk to the consumer. */
  push: (text: string) => void;
  /** Signal that no more chunks will arrive. */
  close: () => void;
  /** Signal that the producer encountered a fatal error. */
  error: (err: unknown) => void;
  /** Async iterable consumed by the StreamResult. */
  iterable: AsyncIterable<{ content: string }>;
};

// =============================================================================
// PROVIDER TYPE UTILS (moved from providers/providerTypeUtils.ts)
// =============================================================================

/** Language model object shape (LanguageModelV2/V3). */
export type LanguageModelObject = {
  readonly modelId: string;
  readonly provider: string;
};

/** Step finish event shape for multi-step generation. */
export type StepFinishEvent = {
  readonly toolCalls: ReadonlyArray<unknown>;
  readonly toolResults: ReadonlyArray<unknown>;
  readonly text: string;
  readonly finishReason: string;
  readonly usage: { inputTokens?: number; outputTokens?: number };
  [key: string]: unknown;
};

/**
 * Represents an AI SDK Tool that may carry a legacy `parameters` field
 * (from AI SDK v3/v4) in addition to the current `inputSchema`.
 */
export type ToolWithLegacyParams = {
  description?: string;
  inputSchema?: unknown;
  execute?: (...args: unknown[]) => unknown;
  /** Legacy field from AI SDK v3/v4 */
  parameters?: unknown;
};

// =============================================================================
// PROVIDER FACTORY (from factories/providerFactory.ts)
// =============================================================================

/**
 * Provider constructor interface - supports both sync constructors and async
 * factory functions.
 */
export type ProviderConstructor =
  | {
      new (
        modelName?: string,
        providerName?: string,
        sdk?: UnknownRecord,
        region?: string,
      ): AIProvider;
    }
  | ((
      modelName?: string,
      providerName?: string,
      sdk?: UnknownRecord,
      region?: string,
    ) => Promise<AIProvider>);

/** Provider registration entry held by ProviderFactory. */
export type ProviderRegistration = {
  constructor: ProviderConstructor;
  defaultModel?: string;
  aliases?: string[];
};

// =============================================================================
// IMAGE GEN (from image-gen/ImageGenService.ts)
// =============================================================================

/** Minimal NeuroLink-like instance accepted by the image generation service. */
export type NeuroLinkInstance = {
  generate: (options: Record<string, unknown>) => Promise<unknown>;
};

// =============================================================================
// OLLAMA (from providers/ollama.ts)
// =============================================================================

/** ProviderError enriched with HTTP response fields from Ollama. */
export type OllamaHttpError = ProviderError & {
  statusCode: number;
  statusText: string;
  responseBody: string;
};

// =============================================================================
// SAGEMAKER DETECTION (from providers/sagemaker/detection.ts)
// =============================================================================

/** Model type detection result. */
export type ModelDetectionResult = {
  type: StreamingCapability["modelType"];
  confidence: number;
  evidence: string[];
  suggestedConfig?: Partial<SageMakerModelConfig>;
};

/** Endpoint health and metadata information. */
export type EndpointHealth = {
  status: "healthy" | "unhealthy" | "unknown";
  responseTime: number;
  metadata?: Record<string, unknown>;
  modelInfo?: {
    name?: string;
    version?: string;
    framework?: string;
    architecture?: string;
  };
};

/** Configuration object for a detection test wrapper. */
export type DetectionTestConfig = {
  test: () => Promise<void>;
  index: number;
  testName: string;
  endpointName: string;
  semaphore: {
    acquire(): Promise<void>;
    release(): void;
  };
  incrementRateLimit: () => void;
  maxRateLimitRetries: number;
  rateLimitState: { count: number };
};

/** Configuration object for parallel detection test execution. */
export type ParallelDetectionConfig = {
  maxConcurrentTests: number;
  maxRateLimitRetries: number;
  initialRateLimitCount: number;
};

// =============================================================================
// SAGEMAKER DIAGNOSTICS (from providers/sagemaker/diagnostics.ts)
// =============================================================================

/** Individual SageMaker diagnostic result. */
export type DiagnosticResult = {
  name: string;
  category: "configuration" | "connectivity" | "streaming";
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
  recommendation?: string;
};

/** Aggregated SageMaker diagnostic report. */
export type DiagnosticReport = {
  overallStatus: "healthy" | "issues" | "critical";
  results: DiagnosticResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
};

// =============================================================================
// SAGEMAKER LANGUAGE MODEL (from providers/sagemaker/language-model.ts)
// =============================================================================

/** SageMaker tool_call item in the OpenAI-compatible payload shape. */
export type SageMakerOpenAIToolCall = {
  type: "function";
  id: string;
  function: {
    name: string;
    arguments: string;
  };
};

// =============================================================================
// GOOGLE AI STUDIO LIVE AUDIO (from providers/googleAiStudio.ts)
// =============================================================================

/**
 * Event pushed through the Google AI Studio voice session's internal queue
 * while audio chunks stream back from the Gemini Live API.
 */
export type GoogleLiveAudioQueueItem =
  | { type: "audio"; audio: import("./stream.js").AudioChunk }
  | { type: "end" }
  | { type: "error"; error: unknown };

// =============================================================================
// GOOGLE VERTEX NATIVE PARTS (from providers/googleVertex.ts)
// =============================================================================

/**
 * Single part inside a Google Vertex "native" (non-AI-SDK) generateContent
 * payload — either inline text or an inline base64 data blob.
 */
export type VertexNativePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Internal helpers used by the conversation-history builder in
 * providers/googleVertex.ts to merge interleaved tool call / result turns.
 */
export type VertexToolStep = {
  type: "tool_step";
  callParts: unknown[];
  resultParts: unknown[];
};

export type VertexRegularSegment = {
  type: "regular";
  role: string;
  parts: unknown[];
};

export type VertexSegment = VertexToolStep | VertexRegularSegment;

import type { Tool, Schema } from "ai";
import type {
  ValidationSchema,
  StandardRecord,
  ZodUnknownSchema,
} from "./typeAliases.js";
import type { AIProviderName } from "./providers.js";
import type { AnalyticsData, TokenUsage } from "./analytics.js";
import type { EvaluationData } from "./evaluation.js";
import type { ChatMessage, ConversationMemoryConfig } from "./conversation.js";
import type { MiddlewareFactoryOptions } from "./middlewareTypes.js";
import type { JsonValue } from "./common.js";
import type { TextContent, ImageContent } from "./content.js";

/**
 * Generate function options type - Primary method for content generation
 * Supports multimodal content while maintaining backward compatibility
 */
export type GenerateOptions = {
  input: {
    text: string;
    images?: Array<Buffer | string>; // Simple image support
    content?: Array<TextContent | ImageContent>; // Advanced multimodal content
  };
  output?: { format?: "text" | "structured" | "json" }; // Future extensible

  // Core options (inherited from TextGenerationOptions)
  provider?: AIProviderName | string;
  model?: string;
  region?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ValidationSchema;
  tools?: Record<string, Tool>;
  timeout?: number | string;
  disableTools?: boolean;

  // Analytics and Evaluation
  enableEvaluation?: boolean;
  enableAnalytics?: boolean;
  context?: StandardRecord;

  // Domain-aware evaluation
  evaluationDomain?: string;
  toolUsageContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;

  // Factory configuration support
  factoryConfig?: {
    domainType?: string;
    domainConfig?: StandardRecord;
    enhancementType?:
      | "domain-configuration"
      | "streaming-optimization"
      | "mcp-integration"
      | "legacy-migration"
      | "context-conversion";
    preserveLegacyFields?: boolean;
    validateDomainData?: boolean;
  };

  // Streaming configuration support
  streaming?: {
    enabled?: boolean;
    chunkSize?: number;
    bufferSize?: number;
    enableProgress?: boolean;
    fallbackToGenerate?: boolean;
  };
};

/**
 * Generate function result type - Primary output format
 * Future-ready for multi-modal outputs while maintaining text focus
 */
export type GenerateResult = {
  content: string; // Primary output
  outputs?: { text: string }; // Future extensible for multi-modal

  // Provider information
  provider?: string;
  model?: string;

  // Usage and performance
  usage?: TokenUsage;
  responseTime?: number;

  // Tool integration
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: StandardRecord;
  }>;
  toolResults?: unknown[]; // Results from tool execution (Vercel AI SDK)
  toolsUsed?: string[];
  toolExecutions?: Array<{
    name: string;
    input: StandardRecord;
    output: unknown;
  }>;
  enhancedWithTools?: boolean;
  availableTools?: Array<{
    name: string;
    description: string;
    parameters: StandardRecord;
  }>;

  // Analytics and evaluation
  analytics?: AnalyticsData;
  evaluation?: EvaluationData;

  // Factory enhancement metadata
  factoryMetadata?: {
    enhancementApplied: boolean;
    enhancementType?: string;
    domainType?: string;
    processingTime?: number;
    configurationUsed?: StandardRecord;
    migrationPerformed?: boolean;
    legacyFieldsPreserved?: boolean;
  };

  // Streaming integration metadata
  streamingMetadata?: {
    streamingUsed: boolean;
    fallbackToGenerate?: boolean;
    chunkCount?: number;
    streamingDuration?: number;
    streamId?: string;
    bufferOptimization?: boolean;
  };
};

/**
 * Unified options for both generation and streaming
 * Supports factory patterns and domain configuration
 */
export type UnifiedGenerationOptions = GenerateOptions & {
  // Streaming preference (if enabled, attempts streaming first)
  preferStreaming?: boolean;
  streamingFallback?: boolean;
};

/**
 * Enhanced provider type with generate method
 */
export type EnhancedProvider = {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
};

/**
 * Factory-enhanced provider type
 * Supports domain configuration and streaming optimizations
 */
export type FactoryEnhancedProvider = EnhancedProvider & {
  generateWithFactory(
    options: UnifiedGenerationOptions,
  ): Promise<GenerateResult>;
  getDomainSupport(): string[];
  getStreamingCapabilities(): {
    supportsStreaming: boolean;
    maxChunkSize: number;
    bufferOptimizations: boolean;
  };
};

/**
 * Text generation options type (consolidated from core types)
 */
export type TextGenerationOptions = {
  prompt?: string;
  input?: { text: string }; // Alternative to prompt for SDK compatibility
  provider?: AIProviderName;
  model?: string;
  region?: string;
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
};

/**
 * Text generation result (consolidated from core types)
 */
export type TextGenerationResult = {
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
};

/**
 * Enhanced result type with optional analytics/evaluation
 */
export type EnhancedGenerateResult = GenerateResult & {
  analytics?: AnalyticsData;
  evaluation?: EvaluationData;
};

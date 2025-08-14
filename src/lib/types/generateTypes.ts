import type { ZodType, ZodTypeDef } from "zod";
import type { Tool, Schema } from "ai";
import type {
  AIProviderName,
  AnalyticsData,
  EvaluationData,
} from "../core/types.js";
import type { ContextManagerConfig } from "../context/types.js";

/**
 * Generate function options interface - Primary method for content generation
 * Future-ready for multi-modal capabilities while maintaining text focus
 */
export interface GenerateOptions {
  input: { text: string }; // Current scope: text input
  output?: { format?: "text" | "structured" | "json" }; // Future extensible

  // Core options (inherited from TextGenerationOptions)
  provider?: AIProviderName | string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>;
  tools?: Record<string, Tool>;
  timeout?: number | string;
  disableTools?: boolean;

  // Analytics and Evaluation
  enableEvaluation?: boolean;
  enableAnalytics?: boolean;
  context?: Record<string, unknown>;

  // Domain-aware evaluation
  evaluationDomain?: string;
  toolUsageContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;

  // Factory configuration support
  factoryConfig?: {
    domainType?: string;
    domainConfig?: Record<string, unknown>;
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
}

/**
 * Generate function result interface - Primary output format
 * Future-ready for multi-modal outputs while maintaining text focus
 */
export interface GenerateResult {
  content: string; // Primary output
  outputs?: { text: string }; // Future extensible for multi-modal

  // Provider information
  provider?: string;
  model?: string;

  // Usage and performance
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  responseTime?: number;

  // Tool integration
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  toolResults?: unknown[]; // Results from tool execution (Vercel AI SDK)
  toolsUsed?: string[];
  toolExecutions?: Array<{
    name: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
  enhancedWithTools?: boolean;
  availableTools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
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
    configurationUsed?: Record<string, unknown>;
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
}

/**
 * Unified options for both generation and streaming
 * Supports factory patterns and domain configuration
 */
export interface UnifiedGenerationOptions extends GenerateOptions {
  // Streaming preference (if enabled, attempts streaming first)
  preferStreaming?: boolean;
  streamingFallback?: boolean;
}

/**
 * Enhanced provider interface with generate method
 */
export interface EnhancedProvider {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
}

/**
 * Factory-enhanced provider interface
 * Supports domain configuration and streaming optimizations
 */
export interface FactoryEnhancedProvider extends EnhancedProvider {
  generateWithFactory(
    options: UnifiedGenerationOptions,
  ): Promise<GenerateResult>;
  getDomainSupport(): string[];
  getStreamingCapabilities(): {
    supportsStreaming: boolean;
    maxChunkSize: number;
    bufferOptimizations: boolean;
  };
}

import type { ZodType, ZodTypeDef } from "zod";
import type { Tool, Schema } from "ai";
import type {
  AIProviderName,
  AnalyticsData,
  EvaluationData,
} from "../core/types.js";
import type { UnknownRecord, Unknown, JsonValue } from "./common.js";

/**
 * Interface for tool execution calls (AI SDK compatible)
 */
export interface ToolCall {
  type?: "tool-call";
  toolCallId?: string;
  toolName: string; // Name of the tool being called
  parameters?: UnknownRecord; // Parameters passed to the tool (NeuroLink format)
  args?: UnknownRecord; // Arguments passed to the tool (AI SDK format)
  id?: string; // Optional unique identifier for the call
}

/**
 * Interface for tool execution results - Enhanced for type safety
 */
export interface ToolResult {
  toolName: string; // Name of the tool that was executed
  status: "success" | "failure"; // Execution status
  output?: JsonValue; // Output from the tool (JSON-serializable)
  error?: string; // Error message if the tool failed
  id?: string; // Optional unique identifier matching the call
  executionTime?: number; // Time taken to execute the tool in milliseconds
  metadata?: {
    [key: string]: JsonValue;
  } & {
    serverId?: string;
    toolCategory?: string;
    isExternal?: boolean;
  };
}

/**
 * Tool Call Results Array - High Reusability
 */
export type ToolCallResults = Array<ToolResult>;

/**
 * Tool Calls Array - High Reusability
 */
export type ToolCalls = Array<ToolCall>;

/**
 * Stream Analytics Data - Enhanced for performance tracking
 */
export interface StreamAnalyticsData {
  /** Tool execution results with timing */
  toolResults?: Promise<ToolCallResults>;
  /** Tool calls made during stream */
  toolCalls?: Promise<ToolCalls>;
  /** Stream performance metrics */
  performance?: {
    startTime: number;
    endTime?: number;
    chunkCount: number;
    avgChunkSize: number;
    totalBytes: number;
  };
  /** Provider analytics */
  providerAnalytics?: AnalyticsData;
}

/**
 * Stream function options interface - Primary method for streaming content
 * Future-ready for multi-modal capabilities while maintaining text focus
 */
export interface StreamOptions {
  input: { text: string }; // Current scope: text input
  output?: {
    format?: "text" | "structured" | "json";
    streaming?: {
      chunkSize?: number;
      bufferSize?: number;
      enableProgress?: boolean;
    };
  }; // Future extensible

  // Core streaming options
  provider?: AIProviderName | string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>;
  tools?: Record<string, Tool>;
  timeout?: number | string;
  disableTools?: boolean;
  maxSteps?: number; // Maximum tool execution steps. Defaults to 5 in the implementation if not specified.

  // Analytics and Evaluation
  enableEvaluation?: boolean;
  enableAnalytics?: boolean;
  context?: UnknownRecord;

  // Domain-aware evaluation
  evaluationDomain?: string;
  toolUsageContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;

  // 🔧 FIX: Factory configuration support (matching GenerateOptions)
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

  // 🔧 FIX: Additional streaming configuration support (matching GenerateOptions)
  streaming?: {
    enabled?: boolean;
    chunkSize?: number;
    bufferSize?: number;
    enableProgress?: boolean;
    fallbackToGenerate?: boolean;
  };
}

/**
 * Stream function result interface - Primary output format for streaming
 * Future-ready for multi-modal outputs while maintaining text focus
 */
export interface StreamResult {
  stream: AsyncIterable<{ content: string }>; // Primary streaming output

  // Provider information
  provider?: string;
  model?: string;

  // Usage information
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };

  // Finish reason
  finishReason?: string;

  // Tool integration (from Vercel AI SDK)
  toolCalls?: ToolCall[]; // Tool calls made during generation
  toolResults?: ToolResult[]; // Results from tool execution

  // Stream metadata
  metadata?: {
    streamId?: string;
    startTime?: number;
    totalChunks?: number;
    estimatedDuration?: number;
    responseTime?: number;
    fallback?: boolean;
  };

  // Analytics and evaluation (available after stream completion)
  analytics?: AnalyticsData | Promise<AnalyticsData>;
  evaluation?: EvaluationData | Promise<EvaluationData>;
}

/**
 * Enhanced provider interface with stream method
 */
export interface EnhancedStreamProvider {
  stream(options: StreamOptions): Promise<StreamResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
}

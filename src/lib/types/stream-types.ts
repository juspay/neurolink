import type { ZodType, ZodTypeDef } from "zod";
import type { Tool, Schema } from "ai";
import type {
  AIProviderName,
  AnalyticsData,
  EvaluationData,
} from "../core/types.js";

/**
 * Interface for tool execution calls
 */
export interface ToolCall {
  toolName: string; // Name of the tool being called
  parameters: Record<string, any>; // Parameters passed to the tool
  id?: string; // Optional unique identifier for the call
}

/**
 * Interface for tool execution results
 */
export interface ToolResult {
  toolName: string; // Name of the tool that was executed
  status: "success" | "failure"; // Execution status
  output?: any; // Output from the tool (can be refined further based on specific tools)
  error?: string; // Error message if the tool failed
  id?: string; // Optional unique identifier matching the call
  executionTime?: number; // Time taken to execute the tool in milliseconds
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
  context?: Record<string, any>;

  // Domain-aware evaluation
  evaluationDomain?: string;
  toolUsageContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
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

  // Analytics and evaluation
  analytics?: AnalyticsData;
  evaluation?: EvaluationData;
}

/**
 * Enhanced provider interface with stream method
 */
export interface EnhancedStreamProvider {
  stream(options: StreamOptions): Promise<StreamResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
}

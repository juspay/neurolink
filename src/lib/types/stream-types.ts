import type { ZodType, ZodTypeDef } from "zod";
import type { Tool, Schema } from "ai";
import type {
  AIProviderName,
  AnalyticsData,
  EvaluationData,
} from "../core/types.js";

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

  // Stream metadata
  metadata?: {
    streamId?: string;
    startTime?: number;
    totalChunks?: number;
    estimatedDuration?: number;
  };

  // Tool integration
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, any>;
  }>;
  toolsUsed?: string[];
  toolExecutions?: Array<{
    name: string;
    input: Record<string, any>;
    output: any;
    duration: number;
  }>;
  enhancedWithTools?: boolean;
  availableTools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;

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

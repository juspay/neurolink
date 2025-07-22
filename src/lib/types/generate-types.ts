import type { ZodType, ZodTypeDef } from "zod";
import type { Tool, Schema } from "ai";
import type {
  AIProviderName,
  AnalyticsData,
  EvaluationData,
} from "../core/types.js";

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
  context?: Record<string, any>;

  // Domain-aware evaluation
  evaluationDomain?: string;
  toolUsageContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
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
    args: Record<string, any>;
  }>;
  toolResults?: any[]; // Results from tool execution (Vercel AI SDK)
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
 * Enhanced provider interface with generate method
 */
export interface EnhancedProvider {
  generate(options: GenerateOptions): Promise<GenerateResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
}

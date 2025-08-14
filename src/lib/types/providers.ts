/**
 * Provider-specific type definitions for NeuroLink
 */

import type { UnknownRecord, JsonValue } from "./common.js";
import type { ToolResult, ToolArgs } from "./tools.js";

/**
 * Generic AI SDK model interface
 */
export interface AISDKModel {
  // This will be refined based on actual AI SDK types
  [key: string]: unknown;
}

/**
 * Provider error information
 */
export interface ProviderError extends Error {
  code?: string | number;
  statusCode?: number;
  provider?: string;
  originalError?: unknown;
}

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Analytics data structure
 */
export interface AnalyticsData {
  provider: string;
  model: string;
  requestDuration: number;
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  timestamp: number;
  context?: JsonValue;
  [key: string]: JsonValue | undefined;
}

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
 * Model Filter Configuration - High Reusability
 */
export interface ModelFilter {
  provider?: string;
  capability?: ModelCapability;
  useCase?: ModelUseCase;
  requireVision?: boolean;
  requireFunctionCalling?: boolean;
  maxTokens?: number;
  costLimit?: number;
}

/**
 * Model Resolution Context - High Reusability
 */
export interface ModelResolutionContext {
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
}

/**
 * Model Statistics Object - High Reusability
 */
export interface ModelStats {
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
}

/**
 * Model Pricing Information - High Reusability
 */
export interface ModelPricing {
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
}

/**
 * Evaluation data structure
 */
export interface EvaluationData {
  relevance?: number;
  accuracy?: number;
  completeness?: number;
  coherence?: number;
  overall?: number;
  feedback?: string;
  [key: string]: JsonValue | undefined;
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  maxTokens?: number;
  supportedModels: string[];
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  model?: string;
  [key: string]: unknown;
}

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
export interface ProviderConstructor {
  new (modelName?: string, providerName?: string, sdk?: unknown): unknown;
}

/**
 * Provider registration entry
 */
export interface ProviderRegistration {
  name: string;
  constructor: ProviderConstructor | ProviderFactory;
  capabilities?: ProviderCapabilities;
  defaultConfig?: ProviderConfig;
}

/**
 * Type guard for provider error
 */
export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof Error && "provider" in error;
}

/**
 * Type guard for token usage
 */
export function isTokenUsage(value: unknown): value is TokenUsage {
  return (
    typeof value === "object" &&
    value !== null &&
    "inputTokens" in value &&
    "outputTokens" in value &&
    "totalTokens" in value &&
    typeof (value as TokenUsage).inputTokens === "number" &&
    typeof (value as TokenUsage).outputTokens === "number" &&
    typeof (value as TokenUsage).totalTokens === "number"
  );
}

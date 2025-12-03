import type { Tool } from "ai";
import type { ValidationSchema, StandardRecord } from "./typeAliases.js";
import type { AIModelProviderConfig } from "./providers.js";
import type { Content, ImageWithAltText } from "./content.js";
import type {
  AnalyticsData,
  ToolExecutionEvent,
  ToolExecutionSummary,
} from "../types/index.js";
import { AIProviderName } from "../constants/enums.js";
import type { TokenUsage } from "./analytics.js";
import type { EvaluationData } from "../index.js";
import type { UnknownRecord, JsonValue } from "./common.js";
import type { MiddlewareFactoryOptions } from "../types/middlewareTypes.js";
import type { ChatMessage } from "./conversation.js";

/**
 * Progress tracking and metadata for streaming operations
 */
export type StreamingProgressData = {
  chunkCount: number;
  totalBytes: number;
  chunkSize: number;
  elapsedTime: number;
  estimatedRemaining?: number;
  streamId?: string;
  phase: "initializing" | "streaming" | "processing" | "complete" | "error";
};

/**
 * Streaming metadata for performance tracking
 */
export type StreamingMetadata = {
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  averageChunkSize: number;
  maxChunkSize: number;
  minChunkSize: number;
  throughputBytesPerSecond?: number;
  streamingProvider: string;
  modelUsed: string;
};

/**
 * Options for AI requests with unified provider configuration
 */
export type StreamingOptions = {
  providers: AIModelProviderConfig[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
};

/**
 * Progress callback for streaming operations
 */
export type ProgressCallback = (
  progress: StreamingProgressData,
) => void | Promise<void>;

/**
 * Type for tool execution calls (AI SDK compatible)
 */
export type ToolCall = {
  type?: "tool-call";
  toolCallId?: string;
  toolName: string; // Name of the tool being called
  parameters?: UnknownRecord; // Parameters passed to the tool (NeuroLink format)
  args?: UnknownRecord; // Arguments passed to the tool (AI SDK format)
  id?: string; // Optional unique identifier for the call
};

/**
 * Type for tool execution results - Enhanced for type safety
 */
export type ToolResult = {
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
};

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
export type StreamAnalyticsData = {
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
};

/**
 * Stream function options type - Primary method for streaming content
 * Future-ready for multi-modal capabilities while maintaining text focus
 */

// ============================================
// STREAMING AUDIO TYPES
// ============================================
//
// NOTE: These types are for STREAMING audio (live transcription, real-time audio).
// For FILE-BASED audio content (audio files as multimodal input), see AudioContent in multimodal.ts
//
// Distinction:
// - AudioInputSpec/AudioChunk: Streaming audio frames (Gemini Live API, real-time transcription)
// - AudioContent (multimodal.ts): File-based audio input (audio files uploaded with messages)
//

export type PCMEncoding = "PCM16LE";

export type AudioInputSpec = {
  frames: AsyncIterable<Buffer>; // PCM16LE mono frames (20–60ms recommended)
  sampleRateHz?: number; // default: 16000
  encoding?: PCMEncoding; // default: 'PCM16LE'
  channels?: 1; // Phase 1: mono
};

export type AudioChunk = {
  data: Buffer;
  sampleRateHz: number; // Gemini typically 24000 on output
  channels: number; // 1
  encoding: PCMEncoding; // 'PCM16LE'
};

export type StreamOptions = {
  input: {
    text: string;
    audio?: AudioInputSpec;
    /**
     * Images to include in the request.
     * Supports simple image data (Buffer, string) or objects with alt text for accessibility.
     *
     * @example Simple usage
     * ```typescript
     * images: [imageBuffer, "https://example.com/image.jpg"]
     * ```
     *
     * @example With alt text for accessibility
     * ```typescript
     * images: [
     *   { data: imageBuffer, altText: "Product screenshot showing main dashboard" },
     *   { data: "https://example.com/chart.png", altText: "Sales chart for Q3 2024" }
     * ]
     * ```
     */
    images?: Array<Buffer | string | ImageWithAltText>;
    csvFiles?: Array<Buffer | string>; // Explicit CSV files (converted to text)
    pdfFiles?: Array<Buffer | string>; // Explicit PDF files (processed as binary documents, not converted to text)
    videoFiles?: Array<Buffer | string>; // Explicit video files
    files?: Array<Buffer | string>; // Auto-detect file types
    content?: Content[]; // Advanced multimodal content
  };
  output?: {
    format?: "text" | "structured" | "json";
    streaming?: {
      chunkSize?: number;
      bufferSize?: number;
      enableProgress?: boolean;
    };
  }; // Future extensible

  // CSV processing options
  csvOptions?: {
    maxRows?: number;
    formatStyle?: "raw" | "markdown" | "json";
    includeHeaders?: boolean;
  };

  // Video processing options
  videoOptions?: {
    frames?: number; // Number of frames to extract (default: 8)
    quality?: number; // Frame quality 0-100 (default: 85)
    format?: "jpeg" | "png"; // Frame format (default: jpeg)
    transcribeAudio?: boolean; // Extract and transcribe audio (default: false)
  };

  // Core streaming options
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

  // 🔧 FIX: Additional streaming configuration support (matching GenerateOptions)
  streaming?: {
    enabled?: boolean;
    chunkSize?: number;
    bufferSize?: number;
    enableProgress?: boolean;
    fallbackToGenerate?: boolean;
  };

  // NEW: Message Array Support for Conversation Memory
  conversationMessages?: ChatMessage[]; // Previous conversation as message array

  // NEW: Middleware related config
  middleware?: MiddlewareFactoryOptions;
};

/**
 * Stream function result type - Primary output format for streaming
 * Future-ready for multi-modal outputs while maintaining text focus
 */
export type StreamResult = {
  stream: AsyncIterable<
    { content: string } | { type: "audio"; audio: AudioChunk }
  >; // text chunks or audio events

  // Provider information
  provider?: string;
  model?: string;

  // Usage information
  usage?: TokenUsage;

  // Finish reason
  finishReason?: string;

  // Tool integration (from Vercel AI SDK)
  toolCalls?: ToolCall[]; // Tool calls made during generation
  toolResults?: ToolResult[]; // Results from tool execution

  // ENHANCED: Native NeuroLink tool event system
  toolEvents?: AsyncIterable<ToolExecutionEvent>; // Real-time tool events generator
  toolExecutions?: ToolExecutionSummary[]; // Final summary of all tool executions
  toolsUsed?: string[]; // List of tools used during generation

  // Stream metadata
  metadata?: {
    streamId?: string;
    startTime?: number;
    totalChunks?: number;
    estimatedDuration?: number;
    responseTime?: number;
    fallback?: boolean;
    // Enhanced with tool metadata
    totalToolExecutions?: number;
    toolExecutionTime?: number;
    hasToolErrors?: boolean;
    guardrailsBlocked?: boolean;
    error?: string;
  };

  // Analytics and evaluation (available after stream completion)
  analytics?: AnalyticsData | Promise<AnalyticsData>;
  evaluation?: EvaluationData | Promise<EvaluationData>;
};

/**
 * Enhanced provider type with stream method
 */
export type EnhancedStreamProvider = {
  stream(options: StreamOptions): Promise<StreamResult>;
  getName(): string;
  isAvailable(): Promise<boolean>;
};

/**
 * Stream text result from AI SDK
 */
export type StreamTextResult = {
  textStream: AsyncIterable<string>;
  text: Promise<string>;
  usage: Promise<AISDKUsage | undefined>;
  response: Promise<
    | {
        id?: string;
        model?: string;
        timestamp?: number | Date;
      }
    | undefined
  >;
  finishReason: Promise<
    | "stop"
    | "length"
    | "content-filter"
    | "tool-calls"
    | "error"
    | "other"
    | "unknown"
  >;
  toolResults?: Promise<ToolResult[]>;
  toolCalls?: Promise<ToolCall[]>;
};

/**
 * Raw usage data from Vercel AI SDK
 */
export type AISDKUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/**
 * Stream analytics collector type
 */
export type StreamAnalyticsCollector = {
  collectUsage(result: StreamTextResult): Promise<TokenUsage>;
  collectMetadata(result: StreamTextResult): Promise<ResponseMetadata>;
  createAnalytics(
    provider: string,
    model: string,
    result: StreamTextResult,
    startTime: number,
    context?: Record<string, unknown>,
  ): Promise<AnalyticsData>;
};

/**
 * Response metadata from stream
 */
export type ResponseMetadata = {
  id?: string;
  model?: string;
  timestamp?: number | Date;
  finishReason?: string;
};

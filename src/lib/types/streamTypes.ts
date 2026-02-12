import type { Tool } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import type { EvaluationData } from "../index.js";
import type { RAGConfig } from "../rag/types.js";
import type {
  AnalyticsData,
  ToolExecutionEvent,
  ToolExecutionSummary,
} from "../types/index.js";
import type { MiddlewareFactoryOptions } from "../types/middlewareTypes.js";
import type { TokenUsage } from "./analytics.js";
import type { JsonValue, UnknownRecord } from "./common.js";
import type { Content, ImageWithAltText } from "./content.js";
import type { ChatMessage } from "./conversation.js";
import type { AIModelProviderConfig } from "./providers.js";
import type { TTSChunk, TTSOptions } from "./ttsTypes.js";
import type { StandardRecord, ValidationSchema } from "./typeAliases.js";

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

/**
 * Stream chunk type using discriminated union for type safety
 *
 * Used in streaming responses to deliver either text or TTS audio chunks.
 * The discriminated union ensures type safety - only one variant can exist at a time.
 *
 * @example Processing text chunks
 * ```typescript
 * for await (const chunk of result.stream) {
 *   if (chunk.type === "text") {
 *     console.log(chunk.content); // TypeScript knows 'content' exists
 *   }
 * }
 * ```
 *
 * @example Processing audio chunks
 * ```typescript
 * const audioBuffer: Buffer[] = [];
 * for await (const chunk of result.stream) {
 *   if (chunk.type === "audio") {
 *     audioBuffer.push(chunk.audioChunk.data); // TypeScript knows 'audioChunk' exists
 *     if (chunk.audioChunk.isFinal) {
 *       const fullAudio = Buffer.concat(audioBuffer);
 *       fs.writeFileSync('output.mp3', fullAudio);
 *     }
 *   }
 * }
 * ```
 *
 * @example Processing both text and audio
 * ```typescript
 * for await (const chunk of result.stream) {
 *   switch (chunk.type) {
 *     case "text":
 *       process.stdout.write(chunk.content);
 *       break;
 *     case "audio":
 *       playAudioChunk(chunk.audioChunk.data);
 *       break;
 *   }
 * }
 * ```
 */
export type StreamChunk =
  | {
      /** Discriminator for text chunks */
      type: "text";
      /** Text content chunk */
      content: string;
    }
  | {
      /** Discriminator for audio chunks */
      type: "audio";
      /** TTS audio chunk data */
      audioChunk: TTSChunk;
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
    files?: Array<Buffer | string | import("./fileTypes.js").FileWithMetadata>; // Auto-detect file types
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

  /**
   * Text-to-Speech (TTS) configuration for streaming
   *
   * Enable audio generation from the streamed text response. Audio chunks will be
   * delivered through the stream alongside text chunks as TTSChunk objects.
   *
   * @example Basic streaming TTS
   * ```typescript
   * const result = await neurolink.stream({
   *   input: { text: "Tell me a story" },
   *   provider: "google-ai",
   *   tts: { enabled: true, voice: "en-US-Neural2-C" }
   * });
   *
   * for await (const chunk of result.stream) {
   *   if (chunk.type === "text") {
   *     process.stdout.write(chunk.content);
   *   } else if (chunk.type === "audio") {
   *     // Handle audio chunk
   *     playAudioChunk(chunk.audioChunk.data);
   *   }
   * }
   * ```
   *
   * @example Advanced streaming TTS with audio buffer
   * ```typescript
   * const result = await neurolink.stream({
   *   input: { text: "Speak slowly" },
   *   provider: "google-ai",
   *   tts: {
   *     enabled: true,
   *     voice: "en-US-Neural2-D",
   *     speed: 0.8,
   *     format: "mp3",
   *     quality: "hd"
   *   }
   * });
   * ```
   */
  tts?: TTSOptions;

  /**
   * Thinking/reasoning configuration for extended thinking models
   *
   * Enables extended thinking capabilities for supported models.
   *
   * **Gemini 3 Models** (gemini-3-pro-preview, gemini-3-flash-preview):
   * Use `thinkingLevel` to control reasoning depth:
   * - `minimal` - Near-zero thinking (Flash only)
   * - `low` - Fast reasoning for simple tasks
   * - `medium` - Balanced reasoning/latency
   * - `high` - Maximum reasoning depth (default for Pro)
   *
   * **Anthropic Claude** (claude-3-7-sonnet, etc.):
   * Use `budgetTokens` to set token budget for thinking.
   *
   * @example Gemini 3 with thinking level (streaming)
   * ```typescript
   * const result = await neurolink.stream({
   *   input: { text: "Solve this complex problem..." },
   *   provider: "google-ai",
   *   model: "gemini-3-pro-preview",
   *   thinkingConfig: {
   *     thinkingLevel: "high"
   *   }
   * });
   * ```
   *
   * @example Anthropic with budget tokens (streaming)
   * ```typescript
   * const result = await neurolink.stream({
   *   input: { text: "Solve this complex math problem..." },
   *   provider: "anthropic",
   *   model: "claude-3-7-sonnet-20250219",
   *   thinkingConfig: {
   *     enabled: true,
   *     budgetTokens: 10000
   *   }
   * });
   * ```
   */
  thinkingConfig?: {
    enabled?: boolean;
    type?: "enabled" | "disabled";
    /** Token budget for thinking (Anthropic models) */
    budgetTokens?: number;
    /** Thinking level for Gemini 3 models: minimal, low, medium, high */
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
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

  // Workflow engine integration
  workflow?: string; // Use predefined workflow ID
  workflowConfig?: import("../workflow/types.js").WorkflowConfig; // Or inline workflow config

  enableSummarization?: boolean; // Enable/disable summarization for this specific request

  /**
   * RAG (Retrieval-Augmented Generation) configuration.
   *
   * When provided, NeuroLink automatically loads the specified files, chunks them,
   * generates embeddings, and creates a search tool that the AI model can invoke
   * on demand to find relevant context before answering.
   *
   * @example Basic RAG streaming
   * ```typescript
   * const stream = await neurolink.stream({
   *   input: { text: "What is RAG?" },
   *   provider: "vertex",
   *   rag: {
   *     files: ["./docs/guide.md"],
   *   }
   * });
   * ```
   */
  rag?: RAGConfig;

  /**
   * File reference registry for on-demand file processing (internal).
   *
   * When set, files above the "tiny" size tier (>10KB) will be registered
   * as lightweight references instead of being fully loaded into the prompt.
   * The LLM can then access file content on-demand via file tools.
   *
   * @internal Set by NeuroLink SDK — not typically used directly by consumers.
   */
  fileRegistry?: unknown;
};

/**
 * Stream function result type - Primary output format for streaming
 * Future-ready for multi-modal outputs while maintaining text focus
 */
export type StreamResult = {
  stream: AsyncIterable<
    | { content: string }
    | { type: "audio"; audio: AudioChunk }
    | { type: "image"; imageOutput: { base64: string } }
    | { content: string; type?: "preliminary" | "final" }
    | { type: "audio"; audio: AudioChunk }
  >; // text chunks (with optional workflow stage) or audio events

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
    preliminaryTime?: number; // Time to first (preliminary) response
    fallback?: boolean;
    // Enhanced with tool metadata
    totalToolExecutions?: number;
    toolExecutionTime?: number;
    hasToolErrors?: boolean;
    guardrailsBlocked?: boolean;
    error?: string;
    // Thought/reasoning metadata
    thoughtSignature?: string;
    thoughts?: Array<{ id?: string; type?: string; content?: string }>;
  };

  // Analytics and evaluation (available after stream completion)
  analytics?: AnalyticsData | Promise<AnalyticsData>;
  evaluation?: EvaluationData | Promise<EvaluationData>;

  // Event sequence for chat history reconstruction
  events?: Array<{
    type: string;
    seq: number;
    timestamp: number;
    [key: string]: unknown;
  }>;

  // Workflow engine integration data
  workflow?: {
    originalResponse: string; // Raw best response before processing
    processedResponse: string; // After conditioning (currently same as original)
    ensembleResponses: Array<{
      provider: string;
      model: string;
      content: string;
      responseTime: number;
      status: "success" | "failure" | "timeout" | "partial";
      error?: string;
    }>;
    judgeScores?: {
      scores: Record<string, number>; // 0-100 scale
      reasoning?: string;
      selectedModel: string;
    };
    selectedModel: string; // Which model was chosen as best
    metrics: {
      totalTime: number;
      ensembleTime: number;
      judgeTime?: number;
      conditioningTime?: number;
    };
    workflowId: string;
    workflowName: string;
  };
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

import type { Tool, Schema } from "ai";
import type {
  ValidationSchema,
  StandardRecord,
  ZodUnknownSchema,
} from "./typeAliases.js";
import { AIProviderName } from "../constants/enums.js";
import type { AnalyticsData, TokenUsage } from "./analytics.js";
import type { EvaluationData } from "./evaluation.js";
import type { ChatMessage, ConversationMemoryConfig } from "./conversation.js";
import type { MiddlewareFactoryOptions } from "./middlewareTypes.js";
import type { JsonValue } from "./common.js";
import type { Content, ImageWithAltText } from "./content.js";
import type { TTSOptions, TTSResult } from "./ttsTypes.js";

/**
 * Generate function options type - Primary method for content generation
 * Supports multimodal content while maintaining backward compatibility
 */
export type GenerateOptions = {
  input: {
    text: string;
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
    csvFiles?: Array<Buffer | string>; // Explicit CSV files
    pdfFiles?: Array<Buffer | string>; // Explicit PDF files
    videoFiles?: Array<Buffer | string>; // Explicit video files
    files?: Array<Buffer | string>; // Auto-detect file types
    content?: Content[]; // Advanced multimodal content
  };
  output?: { format?: "text" | "structured" | "json" }; // Future extensible

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
   * Text-to-Speech (TTS) configuration
   *
   * Enable audio generation from the text response. The generated audio will be
   * returned in the result's `audio` field as a TTSResult object.
   *
   * @example Basic TTS
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Tell me a story" },
   *   provider: "google-ai",
   *   tts: { enabled: true, voice: "en-US-Neural2-C" }
   * });
   * console.log(result.audio?.buffer); // Audio Buffer
   * ```
   *
   * @example Advanced TTS with options
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Speak slowly and clearly" },
   *   provider: "google-ai",
   *   tts: {
   *     enabled: true,
   *     voice: "en-US-Neural2-D",
   *     speed: 0.8,
   *     pitch: 2.0,
   *     format: "mp3",
   *     quality: "standard"
   *   }
   * });
   * ```
   */
  tts?: TTSOptions;

  // Core options (inherited from TextGenerationOptions)
  provider?: AIProviderName | string;
  model?: string;
  region?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /**
   * Zod schema for structured output validation
   *
   * @important Google Gemini Limitation
   * Google Vertex AI and Google AI Studio cannot combine function calling with
   * structured output. You MUST use `disableTools: true` when using schemas with
   * Google providers.
   *
   * Error without disableTools: "Function calling with a response mime type:
   * 'application/json' is unsupported"
   *
   * This is a documented Google API limitation, not a NeuroLink bug.
   * All frameworks (LangChain, Vercel AI SDK, Agno, Instructor) use this approach.
   *
   * @example
   * ```typescript
   * // ✅ Correct for Google providers
   * const result = await neurolink.generate({
   *   schema: MySchema,
   *   provider: "vertex",
   *   disableTools: true  // Required for Google
   * });
   *
   * // ✅ No restriction for other providers
   * const result = await neurolink.generate({
   *   schema: MySchema,
   *   provider: "openai"  // Works without disableTools
   * });
   * ```
   *
   * @see https://ai.google.dev/gemini-api/docs/function-calling
   */
  schema?: ValidationSchema;
  tools?: Record<string, Tool>;
  timeout?: number | string;
  /**
   * Disable tool execution (including built-in tools)
   *
   * @required For Google Gemini providers when using schemas
   * Google Vertex AI and Google AI Studio require this flag when using
   * structured output (schemas) due to Google API limitations.
   *
   * @example
   * ```typescript
   * // Required for Google providers with schemas
   * await neurolink.generate({
   *   schema: MySchema,
   *   provider: "vertex",
   *   disableTools: true
   * });
   * ```
   */
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

  /**
   * Formatted mem0 personalization context for system message injection.
   *
   * This field is populated automatically during generation when mem0 is enabled
   * and contains the formatted memory context retrieved from mem0 cloud API.
   * It is injected as a separate system message to provide personalization
   * without modifying the user's input text.
   *
   * @remarks
   * This field is set internally by the SDK and should not be manually populated.
   * To customize how memory context is formatted, use `formatMemoryConfig` in mem0 configuration.
   *
   * @internal
   */
  mem0Context?: string;

  /**
   * Per-request override for global mem0 configuration.
   *
   * When set, this flag overrides the global mem0 enabled/disabled setting
   * for this specific generation request only.
   *
   * @example
   * ```typescript
   * // Force-enable mem0 for this request even if globally disabled
   * await neurolink.generate({
   *   input: { text: "What did we discuss last time?" },
   *   mem0Enabled: true,
   *   context: { userId: "user-123" }
   * });
   *
   * // Disable mem0 for a sensitive request
   * await neurolink.generate({
   *   input: { text: "Process this confidential data" },
   *   mem0Enabled: false
   * });
   * ```
   *
   * @remarks
   * - If `true`: Enables mem0 for this request regardless of global setting
   * - If `false`: Disables mem0 for this request regardless of global setting
   * - If `undefined`: Falls back to global mem0 configuration
   * - Requires `context.userId` to be set for memory retrieval
   */
  mem0Enabled?: boolean;
};

/**
 * Generate function result type - Primary output format
 * Future-ready for multi-modal outputs while maintaining text focus
 */
export type GenerateResult = {
  content: string; // Primary output
  outputs?: { text: string }; // Future extensible for multi-modal

  /**
   * Text-to-Speech audio result
   *
   * Contains the generated audio buffer and metadata when TTS is enabled.
   * Generated by TTSProcessor.synthesize() using the specified provider.
   *
   * @example Accessing TTS audio
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Hello world" },
   *   provider: "google-ai",
   *   tts: { enabled: true, voice: "en-US-Neural2-C" }
   * });
   *
   * if (result.audio) {
   *   console.log(`Audio size: ${result.audio.size} bytes`);
   *   console.log(`Format: ${result.audio.format}`);
   *   if (result.audio.duration) {
   *     console.log(`Duration: ${result.audio.duration}s`);
   *   }
   *   if (result.audio.voice) {
   *     console.log(`Voice: ${result.audio.voice}`);
   *   }
   *   // Save or play the audio buffer
   *   fs.writeFileSync('output.mp3', result.audio.buffer);
   * }
   * ```
   */
  audio?: TTSResult;

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
  output?: { format?: "text" | "structured" | "json" }; // Output format preference
  tools?: Record<string, Tool>; // Enable MCP tools integration
  timeout?: number | string; // Optional timeout (e.g., 30000, '30s', '2m', '1h')
  disableTools?: boolean; // Disable tools (tools are enabled by default)
  maxSteps?: number; // Maximum tool execution steps (default: 5)

  /**
   * Text-to-Speech (TTS) configuration
   *
   * Enable audio generation from text. Behavior depends on useAiResponse flag:
   * - When useAiResponse is false/undefined (default): TTS synthesizes the input text directly
   * - When useAiResponse is true: TTS synthesizes the AI-generated response
   *
   * @example Using input text (default)
   * ```typescript
   * const neurolink = new NeuroLink();
   * const result = await neurolink.generate({
   *   input: { text: "Hello world" },
   *   provider: "google-ai",
   *   tts: { enabled: true, voice: "en-US-Neural2-C" }
   * });
   * // TTS synthesizes "Hello world" directly, no AI generation
   * ```
   *
   * @example Using AI response
   * ```typescript
   * const neurolink = new NeuroLink();
   * const result = await neurolink.generate({
   *   input: { text: "Tell me a joke" },
   *   provider: "google-ai",
   *   tts: { enabled: true, useAiResponse: true, voice: "en-US-Neural2-C" }
   * });
   * // AI generates the joke, then TTS synthesizes the AI's response
   * ```
   */
  tts?: TTSOptions;

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
  mem0Context?: string; // Mem0 personalization context for separate injection
  mem0Enabled?: boolean; // Override global mem0 configuration for this request

  // NEW: Middleware related configs
  middleware?: MiddlewareFactoryOptions;

  // NEW: Evaluation Context Parameters
  expectedOutcome?: string; // Expected outcome for evaluation
  evaluationCriteria?: string[]; // Criteria for evaluation

  // NEW: CSV Processing Options
  csvOptions?: {
    maxRows?: number;
    formatStyle?: "raw" | "markdown" | "json";
    includeHeaders?: boolean;
  };
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
  audio?: TTSResult;
};

/**
 * Enhanced result type with optional analytics/evaluation
 */
export type EnhancedGenerateResult = GenerateResult & {
  analytics?: AnalyticsData;
  evaluation?: EvaluationData;
};

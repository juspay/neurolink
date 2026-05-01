import type { Schema, Tool, ToolChoice, StepResult, LanguageModel } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import type { RAGConfig } from "./rag.js";
import type { AnalyticsData, TokenUsage } from "./analytics.js";
import type { JsonValue } from "./common.js";
import type { Content, ImageWithAltText } from "./content.js";
import type { ChatMessage, ConversationMemoryConfig } from "./conversation.js";
import type { EvaluationData } from "./evaluation.js";
import type {
  MiddlewareFactoryOptions,
  OnFinishCallback,
  OnErrorCallback,
} from "./middleware.js";
import type {
  DirectorModeOptions,
  DirectorSegment,
  VideoGenerationResult,
  VideoOutputOptions,
} from "./multimodal.js";
import type { PPTGenerationResult, PPTOutputOptions } from "./ppt.js";
import type { TTSOptions, TTSResult } from "./tts.js";
import type { STTOptions, STTResult } from "./stt.js";
import type {
  StandardRecord,
  ValidationSchema,
  ZodUnknownSchema,
} from "./aliases.js";
import type { NeurolinkCredentials } from "./providers.js";
import type { FileWithMetadata } from "./file.js";
import type { WorkflowConfig } from "./workflow.js";

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
    files?: Array<Buffer | string | FileWithMetadata>; // Auto-detect file types
    content?: Content[]; // Advanced multimodal content

    /**
     * Director Mode segments. When provided, Director Mode is activated automatically.
     * Each segment contains its own prompt and image.
     * Must contain 2-10 segments.
     */
    segments?: DirectorSegment[];
  };
  /**
   * Output configuration options
   *
   * @example Text output (default)
   * ```typescript
   * output: { format: "text" }
   * ```
   *
   * @example Video generation with Veo 3.1
   * ```typescript
   * output: {
   *   mode: "video",
   *   video: {
   *     resolution: "1080p",
   *     length: 8,
   *     aspectRatio: "16:9",
   *     audio: true
   *   }
   * }
   * ```
   */
  output?: {
    /** Output format for text generation */
    format?: "text" | "structured" | "json";
    /**
     * Output mode - determines the type of content generated
     * - "text": Standard text generation (default)
     * - "video": Video generation using models like Veo 3.1
     * - "ppt": PowerPoint presentation generation
     */
    mode?: "text" | "video" | "ppt";
    /**
     * Video generation configuration (used when mode is "video")
     * Requires an input image and text prompt
     */
    video?: VideoOutputOptions;
    /**
     * PowerPoint generation configuration (used when mode is "ppt")
     * Generates slides based on text prompt
     */
    ppt?: PPTOutputOptions;
    /**
     * Director Mode configuration (only used when input.segments is provided)
     * Controls transition prompts, durations, and concurrency.
     */
    director?: DirectorModeOptions;
  };

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

  /**
   * Speech-to-Text (STT) configuration
   *
   * Enable audio transcription. When enabled, the audio provided via `stt.audio`
   * will be transcribed to text and used as the prompt.
   *
   * @example
   * ```typescript
   * const neurolink = new NeuroLink();
   * const result = await neurolink.generate({
   *   input: { text: "" },
   *   provider: "openai",
   *   stt: { enabled: true, provider: "whisper", language: "en-US", audio: audioBuffer }
   * });
   * // STT transcribes the audio, result.transcription contains the transcription
   * ```
   */
  stt?: STTOptions & { provider?: string; audio?: Buffer | ArrayBuffer };

  /**
   * Thinking/reasoning configuration for extended thinking models
   *
   * Enables extended thinking capabilities for supported models.
   *
   * **Gemini 3 Models** (gemini-3.1-pro-preview, gemini-3-flash-preview):
   * Use `thinkingLevel` to control reasoning depth:
   * - `minimal` - Near-zero thinking (Flash only)
   * - `low` - Fast reasoning for simple tasks
   * - `medium` - Balanced reasoning/latency
   * - `high` - Maximum reasoning depth (default for Pro)
   *
   * **Anthropic Claude** (claude-3-7-sonnet, etc.):
   * Use `budgetTokens` to set token budget for thinking.
   *
   * @example Gemini 3 with thinking level
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Solve this complex problem..." },
   *   provider: "google-ai",
   *   model: "gemini-3.1-pro-preview",
   *   thinkingConfig: {
   *     thinkingLevel: "high"
   *   }
   * });
   * ```
   *
   * @example Anthropic with budget tokens
   * ```typescript
   * const result = await neurolink.generate({
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
  /**
   * Filter available tools by name.
   * Only tools with names in this array will be made available.
   * Used by dynamic arguments to dynamically select which tools to enable.
   *
   * @example
   * ```typescript
   * await neurolink.generate({
   *   input: { text: "Search for information" },
   *   enabledToolNames: ["websearchGrounding", "readFile"]
   * });
   * ```
   */
  enabledToolNames?: string[];
  timeout?: number | string;
  /** AbortSignal for external cancellation of the AI call */
  abortSignal?: AbortSignal;
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

  /** Include only these tools by name (whitelist). If set, only matching tools are available. */
  toolFilter?: string[];

  /** Exclude these tools by name (blacklist). Applied after toolFilter. */
  excludeTools?: string[];

  /**
   * Skip injecting tool schemas into the system prompt.
   * When true, tools are ONLY passed natively via the provider's `tools` parameter,
   * avoiding duplicate tool definitions (~30K tokens savings per call).
   * Default: false (backward compatible — tool schemas are injected into system prompt).
   */
  skipToolPromptInjection?: boolean;

  /** Disable tool result caching for this request (overrides global mcp.cache.enabled) */
  disableToolCache?: boolean;

  /** Maximum number of tool execution steps (default: 200) */
  maxSteps?: number;

  /**
   * Tool choice configuration for the generation.
   * Controls whether and which tools the model must call.
   *
   * - `"auto"` (default): the model can choose whether and which tools to call
   * - `"none"`: no tool calls allowed
   * - `"required"`: the model must call at least one tool
   * - `{ type: "tool", toolName: string }`: the model must call the specified tool
   *
   * Note: When used without `prepareStep`, this applies to **every step** in the
   * `maxSteps` loop. Using `"required"` or `{ type: "tool" }` without `prepareStep`
   * will cause infinite tool calls until `maxSteps` is exhausted.
   */
  toolChoice?: ToolChoice<Record<string, Tool>>;

  /**
   * Optional callback that runs before each step in a multi-step generation.
   * Allows dynamically changing `toolChoice` and available tools per step.
   *
   * This is the recommended way to enforce specific tool calls on certain steps
   * while allowing the model freedom on others.
   *
   * Maps to Vercel AI SDK's `experimental_prepareStep`.
   *
   * @example Force a specific tool on step 0, then switch to auto:
   * ```typescript
   * prepareStep: ({ stepNumber, steps }) => {
   *   if (stepNumber === 0) {
   *     return {
   *       toolChoice: { type: 'tool', toolName: 'myTool' }
   *     };
   *   }
   *   return { toolChoice: 'auto' };
   * }
   * ```
   *
   * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text#parameters
   */
  prepareStep?: (options: {
    steps: StepResult<Record<string, Tool>>[];
    stepNumber: number;
    maxSteps: number;
    model: LanguageModel;
  }) => PromiseLike<
    | {
        model?: LanguageModel;
        toolChoice?: ToolChoice<Record<string, Tool>>;
        experimental_activeTools?: string[];
      }
    | undefined
  >;

  // Analytics and Evaluation
  enableEvaluation?: boolean;
  enableAnalytics?: boolean;
  context?: StandardRecord;

  // Domain-aware evaluation
  evaluationDomain?: string;
  toolUsageContext?: string;
  /**
   * @deprecated Use `conversationMessages` instead. This field uses a simple `{role, content}` shape
   * that is not consumed by `buildMessagesArray()` — messages passed here will NOT reach the AI model
   * as proper conversation turns. `conversationMessages` uses the full `ChatMessage` type and is
   * correctly wired through the entire generate pipeline.
   */
  conversationHistory?: Array<{ role: string; content: string }>;

  /**
   * Previous conversation as a ChatMessage array.
   * Messages are injected as proper multi-turn conversation history before the current prompt,
   * so the AI model sees them as real prior exchanges (not text dumped into the prompt).
   * Used by task continuation mode and available to external callers.
   */
  conversationMessages?: ChatMessage[];

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

  // Workflow engine integration
  workflow?: string; // Use predefined workflow ID
  workflowConfig?: WorkflowConfig; // Or inline workflow config

  /**
   * RAG (Retrieval-Augmented Generation) configuration.
   *
   * When provided, NeuroLink automatically loads the specified files, chunks them,
   * generates embeddings, and creates a search tool that the AI model can invoke
   * on demand to find relevant context before answering.
   *
   * @example Basic RAG
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "What is RAG?" },
   *   provider: "vertex",
   *   rag: {
   *     files: ["./docs/guide.md"],
   *   }
   * });
   * ```
   *
   * @example Advanced RAG with options
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Explain chunking strategies" },
   *   provider: "vertex",
   *   rag: {
   *     files: ["./docs/guide.md", "./docs/api.md"],
   *     strategy: "markdown",
   *     chunkSize: 512,
   *     topK: 5,
   *   }
   * });
   * ```
   */
  rag?: RAGConfig;

  /**
   * Maximum budget in USD for this session. When the accumulated cost of all
   * generate() calls on this NeuroLink instance exceeds this value, subsequent
   * calls will throw a budget-exceeded error before making the API request.
   *
   * @example
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Summarize this" },
   *   maxBudgetUsd: 1.00
   * });
   * ```
   */
  maxBudgetUsd?: number;

  /**
   * Optional request identifier for observability and log correlation.
   * When provided, this ID is forwarded to spans, logs, and telemetry so
   * callers can correlate generation traces back to their own request lifecycle.
   */
  requestId?: string;

  /**
   * File reference registry for on-demand file processing.
   *
   * When set, files above the "tiny" size tier (>10KB) will be registered
   * as lightweight references instead of being fully loaded into the prompt.
   * The LLM can then access file content on-demand via file tools
   * (list_attached_files, read_file_section, search_in_file).
   *
   * @internal Set by NeuroLink SDK — not typically used directly by consumers.
   */
  fileRegistry?: unknown;

  /** Per-call middleware configuration. */
  middleware?: MiddlewareFactoryOptions;

  /** Callback invoked when generation completes successfully. */
  onFinish?: OnFinishCallback;

  /** Callback invoked when generation encounters an error. */
  onError?: OnErrorCallback;

  /** Pre-validated user context for the request */
  requestContext?: Record<string, unknown>;

  /** Raw auth token — validated by configured auth provider */
  auth?: { token: string };

  /**
   * Per-provider credential overrides for this request.
   * Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
   * Unset providers fall through to instance credentials, then environment variables.
   */
  credentials?: NeurolinkCredentials;

  /**
   * Curator P2-3: per-call fallback callback. Overrides any
   * instance-level `providerFallback` set on `new NeuroLink({...})`.
   */
  providerFallback?: (
    error: unknown,
  ) => Promise<{ provider?: string; model?: string } | null>;

  /**
   * Curator P2-3: per-call ordered model chain. Overrides any
   * instance-level `modelChain`. Tried in order on model-access-denied.
   */
  modelChain?: string[];

  /**
   * Per-call memory control.
   *
   * Override the global memory SDK behavior for this specific call.
   * All flags default to `true` when the global memory SDK is enabled.
   * If the global memory SDK is disabled, these flags have no effect.
   *
   */
  memory?: {
    /** Master toggle for this call. When false, both read and write are skipped. Defaults to true. */
    enabled?: boolean;
    /** Whether to read condensed memory and prepend to prompt. Defaults to true. */
    read?: boolean;
    /** Whether to write (add/condense) the conversation into memory after completion. Defaults to true. */
    write?: boolean;
    /**
     * Additional users whose memory should be retrieved/stored alongside the primary user.
     * Each entry can override the condensation prompt and maxWords for that user.
     * Primary user is still determined by context.userId.
     */
    additionalUsers?: AdditionalMemoryUser[];
  };
};

/**
 * Represents an additional user whose memory should be included in a generate/stream call.
 * Allows per-user prompt overrides for different memory condensation strategies
 * (e.g. personal preferences vs org-level policies).
 */
export type AdditionalMemoryUser = {
  /** The user/owner ID to retrieve or store memory for. */
  userId: string;
  /**
   * Human-readable label used in the formatted memory context.
   * E.g. "Organization Policy", "Team Context", "User Preferences".
   * If not provided, defaults to userId.
   */
  label?: string;
  /** Whether to read this user's memory and include in context. Defaults to true. */
  read?: boolean;
  /** Whether to write conversation into this user's memory. Defaults to true. */
  write?: boolean;
  /** Custom condensation prompt for this user. Overrides the default Hippocampus prompt. */
  prompt?: string;
  /** Max words for this user's condensed memory. Overrides the default maxWords. */
  maxWords?: number;
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

  /**
   * Video generation result
   *
   * Contains the generated video buffer and metadata when video mode is enabled.
   * Present when `output.mode` is set to "video" in GenerateOptions.
   *
   * @example Accessing generated video
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Product showcase", images: [imageBuffer] },
   *   provider: "vertex",
   *   model: "veo-3.1",
   *   output: { mode: "video", video: { resolution: "1080p" } }
   * });
   *
   * if (result.video) {
   *   fs.writeFileSync('output.mp4', result.video.data);
   *   console.log(`Duration: ${result.video.metadata?.duration}s`);
   *   console.log(`Dimensions: ${result.video.metadata?.dimensions?.width}x${result.video.metadata?.dimensions?.height}`);
   * }
   * ```
   */
  video?: VideoGenerationResult;
  /**
   * PowerPoint generation result (present when output.mode is "ppt")
   *
   * @example
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Introducing Our New Product" },
   *   model: "gemini-pro",
   *   output: { mode: "ppt", ppt: { pages: 10, theme: "modern" } }
   * });
   *
   * if (result.ppt) {
   *   console.log(`Generated ${result.ppt.totalSlides} slides`);
   *   console.log(`Saved at: ${result.ppt.filePath}`);
   * }
   * ```
   */
  ppt?: PPTGenerationResult;
  imageOutput?: { base64: string } | null; // Standard format for image generation

  // Provider information
  provider?: string;
  model?: string;

  // Finish reason from the AI provider (e.g., "stop", "length", "tool-calls")
  finishReason?: string;

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

  /** Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts) */
  reasoning?: string;
  /** Token count for reasoning content */
  reasoningTokens?: number;

  /** STT transcription result (present when stt.enabled is true and audio input was provided) */
  transcription?: STTResult;

  // NL-007: Retry metadata for observability
  retries?: {
    count: number;
    errors: Array<{ code: string; message: string }>;
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
 * Extended to support video generation mode
 */
export type TextGenerationOptions = {
  prompt?: string;
  /**
   * Alternative input format for multimodal SDK operations.
   *
   * NOTE: This field is only used by the higher-level `generate()` API
   * (NeuroLink.generate, BaseProvider.generate). Legacy `generateText()`
   * callers must still use the `prompt` field directly.
   *
   * Supports text, images, and other multimodal inputs.
   */
  input?: {
    text: string;
    /**
     * Images to include in the request.
     * For video generation, the first image is used as the source frame.
     */
    images?: Array<Buffer | string | ImageWithAltText>;
    pdfFiles?: Array<Buffer | string>; // Support for PDF inputs (for image generation with Vertex AI)
    files?: Array<Buffer | string | FileWithMetadata>; // Auto-detect file types (including video for analysis)
    /** Director Mode segments (2-10). When provided, Director Mode is activated. */
    segments?: DirectorSegment[];
  };
  provider?: AIProviderName;
  model?: string;
  region?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: ZodUnknownSchema | Schema<unknown>;
  /**
   * Output configuration options
   *
   * @example Video generation
   * ```typescript
   * output: {
   *   mode: "video",
   *   video: { resolution: "1080p", length: 8 }
   * }
   * ```
   */
  output?: {
    format?: "text" | "structured" | "json";
    /**
     * Output mode - determines the type of content generated
     * - "text": Standard text generation (default)
     * - "video": Video generation using models like Veo 3.1
     * - "ppt": PowerPoint presentation generation
     */
    mode?: "text" | "video" | "ppt";
    /**
     * Video generation configuration (used when mode is "video")
     */
    video?: VideoOutputOptions;
    /**
     * PowerPoint generation configuration (used when mode is "ppt")
     */
    ppt?: PPTOutputOptions;
    /**
     * Director Mode configuration (only used when input.segments is provided)
     */
    director?: DirectorModeOptions;
  };
  tools?: Record<string, Tool>; // Enable MCP tools integration
  /**
   * Filter available tools by name.
   * Only tools with names in this array will be made available.
   * Used by dynamic arguments to dynamically select which tools to enable.
   * Merged into `toolFilter` before tool filtering runs.
   *
   * @example
   * ```typescript
   * await neurolink.generate({
   *   input: { text: "Search for information" },
   *   enabledToolNames: ["websearchGrounding", "readFile"]
   * });
   * ```
   */
  enabledToolNames?: string[];
  timeout?: number | string; // Optional timeout (e.g., 30000, '30s', '2m', '1h')
  /** AbortSignal for external cancellation of the AI call */
  abortSignal?: AbortSignal;
  disableTools?: boolean; // Disable tools (tools are enabled by default)
  maxSteps?: number; // Maximum tool execution steps (default: 200)

  /** Include only these tools by name (whitelist). If set, only matching tools are available. */
  toolFilter?: string[];

  /** Exclude these tools by name (blacklist). Applied after toolFilter. */
  excludeTools?: string[];

  /** Disable tool result caching for this request (overrides global mcp.cache.enabled) */
  disableToolCache?: boolean;

  /**
   * Tool choice configuration for the generation.
   * Controls whether and which tools the model must call.
   *
   * - `"auto"` (default): the model can choose whether and which tools to call
   * - `"none"`: no tool calls allowed
   * - `"required"`: the model must call at least one tool
   * - `{ type: "tool", toolName: string }`: the model must call the specified tool
   *
   * Note: When used without `prepareStep`, this applies to **every step** in the
   * `maxSteps` loop. Using `"required"` or `{ type: "tool" }` without `prepareStep`
   * will cause infinite tool calls until `maxSteps` is exhausted.
   */
  toolChoice?: ToolChoice<Record<string, Tool>>;

  /**
   * Optional callback that runs before each step in a multi-step generation.
   * Allows dynamically changing `toolChoice` and available tools per step.
   *
   * This is the recommended way to enforce specific tool calls on certain steps
   * while allowing the model freedom on others.
   *
   * Maps to Vercel AI SDK's `experimental_prepareStep`.
   *
   * @example Force a specific tool on step 0, then switch to auto:
   * ```typescript
   * prepareStep: ({ stepNumber, steps }) => {
   *   if (stepNumber === 0) {
   *     return {
   *       toolChoice: { type: 'tool', toolName: 'myTool' }
   *     };
   *   }
   *   return { toolChoice: 'auto' };
   * }
   * ```
   *
   * @see https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text#parameters
   */
  prepareStep?: (options: {
    steps: StepResult<Record<string, Tool>>[];
    stepNumber: number;
    maxSteps: number;
    model: LanguageModel;
  }) => PromiseLike<
    | {
        model?: LanguageModel;
        toolChoice?: ToolChoice<Record<string, Tool>>;
        experimental_activeTools?: string[];
      }
    | undefined
  >;

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

  /**
   * Speech-to-Text (STT) configuration
   *
   * Enable audio transcription. When enabled, the audio provided via `stt.audio`
   * will be transcribed to text and used as the prompt.
   *
   * @example
   * ```typescript
   * const neurolink = new NeuroLink();
   * const result = await neurolink.generate({
   *   input: { text: "" },
   *   provider: "openai",
   *   stt: { enabled: true, provider: "whisper", language: "en-US", audio: audioBuffer }
   * });
   * // STT transcribes the audio, result.transcription contains the transcription
   * ```
   */
  stt?: STTOptions & { provider?: string; audio?: Buffer | ArrayBuffer };

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

  // NEW: CSV Processing Options
  csvOptions?: {
    maxRows?: number;
    formatStyle?: "raw" | "markdown" | "json";
    includeHeaders?: boolean;
  };

  enableSummarization?: boolean; // Enable/disable summarization for this specific request

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
  /**
   * Skip injecting tool schemas into the system prompt.
   * When true, tools are ONLY passed natively via the provider's `tools` parameter,
   * avoiding duplicate tool definitions (~30K tokens savings per call).
   * Default: false (backward compatible — tool schemas are injected into system prompt).
   */
  skipToolPromptInjection?: boolean;

  /**
   * ## Extended Thinking Options
   *
   * NeuroLink provides multiple ways to configure extended thinking/reasoning.
   * These options interact as follows:
   *
   * ### Option Hierarchy (Priority: thinkingConfig > individual options)
   *
   * 1. **`thinkingConfig`** (recommended) - Full configuration object, highest priority
   * 2. **`thinking`**, **`thinkingBudget`**, **`thinkingLevel`** - Simplified CLI-friendly options
   *
   * When both are provided, `thinkingConfig` takes precedence. The simplified options
   * are automatically merged into `thinkingConfig` internally.
   *
   * ### Provider-Specific Behavior
   *
   * **Anthropic Claude (claude-3-7-sonnet, etc.):**
   * - Use `thinkingConfig.budgetTokens` or `thinkingBudget`
   * - Range: 5000-100000 tokens
   * - `thinkingLevel` is ignored for Anthropic
   *
   * **Google Gemini 3 (gemini-3.1-pro-preview, gemini-3-flash-preview):**
   * - Use `thinkingConfig.thinkingLevel` or `thinkingLevel`
   * - Levels: minimal, low, medium, high
   * - `budgetTokens` is ignored for Gemini (uses level-based allocation)
   *
   * ### Option Compatibility Matrix
   *
   * | Option         | Anthropic | Gemini 3 | Other Providers |
   * |----------------|-----------|----------|-----------------|
   * | thinking       | Yes       | Yes      | Ignored         |
   * | thinkingBudget | Yes       | Ignored  | Ignored         |
   * | thinkingLevel  | Ignored   | Yes      | Ignored         |
   * | thinkingConfig | Yes       | Yes      | Ignored         |
   *
   * ### Examples
   *
   * ```typescript
   * // Simplified (CLI-friendly) - Anthropic
   * { thinking: true, thinkingBudget: 10000 }
   *
   * // Simplified (CLI-friendly) - Gemini 3
   * { thinking: true, thinkingLevel: "high" }
   *
   * // Full config (recommended for SDK)
   * { thinkingConfig: { enabled: true, budgetTokens: 10000 } } // Anthropic
   * { thinkingConfig: { thinkingLevel: "high" } }              // Gemini 3
   * ```
   */

  /**
   * Enable extended thinking capability (simplified option).
   * Equivalent to `thinkingConfig.enabled = true`.
   * Works with both Anthropic and Gemini 3 models.
   */
  thinking?: boolean;

  /**
   * Token budget for thinking (Anthropic models only).
   * Equivalent to `thinkingConfig.budgetTokens`.
   * Range: 5000-100000 tokens. Ignored for Gemini models.
   */
  thinkingBudget?: number;

  /**
   * Thinking level for Gemini 3 models only.
   * Equivalent to `thinkingConfig.thinkingLevel`.
   * - `minimal` - Near-zero thinking (Flash only)
   * - `low` - Light reasoning
   * - `medium` - Balanced reasoning/latency
   * - `high` - Deep reasoning (Pro default)
   * Ignored for Anthropic models.
   */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";

  /**
   * Full thinking/reasoning configuration (recommended for SDK usage).
   * Takes precedence over simplified options (thinking, thinkingBudget, thinkingLevel).
   *
   * @see Above documentation for provider-specific behavior and option compatibility.
   */
  thinkingConfig?: {
    /** Enable extended thinking. Default: false */
    enabled?: boolean;
    /** Explicit enable/disable type. Alternative to `enabled` boolean. */
    type?: "enabled" | "disabled";
    /** Token budget for thinking (Anthropic: 5000-100000). Ignored for Gemini. */
    budgetTokens?: number;
    /** Thinking level (Gemini 3: minimal|low|medium|high). Ignored for Anthropic. */
    thinkingLevel?: "minimal" | "low" | "medium" | "high";
  };

  /**
   * Per-provider credential overrides for this request.
   * Overrides instance-level credentials set in `new NeuroLink({ credentials })`.
   * Unset providers fall through to instance credentials, then environment variables.
   */
  credentials?: NeurolinkCredentials;

  /**
   * Optional request identifier for observability and log correlation.
   * When provided, this ID is forwarded to spans, logs, and telemetry so
   * callers can correlate generation traces back to their own request lifecycle.
   */
  requestId?: string;
};

/**
 * Text generation result (consolidated from core types)
 */
export type TextGenerationResult = {
  content: string;
  finishReason?: string;
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
  /** STT transcription result (present when stt input was processed) */
  transcription?: STTResult;
  /** Video generation result */
  video?: VideoGenerationResult;
  /** PowerPoint generation result */
  ppt?: PPTGenerationResult;
  /** Image generation output */
  imageOutput?: { base64: string } | null;
  /** Gemini 3 thought signature for reasoning continuity across turns */
  thoughtSignature?: string;
  // NL-007: Retry metadata for observability
  retries?: {
    count: number;
    errors: Array<{ code: string; message: string }>;
  };
};

/**
 * Enhanced result type with optional analytics/evaluation
 */
export type EnhancedGenerateResult = GenerateResult & {
  analytics?: AnalyticsData;
  evaluation?: EvaluationData;
};

/**
 * NL-004: Model alias/deprecation configuration.
 * Allows mapping deprecated model names to their replacements.
 */
export type ModelAliasConfig = {
  aliases: Record<
    string,
    {
      target: string;
      action: "warn" | "redirect" | "block";
      reason?: string;
    }
  >;
};

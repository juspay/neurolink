import type { AIProviderName } from "../constants/enums.js";
import type { EvaluationData } from "./evaluation.js";
import type { RAGConfig } from "./rag.js";
import type {
  KnowledgeGroundingMetadata,
  KnowledgeRequestScope,
} from "./knowledge.js";
import type { SkillsCallOptions } from "./skills.js";
import type {
  AnalyticsData,
  ToolExecutionEvent,
  ToolExecutionSummary,
} from "../types/index.js";
import type {
  MiddlewareFactoryOptions,
  OnChunkCallback,
  OnErrorCallback,
  OnFinishCallback,
} from "../types/middleware.js";
import type { TokenUsage } from "./analytics.js";
import type { JsonValue, UnknownRecord } from "./common.js";
import type {
  TerminalAgentModeOption,
  TerminalAgentModeVersion,
} from "./agentMode.js";
import type { Content, ImageWithAltText } from "./content.js";
import type { ChatMessage } from "./conversation.js";
import type { StreamNoOutputSentinel } from "./noOutputSentinel.js";
import type {
  AdditionalMemoryUser,
  GenerateStopReason,
  TTSMetadata,
  ToolExecutionCaptureOptions,
} from "./generate.js";
import type {
  AIModelProviderConfig,
  NeurolinkCredentials,
} from "./providers.js";
import type { TTSChunk, TTSOptions, TTSResult } from "./tts.js";
import type { STTOptions, STTResult } from "./stt.js";
import type { StandardRecord, ValidationSchema } from "./aliases.js";
import type {
  CSVProcessorOptions,
  FileWithMetadata,
  VisionImageOutputFormat,
} from "./file.js";
import type { WorkflowConfig } from "./workflow.js";
import type { LanguageModel, StepResult } from "./providers.js";
import type { Tool, ToolChoice } from "./tools.js";
import type { ProcessorPipelineConfig } from "./ioProcessor.js";

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
export type StreamToolCall = {
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
export type StreamToolResult = {
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
export type ToolCallResults = Array<StreamToolResult>;

/**
 * Tool Calls Array - High Reusability
 */
export type ToolCalls = Array<StreamToolCall>;

// StreamAnalyticsData — canonical definition in analytics.ts

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
 *   if (chunk.type === "tts_audio") {
 *     audioBuffer.push(chunk.audio.data); // TypeScript knows 'audio' exists
 *     if (chunk.audio.isFinal) {
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
 *     case "tts_audio":
 *       playAudioChunk(chunk.audio.data);
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
      /** Discriminator for synthesized TTS audio chunks. Uses `tts_audio`
       *  (not `audio`) to avoid colliding with realtime AudioChunk and to
       *  match the runtime shape emitted by `BaseProvider.stream()`. */
      type: "tts_audio";
      /** TTS audio chunk data */
      audio: TTSChunk;
    };

/** Provider-level chunks accepted by NeuroLink's core streaming pipeline. */
export type ProviderStreamChunk =
  | { content: string }
  | { type: "audio"; audio: AudioChunk }
  | { type: "tts_audio"; audio: TTSChunk }
  | { type: "image"; imageOutput: { base64: string } };

/**
 * What a `beforeStep` callback is told at a step boundary.
 *
 * The boundary is reached only after that step's tool results have settled and
 * been written into the conversation, and before the step cap is re-checked —
 * so a decision taken here applies to the NEXT step of the SAME turn, never to
 * a step already in flight.
 */
export type ExecutionControlStepContext = {
  /** Zero-based index of the step that just settled. */
  stepIndex: number;
  /** Steps that have completed in this turn, including the one that just settled. */
  stepsCompleted: number;
  /** The step cap currently in force — the number a renewal must exceed. */
  maxSteps: number;
  /** Milliseconds since the turn's first request was built. */
  elapsedMs: number;
  /** Names of the tools dispatched on the step that just settled, in order. */
  toolNames: string[];
  /**
   * Fires when the turn is cancelled or the callback outlives its own budget.
   * A callback that does real work (reading a live budget, asking a service)
   * must honour it — the turn does not wait for a callback that ignores it.
   */
  signal: AbortSignal;
};

/**
 * What a `beforeStep` callback may change about the rest of the turn.
 *
 * Returning nothing is a decision too: it declines the renewal, so the
 * existing cap stands and a turn that has reached it ends as a step-limit
 * outcome exactly as it would with no callback at all.
 */
export type ExecutionControlDecision = {
  /**
   * A new absolute step cap. Must be finite and greater than the cap in force;
   * anything else is ignored, so a callback cannot shorten a turn by returning
   * a smaller number or unbound one by returning Infinity.
   */
  maxSteps?: number;
  /**
   * A planning nudge appended to the conversation before the next step, in the
   * same loop and the same history — this is how a caller tells the model that
   * its budget changed without restarting the turn.
   */
  nudge?: string;
};

/**
 * Opt-in execution policy for one streamed turn. Supported only on the native
 * Anthropic stream path today; any other provider REJECTS it rather than
 * ignoring it, because silently dropping a policy the caller set is how a turn
 * ends at a limit its owner believed it had removed.
 *
 * Absent, none of the turn-level policy here applies: the turn is bounded by
 * `timeout` / `turnTimeoutMs` / `maxSteps` as it always was.
 *
 * One thing is NOT conditional on this option, and it is worth stating because
 * it changed: the agentic engine bounds every tool call, at
 * `toolTimeoutMs` or the 300s default, whether or not `executionControl` is
 * present. Loops that previously ran tools with no per-tool timer at all — the
 * Bedrock and Google AI Studio paths — therefore acquired one. A caller that
 * relied on unbounded tool execution says so with `toolTimeoutMs: null`, which
 * restores exactly the old behaviour.
 */
export type ExecutionControlOptions = {
  /**
   * Hard deadline for a single HTTP request (ms). Required, finite, positive.
   *
   * This is the floor that makes the rest of the contract safe: whatever the
   * turn-level policy is — including no lifetime ceiling at all — a stalled
   * upstream is always caught here, with the timer's own identity on the
   * error. A step boundary cannot reset a deadline already running.
   */
  requestTimeoutMs: number;
  /**
   * The turn's wall-clock ceiling (ms).
   *
   * - `null` — no lifetime timer is armed at all. This is the case that cannot
   *   be expressed any other way: a very large number is still a ceiling, and
   *   it fires eventually, in the middle of work, dressed as a cancel. With no
   *   lifetime timer the per-tool deadline is the turn's last bound, so
   *   `toolTimeoutMs: null` is refused alongside it.
   * - a finite positive number — an explicit cap, reported as `time-limit`.
   * - `0`, negative, or non-finite — rejected.
   * - absent — the legacy handling (`turnTimeoutMs`, else the provider
   *   timeout) is inherited untouched.
   *
   * Set to anything other than absent, this OWNS the turn's lifetime timer, so
   * a `turnTimeoutMs` on the same request would be read by nothing. That
   * combination is rejected rather than silently resolved — set one or the
   * other. Note that "absent" means the property is not there AND that it is
   * present holding `undefined`: both say "no opinion", and both inherit.
   */
  lifetimeTimeoutMs?: number | null;
  /**
   * Runs at each step boundary. May renew the step cap and append a planning
   * nudge. It is itself bounded by `beforeStepTimeoutMs` and cancelled with
   * the turn; a callback that throws, or outlives its budget, is treated as
   * declining to renew.
   */
  beforeStep?: (
    context: ExecutionControlStepContext,
  ) =>
    | ExecutionControlDecision
    | undefined
    | Promise<ExecutionControlDecision | undefined>;
  /**
   * Bound on `beforeStep` itself (ms, finite and positive; default 30_000).
   * A boundary callback sits between two model calls, so an unbounded one
   * stalls the turn in a place no other timer is watching.
   */
  beforeStepTimeoutMs?: number;
};

export type StreamOptions = {
  /**
   * Fraction of the model's context window at which compaction runs for this
   * request, replacing the 0.8 default.
   *
   * A request that needs only the current message does not need the whole
   * window kept warm for it, and compacting earlier is free; a request that
   * depends on the entire conversation should compact as late as possible.
   * When the classifier router runs with a decision model it fills this in
   * per request — always at or below the default, never above, because a
   * request that overflows the window fails hard and `ModelPool` records that
   * failure as a permanent cooldown.
   */
  compactionThreshold?: number;
  /**
   * Opt this stream call into the knowledge grounding configured on the
   * NeuroLink instance. Defaults to `false` when omitted.
   */
  useKnowledgeGrounding?: boolean;

  /**
   * Enabled integrations used to scope knowledge retrieval for this turn.
   * Used only when `useKnowledgeGrounding` is true and knowledge grounding is
   * enabled on the NeuroLink instance.
   */
  knowledgeContext?: KnowledgeRequestScope;

  input: {
    /** Prompt text. Optional for media-only modes (avatar, music) that are driven by uploaded files rather than a prompt. */
    text?: string;
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
    audioFiles?: Array<Buffer | string>; // Explicit audio files (metadata/transcript extraction)
    videoFiles?: Array<Buffer | string>; // Explicit video files
    files?: Array<Buffer | string | FileWithMetadata>; // Auto-detect file types
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

  // CSV processing options (#379: canonical shape — see CSVProcessorOptions)
  csvOptions?: CSVProcessorOptions;

  /** PDF processing options (#258). */
  pdfOptions?: {
    /** Password for an encrypted PDF (image-conversion fallback path). */
    password?: string;
    /** Max rendered-canvas pixels per page (#260 memory guard); oversized pages auto-downscale. */
    maxCanvasPixels?: number;
    /**
     * Render scale for the image fallback used by providers without native PDF
     * support (#297). Higher is sharper but costs roughly the square in memory
     * and tokens. Range 0.1-10; defaults to PDF_LIMITS.DEFAULT_SCALE (1.5).
     */
    scale?: number;
    /**
     * Max pages converted by the image fallback (#297). Pages beyond this are
     * not sent to the model at all. Defaults to PDF_LIMITS.DEFAULT_MAX_PAGES (20).
     */
    maxPages?: number;
  };

  /**
   * Options for images that need transcoding before a vision provider can
   * read them (HEIC, TIFF, BMP, ICO, JPEG 2000, AVIF — see
   * `adapters/imageFormatSupport.ts`). Mirrors `GenerateOptions.imageOptions`.
   */
  imageOptions?: {
    /**
     * Transcode target for an incompatible image. Defaults to `"png"` — the
     * module's own default, unchanged unless a caller opts in here.
     */
    outputFormat?: VisionImageOutputFormat;
  };

  // Video processing options
  videoOptions?: {
    /** Frames to extract. Unset lets VideoProcessor pick from the clip's duration; clamped to 100. */
    frames?: number;
    /** Frame encoder quality, clamped to 1-100. Default 80. */
    quality?: number;
    /** Frame encoding. Default jpeg. */
    format?: "jpeg" | "png";
    /** Not implemented yet (#433) — warns rather than silently doing nothing. */
    transcribeAudio?: boolean;
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
   *   } else if (chunk.type === "tts_audio") {
   *     // Handle audio chunk
   *     playAudioChunk(chunk.audio.data);
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
   * Speech-to-Text (STT) configuration for streaming
   *
   * When enabled, audio from `stt.audio` is transcribed before streaming begins.
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
   * @example Gemini 3 with thinking level (streaming)
   * ```typescript
   * const result = await neurolink.stream({
   *   input: { text: "Solve this complex problem..." },
   *   provider: "google-ai",
   *   model: "gemini-3.1-pro-preview",
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
  /** Top-p (nucleus) sampling parameter. Controls diversity of generated tokens. */
  topP?: number;
  /** Top-k sampling parameter. Limits the number of tokens considered. (Google/Gemini models only) */
  topK?: number;
  /** Stop sequences that will halt generation when encountered. */
  stopSequences?: string[];
  systemPrompt?: string;
  /** Opt-in terminal agent mode. See GenerateOptions.agentMode. */
  agentMode?: TerminalAgentModeOption;
  schema?: ValidationSchema;
  tools?: Record<string, Tool>;
  timeout?: number | string;
  /** Wall-clock cap for the whole agentic turn (ms). See GenerateOptions.turnTimeoutMs. */
  turnTimeoutMs?: number;
  /**
   * Opt-in execution policy for this turn (native Anthropic streaming only).
   * See ExecutionControlOptions. Absent means the legacy bounds apply
   * unchanged; present on any other provider is an error, not a no-op.
   *
   * Two consequences of that "error, not a no-op" stance are worth knowing
   * before you set it:
   *
   * - **It is incompatible with provider fallback.** Only the native Anthropic
   *   stream path implements the contract, so a turn that falls back to any
   *   other provider — internal fallback, or a configured fallback chain —
   *   fails there with a ValidationError instead of being served without the
   *   policy. That is deliberate: a fallback that silently dropped the policy
   *   would produce exactly the invisible ceiling this option exists to
   *   remove. Pair it with `disableInternalFallback: true` when you want the
   *   turn to stay on Anthropic, and handle the error if you do not.
   * - **It cannot be combined with `turnTimeoutMs`** when it sets
   *   `lifetimeTimeoutMs`, because both name the turn's wall-clock ceiling and
   *   only one of them can win. Supplying both is rejected up front rather
   *   than resolved in silence.
   * - **`lifetimeTimeoutMs: null` cannot be combined with
   *   `toolTimeoutMs: null`.** Removing the turn's ceiling leaves the per-tool
   *   deadline as the only thing that will ever end a tool which never
   *   returns; removing that as well leaves the turn with no bound anywhere.
   *   Also rejected up front.
   */
  executionControl?: ExecutionControlOptions;
  /** Max time with no progress before the turn ends as "stalled" (ms). Native Vertex loops only — see GenerateOptions.stallTimeoutMs. */
  stallTimeoutMs?: number;
  /** Remaining-time threshold that triggers the wrap-up nudge (ms). See GenerateOptions.wrapupTimeLeadMs. */
  wrapupTimeLeadMs?: number;
  /** Per-tool-execution timeout (ms, default 300_000; `null` for no bound). See GenerateOptions.toolTimeoutMs. */
  toolTimeoutMs?: number | null;
  /** AbortSignal for external cancellation of the AI call */
  abortSignal?: AbortSignal;
  /** Bounds for tool execution capture. See GenerateOptions.toolExecutionCapture. */
  toolExecutionCapture?: ToolExecutionCaptureOptions;
  disableTools?: boolean;
  /** Disable the schema-driven tool call repair mechanism (BZ-665). Default: false (repair enabled). */
  disableToolCallRepair?: boolean;
  maxSteps?: number; // Maximum tool execution steps. Defaults to 5 in the implementation if not specified.
  /** Directories the built-in file tools may touch for this call; see GenerateOptions.toolRoots; can only narrow tools.fileRoots. */
  toolRoots?: string[];

  /**
   * Tool choice configuration for streaming generation.
   * Mirrors generate() so translated/fallback requests can preserve forced tool use.
   */
  toolChoice?: ToolChoice<Record<string, Tool>>;

  /**
   * Optional callback that runs before each stream step in a multi-step generation.
   */
  prepareStep?: (options: {
    steps: StepResult<Record<string, Tool>>[];
    stepNumber: number;
    maxSteps: number;
    model: LanguageModel;
  }) => PromiseLike<
    | {
        toolChoice?: ToolChoice<Record<string, Tool>>;
        activeTools?: Record<string, Tool>;
      }
    | undefined
  >;

  /** Include only these tools by name (whitelist). If set, only matching tools are available. */
  toolFilter?: string[];

  /**
   * Filter available tools by name.
   * Used by dynamic arguments to dynamically select which tools to enable.
   * Merged into `toolFilter` before tool filtering runs.
   */
  enabledToolNames?: string[];

  /** Exclude these tools by name (blacklist). Applied after toolFilter. */
  excludeTools?: string[];

  /** Disable tool result caching for this request (overrides global mcp.cache.enabled) */
  disableToolCache?: boolean;

  /**
   * Disable NeuroLink's internal provider fallback for this request.
   * Used by the Claude proxy so the proxy itself can own fallback order.
   */
  disableInternalFallback?: boolean;

  /**
   * Whether a turn that ended at the caller's own `maxSteps` bound may still
   * trigger the internal no-output provider fallback. Reaching `maxSteps` is
   * a budget the caller set, not a provider failure, but such a turn can end
   * with no text output and would otherwise be retried on a different
   * provider — spending that provider's tokens because the caller's own
   * budget ran out. Set `false` to surface the capped turn as-is
   * (`metadata.stopReason === "step-cap"`). Default (unset/true) preserves
   * the existing fallback behaviour.
   */
  fallbackOnMaxSteps?: boolean;

  /**
   * Skip injecting tool schemas into the system prompt.
   * When true, tools are ONLY passed natively via the provider's `tools` parameter,
   * avoiding duplicate tool definitions (~30K tokens savings per call).
   * Default: false (backward compatible — tool schemas are injected into system prompt).
   */
  skipToolPromptInjection?: boolean;

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
  workflowConfig?: WorkflowConfig; // Or inline workflow config

  enableSummarization?: boolean; // Enable/disable summarization for this specific request

  /**
   * Maximum cumulative cost (USD) for this session.
   * Once the session spend reaches this limit, subsequent stream() calls
   * will throw a SESSION_BUDGET_EXCEEDED error instead of making API calls.
   *
   * @example
   * ```typescript
   * const result = await neurolink.stream({
   *   input: { text: "Summarize this" },
   *   maxBudgetUsd: 1.00
   * });
   * ```
   */
  maxBudgetUsd?: number;

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
  /** BZ-1341: Override fallback provider name (takes precedence over env/model config). */
  fallbackProvider?: string;
  /** BZ-1341: Override fallback model name (takes precedence over env/model config). */
  fallbackModel?: string;

  /** Callback invoked when streaming completes successfully. */
  onFinish?: OnFinishCallback;

  /** Callback invoked when streaming encounters an error. */
  onError?: OnErrorCallback;

  /** Callback invoked for each streaming chunk. */
  onChunk?: OnChunkCallback;

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
   * Invoked for any error thrown while establishing the stream, except a
   * genuine caller cancel — i.e. this call's `abortSignal` fired (network
   * errors, 5xx, timeouts, auth failures, model-access-denied, and
   * internal watchdog aborts all invoke it); receives the error
   * unmodified. There is no mid-stream resume once chunks are flowing.
   * Return `{ provider, model }` to retry, `null` to bubble.
   */
  providerFallback?: (
    error: unknown,
  ) => Promise<{ provider?: string; model?: string } | null>;

  /**
   * Curator P2-3: per-call ordered model chain. Overrides any
   * instance-level `modelChain`. Without an explicit `providerFallback`
   * callback the chain only advances on model-access-denied errors —
   * other failures (network, 5xx, timeouts) bubble immediately.
   */
  modelChain?: string[];

  /**
   * Per-call memory control.
   *
   * Override the global memory SDK behavior for this specific call.
   * All flags default to `true` when the global memory SDK is enabled.
   * If the global memory SDK is disabled, these flags have no effect.
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

  /** PII detection — scans and optionally redacts PII from input before the LLM call. */
  piiDetection?: {
    enabled?: boolean;
    action?: "redact" | "abort" | "warn";
    detectTypes?: Array<
      | "email"
      | "phone"
      | "ssn"
      | "creditCard"
      | "ipAddress"
      | "address"
      | "name"
      | "dateOfBirth"
      | "passport"
      | "driversLicense"
    >;
    customPatterns?: RegExp[];
    allowList?: string[];
    redactionText?: string;
  };

  /** Response validation — validates accumulated stream content after completion. */
  responseValidation?: {
    minLength?: number;
    maxLength?: number;
    requiredPhrases?: string[];
    forbiddenPhrases?: string[];
    jsonSchema?: Record<string, unknown>;
    customValidator?: (text: string) => {
      category: string;
      severity: "error" | "warning" | "info";
      message: string;
    } | null;
    truncationAction?: "abort" | "retry" | "truncate" | "warn";
    truncationSuffix?: string;
    retryOnFailure?: boolean;
    maxRetries?: number;
  };

  /** Input validation — validates input text before any processing. */
  inputValidation?: {
    trimWhitespace?: boolean;
    minLength?: number;
    maxLength?: number;
    requireContent?: boolean;
  };

  /** @deprecated Use `piiDetection`, `responseValidation`, and `inputValidation` instead. */
  processors?: ProcessorPipelineConfig;

  /**
   * Per-call skills control. Only effective when the instance was
   * constructed with `skills.enabled: true`. Lets a call disable the
   * prompt index, or narrow it by scope/tags. Per-call wins over
   * instance config.
   */
  skills?: SkillsCallOptions;
};

/**
 * Stream function result type - Primary output format for streaming
 * Future-ready for multi-modal outputs while maintaining text focus
 */
export type StreamResult = {
  /** Knowledge-grounding diagnostics for this turn (present only when grounding ran). */
  knowledge?: KnowledgeGroundingMetadata;
  /** Terminal agent instructions version applied (present only with `agentMode`). */
  agentModeVersion?: TerminalAgentModeVersion;
  stream: AsyncIterable<
    | { content: string; reasoning?: string }
    | StreamNoOutputSentinel
    | { type: "audio"; audio: AudioChunk }
    | { type: "tts_audio"; audio: TTSChunk }
    | { type: "image"; imageOutput: { base64: string } }
    | { content: string; type?: "preliminary" | "final" }
  >; // text chunks (with optional workflow stage), no-output sentinel, or audio/image events.
  // Reasoner models (deepseek-reasoner/R1, NVIDIA NIM reasoning, o-series via
  // gateways) interleave `{ content: "", reasoning: <delta> }` chunks; the
  // `content` field is always present so plain-text consumers are unaffected.
  // NOTE: `type: "audio"` is realtime/Gemini PCM (`AudioChunk` shape).
  // `type: "tts_audio"` is synthesized TTS output (`TTSChunk` shape, with format/index/voice).

  // Provider information
  provider?: string;
  model?: string;

  // Usage information
  usage?: TokenUsage;

  // Finish reason
  finishReason?: string;

  /**
   * Why the agentic turn ended (see GenerateStopReason). For background-loop
   * streams (the native Vertex paths and the native Anthropic stream path)
   * prefer `metadata.stopReason` after draining the stream — this top-level
   * field may be a getter that resolves late, and wrapper spreads can
   * snapshot it before the loop finishes.
   */
  stopReason?: GenerateStopReason;
  /** Verbatim provider finish/stop reason for the turn's terminal model call. */
  rawFinishReason?: string;

  // Tool integration (from Vercel AI SDK)
  toolCalls?: StreamToolCall[]; // Tool calls made during generation
  toolResults?: StreamToolResult[]; // Results from tool execution

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
    // Resolved finish reason for background-loop streams. Lives on metadata
    // (a mutable reference the loop fills in) because result-object spreads
    // in stream wrappers snapshot top-level getters before the loop resolves.
    finishReason?: string;
    // Resolved turn stop reason / raw provider finish reason / step count —
    // same mutable-reference contract as `finishReason` above: read them
    // after draining the stream.
    stopReason?: GenerateStopReason;
    rawFinishReason?: string;
    stepsUsed?: number;
    /**
     * Parsed structured output for a `stream({ schema })` turn, available
     * AFTER the stream has been drained.
     *
     * Lives on metadata for the same reason `finishReason` above does: it is a
     * mutable reference the loop fills in, so result-object spreads in stream
     * wrappers cannot snapshot it before it resolves. A plain field rather than
     * a promise, deliberately — when a middleware short-circuits the request
     * and the loop never runs, an unresolved promise would hang every reader,
     * whereas an absent field is simply absent. Readers must tolerate that:
     * absence means the model never produced the object.
     */
    structuredData?: unknown;
    /**
     * Tokens spent by the tool-free re-ask that produced `structuredData`,
     * when one was needed.
     *
     * That re-ask is a second, separately-billed model call, and the stream's
     * own `usage` has already resolved by the time it runs — so folding these
     * tokens into it would mutate a value a caller may have read, and leaving
     * them out entirely would under-report what the turn cost. Reported here
     * instead: same delivery as `structuredData`, filled at the same moment,
     * read at the same moment. Absent when no re-ask was needed, which is the
     * common case. The generate path accounts for its equivalent re-ask
     * inline, since there the usage has not been handed out yet.
     */
    structuredDataUsage?: {
      inputTokens: number;
      outputTokens: number;
    };
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

  /** STT transcription result (when stt option is used) */
  transcription?: STTResult;

  /**
   * Streaming TTS result (when `tts.enabled`). `stream()` synthesizes the AI
   * response incrementally; `useAiResponse` continues to select input vs
   * response synthesis for non-streaming generation.
   * Resolves with the synthesized audio after the caller drains `stream` to
   * completion; like other stream-final fields, it remains pending while the
   * lazy stream is unconsumed. It resolves with the aggregate of whatever
   * segments were synthesized: a synthesis failure part-way through still
   * resolves with the earlier segments rather than discarding them. It resolves
   * to undefined only when no segment was produced — TTS was not enabled, no
   * handler resolved for the requested provider, the model stream errored, every
   * synthesis failed, or the caller stopped draining `stream` before it ended
   * (an abandoned stream settles undefined rather than a partial aggregate).
   * Audio is also yielded incrementally as ordered
   * `tts_audio` chunks. Each chunk, including the final one, contains only its
   * own buffered segment. The aggregate is a byte concatenation of those
   * independently synthesized segments, so what it is depends on the format's
   * framing: for frame- or sample-stream formats (`mp3`, `mpeg`, `mpga`,
   * `pcm16`) it is one playable stream; for header-bearing container formats
   * (`wav`, `flac`, `m4a`, `mp4`, `webm`) it is not a valid file, because each
   * segment carries its own header; for `ogg`/`opus` it is a chained stream that
   * some decoders read only through its first segment. Use the individual chunk
   * buffers when each segment must be a valid container file.
   */
  audio?: Promise<TTSResult | undefined>;

  /**
   * Outcome metadata for streaming TTS synthesis. This is a mutable reference
   * whose success and latency fields are finalized asynchronously; read it
   * after draining `stream`.
   */
  ttsMetadata?: TTSMetadata;
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
 * Stream text result from AI SDK (compatible with both v4 and v6)
 *
 * AI SDK v6 changed Promise → PromiseLike and renamed usage fields
 * (promptTokens → inputTokens, completionTokens → outputTokens).
 * This type accepts either shape so callers don't need casts.
 */
export type StreamTextResult = {
  textStream: AsyncIterable<string>;
  fullStream?: AsyncIterable<unknown>;
  text: PromiseLike<string>;
  usage: PromiseLike<AISDKUsage | undefined>;
  response: PromiseLike<
    | {
        id?: string;
        model?: string;
        timestamp?: number | Date;
      }
    | undefined
  >;
  finishReason: PromiseLike<
    | "stop"
    | "length"
    | "content-filter"
    | "tool-calls"
    | "error"
    | "other"
    | "unknown"
  >;
  /**
   * Tool results. Accepts both NeuroLink StreamToolResult[] and AI SDK TypedToolResult[],
   * since the analytics collector passes them through as `unknown` anyway.
   */
  toolResults?: PromiseLike<StreamToolResult[] | ReadonlyArray<unknown>>;
  /**
   * Tool calls. Accepts both NeuroLink StreamToolCall[] and AI SDK TypedToolCall[].
   */
  toolCalls?: PromiseLike<StreamToolCall[] | ReadonlyArray<unknown>>;
};

/**
 * Raw usage data from Vercel AI SDK.
 *
 * Covers both v4 (promptTokens / completionTokens) and
 * v6 (inputTokens / outputTokens) field names.
 * extractTokenUsage() in tokenUtils.ts already handles both shapes.
 */
export type AISDKUsage = {
  /** @deprecated AI SDK v4 name — use inputTokens */
  promptTokens?: number;
  /** @deprecated AI SDK v4 name — use outputTokens */
  completionTokens?: number;
  /** @deprecated AI SDK v4 name — use totalTokens */
  totalTokens?: number;
  /** AI SDK v6 name for prompt / input tokens */
  inputTokens?: number;
  /** AI SDK v6 name for completion / output tokens */
  outputTokens?: number;
  [key: string]: unknown;
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

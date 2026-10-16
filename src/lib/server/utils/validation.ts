/**
 * Request Validation Utilities
 * Provides Zod schemas and validation helpers for server routes
 */

import { z } from "zod";
import type {
  ErrorResponse,
  ServerValidationResult,
} from "../../types/index.js";

// ============================================
// Validation Schemas
// ============================================

/**
 * Agent execute request schema
 */
export const AgentExecuteRequestSchema = z.object({
  input: z.union([
    z.string(),
    z.object({
      text: z.string(),
      images: z.array(z.string()).optional(),
      files: z.array(z.string()).optional(),
    }),
  ]),
  provider: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Options a WebSocket `generate`/`stream` message may pass through to
 * `neurolink.generate()`/`.stream()`. Deliberately an allowlist, not the full
 * `GenerateOptions`/`StreamOptions` shape: the raw client JSON is untrusted,
 * and `GenerateOptions.credentials` in particular carries a per-provider
 * `baseURL` (see `NeurolinkCredentials`) that would otherwise let any caller
 * redirect the server's own outbound request to an arbitrary host (SSRF) or
 * swap in their own API key. `z.object` strips unknown keys by default, so
 * `credentials` and anything else outside this list never reaches the SDK
 * call — the same posture `AgentExecuteRequestSchema` already takes for the
 * equivalent HTTP route.
 */
export const WebSocketAgentOptionsSchema = z.object({
  provider: z.string().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  maxSteps: z.number().positive().optional(),
});

/**
 * WebSocket `generate`/`stream` message payload schema.
 */
export const WebSocketAgentRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  options: WebSocketAgentOptionsSchema.optional(),
});

/**
 * Tool execute request schema
 */
export const ToolExecuteRequestSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  arguments: z.record(z.string(), z.unknown()).default({}),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

/**
 * Tool arguments schema (for direct tool execution)
 */
export const ToolArgumentsSchema = z.record(z.string(), z.unknown());

/**
 * Memory session ID parameter schema
 */
export const SessionIdParamSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

/**
 * MCP server name parameter schema
 */
export const ServerNameParamSchema = z.object({
  name: z.string().min(1, "Server name is required"),
});

/**
 * Tool name parameter schema
 */
export const ToolNameParamSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
});

/**
 * Tool search query schema
 */
export const ToolSearchQuerySchema = z.object({
  q: z.string().optional(),
  source: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional(),
});

/**
 * Generic ID parameter schema (for session endpoints using :id)
 */
export const IdParamSchema = z.object({
  id: z.string().min(1, "Session ID is required"),
});

/**
 * Sessions list query schema (with optional pagination and filtering)
 */
export const SessionsListQuerySchema = z.object({
  userId: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),
});

/**
 * Session messages query schema (for pagination)
 */
export const SessionMessagesQuerySchema = z.object({
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(100))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().nonnegative())
    .optional(),
});

/**
 * Embed request schema (single text)
 */
export const EmbedRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  provider: z.string().optional(),
  model: z.string().optional(),
});

/**
 * Embed many request schema (batch texts)
 */
export const EmbedManyRequestSchema = z.object({
  texts: z
    .array(z.string().min(1))
    .min(1, "At least one text is required")
    .max(2048, "Maximum 2048 texts per batch"),
  provider: z.string().optional(),
  model: z.string().optional(),
});

/**
 * Skill create request schema
 */
export const SkillCreateRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayName: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  instructions: z.string().min(1, "Instructions are required"),
  tags: z.array(z.string()).optional(),
  scope: z.enum(["global", "scoped"]).optional(),
  scopeIds: z.array(z.string()).optional(),
  requestedBy: z.string().optional(),
});

/**
 * Skill update request schema — all fields optional (patch semantics)
 */
export const SkillUpdateRequestSchema = SkillCreateRequestSchema.partial();

/**
 * One dictionary entry for transcription: correct spelling, mis-hearings, meaning.
 */
export const TranscribeDictionaryEntrySchema = z.object({
  term: z.string().trim().min(1, "term is required"),
  heardAs: z.array(z.string()).max(64).optional(),
  meaning: z.string().max(2000).optional(),
});

const sttProviderName = z.string().min(1).max(100);

/** A BCP-47 output tag (`es`, `fr-CA`, `hi-Latn`, `zh-Hant`) or `source`. */
export const TranscribeOutputLanguageSchema = z
  .string()
  .trim()
  .regex(
    /^(?:source|[A-Za-z]{2,3}(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|\d{3}))?)$/u,
    "must be a BCP-47 tag such as es, fr-CA or hi-Latn, or source",
  );

/** Output languages and how they are rendered. */
export const TranscribeOutputSchema = z.object({
  languages: z.array(TranscribeOutputLanguageSchema).max(8),
  provider: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(200).optional(),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  contextUtterances: z.number().int().min(0).max(10).optional(),
  glossary: z.boolean().optional(),
});

/** A text frame on the transcribe WebSocket after the config: change the output languages. */
export const TranscribeOutputControlSchema = z.object({
  type: z.literal("output"),
  languages: z.array(TranscribeOutputLanguageSchema).max(8),
});

/** A listener's frame on the session socket: which languages and speakers to follow. */
export const TranscribeSubscribeSchema = z.object({
  type: z.literal("subscribe"),
  languages: z.array(TranscribeOutputLanguageSchema).max(8).optional(),
  speakers: z.array(z.string().min(1).max(100)).max(64).optional(),
  backlog: z.boolean().optional(),
  interim: z.boolean().optional(),
});

/**
 * Engine and correction settings shared by `POST /agent/transcribe`, the
 * OpenAI-compatible route's extension fields and the transcribe WebSocket's
 * config frame. Unknown keys (including `credentials`) are stripped: a caller
 * cannot swap in its own key or point an engine at another host.
 */
const EvalTimeSchema = z.number().finite().nonnegative().nullish();

export const STTEvalSegmentSchema = z.object({
  id: z.string().min(1).max(200),
  source: z.enum(["primary", "shadow"]),
  model: z.string().max(200),
  participant_identity: z.string().max(500),
  participant_name: z.string().max(500).optional(),
  text: z.string().max(20_000),
  language: z.string().max(35).nullish(),
  start_time: EvalTimeSchema,
  end_time: EvalTimeSchema,
  received_at: z.number().finite().nonnegative(),
});

export const STTEvalBatchSchema = z.object({
  call_id: z.string().min(1).max(500),
  room: z.string().max(500).optional(),
  batch: z.number().int().nonnegative(),
  final: z.boolean().optional(),
  models: z.object({
    primary: z.string().max(200),
    shadow: z.string().max(200),
  }),
  segments: z.array(STTEvalSegmentSchema).max(5_000),
});

export const TranscribeConfigSchema = z.object({
  provider: sttProviderName.optional(),
  model: z.string().min(1).max(200).optional(),
  language: z.string().min(1).max(35).optional(),
  prompt: z.string().max(4000).optional(),
  dictionary: z.array(TranscribeDictionaryEntrySchema).max(500).optional(),
  correction: z
    .object({
      enabled: z.boolean().optional(),
      guard: z.enum(["decide", "none"]).optional(),
      decideTimeoutMs: z.number().int().positive().max(60_000).optional(),
      rewrite: z
        .union([
          z.literal(false),
          z.literal("auto"),
          z.object({
            provider: z.string().min(1).max(100).optional(),
            model: z.string().min(1).max(200).optional(),
            timeoutMs: z.number().int().positive().max(120_000).optional(),
            mode: z.enum(["auto", "always"]).optional(),
          }),
        ])
        .optional(),
      perSentence: z.boolean().optional(),
      transliterate: z.enum(["latin", "native"]).optional(),
      punctuate: z.boolean().optional(),
      cleanup: z.enum(["verbatim", "clean"]).optional(),
      secondOpinion: z
        .union([
          z.literal("auto"),
          z.object({
            provider: sttProviderName,
            model: z.string().min(1).max(200).optional(),
          }),
        ])
        .optional(),
      context: z.string().max(1000).optional(),
      maxDropRatio: z.number().min(0).max(1).optional(),
      contextUtterances: z.number().int().min(0).max(10).optional(),
    })
    .optional(),
  fallback: z
    .object({
      provider: sttProviderName,
      model: z.string().min(1).max(200).optional(),
      when: z.array(z.enum(["unsure", "empty", "error"])).optional(),
    })
    .optional(),
  routing: z
    .object({
      probe: z.boolean().optional(),
      lockAfterPasses: z.number().int().min(1).max(5).optional(),
      prior: z.enum(["carry", "none"]).optional(),
      engines: z
        .record(z.string().min(1).max(35), sttProviderName)
        .refine((engines) => Object.keys(engines).length <= 64, {
          message: "at most 64 routes",
        })
        .optional(),
    })
    .optional(),
  chunking: z.enum(["engine", "utterances"]).optional(),
  output: TranscribeOutputSchema.optional(),
  diarization: z.boolean().optional(),
  wordTimestamps: z.boolean().optional(),
  timeoutMs: z.number().int().positive().max(600_000).optional(),
});

/**
 * `POST /agent/transcribe` body: the config plus exactly one audio source.
 */
export const TranscribeRequestSchema = TranscribeConfigSchema.extend({
  audio: z.string().min(1).optional(),
  audioUrl: z.string().url().optional(),
  audioPath: z.string().min(1).optional(),
  format: z
    .enum([
      "mp3",
      "wav",
      "ogg",
      "opus",
      "m4a",
      "flac",
      "webm",
      "mp4",
      "mpeg",
      "mpga",
      "pcm16",
    ])
    .optional(),
}).refine(
  (body) =>
    [body.audio, body.audioUrl, body.audioPath].filter(
      (source) => source !== undefined,
    ).length === 1,
  { message: "Pass exactly one of audio, audioUrl or audioPath" },
);

/**
 * The transcribe WebSocket's first text frame: the config plus streaming tuning.
 */
export const TranscribeStreamConfigSchema = TranscribeConfigSchema.extend({
  /**
   * `"file"`: the socket carries a whole recording as fast as the client can
   * send it, not a microphone. No interim passes, utterances transcribed
   * several at a time, a failed final retried, file-sized engine timeouts and
   * shorter utterance cuts, with results per utterance as they finish.
   */
  mode: z.enum(["live", "file"]).optional(),
  streaming: z
    .object({
      mode: z.enum(["auto", "native", "chunked"]).optional(),
      sampleRate: z.number().int().min(8000).max(48000).optional(),
      endSilenceMs: z.number().positive().optional(),
      intervalMs: z.number().positive().optional(),
      softCutSeconds: z.number().positive().optional(),
      maxUtteranceSeconds: z.number().positive().optional(),
      onsetRms: z.number().positive().optional(),
      prerollMs: z.number().nonnegative().optional(),
      minSpeechMs: z.number().nonnegative().optional(),
      concurrency: z.number().int().min(1).max(8).optional(),
      finalRetries: z.number().int().min(0).max(3).optional(),
      // The detector and its thresholds; where its model lives is the server's business.
      vad: z
        .object({
          engine: z.enum(["auto", "silero", "energy"]).optional(),
          onset: z.number().min(0).max(1).optional(),
          sustain: z.number().min(0).max(1).optional(),
          startMs: z.number().nonnegative().max(2000).optional(),
        })
        .optional(),
      normalize: z.boolean().optional(),
    })
    .optional(),
});

export const STTRealtimeProfileSchema = TranscribeStreamConfigSchema.omit({
  mode: true,
}).extend({
  completed: z.enum(["corrected", "final"]).optional(),
  correctionWaitMs: z.number().int().min(0).max(30_000).optional(),
  clientLanguage: z.boolean().optional(),
  clientTurnDetection: z.boolean().optional(),
});

export const STTRealtimeProfilesSchema = z.record(
  z.string().min(1).max(100),
  STTRealtimeProfileSchema,
);

// ============================================
// Error Response Type Guards / Helpers
// ============================================

/**
 * Type guard to check if a value is an ErrorResponse
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorResponse).error === "object" &&
    (value as ErrorResponse).error !== null &&
    "code" in (value as ErrorResponse).error &&
    "message" in (value as ErrorResponse).error
  );
}

/**
 * Get default HTTP status code based on error code
 */
function getDefaultHttpStatus(code: string): number {
  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    SCHEMA_ERROR: 400,
    TOOL_NOT_FOUND: 404,
    SERVER_NOT_FOUND: 404,
    SESSION_NOT_FOUND: 404,
    NOT_FOUND: 404,
    AUTH_REQUIRED: 401,
    AUTH_INVALID: 401,
    FORBIDDEN: 403,
    RATE_LIMIT_EXCEEDED: 429,
    MCP_UNAVAILABLE: 503,
    MEMORY_UNAVAILABLE: 503,
    SKILLS_UNAVAILABLE: 503,
    EXECUTION_FAILED: 500,
    INTERNAL_ERROR: 500,
  };
  return statusMap[code] ?? 500;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
  httpStatus?: number,
): ErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId,
    },
    httpStatus: httpStatus ?? getDefaultHttpStatus(code),
  };
}

/**
 * Validate request body against a Zod schema
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  requestId?: string,
): ServerValidationResult<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid request body",
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  query: Record<string, string>,
  requestId?: string,
): ServerValidationResult<T> {
  const result = schema.safeParse(query);

  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid query parameters",
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validate path parameters against a Zod schema
 */
export function validateParams<T>(
  schema: z.ZodSchema<T>,
  params: Record<string, string>,
  requestId?: string,
): ServerValidationResult<T> {
  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      success: false,
      error: createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid path parameters",
        result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

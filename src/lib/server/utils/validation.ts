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

/**
 * Engine and correction settings shared by `POST /agent/transcribe`, the
 * OpenAI-compatible route's extension fields and the transcribe WebSocket's
 * config frame. Unknown keys (including `credentials`) are stripped: a caller
 * cannot swap in its own key or point an engine at another host.
 */
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
          z.object({
            provider: z.string().min(1).max(100).optional(),
            model: z.string().min(1).max(200).optional(),
            timeoutMs: z.number().int().positive().max(120_000).optional(),
          }),
        ])
        .optional(),
      transliterate: z.enum(["latin", "native"]).optional(),
      punctuate: z.boolean().optional(),
      secondOpinion: z
        .object({
          provider: sttProviderName,
          model: z.string().min(1).max(200).optional(),
        })
        .optional(),
      context: z.string().max(1000).optional(),
      maxDropRatio: z.number().min(0).max(1).optional(),
    })
    .optional(),
  fallback: z
    .object({
      provider: sttProviderName,
      model: z.string().min(1).max(200).optional(),
      when: z.array(z.enum(["unsure", "empty", "error"])).optional(),
    })
    .optional(),
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
    })
    .optional(),
});

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

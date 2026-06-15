export const ATTR = {
  // GenAI standard (OpenTelemetry semantic conventions)
  GEN_AI_SYSTEM: "gen_ai.system",
  GEN_AI_MODEL: "gen_ai.request.model",
  GEN_AI_OPERATION: "gen_ai.operation.name",
  GEN_AI_INPUT_TOKENS: "gen_ai.usage.input_tokens",
  GEN_AI_OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
  GEN_AI_FINISH_REASON: "gen_ai.response.finish_reason",
  GEN_AI_COST_USD: "gen_ai.cost_usd",
  GEN_AI_TOOL_NAME: "gen_ai.tool.name",
  GEN_AI_TEMPERATURE: "gen_ai.request.temperature",
  GEN_AI_MAX_TOKENS: "gen_ai.request.max_tokens",
  // NeuroLink custom
  NL_PROVIDER: "neurolink.provider",
  NL_MODEL: "neurolink.model",
  NL_STREAM_MODE: "neurolink.stream_mode",
  NL_TOOL_COUNT: "neurolink.tool_count",
  NL_MESSAGE_COUNT: "neurolink.message_count",
  NL_HAS_TOOLS: "neurolink.has_tools",
  NL_INPUT_LENGTH: "neurolink.input_length",
  NL_OUTPUT_LENGTH: "neurolink.output_length",
  NL_REQUEST_ID: "neurolink.request_id",
  NL_PATH: "neurolink.path",
  NL_HAS_MEMORY: "neurolink.has_conversation_memory",
  NL_COST: "neurolink.cost",
  NL_STRUCTURED_OUTPUT: "neurolink.structured_output",
  NL_HAS_FALLBACK: "neurolink.has_fallback",
  // MCP
  MCP_SERVER_ID: "mcp.server_id",
  MCP_TOOL_NAME: "mcp.tool_name",
  MCP_TIMEOUT_MS: "mcp.timeout_ms",
  MCP_TRANSPORT: "mcp.transport",
  MCP_CIRCUIT_STATE: "mcp.circuit_state",
  // Session/Memory
  SESSION_ID: "session.id",
  USER_ID: "user.id",
  MEMORY_TYPE: "memory.type",
  MESSAGE_COUNT: "message.count",
  CONTENT_LENGTH: "content.length",
  // RAG
  RAG_FILE_COUNT: "rag.file_count",
  RAG_STRATEGY: "rag.strategy",
  RAG_CHUNK_SIZE: "rag.chunk_size",
  RAG_TOP_K: "rag.top_k",
  RAG_RESULT_COUNT: "rag.result_count",
  // Message building
  MSG_COUNT: "message.build.count",
  MSG_HAS_IMAGES: "message.has_images",
  MSG_HAS_FILES: "message.has_files",
  MSG_HAS_SYSTEM_PROMPT: "message.has_system_prompt",
  MSG_TOTAL_CONTENT_LENGTH: "message.total_content_length",
  MSG_IS_MULTIMODAL: "message.is_multimodal",
  // File processing
  FILE_NAME: "file.name",
  FILE_MIMETYPE: "file.mimetype",
  FILE_SIZE_BYTES: "file.size_bytes",
  FILE_CATEGORY: "file.category",
  FILE_OUTPUT_LENGTH: "file.output_length",
  FILE_SUCCESS: "file.success",
  FILE_PROCESSOR_USED: "file.processor_used",
  FILE_CONFIDENCE: "file.detection_confidence",
  FILE_HAS_IMAGES: "file.has_images",
  FILE_IMAGE_COUNT: "file.image_count",
  FILE_ERROR: "file.error",
  FILE_SKIPPED_REASON: "file.skipped_reason",
  FILE_TOTAL_COUNT: "file.total_count",
  FILE_INCLUDED_COUNT: "file.included_count",
  FILE_CONTENT_TYPE: "file.content_type",
  // Video processing
  VIDEO_DURATION_SEC: "video.duration_sec",
  VIDEO_WIDTH: "video.width",
  VIDEO_HEIGHT: "video.height",
  VIDEO_CODEC: "video.codec",
  VIDEO_AUDIO_CODEC: "video.audio_codec",
  VIDEO_FORMAT: "video.format",
  VIDEO_BITRATE: "video.bitrate",
  VIDEO_KEYFRAMES_EXTRACTED: "video.keyframes_extracted",
  VIDEO_TARGET_FRAMES: "video.target_frames",
  VIDEO_INTERVAL_SEC: "video.interval_sec",
  VIDEO_FRAME_QUALITY: "video.frame_quality",
  VIDEO_FRAME_RESIZE_PX: "video.frame_resize_px",
  VIDEO_FRAMES_RESIZED: "video.frames_resized",
  VIDEO_TOTAL_FRAME_BYTES: "video.total_frame_bytes",
  VIDEO_HAS_SUBTITLES: "video.has_subtitles",
  VIDEO_SUBTITLE_LENGTH: "video.subtitle_length",
  VIDEO_TEXT_CONTENT_LENGTH: "video.text_content_length",
  VIDEO_HAS_METADATA: "video.has_metadata",
  VIDEO_HAS_KEYFRAMES: "video.has_keyframes",
  VIDEO_TEMP_PATH: "video.temp_path",
  VIDEO_BYTES_WRITTEN: "video.bytes_written",
  VIDEO_WRITE_DURATION_MS: "video.write_duration_ms",
  VIDEO_STEP: "video.step",
  // Context
  CONTEXT_STAGE: "context.compaction_stage",
  CONTEXT_TOKENS_BEFORE: "context.tokens_before",
  CONTEXT_TOKENS_AFTER: "context.tokens_after",
  // Middleware
  MW_COUNT: "middleware.count",
  MW_NAMES: "middleware.names",
  // Autoresearch
  AR_TAG: "autoresearch.tag",
  AR_BRANCH: "autoresearch.branch",
  AR_PHASE: "autoresearch.phase",
  AR_PHASE_FROM: "autoresearch.phase_from",
  AR_PHASE_TO: "autoresearch.phase_to",
  AR_RUN_COUNT: "autoresearch.run_count",
  AR_KEEP_COUNT: "autoresearch.keep_count",
  AR_STATUS: "autoresearch.status",
  AR_METRIC: "autoresearch.metric",
  AR_BEST_METRIC: "autoresearch.best_metric",
  AR_DIRECTION: "autoresearch.metric_direction",
  AR_COMMIT: "autoresearch.commit",
  AR_DURATION_MS: "autoresearch.duration_ms",
  AR_DESCRIPTION: "autoresearch.description",
  AR_ERROR_CODE: "autoresearch.error_code",
} as const;

/**
 * Langfuse observation/trace attribute names recognised by `@langfuse/otel`'s
 * LangfuseSpanProcessor (already registered on the global TracerProvider). They
 * let native (non-AI-SDK) provider paths emit spans that render as proper
 * generation / tool observations — the same data the Vercel AI SDK's
 * `experimental_telemetry` produced before providers moved to native SDKs.
 */
export const LANGFUSE_ATTR = {
  TRACE_NAME: "langfuse.trace.name",
  TRACE_INPUT: "langfuse.trace.input",
  TRACE_OUTPUT: "langfuse.trace.output",
  OBSERVATION_TYPE: "langfuse.observation.type",
  OBSERVATION_INPUT: "langfuse.observation.input",
  OBSERVATION_OUTPUT: "langfuse.observation.output",
  OBSERVATION_METADATA: "langfuse.observation.metadata",
  OBSERVATION_MODEL_NAME: "langfuse.observation.model.name",
  OBSERVATION_MODEL_PARAMETERS: "langfuse.observation.model.parameters",
  OBSERVATION_USAGE_DETAILS: "langfuse.observation.usage_details",
  OBSERVATION_LEVEL: "langfuse.observation.level",
  OBSERVATION_STATUS_MESSAGE: "langfuse.observation.status_message",
  OBSERVATION_COMPLETION_START_TIME:
    "langfuse.observation.completion_start_time",
} as const;

/** Default ceiling for serialized span attribute values. */
export const SPAN_ATTRIBUTE_MAX_CHARS = 40_000;

/**
 * Serialize an arbitrary value for a span attribute, hard-capped at
 * `maxChars` so a pathological prompt or tool result can't put megabytes
 * on a single span. Strings pass through unserialized; everything else is
 * JSON-stringified with a String() fallback for circular structures.
 */
export function spanJsonAttribute(
  value: unknown,
  maxChars: number = SPAN_ATTRIBUTE_MAX_CHARS,
): string {
  let serialized: string;
  try {
    serialized =
      typeof value === "string"
        ? value
        : (JSON.stringify(value) ?? String(value));
  } catch {
    serialized = String(value);
  }
  if (serialized.length > maxChars) {
    const truncationSuffix = `...[truncated ${serialized.length - maxChars} chars]`;
    const keepLength = Math.max(0, maxChars - truncationSuffix.length);
    return `${serialized.slice(0, keepLength)}${truncationSuffix}`;
  }
  return serialized;
}

import type { SpanModelRequest } from "../types/index.js";

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
  TRACE_TAGS: "langfuse.trace.tags",
  TRACE_METADATA: "langfuse.trace.metadata",
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
/** Smallest ceiling accepted, so the system and question openings still fit. */
const SPAN_ATTRIBUTE_MIN_CHARS = 10_000;

/**
 * The ceiling in force: `NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS` when it is a
 * positive whole number (raised to the minimum if lower), otherwise the
 * default. Read on every call, so a change applies to the next span.
 */
export function spanAttributeMaxChars(): number {
  const configured = Number(
    process.env.NEUROLINK_SPAN_ATTRIBUTE_MAX_CHARS?.trim(),
  );
  if (!Number.isSafeInteger(configured) || configured <= 0) {
    return SPAN_ATTRIBUTE_MAX_CHARS;
  }
  return Math.max(SPAN_ATTRIBUTE_MIN_CHARS, configured);
}

/** Opening of the system prompt a model-request attribute always keeps. */
const SYSTEM_PROMPT_FLOOR_CHARS = 2_000;
/** Room the current question always gets in a model-request attribute. */
const QUESTION_FLOOR_CHARS = 4_000;
/** Room for the "...[truncated N chars]" note, kept outside that opening. */
const TRUNCATION_NOTE_ALLOWANCE_CHARS = 48;
const MIN_SHRINKABLE_STRING_CHARS = 64;

const REDACTED_VALUE = "[REDACTED]";
const REDACTION_FAILED_VALUE = "[content omitted: redaction failed]";
const SENSITIVE_KEY_PATTERN =
  /(authorization|password|passwd|secret|apikey|privatekey|token|credential|signature)/;
const COOKIE_KEY_PATTERN = /^(set)?cookies?$/;
// Cheap pre-check: text without any of these is returned untouched, so the
// common case costs one regex scan and stays byte-identical.
const SENSITIVE_HINT_PATTERN =
  /authorization|password|passwd|secret|api[_-]?key|private[_-]?key|token|credential|signature|cookie|bearer/i;

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[_-]/g, "").toLowerCase();
  return (
    SENSITIVE_KEY_PATTERN.test(normalized) ||
    COOKIE_KEY_PATTERN.test(normalized)
  );
}

// JSON that a tool returned as text, carried inside JSON the model sees as a
// string, has its quotes escaped once per level of nesting, and each level
// doubles the backslashes before the quote: one, three, seven.
const ESCAPED_QUOTE_BACKSLASHES = [1, 3, 7];
const ESCAPED_PAIR_PATTERNS = ESCAPED_QUOTE_BACKSLASHES.map((backslashes) => {
  const quote = `${"\\\\".repeat(backslashes)}"`;
  return new RegExp(
    `${quote}([^"\\\\]{1,80})${quote}(\\s*:\\s*)${quote}((?:(?!${quote})[\\s\\S]){0,8192})${quote}`,
    "g",
  );
});

/**
 * Masks credentials in text that is about to be written to a span: bearer
 * tokens, `name=value` credentials in URLs and form bodies, and the values of
 * sensitive keys in JSON text (tool results arrive as JSON strings).
 */
function redactText(text: string): string {
  if (!SENSITIVE_HINT_PATTERN.test(text)) {
    return text;
  }
  let redacted = text
    .replace(/\bBearer\s+[\w.\-+/=]{16,}/gi, `Bearer ${REDACTED_VALUE}`)
    .replace(
      /\b(access_token|refresh_token|id_token|api_key|apikey|client_secret|password|signature|credential)=([^&\s"]+)/gi,
      `$1=${REDACTED_VALUE}`,
    )
    .replace(
      /"([^"\\]{1,80})"(\s*:\s*)"(?:[^"\\]|\\.)*"/g,
      (match, key: string, separator: string) =>
        isSensitiveKey(key) ? `"${key}"${separator}"${REDACTED_VALUE}"` : match,
    );
  ESCAPED_QUOTE_BACKSLASHES.forEach((backslashes, index) => {
    const quote = `${"\\".repeat(backslashes)}"`;
    redacted = redacted.replace(
      ESCAPED_PAIR_PATTERNS[index],
      (match, key: string, separator: string) =>
        isSensitiveKey(key)
          ? `${quote}${key}${quote}${separator}${quote}${REDACTED_VALUE}${quote}`
          : match,
    );
  });
  return redacted;
}

function redactNode(value: unknown, ancestors: WeakSet<object>): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (ancestors.has(value)) {
    return "[circular]";
  }
  ancestors.add(value);
  try {
    if ("toJSON" in value && typeof value.toJSON === "function") {
      return redactNode(value.toJSON(), ancestors);
    }
    if (Array.isArray(value)) {
      return value.map((entry) => redactNode(entry, ancestors));
    }
    // No prototype, so a key named __proto__ is data rather than an assignment.
    const redacted: Record<string, unknown> = Object.create(null);
    for (const [key, entry] of Object.entries(value)) {
      // Counts and flags under a sensitive-looking name (input_tokens: 5) are
      // not credentials; only text and structures are masked.
      redacted[key] =
        isSensitiveKey(key) &&
        (typeof entry === "string" ||
          (typeof entry === "object" && entry !== null))
          ? REDACTED_VALUE
          : redactNode(entry, ancestors);
    }
    return redacted;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Returns a copy of `value` with credentials masked: values under keys such as
 * `access_token`, `password`, `authorization` or `set-cookie`, bearer tokens
 * and `name=value` credentials inside text. Content with nothing sensitive in
 * it serializes exactly as it did before. Throws only if the value cannot be
 * walked; callers on the tracing path use `spanContentAttribute`, which turns
 * that into an omitted value instead of a leak or a failed turn.
 */
export function redactSpanContent(value: unknown): unknown {
  return redactNode(value, new WeakSet<object>());
}

function redactSafely(value: unknown): unknown {
  try {
    return redactSpanContent(value);
  } catch {
    return REDACTION_FAILED_VALUE;
  }
}

const MAX_SHRINK_ATTEMPTS = 200;

/**
 * Cuts the longest string inside `root` down by at least `excess` characters,
 * in place, and says whether it found one worth cutting. Only ever called on
 * the copy `redactSpanContent` made, never on the caller's own data.
 */
function shrinkLongestString(root: object, excess: number): boolean {
  let owner: object | undefined;
  let ownerKey = "";
  let longestText = "";
  const visited = new Set<object>();
  const pending: object[] = [root];
  while (pending.length > 0) {
    const node = pending.pop();
    if (node === undefined || visited.has(node)) {
      continue;
    }
    visited.add(node);
    for (const [key, entry] of Object.entries(node)) {
      if (typeof entry === "string") {
        if (
          entry.length > longestText.length &&
          entry.length > MIN_SHRINKABLE_STRING_CHARS
        ) {
          longestText = entry;
          owner = node;
          ownerKey = key;
        }
      } else if (entry !== null && typeof entry === "object") {
        pending.push(entry);
      }
    }
  }
  if (owner === undefined) {
    return false;
  }
  const keep = Math.max(
    MIN_SHRINKABLE_STRING_CHARS / 2,
    longestText.length - excess - TRUNCATION_NOTE_ALLOWANCE_CHARS,
  );
  Reflect.set(
    owner,
    ownerKey,
    `${longestText.slice(0, keep)}...[truncated ${longestText.length - keep} chars]`,
  );
  return true;
}

/**
 * `spanJsonAttribute` for content a person or model wrote or a tool returned
 * (arguments, results, answers), with credentials masked first. Use the plain
 * form for metadata such as usage counts and server ids.
 *
 * A structured value over the cap is shortened by trimming its longest
 * strings, so the attribute stays valid JSON instead of ending mid-token.
 */
export function spanContentAttribute(
  value: unknown,
  maxChars: number = spanAttributeMaxChars(),
): string {
  const redacted = redactSafely(value);
  if (redacted === null || typeof redacted !== "object") {
    return spanJsonAttribute(redacted, maxChars);
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(redacted) ?? String(redacted);
  } catch {
    return spanJsonAttribute(redacted, maxChars);
  }
  for (
    let attempt = 0;
    serialized.length > maxChars && attempt < MAX_SHRINK_ATTEMPTS;
    attempt++
  ) {
    if (!shrinkLongestString(redacted, serialized.length - maxChars)) {
      break;
    }
    serialized = JSON.stringify(redacted);
  }
  return spanJsonAttribute(serialized, maxChars);
}

/**
 * Serialize an arbitrary value for a span attribute, hard-capped at
 * `maxChars` so a pathological prompt or tool result can't put megabytes
 * on a single span. Strings pass through unserialized; everything else is
 * JSON-stringified with a String() fallback for circular structures.
 */
export function spanJsonAttribute(
  value: unknown,
  maxChars: number = spanAttributeMaxChars(),
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

/** The content blocks of an Anthropic-shaped message; none for plain text. */
function messageBlocks(message: unknown): unknown[] {
  if (message === null || typeof message !== "object") {
    return [];
  }
  return "content" in message && Array.isArray(message.content)
    ? message.content
    : [];
}

/** One field of a content block, or undefined when the block lacks it. */
function blockField(block: unknown, field: string): unknown {
  return block !== null && typeof block === "object" && field in block
    ? Reflect.get(block, field)
    : undefined;
}

/** Whether a message is the user's, as opposed to the assistant's. */
function isUserMessage(message: unknown): message is { role: "user" } {
  return (
    message !== null &&
    typeof message === "object" &&
    "role" in message &&
    message.role === "user"
  );
}

/** A user message that says something, not one that only returns tool results. */
function isUserQuestion(message: unknown): boolean {
  if (!isUserMessage(message)) {
    return false;
  }
  return (
    ("content" in message && typeof message.content === "string") ||
    messageBlocks(message).some((block) => blockField(block, "type") === "text")
  );
}

/**
 * Removes every tool result whose call is not among `messages`, including one
 * that shares a message with text, and drops messages left with nothing.
 */
function withoutUnansweredResults(messages: unknown[]): unknown[] {
  const calls = new Set(
    messages
      .flatMap(messageBlocks)
      .filter((block) => blockField(block, "type") === "tool_use")
      .map((block) => blockField(block, "id")),
  );
  return messages.flatMap((message) => {
    const blocks = messageBlocks(message);
    const answered = blocks.filter(
      (block) =>
        blockField(block, "type") !== "tool_result" ||
        calls.has(blockField(block, "tool_use_id")),
    );
    if (answered.length === blocks.length) {
      return [message];
    }
    if (
      answered.length === 0 ||
      message === null ||
      typeof message !== "object"
    ) {
      return [];
    }
    return [{ ...message, content: answered }];
  });
}

/**
 * Serialize a model request for a span attribute without losing the
 * conversation to the cap.
 *
 * A head cut keeps the system prompt and drops everything after it, so a long
 * system prompt hides every message, the user's question included. Here the
 * prompt, the current question and this turn's newest messages are budgeted
 * first, earlier messages are dropped whole and counted, and the system prompt
 * gets whatever room is left. A tool result is never kept without the call it
 * answers. The result is always valid JSON.
 */
export function spanModelRequestAttribute(
  rawRequest: SpanModelRequest,
  maxChars: number = spanAttributeMaxChars(),
): string {
  // Credentials are masked before anything is measured, so budgets apply to
  // what is actually written. Each message is masked on its own: one that
  // cannot be walked is omitted without losing the rest of the conversation.
  const request: SpanModelRequest = {
    ...(rawRequest.system !== undefined
      ? { system: redactSafely(rawRequest.system) }
      : {}),
    ...(rawRequest.messages !== undefined
      ? {
          messages: rawRequest.messages.map((message) => redactSafely(message)),
        }
      : {}),
    ...(rawRequest.prompt !== undefined
      ? { prompt: redactText(rawRequest.prompt) }
      : {}),
  };
  const serialize = (value: unknown): string => {
    try {
      return typeof value === "string"
        ? value
        : (JSON.stringify(value) ?? String(value));
    } catch {
      return String(value);
    }
  };
  // Sizes are measured as JSON, which is what the attribute carries: escaping
  // makes a JSON string longer than its text.
  const jsonLength = (value: unknown): number => {
    try {
      return (JSON.stringify(value) ?? "null").length;
    } catch {
      return Number.POSITIVE_INFINITY;
    }
  };
  // Never returns an empty string for non-empty text: when nothing fits, the
  // truncation note alone says the value existed and how long it was.
  const fitText = (text: string, budget: number): string => {
    if (jsonLength(text) <= budget) {
      return text;
    }
    let keep = budget;
    for (let attempt = 0; attempt < 12 && keep > 0; attempt++) {
      const candidate = `${text.slice(0, keep)}...[truncated ${text.length - keep} chars]`;
      const size = jsonLength(candidate);
      if (size <= budget) {
        return candidate;
      }
      keep = Math.floor((keep * budget) / size) - 1;
    }
    return `[truncated ${text.length} chars]`;
  };

  // Room for keys, brackets and the omitted-message count.
  let remaining = maxChars - 128;
  // The system prompt always keeps its opening, so a trace still shows which
  // prompt was in use. Reserved before the messages are budgeted and returned
  // to the system prompt afterwards; a request that fits is unaffected.
  const systemFloor =
    request.system !== undefined
      ? Math.min(
          jsonLength(request.system),
          SYSTEM_PROMPT_FLOOR_CHARS + TRUNCATION_NOTE_ALLOWANCE_CHARS,
        )
      : 0;
  remaining -= systemFloor;
  let prompt: string | undefined;
  if (request.prompt !== undefined) {
    prompt = fitText(request.prompt, remaining);
    remaining -= jsonLength(prompt);
  }

  // Shortens a copy of the message's longest strings; the shape survives.
  const fitMessage = (message: unknown, budget: number): unknown => {
    if (jsonLength(message) <= budget) {
      return message;
    }
    let copy: unknown;
    try {
      copy = JSON.parse(serialize(message));
    } catch {
      copy = undefined;
    }
    if (copy !== null && typeof copy === "object") {
      for (
        let attempt = 0;
        jsonLength(copy) > budget && attempt < MAX_SHRINK_ATTEMPTS;
        attempt++
      ) {
        if (!shrinkLongestString(copy, jsonLength(copy) - budget)) {
          break;
        }
      }
      if (jsonLength(copy) <= budget) {
        return copy;
      }
    }
    return {
      truncatedMessage: fitText(serialize(message), Math.max(0, budget - 32)),
    };
  };

  const messages = request.messages ?? [];
  // The current question is the newest user message with something to say;
  // everything after it is this turn's tool calls and their results.
  let questionIndex = -1;
  for (let index = messages.length - 1; index >= 0; index--) {
    if (isUserQuestion(messages[index])) {
      questionIndex = index;
      break;
    }
  }
  const questionFloor =
    questionIndex >= 0
      ? Math.min(
          jsonLength(messages[questionIndex]) + 1,
          QUESTION_FLOOR_CHARS + TRUNCATION_NOTE_ALLOWANCE_CHARS,
        )
      : 0;
  remaining -= questionFloor;

  const turn: unknown[] = [];
  let turnComplete = true;
  for (let index = messages.length - 1; index > questionIndex; index--) {
    const size = jsonLength(messages[index]) + 1;
    if (size <= remaining) {
      turn.unshift(messages[index]);
      remaining -= size;
      continue;
    }
    turnComplete = false;
    if (turn.length === 0 && remaining > 64) {
      const excerpt = fitText(serialize(messages[index]), remaining - 32);
      turn.unshift({ truncatedMessage: excerpt });
      remaining -= jsonLength(excerpt) + 32;
    }
    break;
  }
  remaining += questionFloor;

  let kept: unknown[] = [];
  if (questionIndex >= 0) {
    const question = fitMessage(messages[questionIndex], remaining - 1);
    remaining -= jsonLength(question) + 1;
    const history: unknown[] = [];
    for (let index = questionIndex - 1; turnComplete && index >= 0; index--) {
      const size = jsonLength(messages[index]) + 1;
      if (size > remaining) {
        break;
      }
      history.unshift(messages[index]);
      remaining -= size;
    }
    kept.push(...history, question);
  }
  kept.push(...turn);
  if (kept.length < messages.length) {
    kept = withoutUnansweredResults(kept);
  }
  const omittedMessages = messages.length - kept.length;
  remaining += systemFloor;

  const body: Record<string, unknown> = {};
  if (request.system !== undefined) {
    body.system =
      jsonLength(request.system) <= remaining
        ? request.system
        : fitText(serialize(request.system), Math.max(0, remaining));
  }
  if (request.messages !== undefined) {
    body.messages = kept;
  }
  if (omittedMessages > 0) {
    body.omittedMessages = omittedMessages;
  }
  if (prompt !== undefined) {
    body.prompt = prompt;
  }
  try {
    return JSON.stringify(body);
  } catch {
    return spanJsonAttribute(body, maxChars);
  }
}

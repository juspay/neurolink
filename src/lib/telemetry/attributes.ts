import { AsyncLocalStorage } from "node:async_hooks";
import {
  INTERNAL_SPAN_ATTRIBUTE,
  MAX_REDACTED_ATTRIBUTES,
  MIN_STRING_BUDGET_CHARS,
  REDACTED_VALUE,
  TRUNCATION_NOTE_ALLOWANCE_CHARS,
} from "../constants/telemetry.js";
import type { SpanModelRequest } from "../types/index.js";
import { messageRole } from "./chatMessages.js";
import {
  binaryPlaceholder,
  declaredMimeType,
  describeDataUrls,
  isBinaryKey,
  redactSecretAssignments,
  redactSensitiveEntry,
} from "./spanSanitizer.js";
import { capStrings, stringify } from "./spanSerialization.js";

export const ATTR = {
  // GenAI standard (OpenTelemetry semantic conventions)
  GEN_AI_SYSTEM: "gen_ai.system",
  GEN_AI_MODEL: "gen_ai.request.model",
  GEN_AI_OPERATION: "gen_ai.operation.name",
  GEN_AI_OBSERVATION: "gen_ai.observation.type",
  GEN_AI_INPUT_TOKENS: "gen_ai.usage.input_tokens",
  GEN_AI_OUTPUT_TOKENS: "gen_ai.usage.output_tokens",
  GEN_AI_FINISH_REASON: "gen_ai.response.finish_reason",
  GEN_AI_COST_USD: "gen_ai.cost_usd",
  GEN_AI_TOOL_NAME: "gen_ai.tool.name",
  GEN_AI_TEMPERATURE: "gen_ai.request.temperature",
  GEN_AI_MAX_TOKENS: "gen_ai.request.max_tokens",
  NL_PROVIDER: "sdk.provider",
  NL_MODEL: "sdk.model",
  NL_STREAM_MODE: "stream_mode",
  NL_TOOL_COUNT: "tool_count",
  NL_MESSAGE_COUNT: "message_count",
  NL_HAS_TOOLS: "has_tools",
  NL_INPUT_LENGTH: "input_length",
  NL_OUTPUT_LENGTH: "output_length",
  NL_REQUEST_ID: "request_id",
  NL_PATH: "path",
  NL_HAS_MEMORY: "has_conversation_memory",
  NL_COST: "cost",
  NL_STRUCTURED_OUTPUT: "structured_output",
  NL_HAS_FALLBACK: "has_fallback",
  NL_INTERNAL: INTERNAL_SPAN_ATTRIBUTE,
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

/**
 * @description Tells whether span inputs (prompts, messages and tool arguments) are recorded. `NEUROLINK_RECORD_INPUTS=false`, in any casing and with or without surrounding spaces, turns it off; any other value, or none, leaves it on, except inside `withoutSpanContent`. Read on every call, so a change applies to the next span.
 * @returns {boolean} `false` when the operator opted out of recording inputs.
 */
export function recordsSpanInputs(): boolean {
  return (
    recordsSpanContent() &&
    process.env.NEUROLINK_RECORD_INPUTS?.trim().toLowerCase() !== "false"
  );
}

const contentWithheld = new AsyncLocalStorage<boolean>();

/**
 * @description Runs `fn` with span content withheld: an observation recorded while it runs, or while anything it starts runs, keeps its model, usage, cost, level and timings but no input or output. The proxy uses it for a model call made on a client's behalf, whose content it records only when bodies are opted in.
 * @param fn {() => T} - Work whose observations carry no content.
 * @returns {T} Whatever `fn` returns.
 */
export function withoutSpanContent<T>(fn: () => T): T {
  return contentWithheld.run(true, fn);
}

/**
 * @description Tells whether span input and output may be recorded here, i.e. the caller is not inside `withoutSpanContent`.
 * @returns {boolean} `false` while content is withheld.
 */
export function recordsSpanContent(): boolean {
  return contentWithheld.getStore() !== true;
}

// Strings this module returned as finished attributes. A caller that builds an
// attribute with `spanContentAttribute` or `spanModelRequestAttribute` and
// hands it to `observe` would otherwise have it redacted again, and a second
// pass over serialized JSON reads an escaped newline as part of a credential's
// value. Redacting a string that already came out of redaction cannot reveal
// anything new, so recognizing it is safe; a string that was evicted is simply
// redacted again, as before.
const finishedAttributes = new Set<string>();

function finished(attribute: string): string {
  finishedAttributes.delete(attribute);
  finishedAttributes.add(attribute);
  if (finishedAttributes.size > MAX_REDACTED_ATTRIBUTES) {
    const oldest = finishedAttributes.values().next().value;
    if (oldest !== undefined) {
      finishedAttributes.delete(oldest);
    }
  }
  return attribute;
}

/**
 * @description Tells whether a string is an attribute that `spanContentAttribute` or `spanModelRequestAttribute` returned recently, so it is already redacted and capped.
 * @param value {string} - Candidate attribute value.
 * @returns {boolean} `true` when the string came out of one of those functions.
 */
export function isFinishedAttribute(value: string): boolean {
  return finishedAttributes.has(value);
}

/** Opening of the system prompt a model-request attribute always keeps. */
const SYSTEM_PROMPT_FLOOR_CHARS = 2_000;
/** Room the current question always gets in a model-request attribute. */
const QUESTION_FLOOR_CHARS = 4_000;

const REDACTION_FAILED_VALUE = "[content omitted: redaction failed]";
const SENSITIVE_KEY_PATTERN =
  /(authorization|password|passwd|secret|apikey|privatekey|tokens?$|credential|signature)/;
const COOKIE_KEY_PATTERN = /^(set)?cookies?$/;
// Cheap pre-check: text without any of these is returned untouched, so the
// common case costs one regex scan and stays byte-identical.
const SENSITIVE_HINT_PATTERN =
  /authorization|password|passwd|secret|api[_-]?key|private[_-]?key|token|credential|signature|cookie|bearer|sk-|gh[pousr]_|github_pat_|AKIA|xox[baprs]-/i;

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
  let redacted = redactSecretAssignments(
    text.replace(/\bBearer\s+[\w.\-+/=]{16,}/gi, `Bearer ${REDACTED_VALUE}`),
  ).replace(
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

// Opt-in stricter masking (`NEUROLINK_MASK_CREDENTIAL_ENTRIES=true`): the value
// of a `{ name, value }` or `{ key, value }` entry whose name is a credential,
// and a credential inside an object key. The released masker reads keys and
// text only, so with the variable unset the output is exactly what it was.
function masksCredentialEntries(): boolean {
  return (
    process.env.NEUROLINK_MASK_CREDENTIAL_ENTRIES?.trim().toLowerCase() ===
    "true"
  );
}

// A name that says how many, how long or what kind of thing rather than
// holding the credential (`max_tokens`, `password_policy`, `credential_type`,
// `secret_version`, `password_min_length`). A name that merely ends in `tokens`
// is not one: `access_tokens` and `refresh_tokens` are credentials, so only a
// bare `tokens` and the count-like names of a model's token budget and usage
// (`max_tokens`, `prompt_tokens`, `cache_read_input_tokens`, ...) are exempt.
// Decided on the name's segments, not with a pattern: a key comes from content
// and may be very long, so the check must stay linear in its length.
const MEASUREMENT_SUFFIXES = new Set([
  "policy",
  "type",
  "algorithm",
  "count",
  "limit",
  "version",
  "length",
]);
const TOKEN_COUNT_PREFIXES = new Set([
  "max",
  "min",
  "prompt",
  "completion",
  "input",
  "output",
  "total",
  "cache",
  "cached",
  "reasoning",
  "thinking",
  "budget",
  "context",
]);

function isMeasurementEntryName(name: string): boolean {
  const segments = snakeCased(name).split("_");
  const last = segments[segments.length - 1];
  if (segments.length === 1) {
    return last === "tokens";
  }
  return (
    MEASUREMENT_SUFFIXES.has(last) ||
    (last === "tokens" && TOKEN_COUNT_PREFIXES.has(segments[0]))
  );
}

function snakeCased(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s.-]+/g, "_")
    .toLowerCase();
}

// Headers, environment variables and form fields are often lists of
// `{ name, value }` or `{ key, value }` entries; when the name is a credential
// the value is one, exactly as if it were stored under that key, whatever the
// value looks like (a numeric PIN is a credential). Only the name decides: a
// setting that merely mentions a credential is not one.
function credentialEntryName(node: object): string | undefined {
  const name =
    "name" in node ? node.name : "key" in node ? node.key : undefined;
  if (typeof name !== "string" || !("value" in node) || !isSensitiveKey(name)) {
    return undefined;
  }
  return isMeasurementEntryName(name) ? undefined : name;
}

function redactNode(
  value: unknown,
  ancestors: WeakSet<object>,
  strict: boolean,
): unknown {
  if (typeof value === "string") {
    return redactText(describeDataUrls(value));
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (ancestors.has(value)) {
    return "[circular]";
  }
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
    return binaryPlaceholder(value, undefined);
  }
  ancestors.add(value);
  try {
    if ("toJSON" in value && typeof value.toJSON === "function") {
      return redactNode(value.toJSON(), ancestors, strict);
    }
    if (Array.isArray(value)) {
      return value.map((entry) => redactNode(entry, ancestors, strict));
    }
    // No prototype, so a key named __proto__ is data rather than an assignment.
    const redacted: Record<string, unknown> = Object.create(null);
    const mimeType = declaredMimeType(value);
    const entryName = strict ? credentialEntryName(value) : undefined;
    for (const [key, entry] of Object.entries(value)) {
      // Opt-in: a key can carry a credential too, such as a URL with an
      // api_key parameter used as a map key.
      const safeKey = strict ? redactText(key) : key;
      const sensitiveName =
        key === "value" && entryName !== undefined
          ? entryName
          : isSensitiveKey(key)
            ? key
            : undefined;
      if (
        sensitiveName !== undefined &&
        (typeof entry === "string" ||
          (typeof entry === "object" && entry !== null))
      ) {
        redacted[safeKey] = redactSensitiveEntry(sensitiveName, entry);
        continue;
      }
      const placeholder = isBinaryKey(key)
        ? binaryPlaceholder(entry, mimeType)
        : undefined;
      redacted[safeKey] = placeholder ?? redactNode(entry, ancestors, strict);
    }
    return redacted;
  } finally {
    ancestors.delete(value);
  }
}

/**
 * @description Returns a copy of a value with credentials masked: values under keys such as `access_token`, `password`, `authorization` or `set-cookie`, bearer tokens, and `name=value` credentials inside text. Purely numeric values after a credential-looking name (e.g. `max_tokens: 4096`) are left alone. With `NEUROLINK_MASK_CREDENTIAL_ENTRIES=true` it also masks the value of a `{ name, value }` or `{ key, value }` entry whose name is such a key (a setting such as `max_tokens`, `password_policy` or `secret_version` is not, and the value is not consulted, so a numeric PIN is masked) and a credential inside an object key; unset, it does neither, as in the released build.
 * @param value {JsonValue | object} - Content to redact; objects and arrays are walked recursively.
 * @returns {JsonValue | object} A redacted copy, serializing exactly as the input when nothing in it is sensitive.
 * @throws {Error} When the value cannot be walked; tracing callers use `spanContentAttribute`, which turns that into an omitted value.
 */
export function redactSpanContent(value: unknown): unknown {
  return redactNode(value, new WeakSet<object>(), masksCredentialEntries());
}

function redactSafely(value: unknown): unknown {
  try {
    return redactSpanContent(value);
  } catch {
    return REDACTION_FAILED_VALUE;
  }
}

/**
 * `spanJsonAttribute` for content a person or model wrote or a tool returned
 * (arguments, results, answers), with credentials masked first. Use the plain
 * form for metadata such as usage counts and server ids.
 *
 * A structured value over the cap is shortened by cutting every string to a
 * per-string budget in one walk, tightening the budget only if the result
 * still does not fit, so the attribute stays valid JSON instead of ending
 * mid-token.
 */
export function spanContentAttribute(
  value: unknown,
  maxChars: number = spanAttributeMaxChars(),
): string {
  const redacted = redactSafely(value);
  if (redacted === null || typeof redacted !== "object") {
    return finished(spanJsonAttribute(redacted, maxChars));
  }
  let serialized = stringify(redacted);
  let budget = Math.floor(maxChars / 4);
  while (serialized.length > maxChars && budget >= MIN_STRING_BUDGET_CHARS) {
    serialized = stringify(capStrings(redacted, budget));
    budget = Math.floor(budget / 4);
  }
  return finished(spanJsonAttribute(serialized, maxChars));
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
  const serialized = stringify(value);
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
      ? { prompt: redactText(describeDataUrls(rawRequest.prompt)) }
      : {}),
  };
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
      copy = JSON.parse(stringify(message));
    } catch {
      copy = undefined;
    }
    if (copy !== null && typeof copy === "object") {
      for (
        let stringBudget = Math.floor(budget / 4);
        jsonLength(copy) > budget && stringBudget >= MIN_STRING_BUDGET_CHARS;
        stringBudget = Math.floor(stringBudget / 4)
      ) {
        capStrings(copy, stringBudget);
      }
      if (jsonLength(copy) <= budget) {
        return copy;
      }
    }
    return {
      role: messageRole(message),
      content: fitText(stringify(message), Math.max(0, budget - 32)),
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
      const excerpt = fitText(stringify(messages[index]), remaining - 32);
      turn.unshift({ role: messageRole(messages[index]), content: excerpt });
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

  const leading: object[] = [];
  if (request.system !== undefined) {
    leading.push({
      role: "system",
      content:
        jsonLength(request.system) <= remaining
          ? request.system
          : fitText(stringify(request.system), Math.max(0, remaining)),
    });
  }
  if (omittedMessages > 0) {
    leading.push({
      role: "system",
      content: `[${omittedMessages} earlier messages omitted]`,
    });
  }
  const conversation = [
    ...leading,
    ...kept,
    ...(prompt !== undefined ? [{ role: "user", content: prompt }] : []),
  ];
  try {
    return finished(JSON.stringify(conversation));
  } catch {
    return finished(spanJsonAttribute(conversation, maxChars));
  }
}

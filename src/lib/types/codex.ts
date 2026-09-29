/**
 * Codex (OpenAI ChatGPT subscription) proxy types.
 *
 * Codex authenticates with a ChatGPT account over OAuth and talks to the
 * ChatGPT backend Responses API (https://chatgpt.com/backend-api/codex).
 * These types describe the on-disk `~/.codex/auth.json` shape we import from,
 * the OAuth refresh contract, and the usage/rate-limit payloads we normalise
 * into the shared AccountQuota model.
 *
 * Naming: all exported names carry the `Codex` prefix (rule 9). Codex quota is
 * stored through the same AccountQuota shape as Anthropic — its primary window
 * maps onto the session fields and its secondary window onto the weekly fields.
 */

import type {
  AccountCoolingReason,
  AccountQuota,
  ClaudeContentBlock,
  ClaudeTool,
  InternalResult,
} from "./proxy.js";

/** Token block inside `~/.codex/auth.json`. */
export type CodexAuthFileTokens = {
  id_token?: string;
  access_token: string;
  refresh_token?: string;
  account_id?: string;
};

/** Shape of `~/.codex/auth.json` written by the Codex CLI. */
export type CodexAuthFile = {
  auth_mode?: string;
  OPENAI_API_KEY?: string | null;
  tokens?: CodexAuthFileTokens;
  last_refresh?: string;
};

/** Result of importing a Codex credential (from auth.json or the OAuth flow). */
export type CodexImportedCredential = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** ChatGPT account id (from auth.json or decoded from the access token). */
  accountId?: string;
  /** Epoch ms when the access token expires (decoded from the JWT `exp`). */
  expiresAt?: number;
  /** ChatGPT plan type decoded from the token, for display only. */
  planType?: string;
  /** Account email decoded from the id token, for the account label. */
  email?: string;
};

/** Raw OpenAI OAuth token endpoint response. */
export type CodexTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
};

/** One rate-limit window as reported by the Codex backend (primary/secondary). */
export type CodexRateLimitWindow = {
  used_percent?: number | null;
  window_minutes?: number | null;
  resets_in_seconds?: number | null;
  /** Seconds until reset. Observed alias of `resets_in_seconds` on some
   *  responses; accepted defensively so a cooldown lands on the real reset
   *  instead of degrading to the transient ceiling. */
  reset_after?: number | null;
  resets_at?: number | null;
  /** Current WHAM usage fields. */
  reset_after_seconds?: number | null;
  reset_at?: number | null;
};

/** Codex rate-limit block: a primary (short) and secondary (long) window. */
export type CodexRateLimits = {
  allowed?: boolean;
  limit_reached?: boolean;
  primary?: CodexRateLimitWindow | null;
  secondary?: CodexRateLimitWindow | null;
};

/** Loose shape of the Codex usage endpoint response. */
export type CodexUsageResponse = {
  /** Legacy Codex usage payload. */
  rate_limits?: CodexRateLimits | null;
  /** Current ChatGPT WHAM account-usage payload. */
  rate_limit?: {
    allowed?: boolean;
    limit_reached?: boolean;
    primary_window?: CodexRateLimitWindow | null;
    secondary_window?: CodexRateLimitWindow | null;
  } | null;
  plan_type?: string | null;
};

/** Result of a single Codex usage fetch. */
export type CodexUsageFetchResult =
  | { ok: true; quota: AccountQuota }
  | {
      ok: false;
      reason:
        | "not_oauth"
        | "auth"
        | "rate_limited"
        | "http"
        | "network"
        | "parse";
    };

/** Explicit plan-exhaustion evidence from a Codex error response. */
export type CodexQuotaError = {
  errorCode: string;
  resetAt: number;
  scope: "session" | "weekly" | "unknown";
};

/** A Codex account with its runtime cooldown/quota state hydrated from disk. */
export type CodexRuntimeAccount = {
  key: string;
  label: string;
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  accountId?: string;
  quota?: AccountQuota;
  coolingUntil?: number;
  coolingReason?: AccountCoolingReason;
  /** A persisted cooldown whose window has already passed. Present only when the
   *  account is therefore eligible again, so the success path can delete the
   *  spent record — nothing else ever reaps it. */
  expiredCooldownUntil?: number;
};

/** Provider-qualified account identity used by proxy status rendering. */
export type CodexProxyStatusAccountIdentity =
  | { provider: "anthropic"; key: string }
  | { provider: "codex"; key: string }
  | { provider: "vertex"; key: string }
  | { provider: "other"; key: null };

/** A text or image content part accepted by the Codex Responses backend. */
export type CodexContentPart =
  | { type: "input_text"; text: string }
  | { type: "output_text"; text: string }
  | { type: "input_image"; image_url: string };

/** A single item in a Codex Responses request. */
export type CodexResponsesInputItem =
  | {
      role: "user" | "assistant";
      content: CodexContentPart[];
    }
  | {
      type: "function_call";
      call_id: string;
      name: string;
      arguments: string;
    }
  | {
      type: "function_call_output";
      call_id: string;
      output: string;
    };

/** Codex reasoning settings; supported levels depend on the selected model. */
export type CodexReasoningEffort =
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

/** Request shape used to bridge Anthropic Messages traffic to Codex Responses. */
export type CodexResponsesRequest = {
  model: string;
  input: CodexResponsesInputItem[];
  stream: true;
  store: false;
  /** Pins one conversation to the cache that already holds its prefix. */
  prompt_cache_key?: string;
  reasoning?: { effort: CodexReasoningEffort };
  instructions?: string;
  tools?: Array<{
    type: "function";
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  }>;
  tool_choice?:
    | "auto"
    | "required"
    | "none"
    | { type: "function"; name: string };
};

/** Fully buffered Codex result rendered back as an Anthropic response. */
export type CodexFallbackResult = {
  text: string;
  toolCalls: NonNullable<InternalResult["toolCalls"]>;
  usage?: NonNullable<InternalResult["usage"]> & {
    /** Numeric serializer compatibility must not imply provider observation. */
    inputTokensObserved?: boolean;
    outputTokensObserved?: boolean;
    cacheReadTokensObserved?: boolean;
    cacheCreationTokensObserved?: boolean;
  };
  finishReason: "end_turn" | "tool_use";
};

/** Incremental Claude frames and explicit upstream cancellation. */
export type CodexFallbackStream = {
  frames: AsyncGenerator<string, CodexFallbackResult>;
  cancel: (reason?: unknown) => Promise<void>;
};

// =============================================================================
// NATIVE CODEX REQUEST TYPES (Codex-outbound fallback: native Codex client ->
// Anthropic/Vertex). Reused verbatim from the merged design doc's tool-fidelity
// section, which read the real captured wire sample
// (~/.neurolink/reference/codex-cli-wire-sample.json) and found the flat
// `{functions, collaboration}` shape the first design pass assumed to be wrong:
// `additional_tools.tools` is an array of namespace objects, each declaration
// discriminated by its own `type` field, never by which namespace it sits in.
// =============================================================================

/** Role a native Codex `input` message item can carry. */
export type CodexNativeRole = "developer" | "user" | "assistant";

/** A plain message item in a native Codex request's `input` array. */
export type CodexNativeMessageInputItem = {
  type: "message";
  id?: string;
  role: CodexNativeRole;
  content: CodexContentPart[];
};

/** A tool declaration backed by a JSON Schema, dispatched as a function call. */
export type CodexNativeFunctionToolDeclaration = {
  type: "function";
  name: string;
  description?: string;
  strict: boolean;
  parameters: Record<string, unknown>;
};

/** Grammar constraining a custom tool's argument text. */
export type CodexNativeCustomToolFormat = {
  type: "grammar";
  syntax: "lark" | "regex";
  definition: string;
};

/** A tool declaration whose arguments are grammar-constrained free text. */
export type CodexNativeCustomToolDeclaration = {
  type: "custom";
  name: string;
  description?: string;
  format: CodexNativeCustomToolFormat;
};

/** A single tool declaration, discriminated by its own `type` field. */
export type CodexNativeToolDeclaration =
  | CodexNativeFunctionToolDeclaration
  | CodexNativeCustomToolDeclaration;

/**
 * A declared tool's own kind, independent of its namespace. Claude's
 * `tool_use` block carries only `name` + `input`, with no such discriminator,
 * so response serialization threads a name -> kind map (built while flattening
 * `additional_tools` on the request side) to decide whether a tool_use's
 * `input` is a real JSON-Schema-shaped object (`function`) or the single
 * grammar-constrained string a custom tool was wrapped into (`custom`).
 */
export type CodexNativeToolKind = "function" | "custom";

/**
 * One declared tool's mapping outcome inside `codexOutboundFallback.ts`:
 * the translated Claude tool, its kind (for `toolKindByName`), and any
 * degrade reasons collected while flattening its schema (fed to
 * `recordCodexOutboundSchemaDegraded` in `proxyTracer.ts`).
 */
export type CodexOutboundToolMappingResult = {
  tool: ClaudeTool;
  kind: CodexNativeToolKind;
  reasons: string[];
};

/** A named group of tool declarations inside one `additional_tools` item. */
export type CodexNativeToolNamespace = {
  type: "namespace";
  name: string;
  description: string;
  tools: CodexNativeToolDeclaration[];
};

/** The `input` item carrying every tool declaration for a native Codex request. */
export type CodexNativeAdditionalToolsInputItem = {
  type: "additional_tools";
  id?: string;
  role: "developer";
  tools: CodexNativeToolNamespace[];
};

/** A model-emitted tool call replayed in a native Codex request's history. */
export type CodexNativeFunctionCallInputItem = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

/** A client-supplied tool result replayed in a native Codex request's history. */
export type CodexNativeFunctionCallOutputInputItem = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

/** A call to a grammar-constrained (`type:"custom"`) tool, replayed in history. */
export type CodexNativeCustomToolCallInputItem = {
  type: "custom_tool_call";
  id?: string;
  call_id: string;
  name: string;
  input: string;
};

/** A client-supplied result for a `custom_tool_call`, replayed in history. */
export type CodexNativeCustomToolCallOutputInputItem = {
  type: "custom_tool_call_output";
  call_id: string;
  output: string;
};

/**
 * A reasoning item the client echoes back with `store:false`. Its content is
 * opaque (`encrypted_content` is readable only by the OpenAI backend), so its
 * shape is deliberately loose beyond the discriminator.
 */
export type CodexNativeReasoningInputItem = {
  type: "reasoning";
  id?: string;
  encrypted_content?: string | null;
  summary?: unknown[];
};

/** A single item in a native Codex request's `input` array. */
export type CodexNativeInputItem =
  | CodexNativeMessageInputItem
  | CodexNativeAdditionalToolsInputItem
  | CodexNativeFunctionCallInputItem
  | CodexNativeFunctionCallOutputInputItem
  | CodexNativeCustomToolCallInputItem
  | CodexNativeCustomToolCallOutputInputItem
  | CodexNativeReasoningInputItem;

/** How a native Codex request constrains which tool the model may call. */
export type CodexNativeToolChoice =
  | "auto"
  | "required"
  | "none"
  | { type: "function"; name: string };

/**
 * A native Codex Responses request, as sent by the real Codex CLI.
 *
 * No top-level `session_id`/`thread_id` — real traffic carries neither at
 * top level, only inside `client_metadata`, which the existing
 * `Record<string, unknown>` field already covers.
 */
export type CodexNativeRequest = {
  model: string;
  input: CodexNativeInputItem[];
  stream: boolean;
  store: boolean;
  tool_choice?: CodexNativeToolChoice;
  parallel_tool_calls?: boolean;
  reasoning?: { effort: CodexReasoningEffort; context?: string };
  include?: string[];
  text?: { verbosity?: string };
  prompt_cache_key?: string;
  client_metadata?: Record<string, unknown>;
};

/**
 * A `parseCodexNativeRequest`/`translateCodexRequestToClaude` failure. Never thrown.
 * `UNTRANSLATABLE_REQUEST` is a request Codex itself accepts but Anthropic would
 * reject, as opposed to one that is invalid on the Codex wire.
 * `REQUEST_TOO_LARGE` is a tool-call history over `streamLimits.ts`'s count or
 * size ceiling; callers map it to HTTP 413 `request_too_large`.
 */
export type CodexTranslationError =
  | { code: "MALFORMED_REQUEST"; message: string }
  | { code: "SUSPECTED_PARTIAL_HISTORY"; message: string }
  | { code: "UNTRANSLATABLE_REQUEST"; message: string }
  | { code: "REQUEST_TOO_LARGE"; message: string };

/** One coalesced run of same-role content while flattening a native Codex `input` array. */
export type CodexOutboundMessageGroup = {
  role: "user" | "assistant";
  blocks: ClaudeContentBlock[];
};

// =============================================================================
// RESPONSE/STREAM CODEC TYPES (Anthropic -> Codex wire format). Mirrors the
// native-request types above but for the outbound direction: an Anthropic-shaped
// `ClaudeResponse`/SSE stream translated into the Codex Responses shape a native
// Codex client expects.
// =============================================================================

/** Lifecycle status of one item inside a Codex Responses `output[]` array. */
export type CodexResponseItemStatus =
  | "in_progress"
  | "completed"
  | "incomplete";

/** Wire usage block inside a synthesized response.completed / non-stream response. */
export type CodexResponseUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  /** Omitted entirely when no cache field was observed on the Anthropic side. */
  input_tokens_details?: {
    cached_tokens?: number;
    cache_write_tokens?: number;
    /** The 1-hour-TTL share of `cache_write_tokens` (a subset, not additive);
     *  sourced from `ClaudeUsage.cacheCreation1hTokens`. Omitted when not observed. */
    cache_write_1h_tokens?: number;
  };
  /** Always omitted — ClaudeUsage carries no reasoning-token count to source it from. */
  output_tokens_details?: { reasoning_tokens?: number };
};

/** One `output_text` content part inside a Codex `message` output item. */
export type CodexResponseOutputTextPart = {
  type: "output_text";
  text: string;
  annotations: [];
};

/** A synthesized assistant-text item in a Codex `response.output[]` array. */
export type CodexResponseMessageItem = {
  id: string;
  type: "message";
  role: "assistant";
  status: CodexResponseItemStatus;
  content: CodexResponseOutputTextPart[];
};

/** A synthesized tool-call item in a Codex `response.output[]` array. */
export type CodexResponseFunctionCallItem = {
  id: string;
  type: "function_call";
  status: CodexResponseItemStatus;
  call_id: string;
  name: string;
  /** Concatenation of raw partial_json fragments. Valid JSON when status is
   *  "completed"; may be a truncated, non-JSON fragment when status is
   *  "incomplete" (closed early by a mid-stream failure). */
  arguments: string;
};

/**
 * A synthesized call to a tool the request declared `custom` (grammar-
 * constrained), in the item shape the real backend emits for one — the shape
 * `codexUsage.ts` reads on the native route and a Codex CLI replays in its
 * history. `input` is the bare grammar text, never JSON.
 */
export type CodexResponseCustomToolCallItem = {
  id: string;
  type: "custom_tool_call";
  status: CodexResponseItemStatus;
  call_id: string;
  name: string;
  /** Empty when status is "incomplete" and the wrapped input never parsed. */
  input: string;
};

/** One item in a Codex `response.output[]` array, discriminated by `type`. */
export type CodexResponseItem =
  | CodexResponseMessageItem
  | CodexResponseFunctionCallItem
  | CodexResponseCustomToolCallItem;

/** A complete Codex Responses envelope — the non-streaming body, and the shape
 *  carried inside a terminal `response.*` SSE event's `response` field. */
export type CodexResponseEnvelope = {
  id: string;
  object: "response";
  created_at: number;
  status: "completed" | "incomplete" | "failed";
  model: string;
  output: CodexResponseItem[];
  usage?: CodexResponseUsage;
  incomplete_details: { reason: "max_output_tokens" } | null;
  error: { code: string; message: string } | null;
};

/** The Codex Responses SSE event-type vocabulary this codec emits. */
export type CodexResponseSSEEventType =
  | "response.created"
  | "response.in_progress"
  | "response.output_item.added"
  | "response.content_part.added"
  | "response.output_text.delta"
  | "response.output_text.done"
  | "response.content_part.done"
  | "response.function_call_arguments.delta"
  | "response.function_call_arguments.done"
  | "response.custom_tool_call_input.delta"
  | "response.custom_tool_call_input.done"
  | "response.output_item.done"
  | "response.completed"
  | "response.incomplete"
  | "response.failed";

/** Incremental Codex-shape SSE frames and the terminal envelope they resolve to. */
export type CodexResponseStream = {
  frames: AsyncGenerator<string, CodexResponseEnvelope>;
  cancel: (reason?: unknown) => Promise<void>;
};

/** Which output item kind (if any) `CodexResponsesStreamSerializer` currently has open. */
export type CodexResponseOpenItemKind =
  | "message"
  | "function_call"
  | "custom_tool_call"
  | null;

// =============================================================================
// OUTBOUND-FALLBACK TRIGGER POLICY (stage-c-trigger.md §1). Classifies a
// native-Codex-route failure into a decision on whether it is eligible to
// fall outbound to the Anthropic OAuth pool / Vertex. Pure data in, pure
// decision out — no dispatch, no HTTP, no account state.
// =============================================================================

/** The four call sites in `codexProxyRoutes.ts`'s `dispatch()` that can trigger
 *  an outbound fallback attempt (stage-c-trigger.md §0's corrected line map). */
export type CodexOutboundFailureClass =
  | "no_accounts"
  | "pool_exhausted"
  | "non_retryable_transport"
  | "loop_fallthrough";

/** What a single insertion point in `codexProxyRoutes.ts` observed. */
export type CodexOutboundFailureInput = {
  failureClass: CodexOutboundFailureClass;
  /** Present only for `non_retryable_transport`: the transport error code
   *  (e.g. `ECONNREFUSED`) that was NOT in the retryable allow-list. */
  transportErrorCode?: string;
  /** Present only for `loop_fallthrough`: the raw HTTP status the last
   *  exhausted account attempt ended on (`lastErrorStatus` at the account-loop
   *  call site). A 401/403 there is a Codex credential failure and stays
   *  eligible; any other 4xx except 429 rejects the request itself. */
  lastStatus?: number;
  /** Present only for `loop_fallthrough`: the error code the last exhausted
   *  account attempt reported, when it reported one. A code
   *  `classifyProxyFailureCode` marks non-retryable (content policy, invalid
   *  request) makes the failure ineligible whatever the status. */
  lastErrorCode?: string;
};

/** `classifyCodexOutboundFailure`'s verdict: whether this failure is eligible
 *  to attempt an outbound fallback, and why (for tracing/logging only — the
 *  caller still applies its own config/loop-prevention/depth gates). */
export type CodexOutboundFallbackDecision = {
  eligible: boolean;
  reason: string;
};

/** Outcome of one `attemptCodexOutboundFallback` call. `not_attempted` covers
 *  every gate failure and every target exhausting without success — the
 *  caller falls through to its own existing (unchanged) error response in
 *  every one of those cases, so the flag-off / all-targets-failed paths stay
 *  byte-identical to today. */
export type CodexOutboundFallbackOutcome =
  | { kind: "not_attempted" }
  | { kind: "request_too_large"; message: string }
  | { kind: "success"; response: Response };

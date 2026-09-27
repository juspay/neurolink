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
 */
export type CodexTranslationError =
  | { code: "MALFORMED_REQUEST"; message: string }
  | { code: "SUSPECTED_PARTIAL_HISTORY"; message: string }
  | { code: "UNTRANSLATABLE_REQUEST"; message: string };

/** One coalesced run of same-role content while flattening a native Codex `input` array. */
export type CodexOutboundMessageGroup = {
  role: "user" | "assistant";
  blocks: ClaudeContentBlock[];
};

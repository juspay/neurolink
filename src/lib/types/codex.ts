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
  primary?: CodexRateLimitWindow | null;
  secondary?: CodexRateLimitWindow | null;
};

/** Loose shape of the Codex usage endpoint response. */
export type CodexUsageResponse = {
  /** Legacy Codex usage payload. */
  rate_limits?: CodexRateLimits | null;
  /** Current ChatGPT WHAM account-usage payload. */
  rate_limit?: {
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
  usage?: NonNullable<InternalResult["usage"]>;
  finishReason: "end_turn" | "tool_use";
};

/** Incremental Claude frames and explicit upstream cancellation. */
export type CodexFallbackStream = {
  frames: AsyncGenerator<string, CodexFallbackResult>;
  cancel: (reason?: unknown) => Promise<void>;
};

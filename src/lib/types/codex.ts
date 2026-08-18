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

import type { AccountCoolingReason, AccountQuota } from "./proxy.js";

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
};

/** Codex rate-limit block: a primary (short) and secondary (long) window. */
export type CodexRateLimits = {
  primary?: CodexRateLimitWindow | null;
  secondary?: CodexRateLimitWindow | null;
};

/** Loose shape of the Codex usage endpoint response. */
export type CodexUsageResponse = {
  rate_limits?: CodexRateLimits | null;
  plan_type?: string | null;
};

/** Result of a single Codex usage fetch. */
export type CodexUsageFetchResult =
  | { ok: true; quota: AccountQuota }
  | { ok: false; reason: "not_oauth" | "auth" | "http" | "network" | "parse" };

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

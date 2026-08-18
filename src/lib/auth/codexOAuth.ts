/**
 * Codex (OpenAI ChatGPT) OAuth + identity helpers.
 *
 * Mirrors the role of `anthropicOAuth.ts` for the Codex pool engine. Codex signs
 * in with a ChatGPT account (PKCE OAuth against auth.openai.com) and talks to the
 * ChatGPT backend Responses API. The proxy pools multiple ChatGPT accounts, so it
 * needs to: import an existing `~/.codex/auth.json`, refresh access tokens, and
 * derive the per-account `chatgpt-account-id` the backend requires.
 *
 * Constants verified against Codex CLI 0.144.4.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { logger } from "../utils/logger.js";
import type {
  CodexAuthFile,
  CodexImportedCredential,
  CodexTokenResponse,
} from "../types/index.js";

// OAuth client + endpoints (Codex CLI values).
export const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
export const CODEX_AUTH_URL = "https://auth.openai.com/oauth/authorize";
export const CODEX_TOKEN_URL = "https://auth.openai.com/oauth/token";
export const CODEX_REVOKE_URL = "https://auth.openai.com/oauth/revoke";
export const CODEX_REDIRECT_URI = "http://localhost:1455/auth/callback";
export const CODEX_DEFAULT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

// Upstream backend (ChatGPT subscription path).
export const CODEX_BACKEND_BASE_URL = "https://chatgpt.com/backend-api/codex";
export const CODEX_RESPONSES_URL = `${CODEX_BACKEND_BASE_URL}/responses`;
export const CODEX_USAGE_URL = `${CODEX_BACKEND_BASE_URL}/usage`;

// Client fingerprint. The real Codex CLI sends these; the proxy defaults them
// only when a non-Codex client omits them.
export const CODEX_VERSION = "0.144.4";
export const CODEX_USER_AGENT = `codex_cli_rs/${CODEX_VERSION} (external; neurolink-proxy)`;
export const CODEX_ORIGINATOR = "codex_cli_rs";

const CODEX_AUTH_FILE = join(homedir(), ".codex", "auth.json");

/** Base64url-decode a JWT segment into a JSON object (claims only, no verify). */
function decodeJwtSegment(segment: string): Record<string, unknown> | null {
  try {
    const padded = segment + "=".repeat((4 - (segment.length % 4)) % 4);
    const json = Buffer.from(
      padded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getOpenAiAuthClaim(
  claims: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!claims) {
    return null;
  }
  const auth = claims["https://api.openai.com/auth"];
  return auth && typeof auth === "object"
    ? (auth as Record<string, unknown>)
    : null;
}

/** Decode the ChatGPT account id, plan type, and expiry from an access token. */
export function decodeCodexAccessToken(accessToken: string): {
  accountId?: string;
  planType?: string;
  expiresAt?: number;
} {
  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    return {};
  }
  const claims = decodeJwtSegment(parts[1]);
  const authClaim = getOpenAiAuthClaim(claims);
  const accountId =
    typeof authClaim?.chatgpt_account_id === "string"
      ? authClaim.chatgpt_account_id
      : undefined;
  const planType =
    typeof authClaim?.chatgpt_plan_type === "string"
      ? authClaim.chatgpt_plan_type
      : undefined;
  const exp = typeof claims?.exp === "number" ? claims.exp * 1000 : undefined;
  return { accountId, planType, expiresAt: exp };
}

/** Decode the account email from an id token (best-effort, for the label). */
export function decodeCodexEmail(idToken?: string): string | undefined {
  if (!idToken) {
    return undefined;
  }
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    return undefined;
  }
  const claims = decodeJwtSegment(parts[1]);
  return typeof claims?.email === "string" ? claims.email : undefined;
}

/**
 * The chatgpt-account-id the backend requires for a given access token.
 * Prefer the value stored on the account; fall back to decoding the JWT so a
 * rotated token always carries a coherent account id.
 */
export function resolveCodexAccountId(
  accessToken: string,
  storedAccountId?: string,
): string | undefined {
  if (storedAccountId && storedAccountId.length > 0) {
    return storedAccountId;
  }
  return decodeCodexAccessToken(accessToken).accountId;
}

/** Build a CodexImportedCredential from raw token material. */
function buildImportedCredential(tokens: {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  account_id?: string;
}): CodexImportedCredential {
  const decoded = decodeCodexAccessToken(tokens.access_token);
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token,
    accountId: tokens.account_id ?? decoded.accountId,
    expiresAt: decoded.expiresAt,
    planType: decoded.planType,
    email: decodeCodexEmail(tokens.id_token),
  };
}

/**
 * Import an existing Codex credential from `~/.codex/auth.json` (or a custom
 * path). This is the verified, robust login path: the user logs into Codex
 * normally, then imports the current account into the proxy pool.
 */
export async function importCodexAuthFile(
  authFilePath: string = CODEX_AUTH_FILE,
): Promise<CodexImportedCredential> {
  const raw = await readFile(authFilePath, "utf8");
  const parsed = JSON.parse(raw) as CodexAuthFile;
  const tokens = parsed.tokens;
  if (!tokens || typeof tokens.access_token !== "string") {
    throw new Error(
      `No ChatGPT OAuth tokens found in ${authFilePath}. Run \`codex login\` first.`,
    );
  }
  if (parsed.auth_mode && parsed.auth_mode !== "chatgpt") {
    throw new Error(
      `Codex auth mode is "${parsed.auth_mode}", expected "chatgpt". Only ChatGPT subscription login can be pooled.`,
    );
  }
  return buildImportedCredential({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    id_token: tokens.id_token,
    account_id: tokens.account_id,
  });
}

/**
 * Refresh a Codex access token. Verified: POST form-urlencoded to
 * auth.openai.com/oauth/token with grant_type=refresh_token and the Codex
 * client id. Returns a fresh credential (access + rotated refresh token).
 */
export async function refreshCodexToken(
  refreshToken: string,
  options: { timeoutMs?: number } = {},
): Promise<CodexImportedCredential> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CODEX_CLIENT_ID,
    scope: CODEX_DEFAULT_SCOPES.join(" "),
  });

  const response = await fetch(CODEX_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": CODEX_USER_AGENT,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw Object.assign(
      new Error(
        `Codex token refresh failed: ${response.status} ${text.slice(0, 200)}`,
      ),
      { status: response.status },
    );
  }

  const data = (await response.json()) as CodexTokenResponse;
  if (!data.access_token) {
    throw new Error("Codex token refresh returned no access_token");
  }
  logger.debug("Codex token refreshed");
  return buildImportedCredential({
    access_token: data.access_token,
    // OpenAI rotates the refresh token; fall back to the old one if omitted.
    refresh_token: data.refresh_token ?? refreshToken,
    id_token: data.id_token,
  });
}

/**
 * Whether a {@link refreshCodexToken} failure means the refresh token itself is
 * no longer usable, as opposed to the request never getting a verdict.
 *
 * Only the authorization server rejecting the grant is permanent. A 5xx, a
 * timeout, or a DNS failure says nothing about the credential, and treating
 * those as permanent disables a working account — which `auth cleanup` then
 * deletes.
 */
export function isPermanentCodexRefreshFailure(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status !== "number" || status < 400 || status >= 500) {
    return false;
  }
  // 408 and 429 are a timeout and a throttle. Neither is the grant being
  // rejected, and treating them as permanent disables the account — which
  // `auth cleanup` then deletes.
  return status !== 408 && status !== 429;
}

/**
 * Whether an imported credential's access token is expired (or within the
 * buffer window) and should be refreshed before use.
 */
export function codexTokenNeedsRefresh(
  expiresAt: number | undefined,
  bufferMs = 5 * 60 * 1000,
): boolean {
  if (!expiresAt) {
    return false;
  }
  return expiresAt - bufferMs <= Date.now();
}

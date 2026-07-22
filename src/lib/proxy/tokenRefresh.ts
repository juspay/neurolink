import { logger } from "../utils/logger.js";
import { tokenStore } from "../auth/tokenStore.js";
import {
  ANTHROPIC_TOKEN_URL,
  ANTHROPIC_TOKEN_URL_FALLBACK,
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_CLIENT_ID,
} from "../auth/anthropicOAuth.js";
import { writeJsonSnapshotAtomically } from "./snapshotPersistence.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { redactUrlForError } from "../utils/logSanitize.js";
import type {
  RefreshableAccount,
  RefreshResult,
  SharedRefreshResult,
  StoredOAuthTokens,
  TokenPersistTarget,
} from "../types/index.js";

const BUFFER_MS = 5 * 60 * 1000;
const SUCCESS_CACHE_MS = 60_000;
// Bound the best-effort persisted-credential reconciliation read so a hung or
// slow token-store decrypt can never stall (or abort) a live token refresh.
const PEEK_TOKENS_TIMEOUT_MS = 2_000;

const refreshesInFlight = new Map<string, Promise<SharedRefreshResult>>();

export function needsRefresh(account: RefreshableAccount): boolean {
  return !!(
    account.expiresAt &&
    account.expiresAt <= Date.now() + BUFFER_MS &&
    account.refreshToken
  );
}

function isRefreshCredentialRejection(status: number | undefined): boolean {
  return status === 400 || status === 401 || status === 403 || status === 404;
}

export function isPermanentRefreshFailure(result: RefreshResult): boolean {
  return isRefreshCredentialRejection(result.status);
}

async function performTokenRefresh(
  account: RefreshableAccount,
): Promise<RefreshResult> {
  if (!account.refreshToken) {
    return { success: false, error: "No refresh token available" };
  }

  // OAuth 2.0 token endpoints require an `application/x-www-form-urlencoded`
  // request body (RFC 6749 §6); a JSON body is nonstandard for this grant and
  // is rejected by RFC-compliant endpoints. Mirror the interactive auth flow
  // in `anthropicOAuth.ts::_refreshAccessToken`.
  const requestBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: account.refreshToken,
    client_id: CLAUDE_CODE_CLIENT_ID,
  }).toString();

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    "User-Agent": CLAUDE_CLI_USER_AGENT,
  };

  const urls = [ANTHROPIC_TOKEN_URL, ANTHROPIC_TOKEN_URL_FALLBACK];
  let terminalFailure: RefreshResult | undefined;

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: requestBody,
        signal: AbortSignal.timeout(10_000),
      });

      if (!resp.ok) {
        const errorBody = await resp.text();
        logger.warn(
          `[token-refresh] failed for ${account.label} at ${redactUrlForError(url)}`,
          {
            status: resp.status,
            error: errorBody.slice(0, 500),
          },
        );
        const failure = {
          success: false,
          error: errorBody,
          status: resp.status,
        } satisfies RefreshResult;
        if (isRefreshCredentialRejection(resp.status)) {
          terminalFailure = failure;
        }
        // If primary URL returned a non-ok status, try fallback.
        if (url === ANTHROPIC_TOKEN_URL) {
          continue;
        }
        return terminalFailure ?? failure;
      }

      const data = (await resp.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
      };
      account.token = data.access_token;
      account.expiresAt =
        data.expires_in !== undefined
          ? Date.now() + data.expires_in * 1000
          : Date.now() + 55 * 60 * 1000;
      if (data.refresh_token) {
        account.refreshToken = data.refresh_token;
      }
      logger.debug(`[token-refresh] refreshed for ${account.label}`);
      return { success: true };
    } catch (e) {
      logger.warn(
        `[token-refresh] exception for ${account.label} at ${redactUrlForError(url)}`,
        {
          error: String(e),
        },
      );
      // If primary URL threw, try fallback
      if (url === ANTHROPIC_TOKEN_URL) {
        continue;
      }
      return terminalFailure ?? { success: false, error: String(e) };
    }
  }

  // Should not reach here, but guard against empty urls array
  return (
    terminalFailure ?? {
      success: false,
      error: "No refresh URLs available",
    }
  );
}

/**
 * Serialize refreshes by refresh-token value. OAuth refresh tokens may rotate,
 * so concurrent refreshes with the same old token can make all but the first
 * request fail with invalid_grant. A short success cache covers callers that
 * loaded either the old token or the newly rotated token around persistence.
 */
export async function refreshToken(
  account: RefreshableAccount,
): Promise<RefreshResult> {
  if (!account.refreshToken) {
    return { success: false, error: "No refresh token available" };
  }

  const lockKey = account.refreshToken;
  let sharedPromise = refreshesInFlight.get(lockKey);
  if (!sharedPromise) {
    const refreshAccount: RefreshableAccount = { ...account };
    const createdPromise = performTokenRefresh(refreshAccount).then(
      (result) => {
        const shared = {
          result,
          token: refreshAccount.token,
          refreshToken: refreshAccount.refreshToken,
          expiresAt: refreshAccount.expiresAt,
        };
        if (result.success) {
          const cachedKeys = new Set([lockKey]);
          const rotatedKey = refreshAccount.refreshToken;
          if (
            rotatedKey &&
            rotatedKey !== lockKey &&
            !refreshesInFlight.has(rotatedKey)
          ) {
            refreshesInFlight.set(rotatedKey, createdPromise);
            cachedKeys.add(rotatedKey);
          }
          const timer = setTimeout(() => {
            for (const key of cachedKeys) {
              if (refreshesInFlight.get(key) === createdPromise) {
                refreshesInFlight.delete(key);
              }
            }
          }, SUCCESS_CACHE_MS);
          timer.unref?.();
        } else if (refreshesInFlight.get(lockKey) === createdPromise) {
          refreshesInFlight.delete(lockKey);
        }
        return shared;
      },
      (error) => {
        if (refreshesInFlight.get(lockKey) === createdPromise) {
          refreshesInFlight.delete(lockKey);
        }
        throw error;
      },
    );
    refreshesInFlight.set(lockKey, createdPromise);
    sharedPromise = createdPromise;
  }

  const shared = await sharedPromise;
  if (shared.result.success) {
    account.token = shared.token;
    account.refreshToken = shared.refreshToken;
    account.expiresAt = shared.expiresAt;
  }
  return shared.result;
}

async function reloadPersistedTokenStoreAccount(
  account: RefreshableAccount,
  target: TokenPersistTarget | undefined,
): Promise<boolean> {
  if (!target || typeof target === "string" || !("providerKey" in target)) {
    return false;
  }
  // Best-effort, bounded reconciliation: this only adopts a newer persisted
  // credential generation if one exists. A decryption/IO failure — or a hung
  // read — must NOT abort the caller, which can still refresh with the
  // already-loaded token. Swallow the failure and treat it as "no newer
  // persisted generation found" so refresh proceeds instead of the account
  // being spuriously disabled.
  let stored: StoredOAuthTokens | null;
  try {
    stored = await withTimeout(
      tokenStore.peekTokens(target.providerKey),
      PEEK_TOKENS_TIMEOUT_MS,
      "[token-refresh] peekTokens reconciliation timed out",
    );
  } catch (err) {
    logger.debug(
      "[token-refresh] skipping persisted-state reconciliation (peek failed)",
      { error: err instanceof Error ? err.message : String(err) },
    );
    return false;
  }
  if (
    !stored ||
    stored.expiresAt <= (account.expiresAt ?? 0) ||
    (stored.accessToken === account.token &&
      stored.refreshToken === account.refreshToken &&
      stored.expiresAt === account.expiresAt)
  ) {
    return false;
  }
  account.token = stored.accessToken;
  account.refreshToken = stored.refreshToken;
  account.expiresAt = stored.expiresAt;
  return true;
}

/**
 * Refreshes against the latest persisted credential generation. Queued
 * requests can otherwise reject a rotated refresh token and disable a newer
 * login that was saved while they were waiting.
 */
export async function refreshTokenFromLatest(
  account: RefreshableAccount,
  target?: TokenPersistTarget,
): Promise<RefreshResult> {
  const reloadedBeforeRefresh = await reloadPersistedTokenStoreAccount(
    account,
    target,
  );
  if (reloadedBeforeRefresh && !needsRefresh(account)) {
    return { success: true };
  }

  const result = await refreshToken(account);
  if (result.success) {
    return result;
  }
  return (await reloadPersistedTokenStoreAccount(account, target))
    ? { success: true }
    : result;
}

export function clearRefreshStateForTests(): void {
  refreshesInFlight.clear();
}

export async function persistTokens(
  target: TokenPersistTarget,
  account: RefreshableAccount,
): Promise<void> {
  if (typeof target !== "string" && "providerKey" in target) {
    await persistTokenStoreAccount(target.providerKey, account);
    return;
  }

  const credPath = typeof target === "string" ? target : target.credPath;
  await persistLegacyCredentials(credPath, account);
}

async function persistLegacyCredentials(
  credPath: string,
  account: RefreshableAccount,
): Promise<void> {
  try {
    const fs = await import("fs/promises");
    const existing = JSON.parse(await fs.readFile(credPath, "utf8"));
    existing.oauth = {
      ...existing.oauth,
      accessToken: account.token,
      expiresAt: account.expiresAt,
      refreshToken: account.refreshToken,
    };
    existing.updatedAt = Date.now();
    await writeJsonSnapshotAtomically(credPath, existing, 0o600);
  } catch (err) {
    logger.warn("[token-refresh] Failed to persist legacy credentials", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function persistTokenStoreAccount(
  providerKey: string,
  account: RefreshableAccount,
): Promise<void> {
  try {
    const existing = await withTimeout(
      tokenStore.peekTokens(providerKey),
      PEEK_TOKENS_TIMEOUT_MS,
      "[token-refresh] peekTokens for persistence timed out",
    );
    const merged: StoredOAuthTokens = {
      accessToken: account.token,
      refreshToken: account.refreshToken ?? existing?.refreshToken,
      expiresAt:
        account.expiresAt ?? existing?.expiresAt ?? Date.now() + 55 * 60 * 1000,
      tokenType: existing?.tokenType ?? "Bearer",
      ...(existing?.scope ? { scope: existing.scope } : {}),
    };
    await withTimeout(
      tokenStore.saveTokens(providerKey, merged),
      PEEK_TOKENS_TIMEOUT_MS,
      "[token-refresh] saveTokens timed out",
    );
  } catch (err) {
    logger.warn("[token-refresh] Failed to persist TokenStore credentials", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

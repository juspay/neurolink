/**
 * Claude-Compatible Proxy Routes
 *
 * Exposes Anthropic-compatible /v1/messages, /v1/models, and /v1/messages/count_tokens
 * endpoints. ALL requests are routed through ctx.neurolink.generate() / ctx.neurolink.stream()
 * -- no direct HTTP calls to Anthropic.
 *
 * An optional ModelRouter can remap incoming model names to different
 * provider/model pairs (e.g. "claude-sonnet-4-20250514" -> vertex/gemini-2.5-pro).
 * Without a router, models are passed through to the Anthropic provider.
 */

import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  buildStableClaudeCodeBillingHeader,
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_OAUTH_BETAS,
  getOrCreateClaudeCodeIdentity,
  parseClaudeCodeUserId,
} from "../../auth/anthropicOAuth.js";
import {
  parseQuotaHeaders,
  saveAccountQuota,
} from "../../proxy/accountQuota.js";
import {
  buildClaudeError,
  ClaudeStreamSerializer,
  generateToolUseId,
  parseClaudeRequest,
  serializeClaudeResponse,
} from "../../proxy/claudeFormat.js";
import type { ModelRouter } from "../../proxy/modelRouter.js";
import { tracers } from "../../telemetry/tracers.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { ProxyTracer, recordFallbackAttempt } from "../../proxy/proxyTracer.js";
import { createRawStreamCapture } from "../../proxy/rawStreamCapture.js";
import {
  logBodyCapture,
  logRequest,
  logRequestAttempt,
  logStreamError,
} from "../../proxy/requestLogger.js";
import { createSSEInterceptor } from "../../proxy/sseInterceptor.js";
import {
  needsRefresh,
  persistTokens,
  refreshToken,
} from "../../proxy/tokenRefresh.js";
import {
  buildProxyTranslationPlan,
  parseRetryAfterMs,
} from "../../proxy/routingPolicy.js";
import type { ProxyTranslationPlan } from "../../types/index.js";
import { writeJsonSnapshotAtomically } from "../../proxy/snapshotPersistence.js";
import {
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
} from "../../proxy/usageStats.js";
import type {
  AnthropicAttemptLogger,
  AnthropicAuthRetryResult,
  AnthropicLoopState,
  AnthropicNonOkResult,
  AnthropicSuccessResult,
  AnthropicUpstreamBodyBuilder,
  AnthropicUpstreamFetchResult,
  ClaudeFinalRequestLogger,
  ClaudeLoggedErrorBuilder,
  ClaudeRequest,
  ClaudeRequestRuntimeContext,
  ClaudeSnapshot,
  ClaudeSnapshotBody,
  InternalResult,
  LoadedClaudeAccountContext,
  ParsedClaudeError,
  ParsedClaudeRequest,
  PreparedAnthropicAccountAttempt,
  ProxyBodyCaptureLogger,
  ProxyPassthroughAccount,
  ProxyTranslationAttempt,
  RouteGroup,
  RuntimeAccountState,
  ServerContext,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { ProviderHealthChecker } from "../../utils/providerHealth.js";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Headers that must never be forwarded upstream to Anthropic. */
const BLOCKED_UPSTREAM_HEADERS = new Set([
  "cookie",
  "proxy-authorization",
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
]);

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** Fill-first: index of the current primary account. Only advances when
 *  the current account exhausts 429 retries or auth retries fail. */
let primaryAccountIndex = 0;
/** Track account count so we can reset primaryAccountIndex when it changes. */
let lastKnownAccountCount = 0;
/** Stable account key (e.g. "anthropic:user@example.com") of the configured
 *  home/primary account. Set once at proxy boot from routing.primaryAccount.
 *  When undefined, home semantics fall back to enabledAccounts[0] (insertion
 *  order) — preserves pre-existing behavior. */
let configuredPrimaryAccountKey: string | undefined;

const MAX_AUTH_RETRIES = 5;
const MAX_CONSECUTIVE_REFRESH_FAILURES = 15;
const MAX_TRANSIENT_SAME_ACCOUNT_RETRIES = 2;
const TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS = [250, 1_000] as const;

/** Maximum upstream 429 attempts per account before rotating to the next account.
 *  Total attempts per account = this + 1 (the initial call plus this many retries). */
const MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES = 10;
/** Max time to sleep between 429 retries. Caps large upstream retry-after values
 *  so we don't hold the client connection open for minutes. */
const MAX_RATE_LIMIT_RETRY_DELAY_MS = 30_000;
/** Timeout for upstream requests to Anthropic. Must be generous enough
 *  to cover the full lifecycle of streaming responses, including extended
 *  thinking from Opus models (which can exceed 5 minutes for large contexts). */
const UPSTREAM_FETCH_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const accountRuntimeState = new Map<string, RuntimeAccountState>();

/** Track whether we've run the one-time startup prune. */
let startupPruneDone = false;

/** Default cooling period when retries are exhausted and upstream didn't
 *  provide a retry-after header. Short enough to recover quickly, long
 *  enough to avoid immediately hammering the same account. */
const DEFAULT_COOLING_PERIOD_MS = 60_000;

/** Advance the primary account index when the current primary is exhausted
 *  (429 retries exhausted or auth failure). This is what makes fill-first work:
 *  we stick to one account until it's unusable. Only advances when the exhausted
 *  account IS the current primary; otherwise it's already a fallback. */
function advancePrimaryIfCurrent(
  accountKey: string,
  enabledCount: number,
  primaryAccountKey: string | undefined,
): void {
  if (enabledCount <= 1) {
    return;
  }
  // Only advance if the cooled account is the current primary
  if (accountKey !== primaryAccountKey) {
    return;
  }
  primaryAccountIndex = (primaryAccountIndex + 1) % enabledCount;
}

/** Resolve the configured primary's stable key to its current index in the
 *  request's enabledAccounts list. Returns 0 (insertion-order fallback) when
 *  no key is configured or the key cannot be matched (account disabled/
 *  removed). The resolution is per-request because enabledAccounts membership
 *  can shift between requests. */
function resolveHomeIndex(enabledAccounts: ProxyPassthroughAccount[]): number {
  if (!configuredPrimaryAccountKey) {
    return 0;
  }
  const idx = enabledAccounts.findIndex(
    (a) => a.key === configuredPrimaryAccountKey,
  );
  return idx >= 0 ? idx : 0;
}

/** If the configured home primary is no longer cooling, reset
 *  primaryAccountIndex back to its index so traffic returns to the preferred
 *  account once its rate limit window expires. Called at the start of each
 *  request. Home is resolved fresh per call via resolveHomeIndex. */
function maybeResetPrimaryToHome(
  enabledAccounts: ProxyPassthroughAccount[],
): void {
  if (enabledAccounts.length <= 1) {
    return;
  }
  const homeIndex = resolveHomeIndex(enabledAccounts);
  if (primaryAccountIndex === homeIndex) {
    return;
  }
  const homeAccount = enabledAccounts[homeIndex];
  const homeState = accountRuntimeState.get(homeAccount.key);
  if (
    !homeState ||
    !homeState.coolingUntil ||
    Date.now() >= homeState.coolingUntil
  ) {
    // Home account is no longer cooling — reset to it
    primaryAccountIndex = homeIndex;
    if (homeState?.coolingUntil) {
      homeState.coolingUntil = undefined;
      logger.always(
        `[proxy] home primary account=${homeAccount.label} cooling expired, resetting primaryAccountIndex to ${homeIndex}`,
      );
    }
  }
}

/** Check if an account is currently in its cooling window. */
function isAccountCooling(accountKey: string): boolean {
  const state = accountRuntimeState.get(accountKey);
  return !!state?.coolingUntil && Date.now() < state.coolingUntil;
}

// ---------------------------------------------------------------------------
// OAuth polyfill helpers (extracted to reduce block nesting)
// ---------------------------------------------------------------------------

const snapshotCache = new Map<
  string,
  { snapshot: ClaudeSnapshot; loadedAt: number }
>();
const SNAPSHOT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SNAPSHOT_STABLE_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "anthropic-beta",
  "anthropic-dangerous-direct-browser-access",
  "anthropic-version",
  "sec-fetch-mode",
  "user-agent",
  "x-app",
  "x-stainless-arch",
  "x-stainless-lang",
  "x-stainless-os",
  "x-stainless-package-version",
  "x-stainless-retry-count",
  "x-stainless-runtime",
  "x-stainless-runtime-version",
  "x-stainless-timeout",
  "x-subscription-tier",
]);
const NON_CLAUDE_OAUTH_BETAS = [
  "oauth-2025-04-20",
  "claude-code-20250219",
  "fine-grained-tool-streaming-2025-05-14",
] as const;

function getSnapshotSafeLabel(accountLabel: string): string {
  return accountLabel.replace(/[^a-zA-Z0-9._@-]/g, "_");
}

function getSnapshotPath(accountLabel: string): string {
  return join(
    homedir(),
    ".neurolink",
    "header-snapshots",
    `anthropic_${getSnapshotSafeLabel(accountLabel)}.json`,
  );
}

function applySnapshotHeaders(
  headers: Record<string, string>,
  snapshot: ClaudeSnapshot | null,
): void {
  if (!snapshot?.headers) {
    return;
  }

  for (const [sk, sv] of Object.entries(snapshot.headers)) {
    const lower = sk.toLowerCase();
    if (
      typeof sv === "string" &&
      !headers[lower] &&
      !BLOCKED_UPSTREAM_HEADERS.has(lower) &&
      lower !== "authorization" &&
      lower !== "x-api-key" &&
      lower !== "x-claude-code-session-id"
    ) {
      headers[lower] = sv;
    }
  }
}

async function loadClaudeSnapshot(
  accountLabel: string,
): Promise<ClaudeSnapshot | null> {
  try {
    const safeLabel = getSnapshotSafeLabel(accountLabel);
    const cached = snapshotCache.get(safeLabel);
    if (cached && Date.now() - cached.loadedAt < SNAPSHOT_CACHE_TTL_MS) {
      return cached.snapshot;
    }

    const snapshotPath = getSnapshotPath(accountLabel);
    try {
      await access(snapshotPath);
    } catch {
      return null;
    }

    const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as
      | ClaudeSnapshot
      | { headers?: Record<string, string>; body?: ClaudeSnapshotBody };
    if (!snapshot || typeof snapshot !== "object") {
      return null;
    }

    const normalized: ClaudeSnapshot = {
      accountKey:
        "accountKey" in snapshot && typeof snapshot.accountKey === "string"
          ? snapshot.accountKey
          : `anthropic:${accountLabel}`,
      capturedAt:
        "capturedAt" in snapshot && typeof snapshot.capturedAt === "string"
          ? snapshot.capturedAt
          : new Date(0).toISOString(),
      source: "claude-code",
      headers:
        "headers" in snapshot && snapshot.headers ? snapshot.headers : {},
      ...(snapshot.body ? { body: snapshot.body } : {}),
    };
    if (
      Object.keys(normalized.headers).length === 0 &&
      Object.keys(normalized.body ?? {}).length === 0
    ) {
      return null;
    }

    snapshotCache.set(safeLabel, {
      snapshot: normalized,
      loadedAt: Date.now(),
    });
    return normalized;
  } catch {
    return null;
  }
}

function buildSnapshotHeaders(
  headers: Record<string, string>,
  existingHeaders?: Record<string, string>,
): Record<string, string> {
  const merged = { ...(existingHeaders ?? {}) };
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      typeof value === "string" &&
      SNAPSHOT_STABLE_HEADERS.has(lower) &&
      !BLOCKED_UPSTREAM_HEADERS.has(lower) &&
      lower !== "authorization" &&
      lower !== "x-api-key" &&
      lower !== "x-claude-code-session-id"
    ) {
      merged[lower] = value;
    }
  }
  return merged;
}

function extractSnapshotBody(body: unknown): ClaudeSnapshotBody | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const parsed = body as {
    metadata?: { user_id?: unknown };
    system?: Array<{ text?: string; type?: string }> | string;
  };
  const identity = parseClaudeCodeUserId(parsed.metadata?.user_id);
  const systemBlocks = Array.isArray(parsed.system)
    ? parsed.system
    : typeof parsed.system === "string"
      ? [{ type: "text", text: parsed.system }]
      : [];
  const billingHeader = systemBlocks.find(
    (block) =>
      typeof block?.text === "string" &&
      block.text.includes("x-anthropic-billing-header"),
  )?.text;
  const agentBlock = systemBlocks.find(
    (block) =>
      typeof block?.text === "string" &&
      block.text.includes("Claude Agent SDK"),
  )?.text;

  if (!identity && !billingHeader && !agentBlock) {
    return undefined;
  }

  return {
    ...(identity ? { metadataUserId: identity.metadataUserId } : {}),
    ...(identity ? { sessionId: identity.sessionId } : {}),
    ...(billingHeader ? { billingHeader } : {}),
    ...(agentBlock ? { agentBlock } : {}),
  };
}

function isLikelyClaudeClient(
  headers: Record<string, string>,
  snapshotBody?: ClaudeSnapshotBody,
): boolean {
  return (
    typeof headers["x-claude-code-session-id"] === "string" ||
    headers["user-agent"]?.startsWith("claude-cli/") ||
    !!snapshotBody?.metadataUserId ||
    !!snapshotBody?.billingHeader ||
    !!snapshotBody?.agentBlock
  );
}

function snapshotsMatch(
  existing: ClaudeSnapshot | null,
  next: ClaudeSnapshot,
): boolean {
  if (!existing) {
    return false;
  }

  return (
    JSON.stringify(existing.headers ?? {}) ===
      JSON.stringify(next.headers ?? {}) &&
    JSON.stringify(existing.body ?? {}) === JSON.stringify(next.body ?? {})
  );
}

async function persistClaudeSnapshot(
  accountLabel: string,
  snapshot: ClaudeSnapshot,
): Promise<void> {
  const snapshotPath = getSnapshotPath(accountLabel);
  await writeJsonSnapshotAtomically(snapshotPath, snapshot, 0o600);
  snapshotCache.set(getSnapshotSafeLabel(accountLabel), {
    snapshot,
    loadedAt: Date.now(),
  });
}

async function maybeRefreshClaudeSnapshot(
  accountLabel: string,
  accountKey: string,
  headers: Record<string, string>,
  bodyStr: string,
): Promise<ClaudeSnapshot | null> {
  const existing = await loadClaudeSnapshot(accountLabel);

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(bodyStr);
  } catch {
    return existing;
  }

  const body = extractSnapshotBody(parsedBody);
  if (!isLikelyClaudeClient(headers, body)) {
    return existing;
  }

  const next: ClaudeSnapshot = {
    accountKey,
    capturedAt: new Date().toISOString(),
    source: "claude-code",
    headers: buildSnapshotHeaders(headers, existing?.headers),
    body: {
      ...(existing?.body ?? {}),
      ...(body ?? {}),
      ...(typeof headers["x-claude-code-session-id"] === "string"
        ? { sessionId: headers["x-claude-code-session-id"] }
        : {}),
    },
  };

  if (snapshotsMatch(existing, next)) {
    return existing;
  }

  try {
    await persistClaudeSnapshot(accountLabel, next);
  } catch (error) {
    logger.warn("[proxy] failed to persist Claude snapshot", {
      accountLabel,
      error: error instanceof Error ? error.message : String(error),
    });
    snapshotCache.set(getSnapshotSafeLabel(accountLabel), {
      snapshot: next,
      loadedAt: Date.now(),
    });
  }
  return next;
}

/**
 * Polyfill the request body for OAuth accounts.
 * Claude Code injects a billing header, agent block, and metadata.user_id
 * into the body.  Non-CC clients (Curator, custom apps) don't send these —
 * Anthropic rejects without them.
 */
function polyfillOAuthBody(
  bodyStr: string,
  accountToken: string,
  snapshot: ClaudeSnapshot | null,
  preferredSessionId?: string,
): { bodyStr: string; sessionId?: string } {
  try {
    const parsed = JSON.parse(bodyStr);

    // Billing header block (required by Anthropic for OAuth)
    // NOTE: This block MUST be deterministic (no random values) to preserve
    // Anthropic's prompt caching prefix chain. We keep the real Claude Code
    // version/entrypoint shape when present, but stabilize the volatile cch.
    const agentBlock = {
      type: "text",
      text:
        snapshot?.body?.agentBlock ||
        "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
    };

    // Normalise system to array and APPEND billing + agent blocks.
    // IMPORTANT: We append (not prepend) to preserve the client's cache
    // prefix chain. Anthropic's prompt caching uses prefix matching — if we
    // insert anything before the client's system blocks, we invalidate all
    // cached content (tools, system prompt, message history).
    //
    // Claude Code sends a billing block with a `cch=<hash>` value that changes
    // on every request. We fix this by:
    //   1. Removing the client's billing block from its current position
    //   2. Stabilizing it while keeping the official Claude Code shape
    //   3. Appending it at the END so the cacheable system blocks stay
    //      at the front of the prefix chain
    if (parsed.system) {
      if (typeof parsed.system === "string") {
        parsed.system = [{ type: "text", text: parsed.system }];
      }
      if (Array.isArray(parsed.system)) {
        // Find and remove existing billing/agent blocks from wherever
        // the client placed them (typically at system[0])
        const billingIdx = parsed.system.findIndex(
          (b: { text?: string }) =>
            typeof b.text === "string" &&
            b.text.includes("x-anthropic-billing-header"),
        );
        const agentIdx = parsed.system.findIndex(
          (b: { text?: string }) =>
            typeof b.text === "string" && b.text.includes("Claude Agent SDK"),
        );
        const billingBlock = {
          type: "text",
          text: buildStableClaudeCodeBillingHeader(
            parsed.system[billingIdx]?.text ?? snapshot?.body?.billingHeader,
          ),
        };

        // Remove in reverse index order so indices stay valid
        const indicesToRemove = [billingIdx, agentIdx]
          .filter((i) => i >= 0)
          .sort((a, b) => b - a);
        for (const idx of indicesToRemove) {
          parsed.system.splice(idx, 1);
        }

        // Always append a deterministic billing block at the end.
        // If the client sent one, we stripped its dynamic cch= and use
        // our stable version instead. If not, we add ours.
        parsed.system = [...parsed.system, billingBlock, agentBlock];
      }
    } else {
      const billingBlock = {
        type: "text",
        text: buildStableClaudeCodeBillingHeader(snapshot?.body?.billingHeader),
      };
      parsed.system = [billingBlock, agentBlock];
    }

    // Inject Claude-Code-shaped metadata.user_id (required for OAuth).
    const tokenPrefix = accountToken.substring(
      0,
      Math.min(20, accountToken.length),
    );
    const identity = getOrCreateClaudeCodeIdentity(tokenPrefix, {
      existingUserId:
        parsed.metadata?.user_id ?? snapshot?.body?.metadataUserId,
      preferredSessionId: preferredSessionId ?? snapshot?.body?.sessionId,
    });
    parsed.metadata = {
      ...parsed.metadata,
      user_id: identity.metadataUserId,
    };

    return { bodyStr: JSON.stringify(parsed), sessionId: identity.sessionId };
  } catch {
    return { bodyStr }; // JSON parse failed — use original body
  }
}

// ---------------------------------------------------------------------------
// Legacy credential refresh helper (extracted to reduce block nesting)
// ---------------------------------------------------------------------------

async function tryLoadLegacyAccount(
  creds: {
    oauth?: { accessToken?: string; refreshToken?: string; expiresAt?: number };
  },
  legacyCredPath: string,
): Promise<ProxyPassthroughAccount | undefined> {
  if (!creds.oauth?.accessToken) {
    return undefined;
  }

  let legacyToken = creds.oauth.accessToken;
  let legacyRefresh = creds.oauth.refreshToken;
  let legacyExpiry = creds.oauth.expiresAt;
  const legacyExpired = legacyExpiry ? legacyExpiry < Date.now() : false;

  if (!legacyExpired) {
    return {
      key: "anthropic:legacy-default",
      label: "default",
      token: legacyToken,
      refreshToken: legacyRefresh,
      expiresAt: legacyExpiry,
      type: "oauth",
      persistTarget: { credPath: legacyCredPath },
    };
  }

  if (!legacyRefresh) {
    logger.always(
      "[proxy] skipping legacy account (expired, no refresh token)",
    );
    return undefined;
  }

  const tmp = {
    token: legacyToken,
    refreshToken: legacyRefresh,
    expiresAt: legacyExpiry,
    label: "default",
  };
  const ok = await refreshToken(tmp);
  if (!ok.success) {
    logger.always(
      `[proxy] skipping legacy account (expired, refresh failed: ${ok.error?.slice(0, 200) ?? "unknown"})`,
    );
    return undefined;
  }

  legacyToken = tmp.token;
  legacyRefresh = tmp.refreshToken;
  legacyExpiry = tmp.expiresAt;
  await persistTokens(legacyCredPath, tmp);
  logger.always("[proxy] refreshed legacy account at startup");

  return {
    key: "anthropic:legacy-default",
    label: "default",
    token: legacyToken,
    refreshToken: legacyRefresh,
    expiresAt: legacyExpiry,
    type: "oauth",
    persistTarget: { credPath: legacyCredPath },
  };
}

async function handleTranslatedClaudeRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  route: { provider: string; model: string };
  modelRouter?: ModelRouter;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    route,
    modelRouter,
    tracer,
    requestStartTime,
    logProxyBody,
  } = args;
  tracer?.setMode("full");
  const parsed = parseClaudeRequest(body);
  const plan = buildProxyTranslationPlan(
    {
      provider: route.provider,
      model: route.model,
    },
    modelRouter?.getFallbackChain() ?? [],
    body.model,
    parsed,
  );
  logProxyRoutingPlan(logProxyBody, "translated_request", plan);
  const attempts = plan.attempts;

  if (body.stream) {
    return handleTranslatedClaudeStreamRequest({
      ctx,
      body,
      attempts,
      parsed,
      tracer,
      requestStartTime,
    });
  }

  return handleTranslatedClaudeJsonRequest({
    ctx,
    body,
    attempts,
    parsed,
    tracer,
    requestStartTime,
    logProxyBody,
  });
}

function logProxyRoutingPlan(
  logProxyBody: ProxyBodyCaptureLogger,
  stage: string,
  plan: Pick<ProxyTranslationPlan, "attempts" | "skipped">,
): void {
  logProxyBody({
    phase: "routing_decision",
    contentType: "application/json",
    body: {
      stage,
      attempts: plan.attempts,
    },
  });
}

async function handleTranslatedClaudeStreamRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  attempts: ProxyTranslationAttempt[];
  parsed: ParsedClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
}): Promise<Response> {
  const { ctx, body, attempts, parsed, tracer, requestStartTime } = args;
  const serializer = new ClaudeStreamSerializer(body.model, 0);
  const KEEPALIVE_INTERVAL_MS = 15_000;
  const encoder = new TextEncoder();
  let translationKeepAliveTimer: ReturnType<typeof setInterval> | undefined;
  let translationCancelled = false;
  let translationSucceeded = false;
  let translatedModel: string | undefined;
  let finalStreamError = "No translation providers succeeded";
  let upstreamIterator: AsyncIterator<unknown> | undefined;

  const translationStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const frame of serializer.start()) {
        controller.enqueue(encoder.encode(frame));
      }

      translationKeepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          // Controller already closed.
        }
      }, KEEPALIVE_INTERVAL_MS);

      try {
        for (
          let attemptIndex = 0;
          attemptIndex < attempts.length;
          attemptIndex++
        ) {
          const attempt = attempts[attemptIndex];
          if (attemptIndex > 0) {
            logger.always(`[proxy] fallback → ${attempt.label}`);
          }

          let collectedText = "";
          try {
            const options = buildProxyFallbackOptions(
              parsed,
              attempt.provider
                ? {
                    provider: attempt.provider,
                    model: attempt.model,
                  }
                : {},
            );
            const streamResult = await ctx.neurolink.stream(
              options as Parameters<typeof ctx.neurolink.stream>[0],
            );
            const iterable = streamResult.stream as AsyncIterable<unknown>;
            upstreamIterator = iterable[Symbol.asyncIterator]();

            while (true) {
              if (translationCancelled) {
                break;
              }
              const { value: chunk, done } = await upstreamIterator.next();
              if (done || translationCancelled) {
                break;
              }
              const text = extractText(chunk);
              if (text) {
                collectedText += text;
                for (const frame of serializer.pushDelta(text)) {
                  controller.enqueue(encoder.encode(frame));
                }
              }
            }

            const toolCalls = streamResult.toolCalls ?? [];
            if (!hasTranslatedOutput(collectedText, toolCalls)) {
              finalStreamError = `Translated provider ${attempt.label} returned no content or tool calls`;
              logger.debug(
                `[proxy] translation attempt ${attempt.label} returned no content or tool calls`,
              );
              continue;
            }

            if (!translationCancelled && toolCalls.length) {
              for (const toolCall of toolCalls) {
                const toolName =
                  (toolCall as { toolName?: string }).toolName ??
                  (toolCall as { name?: string }).name ??
                  "unknown";
                for (const frame of serializer.pushToolUse(
                  generateToolUseId(),
                  toolName,
                  extractToolArgs(toolCall),
                )) {
                  controller.enqueue(encoder.encode(frame));
                }
              }
            }

            if (!translationCancelled) {
              const reason = streamResult.finishReason ?? "end_turn";
              const resolvedUsage = extractUsageFromStreamResult(
                streamResult.usage,
              );
              for (const frame of serializer.finish(
                resolvedUsage.output,
                reason,
              )) {
                controller.enqueue(encoder.encode(frame));
              }
            }

            translatedModel = streamResult.model;
            translationSucceeded = true;
            return;
          } catch (streamErr) {
            if (translationCancelled) {
              return;
            }
            finalStreamError =
              streamErr instanceof Error
                ? streamErr.message
                : String(streamErr);
            if (collectedText.trim().length > 0) {
              logger.always(
                `[proxy] mid-stream error (translation mode): ${finalStreamError}`,
              );
              const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${finalStreamError}` } })}\n\n`;
              controller.enqueue(encoder.encode(errorEvent));
              return;
            }
            logger.debug(
              `[proxy] translation attempt ${attempt.label} failed: ${finalStreamError}`,
            );
          }
        }

        if (!translationCancelled) {
          logger.always(
            `[proxy] mid-stream error (translation mode): ${finalStreamError}`,
          );
          const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${finalStreamError}` } })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        }
      } finally {
        if (translationKeepAliveTimer) {
          clearInterval(translationKeepAliveTimer);
        }
        if (!translationCancelled) {
          controller.close();
        }
        if (tracer && translatedModel && translatedModel !== body.model) {
          tracer.setModelSubstitution(body.model, translatedModel);
        }
        if (!translationSucceeded) {
          tracer?.setError("generation_error", finalStreamError.slice(0, 500));
        }
        tracer?.end(200, Date.now() - requestStartTime);
      }
    },
    cancel() {
      translationCancelled = true;
      if (translationKeepAliveTimer) {
        clearInterval(translationKeepAliveTimer);
        translationKeepAliveTimer = undefined;
      }
      if (upstreamIterator?.return) {
        upstreamIterator.return(undefined).catch((cancelErr) => {
          logger.debug(
            `[proxy] upstream cancel error: ${cancelErr instanceof Error ? cancelErr.message : String(cancelErr)}`,
          );
        });
      }
    },
  });

  return new Response(translationStream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

async function handleTranslatedClaudeJsonRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  attempts: ProxyTranslationAttempt[];
  parsed: ParsedClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    attempts,
    parsed,
    tracer,
    requestStartTime,
    logProxyBody,
  } = args;
  let lastAttemptError = "No translation providers succeeded";

  for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
    const attempt = attempts[attemptIndex];
    if (attemptIndex > 0) {
      logger.always(`[proxy] fallback → ${attempt.label}`);
    }

    try {
      const options = buildProxyFallbackOptions(
        parsed,
        attempt.provider
          ? {
              provider: attempt.provider,
              model: attempt.model,
            }
          : {},
      );
      const streamResult = await ctx.neurolink.stream(
        options as Parameters<typeof ctx.neurolink.stream>[0],
      );
      let collectedText = "";
      for await (const chunk of streamResult.stream) {
        const text = extractText(chunk);
        if (text) {
          collectedText += text;
        }
      }
      if (!hasTranslatedOutput(collectedText, streamResult.toolCalls)) {
        lastAttemptError = `Translated provider ${attempt.label} returned no content or tool calls`;
        logger.debug(
          `[proxy] translation attempt ${attempt.label} returned no content or tool calls`,
        );
        continue;
      }

      const internal: InternalResult = {
        content: collectedText,
        model: streamResult.model,
        finishReason: streamResult.finishReason ?? "end_turn",
        reasoning: undefined,
        usage: streamResult.usage
          ? extractUsageFromStreamResult(streamResult.usage)
          : undefined,
        toolCalls: streamResult.toolCalls as InternalResult["toolCalls"],
      };
      if (tracer && streamResult.model && streamResult.model !== body.model) {
        tracer.setModelSubstitution(body.model, streamResult.model);
      }
      tracer?.end(200, Date.now() - requestStartTime);
      const clientResponse = serializeClaudeResponse(internal, body.model);
      const clientResponseText = JSON.stringify(clientResponse);
      logProxyBody({
        phase: "client_response",
        headers: { "content-type": "application/json" },
        body: clientResponseText,
        bodySize: Buffer.byteLength(clientResponseText, "utf8"),
        contentType: "application/json",
        responseStatus: 200,
        durationMs: Date.now() - requestStartTime,
      });
      return clientResponse;
    } catch (attemptError) {
      lastAttemptError =
        attemptError instanceof Error
          ? attemptError.message
          : String(attemptError);
      logger.debug(
        `[proxy] translation attempt ${attempt.label} failed: ${lastAttemptError}`,
      );
    }
  }

  throw new Error(lastAttemptError);
}

async function handleClaudePassthroughRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  clientRequestBody: string;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    clientRequestBody,
    tracer,
    requestStartTime,
    logProxyBody,
  } = args;
  tracer?.setMode("passthrough-cli");
  const bodyStr = clientRequestBody;
  const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const upstreamHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(ctx.headers)) {
    if (!BLOCKED_UPSTREAM_HEADERS.has(key.toLowerCase()) && value) {
      upstreamHeaders[key] = value;
    }
  }
  if (!upstreamHeaders["content-type"]) {
    upstreamHeaders["content-type"] = "application/json";
  }

  const upstreamSpan = tracer?.startUpstreamAttempt({
    account: "passthrough",
    attempt: 1,
    polyfillHeaders: false,
    polyfillBody: false,
    upstreamUrl: "https://api.anthropic.com/v1/messages?beta=true",
  });
  tracer?.logUpstreamRequestHeaders(upstreamHeaders);
  tracer?.logUpstreamRequestBody(bodyStr);
  logProxyBody({
    phase: "upstream_request",
    headers: upstreamHeaders,
    body: bodyStr,
    bodySize: Buffer.byteLength(bodyStr, "utf8"),
    contentType: upstreamHeaders["content-type"] ?? "application/json",
    account: "passthrough",
    accountType: "passthrough",
    attempt: 1,
  });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages?beta=true", {
      method: "POST",
      headers: upstreamHeaders,
      body: bodyStr,
      signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
    });
  } catch (fetchErr) {
    const errMsg =
      fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    tracer?.setError("network_error", errMsg);
    upstreamSpan?.end();
    tracer?.end(502, Date.now() - requestStartTime);
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: body.stream ?? false,
      toolCount,
      account: "passthrough",
      accountType: "passthrough",
      responseStatus: 502,
      responseTimeMs: Date.now() - requestStartTime,
      errorType: "network_error",
      errorMessage: errMsg,
    });
    const errorBody = buildClaudeError(
      502,
      `Passthrough fetch failed: ${errMsg}`,
    );
    const errorBodyText = JSON.stringify(errorBody);
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: errorBodyText,
      bodySize: Buffer.byteLength(errorBodyText, "utf8"),
      contentType: "application/json",
      account: "passthrough",
      accountType: "passthrough",
      attempt: 1,
      responseStatus: 502,
      durationMs: Date.now() - requestStartTime,
    });
    return errorBody;
  }

  const upstreamResponseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    upstreamResponseHeaders[key] = value;
  });
  tracer?.logUpstreamResponseHeaders(upstreamResponseHeaders);

  if (!response.ok) {
    const errorText = await response.text();
    tracer?.logUpstreamResponseBody(errorText);
    logProxyBody({
      phase: "upstream_response",
      headers: upstreamResponseHeaders,
      body: errorText,
      bodySize: Buffer.byteLength(errorText, "utf8"),
      contentType:
        upstreamResponseHeaders["content-type"] ?? "application/json",
      account: "passthrough",
      accountType: "passthrough",
      attempt: 1,
      responseStatus: response.status,
      durationMs: Date.now() - requestStartTime,
    });
    logProxyBody({
      phase: "client_response",
      headers: upstreamResponseHeaders,
      body: errorText,
      bodySize: Buffer.byteLength(errorText, "utf8"),
      contentType:
        upstreamResponseHeaders["content-type"] ?? "application/json",
      account: "passthrough",
      accountType: "passthrough",
      attempt: 1,
      responseStatus: response.status,
      durationMs: Date.now() - requestStartTime,
    });
    upstreamSpan?.end();
    tracer?.setError("api_error", errorText.slice(0, 500));
    tracer?.end(response.status, Date.now() - requestStartTime);
    try {
      return JSON.parse(errorText);
    } catch {
      return buildClaudeError(response.status, errorText);
    }
  }

  if (body.stream && response.body) {
    return handleClaudePassthroughStreamResponse({
      ctx,
      body,
      bodyStr,
      response,
      tracer,
      requestStartTime,
      toolCount,
      upstreamSpan,
      upstreamResponseHeaders,
      logProxyBody,
    });
  }

  return handleClaudePassthroughJsonResponse({
    ctx,
    body,
    bodyStr,
    response,
    tracer,
    requestStartTime,
    toolCount,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
  });
}

async function handleClaudePassthroughStreamResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  bodyStr: string;
  response: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  toolCount: number;
  upstreamSpan?: ReturnType<ProxyTracer["startUpstreamAttempt"]>;
  upstreamResponseHeaders: Record<string, string>;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<Response> {
  const {
    ctx,
    body,
    bodyStr,
    response,
    tracer,
    requestStartTime,
    toolCount,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
  } = args;
  const responseHeaders = { ...upstreamResponseHeaders };
  const { stream: clientCaptureStream, capture: clientCapture } =
    createRawStreamCapture();
  const responseBody = response.body;
  if (!responseBody) {
    throw new Error("Expected passthrough stream response body");
  }
  let streamSource: ReadableStream<Uint8Array> = responseBody;

  if (tracer) {
    try {
      const { stream: interceptor, telemetry } = createSSEInterceptor({
        captureRawText: true,
      });
      streamSource = streamSource.pipeThrough(interceptor);
      const capturedTracer = tracer;
      const capturedUpstreamSpan = upstreamSpan;
      const capturedResponse = response;
      const capturedRequestBytes = bodyStr.length;

      Promise.all([telemetry, clientCapture])
        .then(([data, clientBody]) => {
          capturedTracer.setUsage({
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          });
          capturedTracer.logStreamEvents(data.events);

          const rateLimit5h = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-5h-utilization",
            ) ?? "",
          );
          const rateLimit7d = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-7d-utilization",
            ) ?? "",
          );
          const usageUpdate: Parameters<typeof capturedTracer.setUsage>[0] = {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          };
          if (!isNaN(rateLimit5h)) {
            usageUpdate.rateLimitAfter5h = rateLimit5h;
          }
          if (!isNaN(rateLimit7d)) {
            usageUpdate.rateLimitAfter7d = rateLimit7d;
          }
          if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
            capturedTracer.setUsage(usageUpdate);
          }

          capturedTracer.logUpstreamResponseBody(data.rawText ?? "");
          capturedTracer.recordMetrics();
          capturedTracer.recordBodySizes(
            capturedRequestBytes,
            data.totalBytesReceived,
          );
          capturedUpstreamSpan?.end();
          capturedTracer.end(200, Date.now() - requestStartTime);

          const traceCtx = capturedTracer.getTraceContext();
          logRequest({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            method: ctx.method,
            path: ctx.path,
            model: body.model,
            stream: true,
            toolCount,
            account: "passthrough",
            accountType: "passthrough",
            responseStatus: 200,
            responseTimeMs: Date.now() - requestStartTime,
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
            traceId: traceCtx.traceId,
            spanId: traceCtx.spanId,
          });
          logProxyBody({
            phase: "upstream_response",
            headers: responseHeaders,
            body: data.rawText ?? "",
            bodySize: data.totalBytesReceived,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: "passthrough",
            accountType: "passthrough",
            attempt: 1,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: "passthrough",
            accountType: "passthrough",
            attempt: 1,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch((error) => {
          capturedTracer.setError(
            "stream_error",
            error instanceof Error ? error.message : String(error),
          );
          capturedUpstreamSpan?.end();
          capturedTracer.end(500, Date.now() - requestStartTime);

          const traceCtx = capturedTracer.getTraceContext();
          logRequest({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            method: ctx.method,
            path: ctx.path,
            model: body.model,
            stream: true,
            toolCount,
            account: "passthrough",
            accountType: "passthrough",
            responseStatus: 500,
            responseTimeMs: Date.now() - requestStartTime,
            errorType: "stream_error",
            errorMessage:
              error instanceof Error ? error.message : String(error),
            traceId: traceCtx.traceId,
            spanId: traceCtx.spanId,
          });
        });
    } catch {
      // Streaming capture is best-effort.
    }
  } else {
    clientCapture
      .then((clientBody) => {
        logProxyBody({
          phase: "upstream_response",
          headers: responseHeaders,
          body: clientBody.text,
          bodySize: clientBody.totalBytes,
          contentType: responseHeaders["content-type"] ?? "text/event-stream",
          account: "passthrough",
          accountType: "passthrough",
          attempt: 1,
          responseStatus: 200,
          durationMs: Date.now() - requestStartTime,
        });
        logProxyBody({
          phase: "client_response",
          headers: responseHeaders,
          body: clientBody.text,
          bodySize: clientBody.totalBytes,
          contentType: responseHeaders["content-type"] ?? "text/event-stream",
          account: "passthrough",
          accountType: "passthrough",
          attempt: 1,
          responseStatus: 200,
          durationMs: Date.now() - requestStartTime,
        });
      })
      .catch(() => {
        // Non-fatal
      });
  }

  const clientStream = streamSource.pipeThrough(clientCaptureStream);
  return new Response(clientStream, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function handleClaudePassthroughJsonResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  bodyStr: string;
  response: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  toolCount: number;
  upstreamSpan?: ReturnType<ProxyTracer["startUpstreamAttempt"]>;
  upstreamResponseHeaders: Record<string, string>;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    bodyStr,
    response,
    tracer,
    requestStartTime,
    toolCount,
    upstreamSpan,
    upstreamResponseHeaders,
    logProxyBody,
  } = args;
  const responseText = await response.text();
  tracer?.logUpstreamResponseBody(responseText);
  logProxyBody({
    phase: "upstream_response",
    headers: upstreamResponseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: upstreamResponseHeaders["content-type"] ?? "application/json",
    account: "passthrough",
    accountType: "passthrough",
    attempt: 1,
    responseStatus: response.status,
    durationMs: Date.now() - requestStartTime,
  });
  logProxyBody({
    phase: "client_response",
    headers: upstreamResponseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: upstreamResponseHeaders["content-type"] ?? "application/json",
    account: "passthrough",
    accountType: "passthrough",
    attempt: 1,
    responseStatus: response.status,
    durationMs: Date.now() - requestStartTime,
  });

  const responseJson = JSON.parse(responseText);
  if (tracer && responseJson && typeof responseJson === "object") {
    const usage = (responseJson as Record<string, unknown>).usage as
      | Record<string, number>
      | undefined;
    if (usage) {
      tracer.setUsage({
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      });

      const rateLimit5h = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-5h-utilization") ??
          "",
      );
      const rateLimit7d = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-7d-utilization") ??
          "",
      );
      if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
        const usageWithRates: Parameters<typeof tracer.setUsage>[0] = {
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        };
        if (!isNaN(rateLimit5h)) {
          usageWithRates.rateLimitAfter5h = rateLimit5h;
        }
        if (!isNaN(rateLimit7d)) {
          usageWithRates.rateLimitAfter7d = rateLimit7d;
        }
        tracer.setUsage(usageWithRates);
      }
    }
    tracer.recordMetrics();
    const responseJsonStr = JSON.stringify(responseJson);
    tracer.recordBodySizes(bodyStr.length, responseJsonStr.length);
    upstreamSpan?.end();
    tracer.end(response.status, Date.now() - requestStartTime);

    const traceCtx = tracer.getTraceContext();
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: false,
      toolCount,
      account: "passthrough",
      accountType: "passthrough",
      responseStatus: response.status,
      responseTimeMs: Date.now() - requestStartTime,
      inputTokens: usage?.input_tokens,
      outputTokens: usage?.output_tokens,
      cacheCreationTokens: usage?.cache_creation_input_tokens,
      cacheReadTokens: usage?.cache_read_input_tokens,
      traceId: traceCtx.traceId,
      spanId: traceCtx.spanId,
    });
  } else {
    upstreamSpan?.end();
    tracer?.end(response.status, Date.now() - requestStartTime);
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: false,
      toolCount,
      account: "passthrough",
      accountType: "passthrough",
      responseStatus: response.status,
      responseTimeMs: Date.now() - requestStartTime,
    });
  }

  return responseJson;
}

async function loadClaudeProxyAccounts(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  accountStrategy: "round-robin" | "fill-first";
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
}): Promise<LoadedClaudeAccountContext | { response: unknown }> {
  const {
    ctx,
    body,
    tracer,
    requestStartTime,
    accountStrategy,
    buildLoggedClaudeError,
  } = args;
  const fs = await import("fs");
  const os = await import("os");
  const accounts: ProxyPassthroughAccount[] = [];
  const legacyCredPath = `${(os as typeof import("os")).homedir()}/.neurolink/anthropic-credentials.json`;
  const { tokenStore } = await import("../../auth/tokenStore.js");

  if (!startupPruneDone) {
    await tokenStore.pruneExpired();
    startupPruneDone = true;
  }

  const compoundKeys = await tokenStore.listByPrefix("anthropic:");
  for (const key of compoundKeys) {
    if (await tokenStore.isDisabled(key)) {
      const existingState = getOrCreateRuntimeState(key);
      const tokens = await tokenStore.loadTokens(key);
      const hasTrackedTokens =
        existingState.lastToken !== undefined && existingState.lastToken !== "";
      const tokenChanged =
        tokens &&
        hasTrackedTokens &&
        (existingState.lastToken !== tokens.accessToken ||
          existingState.lastRefreshToken !== tokens.refreshToken);
      if (tokenChanged) {
        await tokenStore.markEnabled(key);
        logger.always(
          `[proxy] account=${key.split(":")[1] ?? key} re-enabled (credentials changed)`,
        );
        existingState.permanentlyDisabled = false;
        existingState.consecutiveRefreshFailures = 0;
      } else {
        logger.debug(
          `[proxy] skipping disabled account=${key.split(":")[1] ?? key}`,
        );
        existingState.permanentlyDisabled = true;
        continue;
      }
    }

    const tokens = await tokenStore.loadTokens(key);
    if (!tokens) {
      continue;
    }

    let accessToken = tokens.accessToken;
    let refreshTok = tokens.refreshToken;
    let expiresAt = tokens.expiresAt;
    const isExpired = expiresAt ? expiresAt < Date.now() : false;

    if (isExpired) {
      const label = key.split(":")[1] ?? key;
      const existingState = getOrCreateRuntimeState(key);
      if (existingState.permanentlyDisabled) {
        continue;
      }

      if (!refreshTok) {
        logger.always(
          `[proxy] skipping account=${label} (expired, no refresh token)`,
        );
        await disableAccountUntilReauth(
          { key, label, token: accessToken, type: "oauth" },
          existingState,
        );
        continue;
      }

      const tempAccount = {
        token: accessToken,
        refreshToken: refreshTok,
        expiresAt,
        label,
      };
      const refreshed = await refreshToken(tempAccount);
      if (!refreshed.success) {
        logger.always(
          `[proxy] skipping account=${label} (expired, refresh failed: ${refreshed.error?.slice(0, 200) ?? "unknown"})`,
        );
        await disableAccountUntilReauth(
          { key, label, token: accessToken, type: "oauth" },
          existingState,
        );
        continue;
      }

      accessToken = tempAccount.token;
      refreshTok = tempAccount.refreshToken;
      expiresAt = tempAccount.expiresAt;
      await tokenStore.saveTokens(key, {
        accessToken,
        refreshToken: refreshTok,
        expiresAt: expiresAt ?? Date.now() + 3600_000,
        tokenType: "Bearer",
      });
      logger.always(
        `[proxy] refreshed expired account=${key.split(":")[1] ?? key} at startup`,
      );
    }

    const accountType: "oauth" | "api_key" =
      tokens.tokenType === "Bearer" ? "oauth" : "api_key";

    accounts.push({
      key,
      label: key.split(":")[1] ?? key,
      token: accessToken,
      refreshToken: refreshTok,
      expiresAt,
      type: accountType,
      persistTarget: { providerKey: key },
    });
  }

  if (accounts.length === 0) {
    try {
      const creds = JSON.parse(
        (fs as typeof import("fs")).readFileSync(legacyCredPath, "utf8"),
      ) as {
        oauth?: {
          accessToken?: string;
          refreshToken?: string;
          expiresAt?: number;
        };
      };
      const legacyAccount = await tryLoadLegacyAccount(creds, legacyCredPath);
      if (legacyAccount) {
        accounts.push(legacyAccount);
      }
    } catch {
      // file absent or invalid
    }
  }

  if (process.env.ANTHROPIC_API_KEY && accounts.length === 0) {
    accounts.push({
      key: "anthropic:env",
      label: "env",
      token: process.env.ANTHROPIC_API_KEY,
      type: "api_key",
    });
  }

  if (accounts.length === 0) {
    tracer?.setError("authentication_error", "No Anthropic credentials found");
    tracer?.end(401, Date.now() - requestStartTime);
    return {
      response: buildLoggedClaudeError(401, "No Anthropic credentials found"),
    };
  }

  for (const account of accounts) {
    const state = getOrCreateRuntimeState(account.key);
    const tokenChanged =
      state.lastToken !== account.token ||
      state.lastRefreshToken !== account.refreshToken;
    if (tokenChanged) {
      if (state.permanentlyDisabled) {
        logger.always(
          `[proxy] account=${account.label} credentials changed, re-enabling`,
        );
      }
      state.consecutiveRefreshFailures = 0;
      state.permanentlyDisabled = false;
    }
    state.lastToken = account.token;
    state.lastRefreshToken = account.refreshToken;
  }

  const enabledAccounts = accounts.filter((account) => {
    return !getOrCreateRuntimeState(account.key).permanentlyDisabled;
  });
  if (enabledAccounts.length === 0) {
    const reauthMsg = formatReauthMessage(
      accounts.map((account) => account.label),
    );
    tracer?.setError("authentication_error", reauthMsg);
    tracer?.end(401, Date.now() - requestStartTime);
    return { response: buildLoggedClaudeError(401, reauthMsg) };
  }

  const orderedAccounts = [...enabledAccounts];
  if (
    accountStrategy === "round-robin" &&
    orderedAccounts.length !== lastKnownAccountCount
  ) {
    primaryAccountIndex = resolveHomeIndex(orderedAccounts);
    lastKnownAccountCount = orderedAccounts.length;
  }
  if (orderedAccounts.length > 1) {
    const idx = primaryAccountIndex % orderedAccounts.length;
    if (accountStrategy === "round-robin") {
      primaryAccountIndex = (primaryAccountIndex + 1) % orderedAccounts.length;
    }
    if (idx > 0) {
      const head = orderedAccounts.splice(0, idx);
      orderedAccounts.push(...head);
    }
  }

  const normalizedAnthropicBody = normalizeClaudeRequestForAnthropic(body);
  const bodyStr = JSON.stringify(normalizedAnthropicBody);
  const requestStart = Date.now();
  const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
  const url = "https://api.anthropic.com/v1/messages?beta=true";
  const clientHeaders = ctx.headers ?? {};
  const clientSnapshotBody = extractSnapshotBody(body);

  return {
    accounts,
    enabledAccounts,
    orderedAccounts,
    bodyStr,
    requestStart,
    toolCount,
    url,
    clientHeaders,
    isClaudeClientRequest: isLikelyClaudeClient(
      clientHeaders,
      clientSnapshotBody,
    ),
  };
}

async function executeClaudeFallbackTranslation(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  options: Parameters<ServerContext["neurolink"]["stream"]>[0];
  providerLabel: string;
}): Promise<unknown> {
  const {
    ctx,
    body,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
    options,
    providerLabel,
  } = args;
  if (body.stream) {
    const streamResult = await ctx.neurolink.stream(options);
    const serializer = new ClaudeStreamSerializer(body.model, 0);

    // Eagerly consume stream so errors fire synchronously and the
    // fallback loop in tryConfiguredClaudeFallbackChain can catch them.
    const frames: string[] = [];
    let collectedText = "";

    for (const frame of serializer.start()) {
      frames.push(frame);
    }

    for await (const chunk of streamResult.stream) {
      const text = extractText(chunk);
      if (text) {
        collectedText += text;
        for (const frame of serializer.pushDelta(text)) {
          frames.push(frame);
        }
      }
    }

    const toolCalls = streamResult.toolCalls ?? [];

    if (!hasTranslatedOutput(collectedText, toolCalls)) {
      throw new Error(
        `Translated provider ${providerLabel} returned no content or tool calls`,
      );
    }

    if (toolCalls.length) {
      for (const toolCall of toolCalls) {
        const toolName =
          (toolCall as { toolName?: string }).toolName ??
          (toolCall as { name?: string }).name ??
          "unknown";
        for (const frame of serializer.pushToolUse(
          generateToolUseId(),
          toolName,
          extractToolArgs(toolCall),
        )) {
          frames.push(frame);
        }
      }
    }

    const reason = streamResult.finishReason ?? "end_turn";
    const resolvedUsage = extractUsageFromStreamResult(streamResult.usage);
    for (const frame of serializer.finish(resolvedUsage.output, reason)) {
      frames.push(frame);
    }

    // Telemetry AFTER validation — not before like the old lazy path
    tracer?.end(200, Date.now() - requestStartTime);
    recordFinalSuccess();
    logFinalRequest(200, "", providerLabel, undefined, undefined, {
      inputTokens: resolvedUsage.input,
      outputTokens: resolvedUsage.output,
    });

    const bufferedBody = frames.join("");
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "text/event-stream" },
      body: bufferedBody,
      bodySize: Buffer.byteLength(bufferedBody, "utf8"),
      contentType: "text/event-stream",
      responseStatus: 200,
      durationMs: Date.now() - requestStartTime,
    });

    // Return generator that yields pre-buffered frames
    async function* sseGenerator(): AsyncIterable<string> {
      for (const frame of frames) {
        yield frame;
      }
    }
    return sseGenerator();
  }

  const streamResult = await ctx.neurolink.stream(options);
  let collectedText = "";
  for await (const chunk of streamResult.stream) {
    const text = extractText(chunk);
    if (text) {
      collectedText += text;
    }
  }
  if (!hasTranslatedOutput(collectedText, streamResult.toolCalls)) {
    throw new Error(
      `Translated provider ${providerLabel} returned no content or tool calls`,
    );
  }

  const internal: InternalResult = {
    content: collectedText,
    model: streamResult.model,
    finishReason: streamResult.finishReason ?? "end_turn",
    reasoning: undefined,
    usage: streamResult.usage
      ? extractUsageFromStreamResult(streamResult.usage)
      : undefined,
    toolCalls: streamResult.toolCalls as InternalResult["toolCalls"],
  };
  tracer?.end(200, Date.now() - requestStartTime);
  recordFinalSuccess();
  const clientResponse = serializeClaudeResponse(internal, body.model);
  logFinalRequest(200, "", providerLabel, undefined, undefined, {
    inputTokens: internal.usage?.input,
    outputTokens: internal.usage?.output,
  });
  const clientResponseText = JSON.stringify(clientResponse);
  logProxyBody({
    phase: "client_response",
    headers: { "content-type": "application/json" },
    body: clientResponseText,
    bodySize: Buffer.byteLength(clientResponseText, "utf8"),
    contentType: "application/json",
    responseStatus: 200,
    durationMs: Date.now() - requestStartTime,
  });
  return clientResponse;
}

async function tryConfiguredClaudeFallbackChain(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  parsedFallbackRequest: ParsedClaudeRequest;
  modelRouter?: ModelRouter;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<{ response: unknown | null }> {
  const {
    ctx,
    body,
    parsedFallbackRequest,
    modelRouter,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
  } = args;
  const chain = modelRouter?.getFallbackChain() ?? [];
  const fallbackPlan = buildProxyTranslationPlan(
    { provider: "anthropic", model: body.model },
    chain,
    body.model,
    parsedFallbackRequest,
  );
  logProxyBody({
    phase: "routing_decision",
    contentType: "application/json",
    body: {
      stage: "anthropic_fallback",
      attempts: fallbackPlan.attempts.slice(1),
    },
  });

  tracer?.setFallbackInfo({
    triggered: true,
    attemptCount: fallbackPlan.attempts.slice(1).length,
    reason: "all_anthropic_accounts_exhausted",
  });

  for (const fallback of fallbackPlan.attempts.slice(1)) {
    if (!fallback.provider || !fallback.model) {
      continue;
    }

    const availability =
      await ProviderHealthChecker.checkFallbackProviderAvailability(
        fallback.provider,
        fallback.model,
      );
    if (!availability.available) {
      logger.always(
        `[proxy] fallback ${fallback.provider}/${fallback.model} health-check failed (${availability.reason ?? "provider unavailable"}), attempting anyway`,
      );
    }

    const fallbackStart = Date.now();
    try {
      logger.always(
        `[proxy] fallback → ${fallback.provider}/${fallback.model}`,
      );
      const options = buildProxyFallbackOptions(parsedFallbackRequest, {
        provider: fallback.provider,
        model: fallback.model,
      });
      const response = await executeClaudeFallbackTranslation({
        ctx,
        body,
        tracer,
        requestStartTime,
        logProxyBody,
        logFinalRequest,
        options: options as Parameters<ServerContext["neurolink"]["stream"]>[0],
        providerLabel: fallback.provider,
      });
      recordFallbackAttempt({
        provider: fallback.provider,
        model: fallback.model,
        status: "success",
        durationMs: Date.now() - fallbackStart,
      });
      tracer?.setFallbackInfo({
        triggered: true,
        provider: fallback.provider,
        model: fallback.model,
        attemptCount: fallbackPlan.attempts.slice(1).length,
        reason: "fallback_success",
      });
      return { response };
    } catch (fallbackErr) {
      const errMsg =
        fallbackErr instanceof Error
          ? fallbackErr.message
          : String(fallbackErr);

      let errorClass = "unknown";
      if (
        errMsg.includes("Rate limit") ||
        errMsg.includes("rate_limit") ||
        errMsg.includes("max_parallel_requests")
      ) {
        errorClass = "rate_limit";
      } else if (
        errMsg.includes("context length") ||
        errMsg.includes("ContextWindowExceeded")
      ) {
        errorClass = "context_overflow";
      } else if (
        errMsg.includes("no content or tool calls") ||
        errMsg.includes("NoOutputGenerated")
      ) {
        errorClass = "empty_response";
      } else if (
        errMsg.includes("thinking_level") ||
        errMsg.includes("Field required")
      ) {
        errorClass = "schema_mismatch";
      } else if (errMsg.includes("Resource exhausted")) {
        errorClass = "provider_quota";
      }

      logger.always(
        `[proxy] fallback ${fallback.provider}/${fallback.model} failed [${errorClass}]: ${errMsg}`,
      );
      recordFallbackAttempt({
        provider: fallback.provider,
        model: fallback.model,
        status: "failure",
        errorMessage: `[${errorClass}] ${errMsg}`,
        durationMs: Date.now() - fallbackStart,
      });
    }
  }

  return { response: null };
}

async function tryAutoClaudeFallback(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<unknown | null> {
  const { ctx, body, tracer, requestStartTime, logProxyBody, logFinalRequest } =
    args;
  try {
    const parsed = parseClaudeRequest(body);
    const plan = buildProxyTranslationPlan(
      { provider: "anthropic", model: body.model },
      [],
      body.model,
      parsed,
    );
    logProxyRoutingPlan(logProxyBody, "auto_fallback", plan);
    const autoAttempt = plan.attempts.find(
      (attempt) => attempt.label === "auto-provider",
    );
    if (!autoAttempt) {
      return null;
    }
    logger.always("[proxy] fallback → auto-provider");
    const options = buildProxyFallbackOptions(parsed);
    return await executeClaudeFallbackTranslation({
      ctx,
      body,
      tracer,
      requestStartTime,
      logProxyBody,
      logFinalRequest,
      options: options as Parameters<ServerContext["neurolink"]["stream"]>[0],
      providerLabel: "auto-provider",
    });
  } catch (fallbackErr) {
    logger.debug(
      `[proxy] fallback auto-provider failed: ${
        fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
      }`,
    );
    return null;
  }
}

function buildClaudeAnthropicFailureResponse(args: {
  tracer?: ProxyTracer;
  requestStartTime: number;
  authFailureMessage: string | null;
  invalidRequestFailure: {
    status: number;
    body: string;
    contentType?: string;
  } | null;
  sawNetworkError: boolean;
  sawTransientFailure: boolean;
  sawRateLimit: boolean;
  lastError: unknown;
  orderedAccounts: ProxyPassthroughAccount[];
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): unknown {
  const {
    tracer,
    requestStartTime,
    authFailureMessage,
    invalidRequestFailure,
    sawNetworkError,
    sawTransientFailure,
    sawRateLimit,
    lastError,
    orderedAccounts,
    buildLoggedClaudeError,
    logProxyBody,
    logFinalRequest,
  } = args;
  if (authFailureMessage && !sawRateLimit) {
    tracer?.setError("authentication_error", authFailureMessage);
    tracer?.end(401, Date.now() - requestStartTime);
    return buildLoggedClaudeError(401, authFailureMessage);
  }

  if (invalidRequestFailure) {
    tracer?.setError(
      "invalid_request_error",
      summarizeErrorMessage(invalidRequestFailure.body),
    );
    tracer?.end(invalidRequestFailure.status, Date.now() - requestStartTime);
    recordFinalError(invalidRequestFailure.status);
    try {
      const parsedError = JSON.parse(invalidRequestFailure.body);
      logFinalRequest(
        invalidRequestFailure.status,
        "",
        "final",
        "invalid_request_error",
        summarizeErrorMessage(invalidRequestFailure.body),
      );
      logProxyBody({
        phase: "client_response",
        headers: {
          "content-type":
            invalidRequestFailure.contentType ?? "application/json",
        },
        body: invalidRequestFailure.body,
        bodySize: Buffer.byteLength(invalidRequestFailure.body, "utf8"),
        contentType: invalidRequestFailure.contentType ?? "application/json",
        responseStatus: invalidRequestFailure.status,
        durationMs: Date.now() - requestStartTime,
      });
      return parsedError;
    } catch {
      return buildLoggedClaudeError(
        invalidRequestFailure.status,
        summarizeErrorMessage(invalidRequestFailure.body),
        "invalid_request_error",
      );
    }
  }

  if ((sawNetworkError || sawTransientFailure) && !sawRateLimit) {
    const msg = `All Anthropic accounts failed due to transient upstream/network errors. Last error: ${
      lastError instanceof Error
        ? lastError.message
        : String(lastError ?? "unknown")
    }`;
    tracer?.setError("transient_error", msg.slice(0, 500));
    tracer?.end(502, Date.now() - requestStartTime);
    return buildLoggedClaudeError(502, msg);
  }

  if (!sawRateLimit) {
    const msg = `All Anthropic accounts failed. Last error: ${
      lastError instanceof Error
        ? lastError.message
        : String(lastError ?? "unknown")
    }`;
    tracer?.setError("all_accounts_failed", msg.slice(0, 500));
    tracer?.end(502, Date.now() - requestStartTime);
    return buildLoggedClaudeError(502, msg);
  }

  // All accounts returned 429 after exhausting per-account retries.
  // Return 1s retry-after — the proxy already waited for each upstream retry-after inline.
  const retryAfterSec = 1;
  const errorMessage = `All ${orderedAccounts.length} accounts rate-limited after ${MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES + 1} attempts each (1 initial + ${MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES} retries).`;
  logger.always(
    `[proxy] all accounts rate-limited, retry in ${retryAfterSec}s`,
  );
  const errorBody = buildClaudeError(429, errorMessage, "overloaded_error");
  tracer?.setError("rate_limit_error", errorMessage);
  tracer?.end(429, Date.now() - requestStartTime);
  recordFinalError(429);
  logFinalRequest(429, "", "final", "rate_limit_error", errorMessage);
  const errorBodyText = JSON.stringify(errorBody);
  logProxyBody({
    phase: "client_response",
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSec),
    },
    body: errorBodyText,
    bodySize: Buffer.byteLength(errorBodyText, "utf8"),
    contentType: "application/json",
    responseStatus: 429,
    durationMs: Date.now() - requestStartTime,
  });
  return new Response(errorBodyText, {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSec),
    },
  });
}

async function handleAnthropicSuccessfulResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  response: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<AnthropicSuccessResult> {
  const {
    ctx,
    body,
    account,
    accountState,
    response,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  accountState.consecutiveRefreshFailures = 0;
  logger.always(`[proxy] ← ${response.status} account=${account.label}`);

  const quota = parseQuotaHeaders(response.headers);
  if (quota) {
    saveAccountQuota(account.label, quota).catch(() => {
      // Non-fatal: quota persistence is best-effort
    });
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  tracer?.logUpstreamResponseHeaders(responseHeaders);

  if (body.stream) {
    return handleAnthropicStreamingSuccessResponse({
      ctx,
      body,
      account,
      accountState,
      response,
      responseHeaders,
      tracer,
      requestStartTime,
      fetchStartMs,
      attemptNumber,
      finalBodyStr,
      upstreamSpan,
      logProxyBody,
      logFinalRequest,
    });
  }

  return handleAnthropicJsonSuccessResponse({
    account,
    response,
    responseHeaders,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  });
}

async function handleAnthropicStreamingSuccessResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  response: Response;
  responseHeaders: Record<string, string>;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<AnthropicSuccessResult> {
  const {
    ctx,
    body,
    account,
    accountState: _accountState,
    response,
    responseHeaders,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  if (!response.body) {
    upstreamSpan?.end();
    tracer?.setError("stream_error", "No response body from upstream");
    tracer?.end(502, Date.now() - requestStartTime);
    recordFinalError(502, account.label, account.type);
    logFinalRequest(
      502,
      account.label,
      account.type,
      "stream_error",
      "No response body from upstream",
    );
    const clientError = buildClaudeError(502, "No response body from upstream");
    const clientErrorBody = JSON.stringify(clientError);
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: clientErrorBody,
      bodySize: Buffer.byteLength(clientErrorBody, "utf8"),
      contentType: "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus: 502,
      durationMs: Date.now() - requestStartTime,
    });
    return { response: clientError };
  }

  const reader = response.body.getReader();
  const firstChunk = await reader.read();
  if (firstChunk.done || !firstChunk.value || firstChunk.value.length === 0) {
    reader.cancel();
    logger.always(
      `[proxy] ← empty stream from account=${account.label}, trying next`,
    );
    tracer?.recordRetry(account.label, "empty_stream");
    upstreamSpan?.end();
    return { retryNextAccount: true };
  }

  let mainStreamClosed = false;
  const remainingStream = new ReadableStream({
    start(controller) {
      controller.enqueue(firstChunk.value);
    },
    async pull(controller) {
      if (mainStreamClosed) {
        return;
      }
      try {
        const { done, value } = await reader.read();
        if (mainStreamClosed) {
          return;
        }
        if (done) {
          mainStreamClosed = true;
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (streamErr) {
        const errMsg =
          streamErr instanceof Error ? streamErr.message : String(streamErr);
        logger.always(
          `[proxy] mid-stream error account=${account.label}: ${errMsg}`,
        );
        logStreamError({
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
          account: account.label,
          model: body.model,
          errorMessage: errMsg,
          durationMs: Date.now() - fetchStartMs,
        });
        if (!mainStreamClosed) {
          mainStreamClosed = true;
          const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${errMsg}` } })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorEvent));
          controller.close();
        }
      }
    },
    cancel() {
      mainStreamClosed = true;
      reader.cancel();
    },
  });

  const result = attachAnthropicSuccessStreamTelemetry({
    account,
    response,
    responseHeaders,
    remainingStream,
    tracer,
    requestStartTime,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  });
  return { response: result };
}

function attachAnthropicSuccessStreamTelemetry(args: {
  account: ProxyPassthroughAccount;
  response: Response;
  responseHeaders: Record<string, string>;
  remainingStream: ReadableStream<Uint8Array>;
  tracer?: ProxyTracer;
  requestStartTime: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Response {
  const {
    account,
    response,
    responseHeaders,
    remainingStream,
    tracer,
    requestStartTime,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  const { stream: clientCaptureStream, capture: clientCapture } =
    createRawStreamCapture();
  let streamSource: ReadableStream<Uint8Array> = remainingStream;

  if (tracer) {
    try {
      const { stream: interceptor, telemetry } = createSSEInterceptor({
        captureRawText: true,
      });
      streamSource = streamSource.pipeThrough(interceptor);
      const capturedTracer = tracer;
      const capturedUpstreamSpan = upstreamSpan;
      const capturedResponse = response;
      const capturedRequestBytes = finalBodyStr.length;
      const capturedAccountLabel = account.label;

      Promise.all([telemetry, clientCapture])
        .then(([data, clientBody]) => {
          capturedTracer.setUsage({
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          });
          capturedTracer.logStreamEvents(data.events);
          const rateLimit5h = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-5h-utilization",
            ) ?? "",
          );
          const rateLimit7d = parseFloat(
            capturedResponse.headers.get(
              "anthropic-ratelimit-unified-7d-utilization",
            ) ?? "",
          );
          const usageUpdate: Parameters<typeof capturedTracer.setUsage>[0] = {
            inputTokens: data.usage.inputTokens,
            outputTokens: data.usage.outputTokens,
            cacheCreationTokens: data.usage.cacheCreationInputTokens,
            cacheReadTokens: data.usage.cacheReadInputTokens,
          };
          if (!isNaN(rateLimit5h)) {
            usageUpdate.rateLimitAfter5h = rateLimit5h;
          }
          if (!isNaN(rateLimit7d)) {
            usageUpdate.rateLimitAfter7d = rateLimit7d;
          }
          if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
            capturedTracer.setUsage(usageUpdate);
          }

          capturedTracer.logUpstreamResponseBody(data.rawText ?? "");
          capturedTracer.recordMetrics();
          capturedTracer.recordBodySizes(
            capturedRequestBytes,
            data.totalBytesReceived,
          );
          capturedUpstreamSpan?.end();
          capturedTracer.end(200, Date.now() - requestStartTime);
          recordFinalSuccess(capturedAccountLabel, account.type);
          logFinalRequest(
            200,
            capturedAccountLabel,
            account.type,
            undefined,
            undefined,
            {
              inputTokens: data.usage.inputTokens,
              outputTokens: data.usage.outputTokens,
              cacheCreationTokens: data.usage.cacheCreationInputTokens,
              cacheReadTokens: data.usage.cacheReadInputTokens,
            },
          );
          logProxyBody({
            phase: "upstream_response",
            headers: responseHeaders,
            body: data.rawText ?? "",
            bodySize: data.totalBytesReceived,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch((error) => {
          capturedTracer.setError(
            "stream_error",
            error instanceof Error ? error.message : String(error),
          );
          capturedUpstreamSpan?.end();
          capturedTracer.end(500, Date.now() - requestStartTime);
          recordFinalError(500, capturedAccountLabel, account.type);
          logFinalRequest(
            500,
            capturedAccountLabel,
            account.type,
            "stream_error",
            error instanceof Error ? error.message : String(error),
          );
        });
    } catch {
      // Interceptor attachment failed after stream setup; response handling continues.
    }
  } else {
    upstreamSpan?.end();
    try {
      const { stream: noTracerInterceptor, telemetry: noTracerTelemetry } =
        createSSEInterceptor({
          captureRawText: true,
        });
      streamSource = streamSource.pipeThrough(noTracerInterceptor);
      const capturedAccountLabel = account.label;
      Promise.all([noTracerTelemetry, clientCapture])
        .then(([data, clientBody]) => {
          recordFinalSuccess(capturedAccountLabel, account.type);
          logFinalRequest(
            200,
            capturedAccountLabel,
            account.type,
            undefined,
            undefined,
            {
              inputTokens: data.usage.inputTokens,
              outputTokens: data.usage.outputTokens,
              cacheCreationTokens: data.usage.cacheCreationInputTokens,
              cacheReadTokens: data.usage.cacheReadInputTokens,
            },
          );
          logProxyBody({
            phase: "upstream_response",
            headers: responseHeaders,
            body: data.rawText ?? "",
            bodySize: data.totalBytesReceived,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: capturedAccountLabel,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch(() => {
          recordFinalSuccess(account.label, account.type);
          logFinalRequest(response.status, account.label, account.type);
        });
    } catch {
      clientCapture
        .then((clientBody) => {
          logProxyBody({
            phase: "client_response",
            headers: responseHeaders,
            body: clientBody.text,
            bodySize: clientBody.totalBytes,
            contentType: responseHeaders["content-type"] ?? "text/event-stream",
            account: account.label,
            accountType: account.type,
            attempt: attemptNumber,
            responseStatus: 200,
            durationMs: Date.now() - requestStartTime,
          });
        })
        .catch(() => {
          // Non-fatal
        });
      recordFinalSuccess(account.label, account.type);
      logFinalRequest(response.status, account.label, account.type);
    }
  }

  const clientStream = streamSource.pipeThrough(clientCaptureStream);
  const clientResponseHeaders: Record<string, string> = {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  };
  for (const headerName of [
    "retry-after",
    "anthropic-ratelimit-requests-remaining",
    "anthropic-ratelimit-requests-limit",
    "anthropic-ratelimit-tokens-remaining",
    "anthropic-ratelimit-tokens-limit",
  ]) {
    const value = response.headers.get(headerName);
    if (value) {
      clientResponseHeaders[headerName] = value;
    }
  }

  return new Response(clientStream, {
    status: response.status,
    headers: clientResponseHeaders,
  });
}

async function handleAnthropicJsonSuccessResponse(args: {
  account: ProxyPassthroughAccount;
  response: Response;
  responseHeaders: Record<string, string>;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<AnthropicSuccessResult> {
  const {
    account,
    response,
    responseHeaders,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  const responseText = await response.text();
  tracer?.logUpstreamResponseBody(responseText);
  logProxyBody({
    phase: "upstream_response",
    headers: responseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: responseHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: response.status,
    durationMs: Date.now() - fetchStartMs,
  });
  logProxyBody({
    phase: "client_response",
    headers: responseHeaders,
    body: responseText,
    bodySize: Buffer.byteLength(responseText, "utf8"),
    contentType: responseHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: response.status,
    durationMs: Date.now() - requestStartTime,
  });
  const responseJson = JSON.parse(responseText);

  if (tracer && responseJson && typeof responseJson === "object") {
    const usage = (responseJson as Record<string, unknown>).usage as
      | Record<string, number>
      | undefined;
    if (usage) {
      tracer.setUsage({
        inputTokens: usage.input_tokens ?? 0,
        outputTokens: usage.output_tokens ?? 0,
        cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      });

      const rateLimit5h = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-5h-utilization") ??
          "",
      );
      const rateLimit7d = parseFloat(
        response.headers.get("anthropic-ratelimit-unified-7d-utilization") ??
          "",
      );
      if (!isNaN(rateLimit5h) || !isNaN(rateLimit7d)) {
        const usageWithRates: Parameters<typeof tracer.setUsage>[0] = {
          inputTokens: usage.input_tokens ?? 0,
          outputTokens: usage.output_tokens ?? 0,
          cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        };
        if (!isNaN(rateLimit5h)) {
          usageWithRates.rateLimitAfter5h = rateLimit5h;
        }
        if (!isNaN(rateLimit7d)) {
          usageWithRates.rateLimitAfter7d = rateLimit7d;
        }
        tracer.setUsage(usageWithRates);
      }
    }
    tracer.recordMetrics();
    const responseJsonStr = JSON.stringify(responseJson);
    tracer.recordBodySizes(finalBodyStr.length, responseJsonStr.length);
    upstreamSpan?.end();
    tracer.end(response.status, Date.now() - requestStartTime);
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(
      response.status,
      account.label,
      account.type,
      undefined,
      undefined,
      {
        inputTokens: usage?.input_tokens,
        outputTokens: usage?.output_tokens,
        cacheCreationTokens: usage?.cache_creation_input_tokens,
        cacheReadTokens: usage?.cache_read_input_tokens,
      },
    );
  } else {
    upstreamSpan?.end();
    const noTracerUsage =
      responseJson && typeof responseJson === "object"
        ? ((responseJson as Record<string, unknown>).usage as
            | Record<string, number>
            | undefined)
        : undefined;
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(
      response.status,
      account.label,
      account.type,
      undefined,
      undefined,
      {
        inputTokens: noTracerUsage?.input_tokens,
        outputTokens: noTracerUsage?.output_tokens,
        cacheCreationTokens: noTracerUsage?.cache_creation_input_tokens,
        cacheReadTokens: noTracerUsage?.cache_read_input_tokens,
      },
    );
  }

  return { response: responseJson };
}

async function handleAnthropicSuccessfulRetryResponse(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  retryResp: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
}): Promise<Response | unknown> {
  const {
    ctx,
    body,
    account,
    retryResp,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logProxyBody,
    logFinalRequest,
  } = args;
  const retryQuota = parseQuotaHeaders(retryResp.headers);
  if (retryQuota) {
    saveAccountQuota(account.label, retryQuota).catch((error) => {
      logger.debug("[proxy] Failed to persist account quota after auth retry", {
        account: account.label,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  if (body.stream && retryResp.body) {
    const retryReader = retryResp.body.getReader();
    let retryStreamClosed = false;
    const retryStream = new ReadableStream({
      async pull(controller) {
        if (retryStreamClosed) {
          return;
        }
        try {
          const { done, value } = await retryReader.read();
          if (retryStreamClosed) {
            return;
          }
          if (done) {
            retryStreamClosed = true;
            controller.close();
            return;
          }
          controller.enqueue(value);
        } catch (streamErr) {
          const errMsg =
            streamErr instanceof Error ? streamErr.message : String(streamErr);
          logger.always(
            `[proxy] mid-stream error (auth-retry) account=${account.label}: ${errMsg}`,
          );
          logStreamError({
            timestamp: new Date().toISOString(),
            requestId: ctx.requestId,
            account: account.label,
            model: body.model,
            errorMessage: errMsg,
            durationMs: Date.now() - fetchStartMs,
          });
          if (!retryStreamClosed) {
            retryStreamClosed = true;
            const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${errMsg}` } })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
            controller.close();
          }
        }
      },
      cancel() {
        retryStreamClosed = true;
        retryReader.cancel();
      },
    });

    let retryClientStream: ReadableStream<Uint8Array> = retryStream;
    if (tracer) {
      try {
        const { stream: retryInterceptor, telemetry: retryTelemetry } =
          createSSEInterceptor();
        retryClientStream = retryStream.pipeThrough(retryInterceptor);
        const capturedTracer = tracer;
        const capturedUpstreamSpan = upstreamSpan;
        const capturedRetryResp = retryResp;
        const capturedRetryRequestBytes = finalBodyStr.length;
        const capturedAccountLabel = account.label;
        retryTelemetry
          .then((data) => {
            capturedTracer.setUsage({
              inputTokens: data.usage.inputTokens,
              outputTokens: data.usage.outputTokens,
              cacheCreationTokens: data.usage.cacheCreationInputTokens,
              cacheReadTokens: data.usage.cacheReadInputTokens,
            });
            capturedTracer.logStreamEvents(data.events);
            capturedTracer.logUpstreamResponseHeaders(
              Object.fromEntries([...capturedRetryResp.headers.entries()]),
            );
            capturedTracer.recordMetrics();
            capturedTracer.recordBodySizes(
              capturedRetryRequestBytes,
              data.totalBytesReceived,
            );
            capturedUpstreamSpan?.end();
            capturedTracer.end(200, Date.now() - requestStartTime);
            recordFinalSuccess(capturedAccountLabel, account.type);
            logFinalRequest(
              200,
              capturedAccountLabel,
              account.type,
              undefined,
              undefined,
              {
                inputTokens: data.usage.inputTokens,
                outputTokens: data.usage.outputTokens,
                cacheCreationTokens: data.usage.cacheCreationInputTokens,
                cacheReadTokens: data.usage.cacheReadInputTokens,
              },
            );
          })
          .catch((error) => {
            capturedTracer.setError(
              "stream_error",
              error instanceof Error ? error.message : String(error),
            );
            capturedUpstreamSpan?.end();
            capturedTracer.end(500, Date.now() - requestStartTime);
            recordFinalError(500, capturedAccountLabel, account.type);
            logFinalRequest(
              500,
              capturedAccountLabel,
              account.type,
              "stream_error",
              error instanceof Error ? error.message : String(error),
            );
          });
      } catch {
        retryClientStream = retryStream;
      }
    }

    const responseHeaders: Record<string, string> = {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    };
    for (const headerName of [
      "retry-after",
      "anthropic-ratelimit-requests-remaining",
      "anthropic-ratelimit-requests-limit",
      "anthropic-ratelimit-tokens-remaining",
      "anthropic-ratelimit-tokens-limit",
    ]) {
      const value = retryResp.headers.get(headerName);
      if (value) {
        responseHeaders[headerName] = value;
      }
    }
    return new Response(retryClientStream, {
      status: retryResp.status,
      headers: responseHeaders,
    });
  }

  const retryRespHeaders = Object.fromEntries([...retryResp.headers.entries()]);
  const retryText = await retryResp.text();
  tracer?.logUpstreamResponseHeaders(retryRespHeaders);
  tracer?.logUpstreamResponseBody(retryText);
  logProxyBody({
    phase: "upstream_response",
    headers: retryRespHeaders,
    body: retryText,
    bodySize: Buffer.byteLength(retryText, "utf8"),
    contentType: retryRespHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: retryResp.status,
    durationMs: Date.now() - fetchStartMs,
  });
  logProxyBody({
    phase: "client_response",
    headers: retryRespHeaders,
    body: retryText,
    bodySize: Buffer.byteLength(retryText, "utf8"),
    contentType: retryRespHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: retryResp.status,
    durationMs: Date.now() - requestStartTime,
  });

  const retryJson = JSON.parse(retryText);
  if (tracer && retryJson && typeof retryJson === "object") {
    const retryUsage = (retryJson as Record<string, unknown>).usage as
      | Record<string, number>
      | undefined;
    if (retryUsage) {
      tracer.setUsage({
        inputTokens: retryUsage.input_tokens ?? 0,
        outputTokens: retryUsage.output_tokens ?? 0,
        cacheCreationTokens: retryUsage.cache_creation_input_tokens ?? 0,
        cacheReadTokens: retryUsage.cache_read_input_tokens ?? 0,
      });
    }
    tracer.recordMetrics();
    const retryJsonStr = JSON.stringify(retryJson);
    tracer.recordBodySizes(finalBodyStr.length, retryJsonStr.length);
    upstreamSpan?.end();
    tracer.end(retryResp.status, Date.now() - requestStartTime);
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(
      retryResp.status,
      account.label,
      account.type,
      undefined,
      undefined,
      {
        inputTokens: retryUsage?.input_tokens,
        outputTokens: retryUsage?.output_tokens,
        cacheCreationTokens: retryUsage?.cache_creation_input_tokens,
        cacheReadTokens: retryUsage?.cache_read_input_tokens,
      },
    );
  } else {
    upstreamSpan?.end();
    recordFinalSuccess(account.label, account.type);
    logFinalRequest(retryResp.status, account.label, account.type);
  }

  return retryJson;
}

async function handleAnthropicAuthRetry(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  headers: Record<string, string>;
  buildUpstreamBody: (token: string) => { bodyStr: string; sessionId?: string };
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  response: Response;
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  finalBodyStr: string;
  upstreamSpan?: import("@opentelemetry/api").Span;
  logAttempt: (
    status: number,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  lastError: unknown;
  authFailureMessage: string | null;
  sawRateLimit: boolean;
  sawTransientFailure: boolean;
  sawNetworkError: boolean;
}): Promise<AnthropicAuthRetryResult> {
  const {
    ctx,
    body,
    account,
    accountState,
    headers,
    buildUpstreamBody,
    enabledAccounts,
    orderedAccounts,
    response: _response,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    finalBodyStr,
    upstreamSpan,
    logAttempt,
    logProxyBody,
    logFinalRequest,
    lastError,
    authFailureMessage,
    sawRateLimit,
    sawTransientFailure,
    sawNetworkError,
  } = args;
  recordAttemptError(account.label, account.type, 401);
  let currentLastError = lastError;
  let currentAuthFailureMessage = authFailureMessage;
  let currentSawRateLimit = sawRateLimit;
  let currentSawTransientFailure = sawTransientFailure;
  let currentSawNetworkError = sawNetworkError;
  let currentUpstreamSpan = upstreamSpan;
  let authRetrySucceeded = false;
  let authRetryError = "received 401 from Anthropic";

  for (let authRetry = 0; authRetry < MAX_AUTH_RETRIES; authRetry++) {
    logger.always(
      `[proxy] ← 401 account=${account.label} refreshing (attempt ${authRetry + 1}/${MAX_AUTH_RETRIES})`,
    );
    const refreshSucceeded = await refreshToken(account);
    if (!refreshSucceeded.success) {
      accountState.consecutiveRefreshFailures += 1;
      authRetryError = `refresh failed for account=${account.label} attempt ${authRetry + 1}/${MAX_AUTH_RETRIES}: ${refreshSucceeded.error?.slice(0, 200) ?? "unknown"}`;
      currentLastError = authRetryError;
      logger.always(
        `[proxy] ⚠ account=${account.label} refresh failed on attempt ${authRetry + 1}`,
      );
      if (
        accountState.consecutiveRefreshFailures >=
        MAX_CONSECUTIVE_REFRESH_FAILURES
      ) {
        await disableAccountUntilReauth(account, accountState);
        currentAuthFailureMessage = formatReauthMessage(account.label);
        break;
      }
      if (authRetry < MAX_AUTH_RETRIES - 1) {
        await sleep(2000);
      }
      continue;
    }

    if (account.persistTarget) {
      await persistTokens(account.persistTarget, account);
    }
    headers.authorization = `Bearer ${account.token}`;

    try {
      const retryResp = await fetch(
        "https://api.anthropic.com/v1/messages?beta=true",
        {
          method: "POST",
          headers,
          body: buildUpstreamBody(account.token).bodyStr,
          signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
        },
      );
      if (retryResp.ok) {
        authRetrySucceeded = true;
        accountState.consecutiveRefreshFailures = 0;
        logger.always(
          `[proxy] ← 200 account=${account.label} (after ${authRetry + 1} refresh(es))`,
        );
        const successResponse = await handleAnthropicSuccessfulRetryResponse({
          ctx,
          body,
          account,
          retryResp,
          tracer,
          requestStartTime,
          fetchStartMs,
          attemptNumber,
          finalBodyStr,
          upstreamSpan: currentUpstreamSpan,
          logProxyBody,
          logFinalRequest,
        });
        return {
          response: successResponse,
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: undefined,
        };
      }

      const retryStatus = retryResp.status;
      const retryBody = await retryResp.text();
      // Capture full response headers and body for all auth-retry errors.
      // Redact sensitive headers and cap body size before persisting.
      const retryRespHeaders: Record<string, string> = {};
      retryResp.headers.forEach((value, key) => {
        retryRespHeaders[key] = value;
      });
      const safeRetryHeaders = { ...retryRespHeaders };
      delete safeRetryHeaders["authorization"];
      delete safeRetryHeaders["x-api-key"];
      const cappedRetryBody =
        retryBody.length > 4000
          ? retryBody.slice(0, 4000) + "...[truncated]"
          : retryBody;
      tracer?.logUpstreamResponseHeaders(safeRetryHeaders);
      tracer?.logUpstreamResponseBody(cappedRetryBody);
      logProxyBody({
        phase: "upstream_response",
        headers: safeRetryHeaders,
        body: cappedRetryBody,
        bodySize: Buffer.byteLength(retryBody, "utf8"),
        contentType: retryRespHeaders["content-type"] ?? "application/json",
        account: account.label,
        accountType: account.type,
        attempt: attemptNumber,
        responseStatus: retryStatus,
        durationMs: Date.now() - fetchStartMs,
      });
      authRetryError = `retry ${authRetry + 1}/${MAX_AUTH_RETRIES} failed with status ${retryStatus}`;
      currentLastError = retryBody;
      logger.debug(
        `[proxy] retry ${authRetry + 1} failed: ${retryStatus} ${retryBody.substring(0, 120)}`,
      );
      recordAttemptError(account.label, account.type, retryStatus);

      if (retryStatus === 429) {
        currentSawRateLimit = true;
        advancePrimaryIfCurrent(
          account.key,
          enabledAccounts.length,
          orderedAccounts[0]?.key,
        );
        break;
      }

      if (retryStatus === 401 || retryStatus === 402 || retryStatus === 403) {
        if (authRetry < MAX_AUTH_RETRIES - 1) {
          await sleep(1000);
        }
        continue;
      }

      if (isTransientHttpFailure(retryStatus, retryBody)) {
        currentSawTransientFailure = true;
        break;
      }

      logAttempt(retryStatus, "api_error", summarizeErrorMessage(retryBody));
      recordFinalError(retryStatus, account.label, account.type);
      try {
        logFinalRequest(
          retryStatus,
          account.label,
          account.type,
          "api_error",
          summarizeErrorMessage(retryBody),
        );
        return {
          response: JSON.parse(retryBody),
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: currentUpstreamSpan,
        };
      } catch {
        logFinalRequest(
          retryStatus,
          account.label,
          account.type,
          "api_error",
          summarizeErrorMessage(retryBody),
        );
        return {
          response: buildClaudeError(retryStatus, retryBody),
          continueLoop: false,
          lastError: currentLastError,
          authFailureMessage: currentAuthFailureMessage,
          sawRateLimit: currentSawRateLimit,
          sawTransientFailure: currentSawTransientFailure,
          sawNetworkError: currentSawNetworkError,
          upstreamSpan: currentUpstreamSpan,
        };
      }
    } catch (retryFetchErr) {
      currentSawNetworkError = true;
      recordAttemptError(account.label, account.type, 502);
      const message =
        retryFetchErr instanceof Error
          ? retryFetchErr.message
          : String(retryFetchErr);
      authRetryError = `network error on retry ${authRetry + 1}: ${message}`;
      currentLastError = authRetryError;
      logger.debug(`[proxy] ${authRetryError}`);
      break;
    }
  }

  if (!authRetrySucceeded) {
    // No persistent cooldown — just move to next account for this request.
    currentLastError = authRetryError;
    logger.always(
      `[proxy] ⚠ account=${account.label} auth retries exhausted, rotating to next account`,
    );
    logAttempt(401, "authentication_error", authRetryError);
    tracer?.setError("authentication_error", authRetryError);
    tracer?.recordRetry(account.label, "auth_exhausted");
    currentUpstreamSpan?.end();
    currentUpstreamSpan = undefined;
    advancePrimaryIfCurrent(
      account.key,
      enabledAccounts.length,
      orderedAccounts[0]?.key,
    );
  }

  return {
    continueLoop: true,
    lastError: currentLastError,
    authFailureMessage: currentAuthFailureMessage,
    sawRateLimit: currentSawRateLimit,
    sawTransientFailure: currentSawTransientFailure,
    sawNetworkError: currentSawNetworkError,
    upstreamSpan: currentUpstreamSpan,
  };
}

function buildAnthropicTerminalErrorResponse(args: {
  responseStatus: number;
  account: ProxyPassthroughAccount;
  errBody: string;
  errRespHeaders: Record<string, string>;
  requestStartTime: number;
  attemptNumber: number;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  errorType: "not_found_error" | "api_error";
}): Response | unknown {
  const {
    responseStatus,
    account,
    errBody,
    errRespHeaders,
    requestStartTime,
    attemptNumber,
    logProxyBody,
    logFinalRequest,
    errorType,
  } = args;
  try {
    const parsedError = JSON.parse(errBody);
    logFinalRequest(
      responseStatus,
      account.label,
      account.type,
      errorType,
      summarizeErrorMessage(errBody),
    );
    logProxyBody({
      phase: "client_response",
      headers: {
        "content-type": errRespHeaders["content-type"] ?? "application/json",
      },
      body: errBody,
      bodySize: Buffer.byteLength(errBody, "utf8"),
      contentType: errRespHeaders["content-type"] ?? "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus,
      durationMs: Date.now() - requestStartTime,
    });
    return parsedError;
  } catch {
    logFinalRequest(
      responseStatus,
      account.label,
      account.type,
      errorType,
      summarizeErrorMessage(errBody),
    );
    const clientError = buildClaudeError(responseStatus, errBody);
    const clientErrorBody = JSON.stringify(clientError);
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: clientErrorBody,
      bodySize: Buffer.byteLength(clientErrorBody, "utf8"),
      contentType: "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus,
      durationMs: Date.now() - requestStartTime,
    });
    return clientError;
  }
}

async function handleAnthropicNonOkResponse(args: {
  response: Response;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  tracer?: ProxyTracer;
  requestStartTime: number;
  fetchStartMs: number;
  attemptNumber: number;
  logAttempt: (
    status: number,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: (
    status: number,
    accountLabel: string,
    accountType: string,
    errorType?: string,
    errorMessage?: string,
    extra?: {
      inputTokens?: number;
      outputTokens?: number;
      cacheCreationTokens?: number;
      cacheReadTokens?: number;
    },
  ) => void;
  lastError: unknown;
  authFailureMessage: string | null;
  sawTransientFailure: boolean;
  invalidRequestFailure: {
    status: number;
    body: string;
    contentType?: string;
  } | null;
  maxConsecutiveRefreshFailures: number;
}): Promise<AnthropicNonOkResult> {
  const {
    response,
    account,
    accountState,
    enabledAccounts,
    orderedAccounts,
    tracer,
    requestStartTime,
    fetchStartMs,
    attemptNumber,
    logAttempt,
    logProxyBody,
    logFinalRequest,
    lastError,
    authFailureMessage,
    sawTransientFailure,
    invalidRequestFailure,
    maxConsecutiveRefreshFailures,
  } = args;
  let currentLastError = lastError;
  let currentAuthFailureMessage = authFailureMessage;
  let currentSawTransientFailure = sawTransientFailure;
  let currentInvalidRequestFailure = invalidRequestFailure;

  const errBody = await response.text();
  const errRespHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    errRespHeaders[key] = value;
  });
  tracer?.logUpstreamResponseHeaders(errRespHeaders);
  tracer?.logUpstreamResponseBody(errBody);
  logProxyBody({
    phase: "upstream_response",
    headers: errRespHeaders,
    body: errBody,
    bodySize: Buffer.byteLength(errBody, "utf8"),
    contentType: errRespHeaders["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
    responseStatus: response.status,
    durationMs: Date.now() - fetchStartMs,
  });

  if (isInvalidRequestError(response.status, errBody)) {
    logger.always(
      `[proxy] ← ${response.status} upstream invalid_request_error`,
    );
    logAttempt(
      response.status,
      "invalid_request_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.setError("invalid_request_error", summarizeErrorMessage(errBody));
    currentInvalidRequestFailure = {
      status: response.status,
      body: errBody,
      contentType: errRespHeaders["content-type"],
    };
    currentLastError = summarizeErrorMessage(errBody);
    return {
      continueLoop: false,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (
    (response.status === 401 ||
      response.status === 402 ||
      response.status === 403) &&
    account.type === "oauth" &&
    !account.refreshToken
  ) {
    recordAttemptError(account.label, account.type, response.status);
    accountState.consecutiveRefreshFailures += 1;
    if (
      accountState.consecutiveRefreshFailures >= maxConsecutiveRefreshFailures
    ) {
      await disableAccountUntilReauth(account, accountState);
    }
    currentAuthFailureMessage = formatReauthMessage(account.label);
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} (auth failure, no refresh token)`,
    );
    currentLastError = errBody;
    logAttempt(
      response.status,
      "authentication_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.setError("authentication_error", summarizeErrorMessage(errBody));
    tracer?.recordRetry(account.label, "auth_no_refresh");
    advancePrimaryIfCurrent(
      account.key,
      enabledAccounts.length,
      orderedAccounts[0]?.key,
    );
    return {
      continueLoop: true,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (
    (response.status === 401 ||
      response.status === 402 ||
      response.status === 403) &&
    account.type === "api_key"
  ) {
    recordAttemptError(account.label, account.type, response.status);
    currentAuthFailureMessage =
      "Authentication failed for Anthropic API key credentials. Update ANTHROPIC_API_KEY or re-login with OAuth.";
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} (auth failure, api_key)`,
    );
    currentLastError = errBody;
    logAttempt(
      response.status,
      "authentication_error",
      summarizeErrorMessage(errBody),
    );
    tracer?.setError("authentication_error", summarizeErrorMessage(errBody));
    tracer?.recordRetry(account.label, "auth_api_key");
    advancePrimaryIfCurrent(
      account.key,
      enabledAccounts.length,
      orderedAccounts[0]?.key,
    );
    return {
      continueLoop: true,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (response.status === 404) {
    recordFinalError(response.status, account.label, account.type);
    logger.always(`[proxy] ← 404 account=${account.label}`);
    logAttempt(404, "not_found_error", summarizeErrorMessage(errBody));
    tracer?.setError("not_found_error", summarizeErrorMessage(errBody));
    tracer?.end(404, Date.now() - requestStartTime);
    return {
      response: buildAnthropicTerminalErrorResponse({
        responseStatus: 404,
        account,
        errBody,
        errRespHeaders,
        requestStartTime,
        attemptNumber,
        logProxyBody,
        logFinalRequest,
        errorType: "not_found_error",
      }),
      continueLoop: false,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  if (isTransientHttpFailure(response.status, errBody)) {
    recordAttemptError(account.label, account.type, response.status);
    currentSawTransientFailure = true;
    logger.always(
      `[proxy] ← ${response.status} account=${account.label} (transient)`,
    );
    currentLastError = errBody;
    logAttempt(response.status, "api_error", summarizeErrorMessage(errBody));
    tracer?.setError("transient_error", summarizeErrorMessage(errBody));
    tracer?.recordRetry(account.label, "transient");
    return {
      continueLoop: true,
      retrySameAccount: true,
      lastError: currentLastError,
      authFailureMessage: currentAuthFailureMessage,
      sawTransientFailure: currentSawTransientFailure,
      invalidRequestFailure: currentInvalidRequestFailure,
      upstreamSpan: undefined,
    };
  }

  recordFinalError(response.status, account.label, account.type);
  logger.always(`[proxy] ← ${response.status} account=${account.label}`);
  logger.debug(`[claude-proxy] error body: ${errBody.substring(0, 200)}`);
  logAttempt(response.status, "api_error", summarizeErrorMessage(errBody));
  tracer?.setError("api_error", summarizeErrorMessage(errBody));
  tracer?.end(response.status, Date.now() - requestStartTime);
  return {
    response: buildAnthropicTerminalErrorResponse({
      responseStatus: response.status,
      account,
      errBody,
      errRespHeaders,
      requestStartTime,
      attemptNumber,
      logProxyBody,
      logFinalRequest,
      errorType: "api_error",
    }),
    continueLoop: false,
    lastError: currentLastError,
    authFailureMessage: currentAuthFailureMessage,
    sawTransientFailure: currentSawTransientFailure,
    invalidRequestFailure: currentInvalidRequestFailure,
    upstreamSpan: undefined,
  };
}

function createClaudeRequestRuntimeContext(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  clientRequestBody: string;
}): ClaudeRequestRuntimeContext {
  const { ctx, body, clientRequestBody } = args;
  let tracer: ProxyTracer | undefined;
  try {
    tracer = ProxyTracer.startRequest(
      {
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        model: body.model,
        stream: body.stream ?? false,
        toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
        sessionId:
          ctx.headers["x-neurolink-session-id"] ??
          ctx.headers["x-claude-code-session-id"] ??
          undefined,
        userAgent: ctx.headers["user-agent"] ?? undefined,
      },
      ctx.headers,
    );
    const receiveSpan = tracer.startReceive();
    tracer.logRequestHeaders(ctx.headers);
    tracer.logRequestBody(clientRequestBody);
    receiveSpan.end();
  } catch {
    tracer = undefined;
  }

  const requestStartTime = Date.now();
  const logProxyBody: ProxyBodyCaptureLogger = (capture) => {
    const traceCtx = tracer?.getTraceContext();
    void logBodyCapture({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      model: body.model,
      stream: body.stream ?? false,
      ...capture,
      ...(traceCtx
        ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId }
        : {}),
    });
  };
  const logFinalRequest: ClaudeFinalRequestLogger = (
    status,
    accountLabel,
    accountType,
    errorType,
    errorMessage,
    extra,
  ) => {
    const traceCtx = tracer?.getTraceContext();
    logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: !!body.stream,
      toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
      account: accountLabel,
      accountType,
      responseStatus: status,
      responseTimeMs: Date.now() - requestStartTime,
      ...(errorType ? { errorType } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(extra?.inputTokens !== undefined
        ? { inputTokens: extra.inputTokens }
        : {}),
      ...(extra?.outputTokens !== undefined
        ? { outputTokens: extra.outputTokens }
        : {}),
      ...(extra?.cacheCreationTokens !== undefined
        ? { cacheCreationTokens: extra.cacheCreationTokens }
        : {}),
      ...(extra?.cacheReadTokens !== undefined
        ? { cacheReadTokens: extra.cacheReadTokens }
        : {}),
      ...(traceCtx
        ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId }
        : {}),
    });
  };
  const buildLoggedClaudeError: ClaudeLoggedErrorBuilder = (
    status,
    message,
    errorType,
    extra,
  ) => {
    const errorBody = buildClaudeError(status, message, errorType);
    const errorBodyText = JSON.stringify(errorBody);
    recordFinalError(status, extra?.account, extra?.accountType);
    logFinalRequest(
      status,
      extra?.account ?? "",
      extra?.accountType ?? "final",
      errorType,
      message,
    );
    logProxyBody({
      phase: "client_response",
      headers: { "content-type": "application/json" },
      body: errorBodyText,
      bodySize: Buffer.byteLength(errorBodyText, "utf8"),
      contentType: "application/json",
      responseStatus: status,
      durationMs: Date.now() - requestStartTime,
      ...extra,
    });
    return errorBody;
  };

  logProxyBody({
    phase: "client_request",
    headers: ctx.headers,
    body: clientRequestBody,
    bodySize: Buffer.byteLength(clientRequestBody, "utf8"),
    contentType: ctx.headers["content-type"] ?? "application/json",
  });

  return {
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
    buildLoggedClaudeError,
  };
}

function createAnthropicAttemptLogger(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  toolCount: number;
  requestStart: number;
  tracer?: ProxyTracer;
  account: ProxyPassthroughAccount;
  attemptNumber: number;
}): AnthropicAttemptLogger {
  const { ctx, body, toolCount, requestStart, tracer, account, attemptNumber } =
    args;
  return (status, errorType, errorMessage, extra) => {
    const traceCtx = tracer?.getTraceContext();
    logRequestAttempt({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      attempt: attemptNumber,
      method: ctx.method,
      path: ctx.path,
      model: body.model,
      stream: !!body.stream,
      toolCount,
      account: account.label,
      accountType: account.type,
      responseStatus: status,
      responseTimeMs: Date.now() - requestStart,
      ...(errorType ? { errorType } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      ...(extra?.inputTokens !== undefined
        ? { inputTokens: extra.inputTokens }
        : {}),
      ...(extra?.outputTokens !== undefined
        ? { outputTokens: extra.outputTokens }
        : {}),
      ...(extra?.cacheCreationTokens !== undefined
        ? { cacheCreationTokens: extra.cacheCreationTokens }
        : {}),
      ...(extra?.cacheReadTokens !== undefined
        ? { cacheReadTokens: extra.cacheReadTokens }
        : {}),
      ...(traceCtx
        ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId }
        : {}),
    });
  };
}

async function prepareAnthropicAccountAttempt(args: {
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  bodyStr: string;
  clientHeaders: Record<string, string | undefined>;
  isClaudeClientRequest: boolean;
  url: string;
  tracer?: ProxyTracer;
  attemptNumber: number;
  currentLastError: unknown;
  currentAuthFailureMessage: string | null;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
}): Promise<PreparedAnthropicAccountAttempt> {
  const {
    account,
    accountState,
    bodyStr,
    clientHeaders,
    isClaudeClientRequest,
    url,
    tracer,
    attemptNumber,
    currentLastError,
    currentAuthFailureMessage,
    logAttempt,
    logProxyBody,
  } = args;
  let lastError = currentLastError;
  let authFailureMessage = currentAuthFailureMessage;

  if (needsRefresh(account)) {
    const refreshed = await refreshToken(account);
    if (refreshed.success) {
      if (account.persistTarget) {
        await persistTokens(account.persistTarget, account);
      }
      accountState.consecutiveRefreshFailures = 0;
    } else {
      accountState.consecutiveRefreshFailures += 1;
      lastError = `token refresh failed for account=${account.label}: ${refreshed.error?.slice(0, 200) ?? "unknown"}`;
      logger.debug(
        `[proxy] preflight refresh failed account=${account.label} failures=${accountState.consecutiveRefreshFailures}`,
      );
      if (
        accountState.consecutiveRefreshFailures >=
        MAX_CONSECUTIVE_REFRESH_FAILURES
      ) {
        await disableAccountUntilReauth(account, accountState);
        authFailureMessage = formatReauthMessage(account.label);
        logAttempt(401, "authentication_error", String(lastError));
        return {
          continueLoop: true,
          lastError,
          authFailureMessage,
        };
      }
    }
  }

  const isOAuth = account.type === "oauth";
  const filteredHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(clientHeaders)) {
    if (typeof v === "string") {
      filteredHeaders[k] = v;
    }
  }
  const snapshot = isOAuth
    ? await maybeRefreshClaudeSnapshot(
        account.label,
        account.key,
        filteredHeaders,
        bodyStr,
      )
    : null;
  const headers: Record<string, string> = {};
  for (const [headerKey, headerValue] of Object.entries(clientHeaders)) {
    const lower = headerKey.toLowerCase();
    if (
      typeof headerValue === "string" &&
      !BLOCKED_UPSTREAM_HEADERS.has(lower)
    ) {
      headers[lower] = headerValue;
    }
  }

  headers["content-type"] = "application/json";
  if (isOAuth) {
    headers.authorization = `Bearer ${account.token}`;
    delete headers["x-api-key"];
    applySnapshotHeaders(headers, snapshot);
  } else {
    headers["x-api-key"] = account.token;
    delete headers.authorization;
  }

  if (!headers["user-agent"]) {
    headers["user-agent"] = CLAUDE_CLI_USER_AGENT;
  }
  if (!headers["anthropic-version"]) {
    headers["anthropic-version"] = "2023-06-01";
  }
  if (!headers["anthropic-dangerous-direct-browser-access"]) {
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  if (!headers["x-app"]) {
    headers["x-app"] = "cli";
  }
  if (!headers.accept) {
    headers.accept = "application/json";
  }

  if (isOAuth) {
    const betaSeed = isClaudeClientRequest
      ? (headers["anthropic-beta"] ?? "")
      : (clientHeaders["anthropic-beta"] ?? "");
    const existing = new Set(
      betaSeed
        .split(",")
        .map((value: string) => value.trim())
        .filter(Boolean),
    );
    for (const beta of isClaudeClientRequest
      ? CLAUDE_CODE_OAUTH_BETAS
      : NON_CLAUDE_OAUTH_BETAS) {
      existing.add(beta);
    }
    headers["anthropic-beta"] = [...existing].join(",");
  } else {
    const cleaned = (headers["anthropic-beta"] ?? "")
      .split(",")
      .map((value: string) => value.trim())
      .filter(
        (value: string) =>
          value && !CLAUDE_CODE_OAUTH_BETAS.includes(value as never),
      )
      .join(",");
    if (cleaned) {
      headers["anthropic-beta"] = cleaned;
    } else {
      delete headers["anthropic-beta"];
    }
  }

  const buildUpstreamBody: AnthropicUpstreamBodyBuilder = (token) =>
    isOAuth
      ? polyfillOAuthBody(
          bodyStr,
          token,
          snapshot,
          headers["x-claude-code-session-id"],
        )
      : { bodyStr };
  const polyfilledBody = buildUpstreamBody(account.token);
  if (
    isOAuth &&
    polyfilledBody.sessionId &&
    !headers["x-claude-code-session-id"]
  ) {
    headers["x-claude-code-session-id"] = polyfilledBody.sessionId;
  }
  const finalBodyStr = polyfilledBody.bodyStr;

  logger.always(`[proxy] → account=${account.label} (${account.type})`);
  recordAttempt(account.label, account.type);
  const fetchStartMs = Date.now();
  let upstreamSpan: import("@opentelemetry/api").Span | undefined;
  if (tracer) {
    upstreamSpan = tracer.startUpstreamAttempt({
      attempt: attemptNumber,
      account: account.label,
      polyfillHeaders: isOAuth,
      polyfillBody: isOAuth,
      upstreamUrl: url,
    });
    tracer.logUpstreamRequestHeaders(headers);
    tracer.logUpstreamRequestBody(finalBodyStr);
    Object.assign(headers, tracer.getTraceHeaders());
  }
  logProxyBody({
    phase: "upstream_request",
    headers,
    body: finalBodyStr,
    bodySize: Buffer.byteLength(finalBodyStr, "utf8"),
    contentType: headers["content-type"] ?? "application/json",
    account: account.label,
    accountType: account.type,
    attempt: attemptNumber,
  });

  return {
    continueLoop: false,
    lastError,
    authFailureMessage,
    headers,
    buildUpstreamBody,
    finalBodyStr,
    fetchStartMs,
    upstreamSpan,
  };
}

async function fetchAnthropicAccountResponse(args: {
  url: string;
  headers: Record<string, string>;
  finalBodyStr: string;
  account: ProxyPassthroughAccount;
  accountState: RuntimeAccountState;
  enabledAccounts: ProxyPassthroughAccount[];
  orderedAccounts: ProxyPassthroughAccount[];
  tracer?: ProxyTracer;
  logAttempt: AnthropicAttemptLogger;
  logProxyBody: ProxyBodyCaptureLogger;
  fetchStartMs: number;
  attemptNumber: number;
  currentLastError: unknown;
  currentSawRateLimit: boolean;
  currentSawNetworkError: boolean;
  upstreamSpan?: import("@opentelemetry/api").Span;
}): Promise<AnthropicUpstreamFetchResult> {
  const {
    url,
    headers,
    finalBodyStr,
    account,
    accountState: _accountState2,
    enabledAccounts: _enabledAccounts,
    orderedAccounts: _orderedAccounts,
    tracer,
    logAttempt,
    logProxyBody,
    fetchStartMs,
    attemptNumber,
    currentLastError,
    currentSawRateLimit,
    currentSawNetworkError,
    upstreamSpan,
  } = args;
  let lastError = currentLastError;
  let sawRateLimit = currentSawRateLimit;
  let sawNetworkError = currentSawNetworkError;
  const currentUpstreamSpan = upstreamSpan;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: finalBodyStr,
      signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
    });
  } catch (fetchErr) {
    if (!isRetryableNetworkError(fetchErr)) {
      throw fetchErr;
    }
    sawNetworkError = true;
    recordAttemptError(account.label, account.type, 502);
    const errorCode = getErrorCode(fetchErr) ?? "unknown";
    const errorMessage =
      fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    lastError = errorMessage;
    logger.always(
      `[proxy] fetch error account=${account.label} code=${errorCode} (retryable): ${errorMessage}`,
    );
    logAttempt(502, "network_error", errorMessage);
    tracer?.setError("network_error", errorMessage);
    tracer?.recordRetry(account.label, "network_error");
    currentUpstreamSpan?.end();
    return {
      continueLoop: true,
      retrySameAccount: true,
      lastError,
      sawRateLimit,
      sawNetworkError,
      upstreamSpan: undefined,
    };
  }

  if (response.status === 429) {
    sawRateLimit = true;
    const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
    recordAttemptError(account.label, account.type, 429);
    // Capture full response headers and body for diagnostics (parity with
    // handleAnthropicNonOkResponse which does this for all other error statuses).
    const errRespHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      errRespHeaders[key] = value;
    });
    lastError = await response.text();
    // Redact sensitive headers and cap body before persisting
    const safe429Headers = { ...errRespHeaders };
    delete safe429Headers["authorization"];
    delete safe429Headers["x-api-key"];
    const capped429Body =
      String(lastError).length > 4000
        ? String(lastError).slice(0, 4000) + "...[truncated]"
        : String(lastError);
    tracer?.logUpstreamResponseHeaders(safe429Headers);
    tracer?.logUpstreamResponseBody(capped429Body);
    logProxyBody({
      phase: "upstream_response",
      headers: safe429Headers,
      body: capped429Body,
      bodySize: Buffer.byteLength(String(lastError), "utf8"),
      contentType: errRespHeaders["content-type"] ?? "application/json",
      account: account.label,
      accountType: account.type,
      attempt: attemptNumber,
      responseStatus: 429,
      durationMs: Date.now() - fetchStartMs,
    });
    logger.always(
      `[proxy] ← 429 account=${account.label} retry-after=${retryAfterMs}ms (upstream) ratelimit-status=${errRespHeaders["anthropic-ratelimit-unified-status"] ?? "unknown"}`,
    );
    logAttempt(429, "rate_limit_error", String(lastError));
    tracer?.setError("rate_limit_error", String(lastError).slice(0, 500));
    tracer?.recordRetry(account.label, "rate_limit");
    currentUpstreamSpan?.end();
    return {
      continueLoop: true,
      retrySameAccount: true,
      retryAfterMs,
      lastError,
      sawRateLimit,
      sawNetworkError,
      upstreamSpan: undefined,
    };
  }

  return {
    continueLoop: false,
    response,
    lastError,
    sawRateLimit,
    sawNetworkError,
    upstreamSpan: currentUpstreamSpan,
  };
}

async function handleAnthropicRoutedClaudeRequest(args: {
  ctx: ServerContext;
  body: ClaudeRequest;
  modelRouter?: ModelRouter;
  tracer?: ProxyTracer;
  requestStartTime: number;
  accountStrategy: "round-robin" | "fill-first";
  buildLoggedClaudeError: ClaudeLoggedErrorBuilder;
  logProxyBody: ProxyBodyCaptureLogger;
  logFinalRequest: ClaudeFinalRequestLogger;
}): Promise<unknown> {
  const {
    ctx,
    body,
    modelRouter,
    tracer,
    requestStartTime,
    accountStrategy,
    buildLoggedClaudeError,
    logProxyBody,
    logFinalRequest,
  } = args;
  const parsedRequest = parseClaudeRequest(body);
  const loadedAccounts = await loadClaudeProxyAccounts({
    ctx,
    body,
    tracer,
    requestStartTime,
    accountStrategy,
    buildLoggedClaudeError,
  });
  if ("response" in loadedAccounts) {
    return loadedAccounts.response;
  }

  const {
    accounts,
    enabledAccounts,
    orderedAccounts,
    bodyStr,
    requestStart,
    toolCount,
    url,
    clientHeaders,
    isClaudeClientRequest,
  } = loadedAccounts;
  const loopState: AnthropicLoopState = {
    lastError: undefined,
    sawRateLimit: false,
    sawNetworkError: false,
    sawTransientFailure: false,
    invalidRequestFailure: null,
    authFailureMessage: null,
    attemptNumber: 0,
  };
  const acctSelectionSpan = tracer?.startAccountSelection();

  // Try to return to the home primary account if its cooling has expired.
  maybeResetPrimaryToHome(enabledAccounts);

  // Skip accounts that are still cooling from a recent 429-exhaustion,
  // but keep them as last-resort if ALL accounts are cooling.
  const nonCoolingAccounts = orderedAccounts.filter(
    (a) => !isAccountCooling(a.key),
  );
  const effectiveAccounts =
    nonCoolingAccounts.length > 0 ? nonCoolingAccounts : orderedAccounts;

  accountLoop: for (const account of effectiveAccounts) {
    const accountState = getOrCreateRuntimeState(account.key);
    let transientSameAccountRetries = 0;
    let rateLimitSameAccountRetries = 0;

    while (true) {
      loopState.attemptNumber += 1;
      if (tracer && loopState.attemptNumber === 1 && acctSelectionSpan) {
        tracer.setAccountSelection({
          strategy: accountStrategy,
          accountsTotal: accounts.length,
          accountsHealthy: enabledAccounts.length,
          selectedAccount: account.label,
          accountType: account.type,
        });
        acctSelectionSpan.end();
      }

      const logAttempt = createAnthropicAttemptLogger({
        ctx,
        body,
        toolCount,
        requestStart,
        tracer,
        account,
        attemptNumber: loopState.attemptNumber,
      });
      const preparedAttempt = await prepareAnthropicAccountAttempt({
        account,
        accountState,
        bodyStr,
        clientHeaders,
        isClaudeClientRequest,
        url,
        tracer,
        attemptNumber: loopState.attemptNumber,
        currentLastError: loopState.lastError,
        currentAuthFailureMessage: loopState.authFailureMessage,
        logAttempt,
        logProxyBody,
      });
      loopState.lastError = preparedAttempt.lastError;
      loopState.authFailureMessage = preparedAttempt.authFailureMessage;
      if (
        preparedAttempt.continueLoop ||
        !preparedAttempt.headers ||
        !preparedAttempt.buildUpstreamBody ||
        !preparedAttempt.finalBodyStr ||
        preparedAttempt.fetchStartMs === undefined
      ) {
        continue accountLoop;
      }

      const fetchResult = await fetchAnthropicAccountResponse({
        url,
        headers: preparedAttempt.headers,
        finalBodyStr: preparedAttempt.finalBodyStr,
        account,
        accountState,
        enabledAccounts,
        orderedAccounts,
        tracer,
        logAttempt,
        logProxyBody,
        fetchStartMs: preparedAttempt.fetchStartMs,
        attemptNumber: loopState.attemptNumber,
        currentLastError: loopState.lastError,
        currentSawRateLimit: loopState.sawRateLimit,
        currentSawNetworkError: loopState.sawNetworkError,
        upstreamSpan: preparedAttempt.upstreamSpan,
      });
      loopState.lastError = fetchResult.lastError;
      loopState.sawRateLimit = fetchResult.sawRateLimit;
      loopState.sawNetworkError = fetchResult.sawNetworkError;
      if (fetchResult.continueLoop || !fetchResult.response) {
        // 429 with retry-after: wait and retry same account up to 5 times
        if (
          fetchResult.retrySameAccount &&
          fetchResult.retryAfterMs !== undefined &&
          rateLimitSameAccountRetries < MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES
        ) {
          rateLimitSameAccountRetries += 1;
          const delayMs = Math.min(
            fetchResult.retryAfterMs || 1_000,
            MAX_RATE_LIMIT_RETRY_DELAY_MS,
          );
          logger.always(
            `[proxy] retrying same account=${account.label} after upstream 429 (${rateLimitSameAccountRetries}/${MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES}) in ${delayMs}ms`,
          );
          await sleep(delayMs);
          continue;
        }
        // Rate-limit retries exhausted for this account — rotate
        if (
          fetchResult.retrySameAccount &&
          fetchResult.retryAfterMs !== undefined
        ) {
          // Mark account as cooling so subsequent requests don't hammer it
          const coolingMs = Math.min(
            fetchResult.retryAfterMs || DEFAULT_COOLING_PERIOD_MS,
            DEFAULT_COOLING_PERIOD_MS,
          );
          accountState.coolingUntil = Date.now() + coolingMs;
          advancePrimaryIfCurrent(
            account.key,
            enabledAccounts.length,
            orderedAccounts[0]?.key,
          );
          logger.always(
            `[proxy] exhausted ${MAX_RATE_LIMIT_SAME_ACCOUNT_RETRIES} rate-limit retries for account=${account.label}; cooling for ${coolingMs}ms, rotating`,
          );
          continue accountLoop;
        }
        // Transient error retry (network errors, 529 overloaded)
        if (
          fetchResult.retrySameAccount &&
          transientSameAccountRetries < MAX_TRANSIENT_SAME_ACCOUNT_RETRIES
        ) {
          transientSameAccountRetries += 1;
          const delayMs = getTransientSameAccountRetryDelayMs(
            transientSameAccountRetries,
          );
          logger.always(
            `[proxy] retrying same account=${account.label} after transient network error (${transientSameAccountRetries}/${MAX_TRANSIENT_SAME_ACCOUNT_RETRIES}) in ${delayMs}ms`,
          );
          await sleep(delayMs);
          continue;
        }
        if (fetchResult.retrySameAccount) {
          logger.always(
            `[proxy] exhausted transient same-account retries for account=${account.label}; rotating`,
          );
        }
        continue accountLoop;
      }

      let upstreamSpan = fetchResult.upstreamSpan;
      const response = fetchResult.response;
      if (
        response.status === 401 &&
        account.type === "oauth" &&
        account.refreshToken
      ) {
        const authRetryResult = await handleAnthropicAuthRetry({
          ctx,
          body,
          account,
          accountState,
          headers: preparedAttempt.headers,
          buildUpstreamBody: preparedAttempt.buildUpstreamBody,
          enabledAccounts,
          orderedAccounts,
          response,
          tracer,
          requestStartTime,
          fetchStartMs: preparedAttempt.fetchStartMs,
          attemptNumber: loopState.attemptNumber,
          finalBodyStr: preparedAttempt.finalBodyStr,
          upstreamSpan,
          logAttempt,
          logProxyBody,
          logFinalRequest,
          lastError: loopState.lastError,
          authFailureMessage: loopState.authFailureMessage,
          sawRateLimit: loopState.sawRateLimit,
          sawTransientFailure: loopState.sawTransientFailure,
          sawNetworkError: loopState.sawNetworkError,
        });
        loopState.lastError = authRetryResult.lastError;
        loopState.authFailureMessage = authRetryResult.authFailureMessage;
        loopState.sawRateLimit = authRetryResult.sawRateLimit;
        loopState.sawTransientFailure = authRetryResult.sawTransientFailure;
        loopState.sawNetworkError = authRetryResult.sawNetworkError;
        upstreamSpan = authRetryResult.upstreamSpan;
        if (authRetryResult.response !== undefined) {
          return authRetryResult.response;
        }
        if (authRetryResult.continueLoop) {
          continue accountLoop;
        }
      }

      if (!response.ok) {
        const nonOkResult = await handleAnthropicNonOkResponse({
          response,
          account,
          accountState,
          enabledAccounts,
          orderedAccounts,
          tracer,
          requestStartTime,
          fetchStartMs: preparedAttempt.fetchStartMs,
          attemptNumber: loopState.attemptNumber,
          logAttempt,
          logProxyBody,
          logFinalRequest,
          lastError: loopState.lastError,
          authFailureMessage: loopState.authFailureMessage,
          sawTransientFailure: loopState.sawTransientFailure,
          invalidRequestFailure: loopState.invalidRequestFailure,
          maxConsecutiveRefreshFailures: MAX_CONSECUTIVE_REFRESH_FAILURES,
        });
        loopState.lastError = nonOkResult.lastError;
        loopState.authFailureMessage = nonOkResult.authFailureMessage;
        loopState.sawTransientFailure = nonOkResult.sawTransientFailure;
        loopState.invalidRequestFailure = nonOkResult.invalidRequestFailure;
        if (nonOkResult.response !== undefined) {
          return nonOkResult.response;
        }
        if (nonOkResult.continueLoop) {
          if (
            nonOkResult.retrySameAccount &&
            transientSameAccountRetries < MAX_TRANSIENT_SAME_ACCOUNT_RETRIES
          ) {
            transientSameAccountRetries += 1;
            const delayMs = getTransientSameAccountRetryDelayMs(
              transientSameAccountRetries,
            );
            logger.always(
              `[proxy] retrying same account=${account.label} after transient upstream ${response.status} (${transientSameAccountRetries}/${MAX_TRANSIENT_SAME_ACCOUNT_RETRIES}) in ${delayMs}ms`,
            );
            await sleep(delayMs);
            continue;
          }
          if (nonOkResult.retrySameAccount) {
            logger.always(
              `[proxy] exhausted transient same-account retries for account=${account.label}; rotating`,
            );
          }
          continue accountLoop;
        }
        break accountLoop;
      }

      // Clear cooling on success — account is healthy again
      if (accountState.coolingUntil) {
        accountState.coolingUntil = undefined;
      }

      const successResult = await handleAnthropicSuccessfulResponse({
        ctx,
        body,
        account,
        accountState,
        response,
        tracer,
        requestStartTime,
        fetchStartMs: preparedAttempt.fetchStartMs,
        attemptNumber: loopState.attemptNumber,
        finalBodyStr: preparedAttempt.finalBodyStr,
        upstreamSpan,
        logProxyBody,
        logFinalRequest,
      });
      if ("retryNextAccount" in successResult) {
        continue accountLoop;
      }
      return successResult.response;
    }
  }

  if (loopState.attemptNumber === 0) {
    acctSelectionSpan?.end();
  }

  const configuredFallbackResult = await tryConfiguredClaudeFallbackChain({
    ctx,
    body,
    parsedFallbackRequest: parsedRequest,
    modelRouter,
    tracer,
    requestStartTime,
    logProxyBody,
    logFinalRequest,
  });
  if (configuredFallbackResult.response) {
    return configuredFallbackResult.response;
  }

  // Try auto-provider fallback when the configured chain didn't produce a
  // response (either no chain configured, or all entries failed/deduped).
  if (!loopState.sawRateLimit) {
    const autoFallbackResponse = await tryAutoClaudeFallback({
      ctx,
      body,
      tracer,
      requestStartTime,
      logProxyBody,
      logFinalRequest,
    });
    if (autoFallbackResponse) {
      return autoFallbackResponse;
    }
  }

  return buildClaudeAnthropicFailureResponse({
    tracer,
    requestStartTime,
    authFailureMessage: loopState.authFailureMessage,
    invalidRequestFailure: loopState.invalidRequestFailure,
    sawNetworkError: loopState.sawNetworkError,
    sawTransientFailure: loopState.sawTransientFailure,
    sawRateLimit: loopState.sawRateLimit,
    lastError: loopState.lastError,
    orderedAccounts,
    buildLoggedClaudeError,
    logProxyBody,
    logFinalRequest,
  });
}

// ---------------------------------------------------------------------------
// Route factory
// ---------------------------------------------------------------------------

/**
 * Create Claude-compatible proxy routes.
 *
 * Every request flows through ctx.neurolink.generate() or ctx.neurolink.stream().
 * No direct fetch() calls to api.anthropic.com.
 *
 * @param modelRouter - Optional model router for remapping model names.
 * @param basePath    - Base path prefix (default: "" since Claude API uses /v1/...).
 * @returns RouteGroup with Claude-compatible endpoints.
 */
export function createClaudeProxyRoutes(
  modelRouter?: ModelRouter,
  basePath: string = "",
  accountStrategy: "round-robin" | "fill-first" = "fill-first",
  passthroughMode: boolean = false,
  primaryAccountKey?: string,
): RouteGroup {
  configuredPrimaryAccountKey = primaryAccountKey;
  return {
    prefix: `${basePath}/v1`,
    routes: [
      // =====================================================================
      // POST /v1/messages -- Main chat completions endpoint
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/v1/messages`,
        handler: async (ctx: ServerContext) => {
          const body = ctx.body as ClaudeRequest | undefined;

          // 1. Validate
          if (
            typeof body?.model !== "string" ||
            !Array.isArray(body?.messages)
          ) {
            return buildClaudeError(
              400,
              "Missing required fields: model, messages",
            );
          }

          // 2. Resolve model via router (or pass through to anthropic)
          // Guard: without a model router, only Claude models are allowed.
          const modelLower = body.model.toLowerCase();
          if (!modelRouter && !modelLower.startsWith("claude-")) {
            return buildClaudeError(
              404,
              `Model '${body.model}' is not an Anthropic model. ` +
                `The proxy only supports Claude models. ` +
                `Use a model router to route non-Claude models to other providers.`,
            );
          }

          const route = modelRouter?.resolve(body.model) ?? {
            provider: "anthropic",
            model: body.model,
          };
          const clientRequestBody = JSON.stringify(body);

          // 3. Create request runtime context (tracer, loggers, error builder)
          const {
            tracer,
            requestStartTime,
            logProxyBody,
            logFinalRequest,
            buildLoggedClaudeError,
          } = createClaudeRequestRuntimeContext({
            ctx,
            body,
            clientRequestBody,
          });

          try {
            // 4. Route based on target provider
            if (route.provider === null) {
              tracer?.setError(
                "not_found_error",
                `Model '${body.model}' is not a Claude model.`,
              );
              tracer?.end(404, Date.now() - requestStartTime);
              return buildLoggedClaudeError(
                404,
                `Model '${body.model}' is not a Claude model. Use a model router to route it to another provider.`,
              );
            }

            if (route.provider === "anthropic") {
              tracer?.setMode("passthrough");

              if (passthroughMode) {
                return handleClaudePassthroughRequest({
                  ctx,
                  body,
                  clientRequestBody,
                  tracer,
                  requestStartTime,
                  logProxyBody,
                });
              }

              return handleAnthropicRoutedClaudeRequest({
                ctx,
                body,
                modelRouter,
                tracer,
                requestStartTime,
                accountStrategy,
                buildLoggedClaudeError,
                logProxyBody,
                logFinalRequest,
              });
            } else {
              return handleTranslatedClaudeRequest({
                ctx,
                body,
                route: {
                  provider: route.provider,
                  model: route.model,
                },
                modelRouter,
                tracer,
                requestStartTime,
                logProxyBody,
              });
            }
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : String(error);
            logger.error(
              `[claude-proxy] Generation error for ${body.model}: ${errMsg}`,
            );
            tracer?.setError("generation_error", errMsg.slice(0, 500));
            tracer?.end(502, Date.now() - requestStartTime);
            return buildLoggedClaudeError(
              502,
              `Generation failed: ${error instanceof Error ? error.message : "unknown error"}`,
            );
          }
        },
        description:
          "Claude-compatible messages endpoint routed through NeuroLink",
        tags: ["claude-proxy", "messages"],
        streaming: { enabled: true, contentType: "text/event-stream" },
      },

      // =====================================================================
      // GET /v1/models -- List available models
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/v1/models`,
        handler: async (_ctx: ServerContext) =>
          withSpan(
            {
              name: "neurolink.http.claudeProxy.listModels",
              tracer: tracers.http,
              attributes: { "http.route": `${basePath}/v1/models` },
            },
            async () => {
              const models = [
                "claude-sonnet-4-20250514",
                "claude-sonnet-4-5-20250929",
                "claude-haiku-4-5-20241022",
                "claude-opus-4-20250514",
              ];

              return {
                object: "list",
                data: models.map((id) => ({
                  id,
                  object: "model",
                  created: 1700000000,
                  owned_by: "anthropic",
                })),
              };
            },
          ),
        description: "List available Claude models",
        tags: ["claude-proxy", "models"],
      },

      // =====================================================================
      // POST /v1/messages/count_tokens -- Token counting endpoint
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/v1/messages/count_tokens`,
        handler: async (ctx: ServerContext) =>
          withSpan(
            {
              name: "neurolink.http.claudeProxy.countTokens",
              tracer: tracers.http,
              attributes: {
                "http.route": `${basePath}/v1/messages/count_tokens`,
              },
            },
            async (span) => {
              const body = ctx.body as
                | { model?: string; messages?: Array<{ content: unknown }> }
                | undefined;

              if (
                typeof body?.model !== "string" ||
                !Array.isArray(body?.messages)
              ) {
                return buildClaudeError(
                  400,
                  "Missing required fields: model, messages",
                );
              }

              // Simple estimation using character-to-token heuristic
              const text = body.messages
                .map((m) =>
                  typeof m.content === "string"
                    ? m.content
                    : JSON.stringify(m.content),
                )
                .join(" ");

              const inputTokens = Math.ceil(text.length / 4);
              span.setAttribute("ai.model", body.model);
              span.setAttribute("gen_ai.usage.input_tokens", inputTokens);
              return { input_tokens: inputTokens };
            },
          ),
        description: "Count tokens for a messages request",
        tags: ["claude-proxy", "tokens"],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract token usage from a StreamResult.usage object, handling multiple
 * naming conventions across AI SDK versions and providers:
 * - AI SDK v6: inputTokens / outputTokens
 * - AI SDK v4: promptTokens / completionTokens
 * - NeuroLink internal: input / output
 */
function extractUsageFromStreamResult(usage: unknown): {
  input: number;
  output: number;
  total: number;
} {
  if (!usage || typeof usage !== "object") {
    return { input: 0, output: 0, total: 0 };
  }
  const u = usage as Record<string, unknown>;
  const input =
    (typeof u.inputTokens === "number" ? u.inputTokens : 0) ||
    (typeof u.promptTokens === "number" ? u.promptTokens : 0) ||
    (typeof u.input === "number" ? u.input : 0);
  const output =
    (typeof u.outputTokens === "number" ? u.outputTokens : 0) ||
    (typeof u.completionTokens === "number" ? u.completionTokens : 0) ||
    (typeof u.output === "number" ? u.output : 0);
  return { input, output, total: input + output };
}

/**
 * Extract text content from a stream chunk (handles various chunk formats).
 */
function extractText(chunk: unknown): string | null {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk && typeof chunk === "object") {
    const c = chunk as Record<string, unknown>;

    // NeuroLink StreamResult chunk format: { content: string }
    if (typeof c.content === "string") {
      return c.content;
    }

    // Vercel AI SDK text delta format
    if (c.type === "text-delta" && typeof c.textDelta === "string") {
      return c.textDelta;
    }

    // Direct text field
    if (typeof c.text === "string") {
      return c.text;
    }
  }

  return null;
}

function getOrCreateRuntimeState(accountKey: string): RuntimeAccountState {
  const existing = accountRuntimeState.get(accountKey);
  if (existing) {
    return existing;
  }
  const initial: RuntimeAccountState = {
    consecutiveRefreshFailures: 0,
    permanentlyDisabled: false,
  };
  accountRuntimeState.set(accountKey, initial);
  return initial;
}

async function disableAccountUntilReauth(
  account: ProxyPassthroughAccount,
  state: RuntimeAccountState,
): Promise<void> {
  state.permanentlyDisabled = true;

  // Decision 7 (usage): Persist disabled state to disk so it survives restarts
  try {
    const { tokenStore } = await import("../../auth/tokenStore.js");
    await tokenStore.markDisabled(account.key, "refresh_failed");
  } catch (e) {
    logger.debug(
      `[proxy] failed to persist disabled state for ${account.label}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  logger.always(
    `[proxy] account=${account.label} disabled until re-authentication. Run: neurolink auth login anthropic --method oauth`,
  );
}

function formatReauthMessage(labels: string | string[]): string {
  const value = Array.isArray(labels) ? labels.join(", ") : labels;
  return `Account(s) require re-authentication: ${value}. Run: neurolink auth login anthropic --method oauth`;
}

function summarizeErrorMessage(
  message: string,
  maxLength: number = 180,
): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength)}...`;
}

export function getTransientSameAccountRetryDelayMs(
  retryNumber: number,
): number {
  const index = Math.min(
    Math.max(retryNumber - 1, 0),
    TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS.length - 1,
  );
  return TRANSIENT_SAME_ACCOUNT_RETRY_DELAYS_MS[index] ?? 0;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get low-level network error code from an unknown error shape.
 */
function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const directCode = (error as { code?: unknown }).code;
  if (typeof directCode === "string") {
    return directCode;
  }
  const cause = (error as { cause?: unknown }).cause;
  if (!cause || typeof cause !== "object") {
    return undefined;
  }
  const causeCode = (cause as { code?: unknown }).code;
  return typeof causeCode === "string" ? causeCode : undefined;
}

/**
 * Determine whether a thrown fetch error is a transient connectivity issue.
 */
function isRetryableNetworkError(error: unknown): boolean {
  const code = getErrorCode(error);

  // Check non-retryable codes FIRST — before the string-based heuristic
  // which could false-positive on error messages containing these strings.
  const NON_RETRYABLE_CODES = ["ENOTFOUND"];
  if (code && NON_RETRYABLE_CODES.includes(code)) {
    return false;
  }

  if (
    code &&
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "EHOSTUNREACH",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_CONNECT",
      "UND_ERR_SOCKET",
      "UND_ERR_HEADERS_TIMEOUT",
    ].includes(code)
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  // Exclude ENOTFOUND from string-based heuristic — DNS failures are permanent
  // and rotating accounts won't help since they all hit the same host.
  if (normalized.includes("enotfound")) {
    return false;
  }

  return (
    normalized.includes("econnrefused") ||
    normalized.includes("econnreset") ||
    normalized.includes("etimedout") ||
    normalized.includes("connection error") ||
    normalized.includes("connect error") ||
    normalized.includes("fetch failed") ||
    normalized.includes("socket hang up")
  );
}

const TRANSIENT_HTTP_STATUSES = new Set([
  408, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 529,
]);

/**
 * Parse a Claude error payload when available.
 */
export function parseClaudeErrorBody(errBody: string): ParsedClaudeError {
  try {
    const parsed = JSON.parse(errBody) as {
      type?: unknown;
      error?: { type?: unknown; message?: unknown };
    };
    if (
      parsed &&
      parsed.type === "error" &&
      parsed.error &&
      typeof parsed.error === "object"
    ) {
      return {
        errorType:
          typeof parsed.error.type === "string" ? parsed.error.type : undefined,
        message:
          typeof parsed.error.message === "string"
            ? parsed.error.message
            : undefined,
      };
    }
  } catch {
    // ignore parse errors; caller will use heuristics
  }
  return {};
}

/**
 * Detect malformed request errors that should not trigger account/provider failover.
 */
export function isInvalidRequestError(
  status: number,
  errBody: string,
): boolean {
  if (status === 422) {
    return true;
  }
  const parsed = parseClaudeErrorBody(errBody);
  return (
    parsed.errorType === "invalid_request_error" ||
    errBody.includes("invalid_request_error")
  );
}

function normalizeClaudeRequestForAnthropic(
  body: ClaudeRequest,
): ClaudeRequest {
  return {
    ...body,
    messages: body.messages.map((msg) => {
      if (typeof msg.content !== "string") {
        return msg;
      }

      return {
        ...msg,
        content: [{ type: "text", text: msg.content }],
      };
    }),
  };
}

export function buildProxyFallbackOptions(
  parsed: ParsedClaudeRequest,
  overrides: {
    provider?: string;
    model?: string;
  } = {},
): Record<string, unknown> {
  const historyMessages = parsed.conversationMessages.slice(0, -1);
  const toolNames = Object.keys(parsed.tools);
  const images = shouldOmitImagesForTarget(overrides.provider, overrides.model)
    ? []
    : parsed.images;
  const thinkingConfig = shouldOmitThinkingConfigForTarget(
    overrides.provider,
    overrides.model,
  )
    ? undefined
    : parsed.thinkingConfig;
  const toolChoice = parsed.toolChoiceName
    ? { type: "tool" as const, toolName: parsed.toolChoiceName }
    : parsed.toolChoice;

  return {
    input: {
      text: parsed.prompt,
      ...(images.length > 0 ? { images } : {}),
    },
    ...(overrides.provider ? { provider: overrides.provider } : {}),
    ...(overrides.model ? { model: overrides.model } : {}),
    systemPrompt: parsed.systemPrompt,
    maxTokens: parsed.maxTokens,
    ...(parsed.temperature !== undefined
      ? { temperature: parsed.temperature }
      : {}),
    ...(parsed.topP !== undefined ? { topP: parsed.topP } : {}),
    ...(parsed.topK !== undefined ? { topK: parsed.topK } : {}),
    ...(parsed.stopSequences?.length
      ? { stopSequences: parsed.stopSequences }
      : {}),
    ...(thinkingConfig ? { thinkingConfig } : {}),
    ...(toolNames.length === 0 ? { disableTools: true } : {}),
    // Claude-compatible requests already declare the exact tool contract.
    // Filter out NeuroLink's built-in agent tools so translated fallbacks only
    // expose the tools the client actually knows how to handle.
    ...(toolNames.length > 0
      ? {
          tools: parsed.tools,
          toolFilter: toolNames,
        }
      : {}),
    ...(toolChoice ? { toolChoice } : {}),
    ...(historyMessages.length > 0
      ? { conversationMessages: historyMessages }
      : {}),
    disableInternalFallback: true,
    skipToolPromptInjection: true,
    maxSteps: 1,
  };
}

function hasTranslatedOutput(
  collectedText: string,
  toolCalls: unknown[] | undefined,
): boolean {
  return collectedText.trim().length > 0 || (toolCalls?.length ?? 0) > 0;
}

function shouldOmitImagesForTarget(provider?: string, model?: string): boolean {
  // `open-large` in our LiteLLM setup handles text and tools, but returns an
  // empty completion when binary images are forwarded. Claude Code already
  // includes textual image markers in the prompt, so dropping only the binary
  // image payload keeps the request usable instead of breaking fallback.
  return provider === "litellm" && model === "open-large";
}

function shouldOmitThinkingConfigForTarget(
  provider?: string,
  model?: string,
): boolean {
  if (provider === "litellm") {
    return true;
  }
  if (provider !== "vertex") {
    return false;
  }
  // Only Gemini 2.5+ and 3.x support thinking_level on Vertex.
  const m = model?.toLowerCase() ?? "";
  return !/gemini-(2\.5|3)/.test(m);
}

function extractToolArgs(toolCall: unknown): unknown {
  return (
    (toolCall as { args?: unknown }).args ??
    (toolCall as { parameters?: unknown }).parameters ??
    (toolCall as { input?: unknown }).input ??
    {}
  );
}

/**
 * Detect transient upstream failures that should trigger account/provider failover.
 *
 * Includes Cloudflare 52x statuses and Anthropic 400/api_error wrappers that
 * carry transient HTML responses (e.g. 520 pages) inside `error.message`.
 */
export function isTransientHttpFailure(
  status: number,
  errBody: string,
): boolean {
  if (TRANSIENT_HTTP_STATUSES.has(status)) {
    return true;
  }

  if (status !== 400) {
    return false;
  }

  const parsed = parseClaudeErrorBody(errBody);
  if (parsed.errorType === "overloaded_error") {
    return true;
  }

  if (parsed.errorType !== "api_error") {
    return false;
  }

  const normalized = (parsed.message ?? errBody).toLowerCase();
  return (
    normalized.includes("<!doctype html") ||
    normalized.includes("error code 520") ||
    normalized.includes("web server is returning an unknown error") ||
    normalized.includes("cloudflare") ||
    normalized.includes("internal server error")
  );
}

// ---------------------------------------------------------------------------
// Test hooks (not part of the public SDK API). Only consumed by the proxy
// continuous-test-suite to drive the in-process resolver/reset logic without
// spinning up a full proxy. Keep this surface small.
// ---------------------------------------------------------------------------

export const __testHooks = {
  resolveHomeIndex,
  maybeResetPrimaryToHome,
  setConfiguredPrimaryAccountKey: (key: string | undefined): void => {
    configuredPrimaryAccountKey = key;
  },
  getConfiguredPrimaryAccountKey: (): string | undefined =>
    configuredPrimaryAccountKey,
  setPrimaryAccountIndex: (index: number): void => {
    primaryAccountIndex = index;
  },
  getPrimaryAccountIndex: (): number => primaryAccountIndex,
  setAccountRuntimeState: (
    key: string,
    state: Partial<RuntimeAccountState>,
  ): void => {
    const existing =
      accountRuntimeState.get(key) ?? getOrCreateRuntimeState(key);
    Object.assign(existing, state);
    accountRuntimeState.set(key, existing);
  },
  resetAllRuntimeState: (): void => {
    accountRuntimeState.clear();
    primaryAccountIndex = 0;
    lastKnownAccountCount = 0;
    configuredPrimaryAccountKey = undefined;
  },
};

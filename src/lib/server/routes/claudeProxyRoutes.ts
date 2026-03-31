/* eslint-disable max-depth */
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

import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  buildStableClaudeCodeBillingHeader,
  CLAUDE_CLI_USER_AGENT,
  CLAUDE_CODE_OAUTH_BETAS,
  getOrCreateClaudeCodeIdentity,
  parseClaudeCodeUserId,
} from "../../auth/anthropicOAuth.js";
import { parseQuotaHeaders, saveAccountQuota } from "../../proxy/accountQuota.js";
import {
  buildClaudeError,
  ClaudeStreamSerializer,
  generateToolUseId,
  parseClaudeRequest,
  serializeClaudeResponse,
} from "../../proxy/claudeFormat.js";
import type { ModelRouter } from "../../proxy/modelRouter.js";
import { ProxyTracer } from "../../proxy/proxyTracer.js";
import { createRawStreamCapture } from "../../proxy/rawStreamCapture.js";
import { logBodyCapture, logRequest, logRequestAttempt, logStreamError } from "../../proxy/requestLogger.js";
import { createSSEInterceptor } from "../../proxy/sseInterceptor.js";
import { needsRefresh, persistTokens, refreshToken } from "../../proxy/tokenRefresh.js";
import {
  recordAttempt,
  recordAttemptError,
  recordCooldown,
  recordFinalError,
  recordFinalSuccess,
} from "../../proxy/usageStats.js";
import type {
  ClaudeRequest,
  InternalResult,
  ParsedClaudeRequest,
  ProxyPassthroughAccount,
  RuntimeAccountState,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { ProviderHealthChecker } from "../../utils/providerHealth.js";
import type { RouteGroup, ServerContext } from "../types.js";

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
 *  the current account hits a 429 or auth failure that puts it on cooldown. */
let primaryAccountIndex = 0;
/** Track account count so we can reset primaryAccountIndex when it changes. */
let lastKnownAccountCount = 0;

const MAX_AUTH_RETRIES = 5;
const MAX_CONSECUTIVE_REFRESH_FAILURES = 15;

/** Decision 8: Cooldowns only for 401 and 429. */
const AUTH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes for 401
const RATE_LIMIT_BACKOFF_BASE_MS = 1000; // 1 second base for 429
const RATE_LIMIT_BACKOFF_CAP_MS = 10 * 60 * 1000; // 10 minute cap for 429
/** Timeout for upstream requests to Anthropic. Must be generous enough
 *  to cover the full lifecycle of streaming responses, including extended
 *  thinking from Opus models (which can exceed 5 minutes for large contexts). */
const UPSTREAM_FETCH_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const accountRuntimeState = new Map<string, RuntimeAccountState>();

type ProxyTranslationAttempt = {
  provider?: string;
  model?: string;
  label: string;
};

/** Track whether we've run the one-time startup prune. */
let startupPruneDone = false;

/** Advance the primary account index when the current primary is put on cooldown.
 *  This is what makes fill-first work: we stick to one account until it's unusable.
 *  Only advances when the account being cooled IS the current primary; otherwise
 *  it's already a fallback and advancing would disrupt the fill-first ordering. */
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

// ---------------------------------------------------------------------------
// OAuth polyfill helpers (extracted to reduce block nesting)
// ---------------------------------------------------------------------------

type ClaudeSnapshotBody = {
  metadataUserId?: string;
  billingHeader?: string;
  agentBlock?: string;
  sessionId?: string;
};

type ClaudeSnapshot = {
  accountKey: string;
  capturedAt: string;
  source: "claude-code";
  headers: Record<string, string>;
  body?: ClaudeSnapshotBody;
};

const snapshotCache = new Map<string, { snapshot: ClaudeSnapshot; loadedAt: number }>();
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
  return join(homedir(), ".neurolink", "header-snapshots", `anthropic_${getSnapshotSafeLabel(accountLabel)}.json`);
}

function applySnapshotHeaders(headers: Record<string, string>, snapshot: ClaudeSnapshot | null): void {
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

async function loadClaudeSnapshot(accountLabel: string): Promise<ClaudeSnapshot | null> {
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
      headers: "headers" in snapshot && snapshot.headers ? snapshot.headers : {},
      ...(snapshot.body ? { body: snapshot.body } : {}),
    };
    if (Object.keys(normalized.headers).length === 0 && Object.keys(normalized.body ?? {}).length === 0) {
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
    (block) => typeof block?.text === "string" && block.text.includes("x-anthropic-billing-header"),
  )?.text;
  const agentBlock = systemBlocks.find(
    (block) => typeof block?.text === "string" && block.text.includes("Claude Agent SDK"),
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

function isLikelyClaudeClient(headers: Record<string, string>, snapshotBody?: ClaudeSnapshotBody): boolean {
  return (
    typeof headers["x-claude-code-session-id"] === "string" ||
    headers["user-agent"]?.startsWith("claude-cli/") ||
    !!snapshotBody?.metadataUserId ||
    !!snapshotBody?.billingHeader ||
    !!snapshotBody?.agentBlock
  );
}

function snapshotsMatch(existing: ClaudeSnapshot | null, next: ClaudeSnapshot): boolean {
  if (!existing) {
    return false;
  }

  return (
    JSON.stringify(existing.headers ?? {}) === JSON.stringify(next.headers ?? {}) &&
    JSON.stringify(existing.body ?? {}) === JSON.stringify(next.body ?? {})
  );
}

async function persistClaudeSnapshot(accountLabel: string, snapshot: ClaudeSnapshot): Promise<void> {
  const snapshotPath = getSnapshotPath(accountLabel);
  const dirPath = join(homedir(), ".neurolink", "header-snapshots");
  await mkdir(dirPath, { recursive: true });
  const tmpPath = `${snapshotPath}.tmp`;
  await writeFile(tmpPath, JSON.stringify(snapshot, null, 2), { mode: 0o600 });
  await rename(tmpPath, snapshotPath);
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

  await persistClaudeSnapshot(accountLabel, next);
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
      text: snapshot?.body?.agentBlock || "You are a Claude agent, built on Anthropic's Claude Agent SDK.",
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
          (b: { text?: string }) => typeof b.text === "string" && b.text.includes("x-anthropic-billing-header"),
        );
        const agentIdx = parsed.system.findIndex(
          (b: { text?: string }) => typeof b.text === "string" && b.text.includes("Claude Agent SDK"),
        );
        const billingBlock = {
          type: "text",
          text: buildStableClaudeCodeBillingHeader(parsed.system[billingIdx]?.text ?? snapshot?.body?.billingHeader),
        };

        // Remove in reverse index order so indices stay valid
        const indicesToRemove = [billingIdx, agentIdx].filter((i) => i >= 0).sort((a, b) => b - a);
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
    const tokenPrefix = accountToken.substring(0, Math.min(20, accountToken.length));
    const identity = getOrCreateClaudeCodeIdentity(tokenPrefix, {
      existingUserId: parsed.metadata?.user_id ?? snapshot?.body?.metadataUserId,
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
    logger.always("[proxy] skipping legacy account (expired, no refresh token)");
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
    logger.always(`[proxy] skipping legacy account (expired, refresh failed: ${ok.error?.slice(0, 200) ?? "unknown"})`);
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

export type { ClaudeProxyDeps } from "../../types/index.js";

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
// eslint-disable-next-line max-lines-per-function
export function createClaudeProxyRoutes(
  modelRouter?: ModelRouter,
  basePath: string = "",
  accountStrategy: "round-robin" | "fill-first" = "fill-first",
  passthroughMode: boolean = false,
): RouteGroup {
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
          if (typeof body?.model !== "string" || !Array.isArray(body?.messages)) {
            return buildClaudeError(400, "Missing required fields: model, messages");
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

          // ── OTel tracing ──────────────────────────────────────
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
                  ctx.headers["x-neurolink-session-id"] ?? ctx.headers["x-claude-code-session-id"] ?? undefined,
                userAgent: ctx.headers["user-agent"] ?? undefined,
              },
              ctx.headers,
            );
            const receiveSpan = tracer.startReceive();
            tracer.logRequestHeaders(ctx.headers);
            tracer.logRequestBody(clientRequestBody);
            receiveSpan.end();
          } catch {
            // Graceful degradation — continue without tracing
            tracer = undefined;
          }
          const requestStartTime = Date.now();
          const logProxyBody = (
            capture: Omit<
              Parameters<typeof logBodyCapture>[0],
              "timestamp" | "requestId" | "model" | "stream" | "traceId" | "spanId"
            >,
          ): void => {
            const traceCtx = tracer?.getTraceContext();
            void logBodyCapture({
              timestamp: new Date().toISOString(),
              requestId: ctx.requestId,
              model: body.model,
              stream: body.stream ?? false,
              ...capture,
              ...(traceCtx ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId } : {}),
            });
          };
          const logFinalRequest = (
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
          ): void => {
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
              ...(extra?.inputTokens !== undefined ? { inputTokens: extra.inputTokens } : {}),
              ...(extra?.outputTokens !== undefined ? { outputTokens: extra.outputTokens } : {}),
              ...(extra?.cacheCreationTokens !== undefined ? { cacheCreationTokens: extra.cacheCreationTokens } : {}),
              ...(extra?.cacheReadTokens !== undefined ? { cacheReadTokens: extra.cacheReadTokens } : {}),
              ...(traceCtx ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId } : {}),
            });
          };
          logProxyBody({
            phase: "client_request",
            headers: ctx.headers,
            body: clientRequestBody,
            bodySize: Buffer.byteLength(clientRequestBody, "utf8"),
            contentType: ctx.headers["content-type"] ?? "application/json",
          });
          const buildLoggedClaudeError = (
            status: number,
            message: string,
            errorType?: string,
            extra?: {
              account?: string;
              accountType?: string;
              attempt?: number;
            },
          ) => {
            const errorBody = buildClaudeError(status, message, errorType);
            const errorBodyText = JSON.stringify(errorBody);
            recordFinalError(status, extra?.account, extra?.accountType);
            logFinalRequest(status, extra?.account ?? "", extra?.accountType ?? "final", errorType, message);
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

          try {
            // 3. Route based on target provider
            if (route.provider === null) {
              tracer?.setError("not_found_error", `Model '${body.model}' is not a Claude model.`);
              tracer?.end(404, Date.now() - requestStartTime);
              return buildLoggedClaudeError(
                404,
                `Model '${body.model}' is not a Claude model. ` + `Use a model router to route it to another provider.`,
              );
            }
            const isClaudeTarget = route.provider === "anthropic";

            if (isClaudeTarget) {
              // --- PASSTHROUGH MODE (Claude -> Claude) -------------------
              tracer?.setMode("passthrough");

              // ── CLI --passthrough: raw transparent forwarding ──────
              if (passthroughMode) {
                tracer?.setMode("passthrough-cli");
                const bodyStr = clientRequestBody;
                const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;

                // Forward client headers as-is, filtering blocked ones
                const upstreamHeaders: Record<string, string> = {};
                for (const [key, value] of Object.entries(ctx.headers)) {
                  if (!BLOCKED_UPSTREAM_HEADERS.has(key.toLowerCase()) && value) {
                    upstreamHeaders[key] = value;
                  }
                }
                // Ensure content-type is set
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
                  const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
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
                  const errorBody = buildClaudeError(502, `Passthrough fetch failed: ${errMsg}`);
                  logProxyBody({
                    phase: "client_response",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(errorBody),
                    bodySize: Buffer.byteLength(JSON.stringify(errorBody), "utf8"),
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
                response.headers.forEach((v, k) => {
                  upstreamResponseHeaders[k] = v;
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
                    body: errorText,
                    bodySize: Buffer.byteLength(errorText, "utf8"),
                    contentType: upstreamResponseHeaders["content-type"] ?? "application/json",
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

                // Streaming response
                if (body.stream && response.body) {
                  const responseHeaders = { ...upstreamResponseHeaders };
                  const { stream: clientCaptureStream, capture: clientCapture } = createRawStreamCapture();
                  let streamSource: ReadableStream<Uint8Array> = response.body;
                  if (tracer) {
                    try {
                      const { stream: interceptor, telemetry } = createSSEInterceptor({ captureRawText: true });
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
                            capturedResponse.headers.get("anthropic-ratelimit-unified-5h-utilization") ?? "",
                          );
                          const rateLimit7d = parseFloat(
                            capturedResponse.headers.get("anthropic-ratelimit-unified-7d-utilization") ?? "",
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
                          capturedTracer.recordBodySizes(capturedRequestBytes, data.totalBytesReceived);
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
                        .catch((err) => {
                          capturedTracer.setError("stream_error", err instanceof Error ? err.message : String(err));
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
                            errorMessage: err instanceof Error ? err.message : String(err),
                            traceId: traceCtx.traceId,
                            spanId: traceCtx.spanId,
                          });
                        });
                    } catch {
                      // Streaming capture is best-effort; request completion is handled elsewhere.
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

                // Non-streaming response
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
                  const usage = (responseJson as Record<string, unknown>).usage as Record<string, number> | undefined;
                  if (usage) {
                    tracer.setUsage({
                      inputTokens: usage.input_tokens ?? 0,
                      outputTokens: usage.output_tokens ?? 0,
                      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
                      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
                    });

                    const rateLimit5h = parseFloat(
                      response.headers.get("anthropic-ratelimit-unified-5h-utilization") ?? "",
                    );
                    const rateLimit7d = parseFloat(
                      response.headers.get("anthropic-ratelimit-unified-7d-utilization") ?? "",
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
              // ── END CLI --passthrough ─────────────────────────────

              const fs = await import("fs");
              const os = await import("os");
              const accounts: ProxyPassthroughAccount[] = [];
              const legacyCredPath = `${(os as typeof import("os")).homedir()}/.neurolink/anthropic-credentials.json`;

              // 1. Compound keys from TokenStore
              // Skip accounts with expired tokens and no refresh token.
              // For expired tokens WITH a refresh token, attempt ONE refresh
              // before adding — if it fails, skip the account entirely.
              const { tokenStore } = await import("../../auth/tokenStore.js");

              // Decision 10D: Auto-prune dead entries once on first request (startup)
              if (!startupPruneDone) {
                await tokenStore.pruneExpired();
                startupPruneDone = true;
              }

              const compoundKeys = await tokenStore.listByPrefix("anthropic:");
              for (const key of compoundKeys) {
                // Decision 10D + Hot-reload: Skip disabled accounts UNLESS credentials changed
                if (await tokenStore.isDisabled(key)) {
                  const existingState = getOrCreateRuntimeState(key);
                  // Check if credentials were refreshed/re-authed since disable.
                  // On cold start, lastToken is empty — don't treat that as a
                  // credential change; only compare on subsequent reloads.
                  const tokens = await tokenStore.loadTokens(key);
                  const hasTrackedTokens = existingState.lastToken !== undefined && existingState.lastToken !== "";
                  const tokenChanged =
                    tokens &&
                    hasTrackedTokens &&
                    (existingState.lastToken !== tokens.accessToken ||
                      existingState.lastRefreshToken !== tokens.refreshToken);
                  if (tokenChanged) {
                    // Credentials changed — auto-enable and use this account
                    await tokenStore.markEnabled(key);
                    logger.always(`[proxy] account=${key.split(":")[1] ?? key} re-enabled (credentials changed)`);
                    existingState.permanentlyDisabled = false;
                    existingState.coolingUntil = undefined;
                    existingState.backoffLevel = 0;
                    existingState.consecutiveRefreshFailures = 0;
                  } else {
                    logger.debug(`[proxy] skipping disabled account=${key.split(":")[1] ?? key}`);
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

                // Check if token is expired
                const isExpired = expiresAt ? expiresAt < Date.now() : false;

                if (isExpired) {
                  const label = key.split(":")[1] ?? key;
                  // Check if already marked dead from a previous request
                  const existingState = getOrCreateRuntimeState(key);
                  if (existingState.permanentlyDisabled) {
                    // Already known dead — skip silently (no log spam)
                    continue;
                  }

                  if (!refreshTok) {
                    logger.always(`[proxy] skipping account=${label} (expired, no refresh token)`);
                    await disableAccountUntilReauth({ key, label, token: accessToken, type: "oauth" }, existingState);
                    continue;
                  }
                  // Try ONE refresh before adding
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
                    await disableAccountUntilReauth({ key, label, token: accessToken, type: "oauth" }, existingState);
                    continue;
                  }
                  // Refresh succeeded — use new token and persist
                  accessToken = tempAccount.token;
                  refreshTok = tempAccount.refreshToken;
                  expiresAt = tempAccount.expiresAt;
                  await tokenStore.saveTokens(key, {
                    accessToken,
                    refreshToken: refreshTok,
                    expiresAt: expiresAt ?? Date.now() + 3600_000,
                    tokenType: "Bearer",
                  });
                  logger.always(`[proxy] refreshed expired account=${key.split(":")[1] ?? key} at startup`);
                }

                // Detect whether this is an API key or an OAuth token.
                // Use the stored tokenType (set at auth time) rather than a
                // prefix heuristic — both API keys (sk-ant-api03-…) and OAuth
                // access tokens (sk-ant-oat01-…) share the "sk-ant-" prefix.
                const accountType: "oauth" | "api_key" = tokens.tokenType === "Bearer" ? "oauth" : "api_key";

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

              // 2. Legacy credentials file (only if no usable compound account was loaded)
              if (accounts.length === 0) {
                try {
                  const creds = JSON.parse((fs as typeof import("fs")).readFileSync(legacyCredPath, "utf8")) as {
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
                  // no-op: file absent or invalid
                }
              }

              // 3. Env var — only use as fallback when no OAuth accounts are available.
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
                return buildLoggedClaudeError(401, "No Anthropic credentials found");
              }

              // Sync in-memory runtime state with current token material.
              for (const account of accounts) {
                const state = getOrCreateRuntimeState(account.key);
                const tokenChanged =
                  state.lastToken !== account.token || state.lastRefreshToken !== account.refreshToken;
                if (tokenChanged) {
                  if (state.permanentlyDisabled) {
                    logger.always(`[proxy] account=${account.label} credentials changed, re-enabling`);
                  }
                  state.coolingUntil = undefined;
                  state.backoffLevel = 0;
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
                const reauthMsg = formatReauthMessage(accounts.map((account) => account.label));
                tracer?.setError("authentication_error", reauthMsg);
                tracer?.end(401, Date.now() - requestStartTime);
                return buildLoggedClaudeError(401, reauthMsg);
              }

              // Order accounts based on the configured strategy.
              // - fill-first: always start with the primary account;
              //   only fall over when the primary is cooling down (429/401).
              // - round-robin: rotate the starting index on every request
              //   so traffic is spread evenly across accounts.
              const orderedAccounts = [...enabledAccounts];
              // Reset round-robin index when account list size changes
              // (e.g. a new account was authenticated while the proxy was running).
              // Only applies to round-robin; fill-first uses primaryAccountIndex
              // as a sticky primary and should not be disrupted.
              if (accountStrategy === "round-robin" && orderedAccounts.length !== lastKnownAccountCount) {
                primaryAccountIndex = 0;
                lastKnownAccountCount = orderedAccounts.length;
              }
              if (orderedAccounts.length > 1) {
                if (accountStrategy === "round-robin") {
                  // Advance the index on every request for even distribution
                  const idx = primaryAccountIndex % orderedAccounts.length;
                  primaryAccountIndex = (primaryAccountIndex + 1) % orderedAccounts.length;
                  if (idx > 0) {
                    const head = orderedAccounts.splice(0, idx);
                    orderedAccounts.push(...head);
                  }
                } else {
                  // fill-first (default): clamp primaryAccountIndex
                  const idx = primaryAccountIndex % orderedAccounts.length;
                  if (idx > 0) {
                    const head = orderedAccounts.splice(0, idx);
                    orderedAccounts.push(...head);
                  }
                }
              }

              let lastError: unknown;
              let sawRateLimit = false;
              let sawNetworkError = false;
              let sawTransientFailure = false;
              let invalidRequestFailure: {
                status: number;
                body: string;
                contentType?: string;
              } | null = null;
              let authFailureMessage: string | null = null;
              const normalizedAnthropicBody = normalizeClaudeRequestForAnthropic(body);
              const bodyStr = JSON.stringify(normalizedAnthropicBody);
              const requestStart = Date.now();
              const toolCount = Array.isArray(body.tools) ? body.tools.length : 0;
              const url = "https://api.anthropic.com/v1/messages?beta=true";
              const clientHeaders = ctx.headers ?? {};
              const clientSnapshotBody = extractSnapshotBody(body);
              const isClaudeClientRequest = isLikelyClaudeClient(clientHeaders, clientSnapshotBody);
              let attemptNumber = 0;

              // OTel: account selection span (covers the whole selection phase)
              const acctSelectionSpan = tracer?.startAccountSelection();

              for (const account of orderedAccounts) {
                const accountState = getOrCreateRuntimeState(account.key);
                if (accountState.coolingUntil && accountState.coolingUntil > Date.now()) {
                  continue;
                }

                const logAttempt = (
                  status: number,
                  errorType?: string,
                  errorMessage?: string,
                  extra?: {
                    inputTokens?: number;
                    outputTokens?: number;
                    cacheCreationTokens?: number;
                    cacheReadTokens?: number;
                  },
                ): void => {
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
                    ...(extra?.inputTokens !== undefined ? { inputTokens: extra.inputTokens } : {}),
                    ...(extra?.outputTokens !== undefined ? { outputTokens: extra.outputTokens } : {}),
                    ...(extra?.cacheCreationTokens !== undefined
                      ? { cacheCreationTokens: extra.cacheCreationTokens }
                      : {}),
                    ...(extra?.cacheReadTokens !== undefined ? { cacheReadTokens: extra.cacheReadTokens } : {}),
                    ...(traceCtx ? { traceId: traceCtx.traceId, spanId: traceCtx.spanId } : {}),
                  });
                };

                // OTel: record account selection and start upstream attempt span
                attemptNumber++;
                if (tracer) {
                  // End the selection span on first actual attempt
                  if (attemptNumber === 1 && acctSelectionSpan) {
                    tracer.setAccountSelection({
                      strategy: accountStrategy,
                      accountsTotal: accounts.length,
                      accountsHealthy: enabledAccounts.length,
                      selectedAccount: account.label,
                      accountType: account.type,
                    });
                    acctSelectionSpan.end();
                  }
                }
                let upstreamSpan: import("@opentelemetry/api").Span | undefined;

                // Auto-refresh expiring access tokens once before making the request.
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
                    if (accountState.consecutiveRefreshFailures >= MAX_CONSECUTIVE_REFRESH_FAILURES) {
                      await disableAccountUntilReauth(account, accountState);
                      authFailureMessage = formatReauthMessage(account.label);
                      logAttempt(401, "authentication_error", String(lastError));
                      continue;
                    }
                  }
                }

                const isOAuth = account.type === "oauth";
                const snapshot = isOAuth
                  ? await maybeRefreshClaudeSnapshot(account.label, account.key, clientHeaders, bodyStr)
                  : null;

                // Decision 6: Passthrough client headers, fill gaps only.
                // Start with a copy of incoming client headers, then set
                // defaults for anything the client didn't send. Always
                // override auth + content-type.
                const headers: Record<string, string> = {};
                for (const [hk, hv] of Object.entries(clientHeaders)) {
                  const lower = hk.toLowerCase();
                  if (typeof hv === "string" && !BLOCKED_UPSTREAM_HEADERS.has(lower)) {
                    headers[lower] = hv;
                  }
                }

                // Always set (override) — auth and content-type are proxy-controlled
                headers["content-type"] = "application/json";
                if (isOAuth) {
                  headers["authorization"] = `Bearer ${account.token}`;
                  delete headers["x-api-key"];
                } else {
                  headers["x-api-key"] = account.token;
                  delete headers["authorization"];
                }

                // Apply header snapshot defaults for OAuth accounts
                if (isOAuth) {
                  applySnapshotHeaders(headers, snapshot);
                }

                // Hard defaults for anything still missing
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
                if (!headers["accept"]) {
                  headers["accept"] = "application/json";
                }

                // Manage anthropic-beta header based on auth type.
                // OAuth requires specific betas; API-key must NOT carry them.
                if (isOAuth) {
                  const betaSeed = isClaudeClientRequest
                    ? (headers["anthropic-beta"] ?? "")
                    : (clientHeaders["anthropic-beta"] ?? "");
                  const existing = new Set(
                    betaSeed
                      .split(",")
                      .map((s: string) => s.trim())
                      .filter(Boolean),
                  );
                  for (const beta of isClaudeClientRequest ? CLAUDE_CODE_OAUTH_BETAS : NON_CLAUDE_OAUTH_BETAS) {
                    existing.add(beta);
                  }
                  headers["anthropic-beta"] = [...existing].join(",");
                } else {
                  // Strip OAuth-specific betas that may have leaked from client
                  const cleaned = (headers["anthropic-beta"] ?? "")
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter((s: string) => s && !CLAUDE_CODE_OAUTH_BETAS.includes(s as never))
                    .join(",");
                  if (cleaned) {
                    headers["anthropic-beta"] = cleaned;
                  } else {
                    delete headers["anthropic-beta"];
                  }
                }

                // Polyfill request body for ALL OAuth accounts.
                // Anthropic requires metadata.user_id and billing headers
                // for OAuth — not just Claude Code clients.
                const shouldPolyfillBody = isOAuth;
                const buildUpstreamBody = (token: string) =>
                  shouldPolyfillBody
                    ? polyfillOAuthBody(bodyStr, token, snapshot, headers["x-claude-code-session-id"])
                    : { bodyStr };
                const polyfilledBody = buildUpstreamBody(account.token);
                if (isOAuth && polyfilledBody.sessionId && !headers["x-claude-code-session-id"]) {
                  headers["x-claude-code-session-id"] = polyfilledBody.sessionId;
                }
                const finalBodyStr = polyfilledBody.bodyStr;

                logger.always(`[proxy] → account=${account.label} (${account.type})`);
                recordAttempt(account.label, account.type);

                // Log full request for debugging (written to ~/.neurolink/logs/proxy-debug-*.jsonl)
                const fetchStartMs = Date.now();

                // OTel: start upstream attempt span and inject trace headers
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
                  const traceHeaders = tracer.getTraceHeaders();
                  Object.assign(headers, traceHeaders);
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
                  // Decision 8: Network errors — immediate rotation, no cooldown
                  sawNetworkError = true;
                  recordAttemptError(account.label, account.type, 502);
                  const errorCode = getErrorCode(fetchErr) ?? "unknown";
                  const errorMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
                  lastError = errorMessage;
                  logger.always(
                    `[proxy] fetch error account=${account.label} code=${errorCode} (rotating): ${errorMessage}`,
                  );
                  logAttempt(502, "network_error", errorMessage);
                  tracer?.setError("network_error", errorMessage);
                  tracer?.recordRetry(account.label, "network_error");
                  upstreamSpan?.end();
                  upstreamSpan = undefined;
                  continue;
                }

                // Check 429 (with Retry-After + exponential backoff) → continue.
                if (response.status === 429) {
                  sawRateLimit = true;
                  const retryAfter = response.headers.get("retry-after");
                  let cooldownMs = 0;
                  if (retryAfter) {
                    const seconds = parseInt(retryAfter, 10);
                    if (!Number.isNaN(seconds)) {
                      cooldownMs = seconds * 1000;
                    } else {
                      const date = new Date(retryAfter);
                      if (!Number.isNaN(date.getTime())) {
                        cooldownMs = Math.max(date.getTime() - Date.now(), 1000);
                      }
                    }
                  }
                  const level = accountState.backoffLevel;
                  const baseCooldown = cooldownMs > 0 ? cooldownMs : RATE_LIMIT_BACKOFF_BASE_MS;
                  const backoffMs = Math.min(baseCooldown * 2 ** level, RATE_LIMIT_BACKOFF_CAP_MS);
                  accountState.coolingUntil = Date.now() + backoffMs;
                  accountState.backoffLevel += 1;
                  advancePrimaryIfCurrent(account.key, enabledAccounts.length, orderedAccounts[0]?.key);
                  recordAttemptError(account.label, account.type, 429);
                  recordCooldown(account.label, account.type, accountState.coolingUntil, accountState.backoffLevel);
                  lastError = await response.text();
                  logger.always(
                    `[proxy] ← 429 account=${account.label} backoff-level=${accountState.backoffLevel} cooldown=${Math.round(backoffMs / 1000)}s`,
                  );
                  logAttempt(429, "rate_limit_error", String(lastError));
                  tracer?.setError("rate_limit_error", String(lastError).slice(0, 500));
                  tracer?.recordRetry(account.label, "rate_limit");
                  upstreamSpan?.end();
                  upstreamSpan = undefined;
                  continue;
                }

                // On 401 for refreshable OAuth: refresh token and retry before failing over.
                if (response.status === 401 && account.type === "oauth" && account.refreshToken) {
                  recordAttemptError(account.label, account.type, 401);
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
                      lastError = authRetryError;
                      logger.always(`[proxy] ⚠ account=${account.label} refresh failed on attempt ${authRetry + 1}`);
                      if (accountState.consecutiveRefreshFailures >= MAX_CONSECUTIVE_REFRESH_FAILURES) {
                        await disableAccountUntilReauth(account, accountState);
                        authFailureMessage = formatReauthMessage(account.label);
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
                      const retryResp = await fetch(url, {
                        method: "POST",
                        headers,
                        body: buildUpstreamBody(account.token).bodyStr,
                        signal: AbortSignal.timeout(UPSTREAM_FETCH_TIMEOUT_MS),
                      });
                      if (retryResp.ok) {
                        authRetrySucceeded = true;
                        accountState.consecutiveRefreshFailures = 0;
                        accountState.backoffLevel = 0;
                        accountState.coolingUntil = undefined;
                        logger.always(`[proxy] ← 200 account=${account.label} (after ${authRetry + 1} refresh(es))`);
                        // Final success is recorded only once the response path
                        // that reaches the client is fully determined.
                        // Capture quota headers after successful auth-retry

                        {
                          const retryQuota = parseQuotaHeaders(retryResp.headers);
                          if (retryQuota) {
                            saveAccountQuota(account.label, retryQuota).catch(() => {});
                          }
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
                                const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
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
                          // OTel: pipe auth-retry stream through SSE interceptor
                          let retryClientStream: ReadableStream<Uint8Array> = retryStream;
                          if (tracer) {
                            try {
                              const { stream: retryInterceptor, telemetry: retryTelemetry } = createSSEInterceptor();
                              retryClientStream = retryStream.pipeThrough(retryInterceptor);
                              const capturedTracer2 = tracer;
                              const capturedUpstreamSpan2 = upstreamSpan;
                              const capturedRetryResp = retryResp;
                              const capturedRetryRequestBytes = finalBodyStr.length;
                              const capturedAccountLabel2 = account.label;
                              retryTelemetry
                                .then((data) => {
                                  capturedTracer2.setUsage({
                                    inputTokens: data.usage.inputTokens,
                                    outputTokens: data.usage.outputTokens,
                                    cacheCreationTokens: data.usage.cacheCreationInputTokens,
                                    cacheReadTokens: data.usage.cacheReadInputTokens,
                                  });
                                  capturedTracer2.logStreamEvents(data.events);
                                  capturedTracer2.logUpstreamResponseHeaders(
                                    Object.fromEntries([...capturedRetryResp.headers.entries()]),
                                  );
                                  capturedTracer2.recordMetrics();
                                  capturedTracer2.recordBodySizes(capturedRetryRequestBytes, data.totalBytesReceived);
                                  capturedUpstreamSpan2?.end();
                                  capturedTracer2.end(200, Date.now() - requestStartTime);
                                  recordFinalSuccess(capturedAccountLabel2, account.type);

                                  // Deferred JSONL log with token usage (auth-retry streaming)
                                  logFinalRequest(200, capturedAccountLabel2, account.type, undefined, undefined, {
                                    inputTokens: data.usage.inputTokens,
                                    outputTokens: data.usage.outputTokens,
                                    cacheCreationTokens: data.usage.cacheCreationInputTokens,
                                    cacheReadTokens: data.usage.cacheReadInputTokens,
                                  });
                                })
                                .catch((err) => {
                                  capturedTracer2.setError(
                                    "stream_error",
                                    err instanceof Error ? err.message : String(err),
                                  );
                                  capturedUpstreamSpan2?.end();
                                  capturedTracer2.end(500, Date.now() - requestStartTime);
                                  recordFinalError(500, capturedAccountLabel2, account.type);
                                  logFinalRequest(
                                    500,
                                    capturedAccountLabel2,
                                    account.type,
                                    "stream_error",
                                    err instanceof Error ? err.message : String(err),
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
                          for (const h of [
                            "retry-after",
                            "anthropic-ratelimit-requests-remaining",
                            "anthropic-ratelimit-requests-limit",
                            "anthropic-ratelimit-tokens-remaining",
                            "anthropic-ratelimit-tokens-limit",
                          ]) {
                            const val = retryResp.headers.get(h);
                            if (val) {
                              responseHeaders[h] = val;
                            }
                          }
                          return new Response(retryClientStream, {
                            status: retryResp.status,
                            headers: responseHeaders,
                          });
                        }
                        // OTel: non-streaming auth-retry success
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
                          logFinalRequest(retryResp.status, account.label, account.type, undefined, undefined, {
                            inputTokens: retryUsage?.input_tokens,
                            outputTokens: retryUsage?.output_tokens,
                            cacheCreationTokens: retryUsage?.cache_creation_input_tokens,
                            cacheReadTokens: retryUsage?.cache_read_input_tokens,
                          });
                        } else {
                          upstreamSpan?.end();
                          recordFinalSuccess(account.label, account.type);
                          logFinalRequest(retryResp.status, account.label, account.type);
                        }
                        return retryJson;
                      }

                      const retryStatus = retryResp.status;
                      const retryBody = await retryResp.text();
                      authRetryError = `retry ${authRetry + 1}/${MAX_AUTH_RETRIES} failed with status ${retryStatus}`;
                      lastError = retryBody;
                      logger.debug(
                        `[proxy] retry ${authRetry + 1} failed: ${retryStatus} ${retryBody.substring(0, 120)}`,
                      );
                      recordAttemptError(account.label, account.type, retryStatus);

                      if (retryStatus === 429) {
                        sawRateLimit = true;
                        const retryAfter = retryResp.headers.get("retry-after");
                        const parsedRetryAfter = parseInt(retryAfter ?? "", 10);
                        const cooldownMs = Number.isNaN(parsedRetryAfter)
                          ? 60_000
                          : Math.max(1, parsedRetryAfter) * 1000;
                        accountState.coolingUntil = Date.now() + cooldownMs;
                        advancePrimaryIfCurrent(account.key, enabledAccounts.length, orderedAccounts[0]?.key);
                        recordCooldown(
                          account.label,
                          account.type,
                          accountState.coolingUntil,
                          accountState.backoffLevel,
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
                        // Decision 8: No cooldown for transient errors — rotate immediately
                        sawTransientFailure = true;
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
                        return JSON.parse(retryBody);
                      } catch {
                        logFinalRequest(
                          retryStatus,
                          account.label,
                          account.type,
                          "api_error",
                          summarizeErrorMessage(retryBody),
                        );
                        return buildClaudeError(retryStatus, retryBody);
                      }
                    } catch (retryFetchErr) {
                      // Decision 8: No cooldown for network errors — rotate immediately
                      sawNetworkError = true;
                      recordAttemptError(account.label, account.type, 502);
                      const message = retryFetchErr instanceof Error ? retryFetchErr.message : String(retryFetchErr);
                      authRetryError = `network error on retry ${authRetry + 1}: ${message}`;
                      lastError = authRetryError;
                      logger.debug(`[proxy] ${authRetryError}`);
                      break;
                    }
                  }

                  if (!authRetrySucceeded) {
                    if (!accountState.permanentlyDisabled) {
                      if (!accountState.coolingUntil || accountState.coolingUntil <= Date.now()) {
                        accountState.coolingUntil = Date.now() + AUTH_COOLDOWN_MS;
                      }
                      recordCooldown(account.label, account.type, accountState.coolingUntil, accountState.backoffLevel);
                    }
                    lastError = authRetryError;
                    logger.always(`[proxy] ⚠ account=${account.label} auth retries exhausted, cooldown=5min`);
                    logAttempt(401, "authentication_error", authRetryError);
                    tracer?.setError("authentication_error", authRetryError);
                    tracer?.recordRetry(account.label, "auth_exhausted");
                    upstreamSpan?.end();
                    upstreamSpan = undefined;
                    continue;
                  }
                }

                if (!response.ok) {
                  const errBody = await response.text();

                  const errRespHeaders: Record<string, string> = {};
                  response.headers.forEach((v, k) => {
                    errRespHeaders[k] = v;
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

                  // Upstream invalid_request_error responses are not retried on the
                  // same Anthropic account, but may still be handed to fallback providers.
                  if (isInvalidRequestError(response.status, errBody)) {
                    logger.always(`[proxy] ← ${response.status} upstream invalid_request_error`);
                    logAttempt(response.status, "invalid_request_error", summarizeErrorMessage(errBody));
                    tracer?.setError("invalid_request_error", summarizeErrorMessage(errBody));
                    invalidRequestFailure = {
                      status: response.status,
                      body: errBody,
                      contentType: errRespHeaders["content-type"],
                    };
                    lastError = summarizeErrorMessage(errBody);
                    upstreamSpan?.end();
                    upstreamSpan = undefined;
                    break;
                  }

                  // Auth failures for OAuth accounts without refresh token.
                  if (
                    (response.status === 401 || response.status === 402 || response.status === 403) &&
                    account.type === "oauth" &&
                    !account.refreshToken
                  ) {
                    recordAttemptError(account.label, account.type, response.status);
                    accountState.consecutiveRefreshFailures += 1;
                    accountState.coolingUntil = Date.now() + AUTH_COOLDOWN_MS;
                    recordCooldown(account.label, account.type, accountState.coolingUntil, accountState.backoffLevel);
                    if (accountState.consecutiveRefreshFailures >= MAX_CONSECUTIVE_REFRESH_FAILURES) {
                      await disableAccountUntilReauth(account, accountState);
                    }
                    authFailureMessage = formatReauthMessage(account.label);
                    logger.always(`[proxy] ← ${response.status} account=${account.label} cooldown=5min`);
                    lastError = errBody;
                    logAttempt(response.status, "authentication_error", summarizeErrorMessage(errBody));
                    tracer?.setError("authentication_error", summarizeErrorMessage(errBody));
                    tracer?.recordRetry(account.label, "auth_no_refresh");
                    upstreamSpan?.end();
                    upstreamSpan = undefined;
                    continue;
                  }

                  // Auth failures for API-key accounts.
                  if (
                    (response.status === 401 || response.status === 402 || response.status === 403) &&
                    account.type === "api_key"
                  ) {
                    recordAttemptError(account.label, account.type, response.status);
                    authFailureMessage =
                      "Authentication failed for Anthropic API key credentials. Update ANTHROPIC_API_KEY or re-login with OAuth.";
                    accountState.coolingUntil = Date.now() + AUTH_COOLDOWN_MS;
                    recordCooldown(account.label, account.type, accountState.coolingUntil, accountState.backoffLevel);
                    logger.always(`[proxy] ← ${response.status} account=${account.label} cooldown=5min`);
                    lastError = errBody;
                    logAttempt(response.status, "authentication_error", summarizeErrorMessage(errBody));
                    tracer?.setError("authentication_error", summarizeErrorMessage(errBody));
                    tracer?.recordRetry(account.label, "auth_api_key");
                    upstreamSpan?.end();
                    upstreamSpan = undefined;
                    continue;
                  }

                  // 404 is generally model/account specific; return immediately (no cooldown per Decision 8).
                  if (response.status === 404) {
                    recordFinalError(response.status, account.label, account.type);
                    logger.always(`[proxy] ← 404 account=${account.label}`);
                    logAttempt(404, "not_found_error", summarizeErrorMessage(errBody));
                    tracer?.setError("not_found_error", summarizeErrorMessage(errBody));
                    upstreamSpan?.end();
                    tracer?.end(404, Date.now() - requestStartTime);
                    try {
                      const parsedError = JSON.parse(errBody);
                      logFinalRequest(
                        404,
                        account.label,
                        account.type,
                        "not_found_error",
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
                        responseStatus: 404,
                        durationMs: Date.now() - requestStartTime,
                      });
                      return parsedError;
                    } catch {
                      logFinalRequest(
                        404,
                        account.label,
                        account.type,
                        "not_found_error",
                        summarizeErrorMessage(errBody),
                      );
                      const clientError = buildClaudeError(404, errBody);
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
                        responseStatus: 404,
                        durationMs: Date.now() - requestStartTime,
                      });
                      return clientError;
                    }
                  }

                  // Decision 8: Transient upstream failures — immediate rotation, NO cooldown.
                  if (isTransientHttpFailure(response.status, errBody)) {
                    recordAttemptError(account.label, account.type, response.status);
                    sawTransientFailure = true;
                    // No cooldown for transient errors (502, 503, etc.) — rotate immediately
                    logger.always(`[proxy] ← ${response.status} account=${account.label} (transient, rotating)`);
                    lastError = errBody;
                    logAttempt(response.status, "api_error", summarizeErrorMessage(errBody));
                    tracer?.setError("transient_error", summarizeErrorMessage(errBody));
                    tracer?.recordRetry(account.label, "transient");
                    upstreamSpan?.end();
                    upstreamSpan = undefined;
                    continue;
                  }

                  // Other non-ok errors → return as-is.
                  recordFinalError(response.status, account.label, account.type);
                  logger.always(`[proxy] ← ${response.status} account=${account.label}`);
                  logger.debug(`[claude-proxy] error body: ${errBody.substring(0, 200)}`);
                  logAttempt(response.status, "api_error", summarizeErrorMessage(errBody));
                  tracer?.setError("api_error", summarizeErrorMessage(errBody));
                  upstreamSpan?.end();
                  tracer?.end(response.status, Date.now() - requestStartTime);
                  try {
                    const parsedError = JSON.parse(errBody);
                    logFinalRequest(
                      response.status,
                      account.label,
                      account.type,
                      "api_error",
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
                      responseStatus: response.status,
                      durationMs: Date.now() - requestStartTime,
                    });
                    return parsedError;
                  } catch {
                    logFinalRequest(
                      response.status,
                      account.label,
                      account.type,
                      "api_error",
                      summarizeErrorMessage(errBody),
                    );
                    const clientError = buildClaudeError(response.status, errBody);
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
                      responseStatus: response.status,
                      durationMs: Date.now() - requestStartTime,
                    });
                    return clientError;
                  }
                }

                // Success path.
                accountState.backoffLevel = 0;
                accountState.coolingUntil = undefined;
                accountState.consecutiveRefreshFailures = 0;
                logger.always(`[proxy] ← ${response.status} account=${account.label}`);
                // NOTE: logAttempt is deferred below so we can include token
                // usage.  For streaming, the SSE interceptor callback logs it;
                // for non-streaming, we log after JSON parsing.

                // Capture quota/utilisation headers (fire-and-forget).
                const quota = parseQuotaHeaders(response.headers);
                if (quota) {
                  saveAccountQuota(account.label, quota).catch(() => {
                    // Non-fatal: quota persistence is best-effort
                  });
                }

                const respHeaders: Record<string, string> = {};
                response.headers.forEach((v, k) => {
                  respHeaders[k] = v;
                });
                tracer?.logUpstreamResponseHeaders(respHeaders);

                if (body.stream) {
                  // Bootstrap retry: read first chunk to verify stream is valid.
                  if (response.body) {
                    const reader = response.body.getReader();
                    const firstChunk = await reader.read();

                    if (firstChunk.done || !firstChunk.value || firstChunk.value.length === 0) {
                      // Empty stream — retry with next account.
                      reader.cancel();
                      accountState.coolingUntil = Date.now() + 10_000;
                      recordCooldown(account.label, account.type, accountState.coolingUntil, accountState.backoffLevel);
                      logger.always(`[proxy] ← empty stream from account=${account.label}, trying next`);
                      tracer?.recordRetry(account.label, "empty_stream");
                      upstreamSpan?.end();
                      upstreamSpan = undefined;
                      continue;
                    }

                    // Stream is valid — create a new ReadableStream with first chunk prepended.
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
                          const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr);
                          logger.always(`[proxy] mid-stream error account=${account.label}: ${errMsg}`);
                          logStreamError({
                            timestamp: new Date().toISOString(),
                            requestId: ctx.requestId,
                            account: account.label,
                            model: body.model,
                            errorMessage: errMsg,
                            durationMs: Date.now() - fetchStartMs,
                          });
                          // Send SSE error event so the client gets a meaningful error
                          // instead of a raw connection drop
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

                    // OTel: pipe stream through SSE interceptor for telemetry extraction.
                    // The interceptor passes all bytes through unmodified and resolves
                    // its telemetry promise when the stream finishes.
                    const { stream: clientCaptureStream, capture: clientCapture } = createRawStreamCapture();
                    let streamSource: ReadableStream<Uint8Array> = remainingStream;
                    if (tracer) {
                      try {
                        const { stream: interceptor, telemetry } = createSSEInterceptor({ captureRawText: true });
                        streamSource = streamSource.pipeThrough(interceptor);

                        // Capture refs in const variables for the async closure —
                        // loop variables (upstreamSpan, response) will change on next iteration,
                        // and TypeScript needs the narrowed type for tracer.
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

                            // Extract rate limits from response headers
                            const rateLimit5h = parseFloat(
                              capturedResponse.headers.get("anthropic-ratelimit-unified-5h-utilization") ?? "",
                            );
                            const rateLimit7d = parseFloat(
                              capturedResponse.headers.get("anthropic-ratelimit-unified-7d-utilization") ?? "",
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
                            capturedTracer.recordBodySizes(capturedRequestBytes, data.totalBytesReceived);
                            capturedUpstreamSpan?.end();
                            capturedTracer.end(200, Date.now() - requestStartTime);
                            recordFinalSuccess(capturedAccountLabel, account.type);

                            // Deferred JSONL log with token usage + traceId
                            // (streaming: tokens only available after SSE stream finishes)
                            logFinalRequest(200, capturedAccountLabel, account.type, undefined, undefined, {
                              inputTokens: data.usage.inputTokens,
                              outputTokens: data.usage.outputTokens,
                              cacheCreationTokens: data.usage.cacheCreationInputTokens,
                              cacheReadTokens: data.usage.cacheReadInputTokens,
                            });
                            logProxyBody({
                              phase: "upstream_response",
                              headers: respHeaders,
                              body: data.rawText ?? "",
                              bodySize: data.totalBytesReceived,
                              contentType: respHeaders["content-type"] ?? "text/event-stream",
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
                          .catch((err) => {
                            capturedTracer.setError("stream_error", err instanceof Error ? err.message : String(err));
                            capturedUpstreamSpan?.end();
                            capturedTracer.end(500, Date.now() - requestStartTime);
                            recordFinalError(500, capturedAccountLabel, account.type);

                            // Log the streaming error in JSONL
                            logFinalRequest(
                              500,
                              capturedAccountLabel,
                              account.type,
                              "stream_error",
                              err instanceof Error ? err.message : String(err),
                            );
                          });
                      } catch {
                        // Interceptor attachment failed after stream setup; response handling continues.
                      }
                    } else {
                      // No tracer — still intercept stream for JSONL token logging
                      upstreamSpan?.end();
                      try {
                        const { stream: noTracerInterceptor, telemetry: noTracerTelemetry } = createSSEInterceptor({
                          captureRawText: true,
                        });
                        streamSource = streamSource.pipeThrough(noTracerInterceptor);
                        const capturedAccountLabel = account.label;
                        Promise.all([noTracerTelemetry, clientCapture])
                          .then(([data, clientBody]) => {
                            recordFinalSuccess(capturedAccountLabel, account.type);
                            logFinalRequest(200, capturedAccountLabel, account.type, undefined, undefined, {
                              inputTokens: data.usage.inputTokens,
                              outputTokens: data.usage.outputTokens,
                              cacheCreationTokens: data.usage.cacheCreationInputTokens,
                              cacheReadTokens: data.usage.cacheReadInputTokens,
                            });
                            logProxyBody({
                              phase: "upstream_response",
                              headers: respHeaders,
                              body: data.rawText ?? "",
                              bodySize: data.totalBytesReceived,
                              contentType: respHeaders["content-type"] ?? "text/event-stream",
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
                        // SSE interceptor creation failed — log without tokens
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
                    // Forward rate limit headers from Anthropic.
                    const responseHeaders: Record<string, string> = {
                      "content-type": "text/event-stream",
                      "cache-control": "no-cache",
                      connection: "keep-alive",
                    };
                    for (const h of [
                      "retry-after",
                      "anthropic-ratelimit-requests-remaining",
                      "anthropic-ratelimit-requests-limit",
                      "anthropic-ratelimit-tokens-remaining",
                      "anthropic-ratelimit-tokens-limit",
                    ]) {
                      const val = response.headers.get(h);
                      if (val) {
                        responseHeaders[h] = val;
                      }
                    }

                    return new Response(clientStream, {
                      status: response.status,
                      headers: responseHeaders,
                    });
                  }
                  upstreamSpan?.end();
                  tracer?.setError("stream_error", "No response body from upstream");
                  tracer?.end(502, Date.now() - requestStartTime);
                  recordFinalError(502, account.label, account.type);
                  logFinalRequest(502, account.label, account.type, "stream_error", "No response body from upstream");
                  const clientError = buildClaudeError(502, "No response body from upstream");
                  logProxyBody({
                    phase: "client_response",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(clientError),
                    bodySize: Buffer.byteLength(JSON.stringify(clientError), "utf8"),
                    contentType: "application/json",
                    account: account.label,
                    accountType: account.type,
                    attempt: attemptNumber,
                    responseStatus: 502,
                    durationMs: Date.now() - requestStartTime,
                  });
                  return clientError;
                }

                // Non-streaming: return JSON directly.
                // OTel: extract usage from response JSON before returning.
                const responseText = await response.text();
                tracer?.logUpstreamResponseBody(responseText);
                logProxyBody({
                  phase: "upstream_response",
                  headers: respHeaders,
                  body: responseText,
                  bodySize: Buffer.byteLength(responseText, "utf8"),
                  contentType: respHeaders["content-type"] ?? "application/json",
                  account: account.label,
                  accountType: account.type,
                  attempt: attemptNumber,
                  responseStatus: response.status,
                  durationMs: Date.now() - fetchStartMs,
                });
                logProxyBody({
                  phase: "client_response",
                  headers: respHeaders,
                  body: responseText,
                  bodySize: Buffer.byteLength(responseText, "utf8"),
                  contentType: respHeaders["content-type"] ?? "application/json",
                  account: account.label,
                  accountType: account.type,
                  attempt: attemptNumber,
                  responseStatus: response.status,
                  durationMs: Date.now() - requestStartTime,
                });
                const responseJson = JSON.parse(responseText);
                if (tracer && responseJson && typeof responseJson === "object") {
                  const usage = (responseJson as Record<string, unknown>).usage as Record<string, number> | undefined;
                  if (usage) {
                    tracer.setUsage({
                      inputTokens: usage.input_tokens ?? 0,
                      outputTokens: usage.output_tokens ?? 0,
                      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
                      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
                    });

                    // Extract rate limits from response headers
                    const rateLimit5h = parseFloat(
                      response.headers.get("anthropic-ratelimit-unified-5h-utilization") ?? "",
                    );
                    const rateLimit7d = parseFloat(
                      response.headers.get("anthropic-ratelimit-unified-7d-utilization") ?? "",
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
                  logFinalRequest(response.status, account.label, account.type, undefined, undefined, {
                    inputTokens: usage?.input_tokens,
                    outputTokens: usage?.output_tokens,
                    cacheCreationTokens: usage?.cache_creation_input_tokens,
                    cacheReadTokens: usage?.cache_read_input_tokens,
                  });
                } else {
                  upstreamSpan?.end();
                  // No tracer — still extract usage from response JSON for JSONL logging
                  const noTracerUsage =
                    responseJson && typeof responseJson === "object"
                      ? ((responseJson as Record<string, unknown>).usage as Record<string, number> | undefined)
                      : undefined;
                  recordFinalSuccess(account.label, account.type);
                  logFinalRequest(response.status, account.label, account.type, undefined, undefined, {
                    inputTokens: noTracerUsage?.input_tokens,
                    outputTokens: noTracerUsage?.output_tokens,
                    cacheCreationTokens: noTracerUsage?.cache_creation_input_tokens,
                    cacheReadTokens: noTracerUsage?.cache_read_input_tokens,
                  });
                }
                return responseJson;
              }

              // OTel: end account selection span if all accounts were skipped
              if (attemptNumber === 0) {
                acctSelectionSpan?.end();
              }

              // All accounts exhausted — compute earliest recovery time.
              const earliestRecovery = orderedAccounts.reduce((min, account) => {
                const coolingUntil = getOrCreateRuntimeState(account.key).coolingUntil;
                return coolingUntil ? Math.min(min, coolingUntil) : min;
              }, Infinity);
              const retryAfterSec = Number.isFinite(earliestRecovery)
                ? Math.max(1, Math.ceil((earliestRecovery - Date.now()) / 1000))
                : 60;

              // Try fallback chain (alternative providers)
              const chain = modelRouter?.getFallbackChain() ?? [];
              for (const fallback of chain) {
                const availability = await ProviderHealthChecker.checkFallbackProviderAvailability(
                  fallback.provider,
                  fallback.model,
                );

                if (!availability.available) {
                  logger.debug(
                    `[proxy] skipping fallback ${fallback.provider}/${fallback.model}: ${availability.reason ?? "provider unavailable"}`,
                  );
                  continue;
                }

                try {
                  logger.always(`[proxy] fallback → ${fallback.provider}/${fallback.model}`);
                  const parsed = parseClaudeRequest(body);
                  const opts = buildProxyFallbackOptions(parsed, {
                    provider: fallback.provider,
                    model: fallback.model,
                  });
                  if (body.stream) {
                    const streamResult = await ctx.neurolink.stream(
                      opts as unknown as Parameters<typeof ctx.neurolink.stream>[0],
                    );
                    const serializer = new ClaudeStreamSerializer(body.model, 0);
                    async function* sseGenerator(): AsyncIterable<string> {
                      for (const frame of serializer.start()) {
                        yield frame;
                      }
                      let collectedText = "";
                      for await (const chunk of streamResult.stream) {
                        const text = extractText(chunk);
                        if (text) {
                          collectedText += text;
                          for (const frame of serializer.pushDelta(text)) {
                            yield frame;
                          }
                        }
                      }
                      // Emit tool_use blocks if model wants to call tools
                      const toolCalls = streamResult.toolCalls ?? [];
                      if (!hasTranslatedOutput(collectedText, toolCalls)) {
                        throw new Error(
                          `Translated provider ${fallback.provider}/${fallback.model} returned no content or tool calls`,
                        );
                      }
                      if (toolCalls.length) {
                        for (const tc of toolCalls) {
                          const toolName =
                            (tc as { toolName?: string }).toolName ?? (tc as { name?: string }).name ?? "unknown";
                          for (const frame of serializer.pushToolUse(
                            generateToolUseId(),
                            toolName,
                            extractToolArgs(tc),
                          )) {
                            yield frame;
                          }
                        }
                      }
                      const reason = streamResult.finishReason ?? "end_turn";
                      const resolvedUsage = extractUsageFromStreamResult(streamResult.usage);
                      for (const frame of serializer.finish(resolvedUsage.output, reason)) {
                        yield frame;
                      }
                    }
                    tracer?.end(200, Date.now() - requestStartTime);
                    recordFinalSuccess();
                    logFinalRequest(200, "", fallback.provider);
                    return sseGenerator();
                  }
                  const streamResult = await ctx.neurolink.stream(
                    opts as unknown as Parameters<typeof ctx.neurolink.stream>[0],
                  );
                  let collectedText = "";
                  for await (const chunk of streamResult.stream) {
                    const text = extractText(chunk);
                    if (text) {
                      collectedText += text;
                    }
                  }
                  if (!hasTranslatedOutput(collectedText, streamResult.toolCalls)) {
                    throw new Error(
                      `Translated provider ${fallback.provider}/${fallback.model} returned no content or tool calls`,
                    );
                  }
                  const internal: InternalResult = {
                    content: collectedText,
                    model: streamResult.model,
                    finishReason: streamResult.finishReason ?? "end_turn",
                    reasoning: undefined,
                    usage: streamResult.usage ? extractUsageFromStreamResult(streamResult.usage) : undefined,
                    toolCalls: streamResult.toolCalls as InternalResult["toolCalls"],
                  };
                  tracer?.end(200, Date.now() - requestStartTime);
                  recordFinalSuccess();
                  const clientResponse = serializeClaudeResponse(internal, body.model);
                  logFinalRequest(200, "", fallback.provider, undefined, undefined, {
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
                } catch (fallbackErr) {
                  logger.debug(
                    `[proxy] fallback ${fallback.provider}/${fallback.model} failed: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
                  );
                }
              }

              // If no explicit fallback chain is configured, try SDK auto-provider fallback.
              // Skip auto-provider when all accounts are rate-limited — the client
              // (e.g. Claude Code) understands 429 + Retry-After and will retry on
              // its own. Silently routing to a different provider (e.g. OpenAI)
              // produces confusing errors like "insufficient_quota".
              if (chain.length === 0 && !sawRateLimit) {
                try {
                  logger.always("[proxy] fallback → auto-provider");
                  const parsed = parseClaudeRequest(body);
                  const opts = buildProxyFallbackOptions(parsed);
                  if (body.stream) {
                    const streamResult = await ctx.neurolink.stream(
                      opts as unknown as Parameters<typeof ctx.neurolink.stream>[0],
                    );
                    const serializer = new ClaudeStreamSerializer(body.model, 0);
                    async function* sseGenerator(): AsyncIterable<string> {
                      for (const frame of serializer.start()) {
                        yield frame;
                      }
                      let collectedText = "";
                      for await (const chunk of streamResult.stream) {
                        const text = extractText(chunk);
                        if (text) {
                          collectedText += text;
                          for (const frame of serializer.pushDelta(text)) {
                            yield frame;
                          }
                        }
                      }
                      // Emit tool_use blocks if model wants to call tools
                      const toolCalls = streamResult.toolCalls ?? [];
                      if (!hasTranslatedOutput(collectedText, toolCalls)) {
                        throw new Error("Translated provider auto-provider returned no content or tool calls");
                      }
                      if (toolCalls.length) {
                        for (const tc of toolCalls) {
                          const toolName =
                            (tc as { toolName?: string }).toolName ?? (tc as { name?: string }).name ?? "unknown";
                          for (const frame of serializer.pushToolUse(
                            generateToolUseId(),
                            toolName,
                            extractToolArgs(tc),
                          )) {
                            yield frame;
                          }
                        }
                      }
                      const reason = streamResult.finishReason ?? "end_turn";
                      const resolvedUsage = extractUsageFromStreamResult(streamResult.usage);
                      for (const frame of serializer.finish(resolvedUsage.output, reason)) {
                        yield frame;
                      }
                    }
                    tracer?.end(200, Date.now() - requestStartTime);
                    recordFinalSuccess();
                    logFinalRequest(200, "", "auto-provider");
                    return sseGenerator();
                  }
                  const streamResult = await ctx.neurolink.stream(
                    opts as unknown as Parameters<typeof ctx.neurolink.stream>[0],
                  );
                  let collectedText = "";
                  for await (const chunk of streamResult.stream) {
                    const text = extractText(chunk);
                    if (text) {
                      collectedText += text;
                    }
                  }
                  if (!hasTranslatedOutput(collectedText, streamResult.toolCalls)) {
                    throw new Error("Translated provider auto-provider returned no content or tool calls");
                  }
                  const internal: InternalResult = {
                    content: collectedText,
                    model: streamResult.model,
                    finishReason: streamResult.finishReason ?? "end_turn",
                    reasoning: undefined,
                    usage: streamResult.usage ? extractUsageFromStreamResult(streamResult.usage) : undefined,
                    toolCalls: streamResult.toolCalls as InternalResult["toolCalls"],
                  };
                  tracer?.end(200, Date.now() - requestStartTime);
                  recordFinalSuccess();
                  const clientResponse = serializeClaudeResponse(internal, body.model);
                  logFinalRequest(200, "", "auto-provider", undefined, undefined, {
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
                } catch (fallbackErr) {
                  logger.debug(
                    `[proxy] fallback auto-provider failed: ${
                      fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
                    }`,
                  );
                }
              }

              if (authFailureMessage && !sawRateLimit) {
                tracer?.setError("authentication_error", authFailureMessage);
                tracer?.end(401, Date.now() - requestStartTime);
                return buildLoggedClaudeError(401, authFailureMessage);
              }

              if (invalidRequestFailure) {
                tracer?.setError("invalid_request_error", summarizeErrorMessage(invalidRequestFailure.body));
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
                      "content-type": invalidRequestFailure.contentType ?? "application/json",
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
                  lastError instanceof Error ? lastError.message : String(lastError ?? "unknown")
                }`;
                tracer?.setError("transient_error", msg.slice(0, 500));
                tracer?.end(502, Date.now() - requestStartTime);
                return buildLoggedClaudeError(502, msg);
              }

              if (!sawRateLimit) {
                const msg = `All Anthropic accounts failed. Last error: ${
                  lastError instanceof Error ? lastError.message : String(lastError ?? "unknown")
                }`;
                tracer?.setError("all_accounts_failed", msg.slice(0, 500));
                tracer?.end(502, Date.now() - requestStartTime);
                return buildLoggedClaudeError(502, msg);
              }

              // All accounts AND all fallbacks exhausted — return 429 with Retry-After
              logger.always(`[proxy] all accounts rate-limited, retry in ${retryAfterSec}s`);
              const errorBody = buildClaudeError(
                429,
                `All accounts rate-limited. Earliest recovery in ${retryAfterSec}s.`,
                "overloaded_error",
              );
              tracer?.setError("rate_limit_error", `All accounts rate-limited. Retry in ${retryAfterSec}s.`);
              tracer?.end(429, Date.now() - requestStartTime);
              recordFinalError(429);
              logFinalRequest(
                429,
                "",
                "final",
                "rate_limit_error",
                `All accounts rate-limited. Retry in ${retryAfterSec}s.`,
              );
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
            } else {
              // ─── TRANSLATION MODE (Claude → Other Provider) ───────
              tracer?.setMode("full");
              // Parse into NeuroLink format, call generate/stream, serialize back
              const parsed = parseClaudeRequest(body);
              const attempts = buildProxyTranslationAttempts(
                {
                  provider: route.provider,
                  model: route.model,
                },
                modelRouter,
              );

              if (body.stream) {
                const serializer = new ClaudeStreamSerializer(body.model, 0);
                const KEEPALIVE_INTERVAL_MS = 15_000; // 15 seconds

                // Return a ReadableStream that emits SSE keep-alive comments
                // every ~15s independently of upstream chunk arrival, so
                // intermediaries don't drop the connection during stalls.
                const encoder = new TextEncoder();
                let translationKeepAliveTimer: ReturnType<typeof setInterval> | undefined;
                let translationCancelled = false;
                let translationSucceeded = false;
                let translatedModel: string | undefined;
                let finalStreamError = "No translation providers succeeded";
                // Hold a reference to the upstream async iterator so
                // we can abort it when the client disconnects.
                let upstreamIterator: AsyncIterator<unknown> | undefined;
                const translationStream = new ReadableStream<Uint8Array>({
                  async start(controller) {
                    // Emit start frames
                    for (const frame of serializer.start()) {
                      controller.enqueue(encoder.encode(frame));
                    }

                    // Keep-alive interval — fires even when upstream is stalled
                    translationKeepAliveTimer = setInterval(() => {
                      try {
                        controller.enqueue(encoder.encode(": keep-alive\n\n"));
                      } catch {
                        // Controller already closed — ignore
                      }
                    }, KEEPALIVE_INTERVAL_MS);

                    try {
                      for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
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
                            if (done) {
                              break;
                            }
                            if (translationCancelled) {
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
                            for (const tc of toolCalls) {
                              const toolName =
                                (tc as { toolName?: string }).toolName ?? (tc as { name?: string }).name ?? "unknown";
                              for (const frame of serializer.pushToolUse(
                                generateToolUseId(),
                                toolName,
                                extractToolArgs(tc),
                              )) {
                                controller.enqueue(encoder.encode(frame));
                              }
                            }
                          }

                          if (!translationCancelled) {
                            const reason = streamResult.finishReason ?? "end_turn";
                            const resolvedUsage = extractUsageFromStreamResult(streamResult.usage);
                            for (const frame of serializer.finish(resolvedUsage.output, reason)) {
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
                          finalStreamError = streamErr instanceof Error ? streamErr.message : String(streamErr);
                          if (collectedText.trim().length > 0) {
                            logger.always(`[proxy] mid-stream error (translation mode): ${finalStreamError}`);
                            const errorEvent = `event: error\ndata: ${JSON.stringify({ type: "error", error: { type: "api_error", message: `Upstream stream interrupted: ${finalStreamError}` } })}\n\n`;
                            controller.enqueue(encoder.encode(errorEvent));
                            return;
                          }
                          logger.debug(`[proxy] translation attempt ${attempt.label} failed: ${finalStreamError}`);
                        }
                      }

                      if (!translationCancelled) {
                        logger.always(`[proxy] mid-stream error (translation mode): ${finalStreamError}`);
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
                      // OTel: record model substitution if proxy routed to a different model
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
                    // Propagate cancellation to the upstream provider stream
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
                    logger.debug(`[proxy] translation attempt ${attempt.label} returned no content or tool calls`);
                    continue;
                  }

                  const internal: InternalResult = {
                    content: collectedText,
                    model: streamResult.model,
                    finishReason: streamResult.finishReason ?? "end_turn",
                    reasoning: undefined,
                    usage: streamResult.usage ? extractUsageFromStreamResult(streamResult.usage) : undefined,
                    toolCalls: streamResult.toolCalls as InternalResult["toolCalls"],
                  };
                  // OTel: record model substitution if proxy routed to a different model
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
                  lastAttemptError = attemptError instanceof Error ? attemptError.message : String(attemptError);
                  logger.debug(`[proxy] translation attempt ${attempt.label} failed: ${lastAttemptError}`);
                }
              }

              throw new Error(lastAttemptError);
            }
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            logger.error(`[claude-proxy] Generation error for ${body.model}: ${errMsg}`);
            tracer?.setError("generation_error", errMsg.slice(0, 500));
            tracer?.end(502, Date.now() - requestStartTime);
            return buildLoggedClaudeError(
              502,
              `Generation failed: ${error instanceof Error ? error.message : "unknown error"}`,
            );
          }
        },
        description: "Claude-compatible messages endpoint routed through NeuroLink",
        tags: ["claude-proxy", "messages"],
        streaming: { enabled: true, contentType: "text/event-stream" },
      },

      // =====================================================================
      // GET /v1/models -- List available models
      // =====================================================================
      {
        method: "GET",
        path: `${basePath}/v1/models`,
        handler: async (_ctx: ServerContext) => {
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
        description: "List available Claude models",
        tags: ["claude-proxy", "models"],
      },

      // =====================================================================
      // POST /v1/messages/count_tokens -- Token counting endpoint
      // =====================================================================
      {
        method: "POST",
        path: `${basePath}/v1/messages/count_tokens`,
        handler: async (ctx: ServerContext) => {
          const body = ctx.body as { model?: string; messages?: Array<{ content: unknown }> } | undefined;

          if (!body?.model || !body?.messages) {
            return buildClaudeError(400, "Missing required fields: model, messages");
          }

          // Simple estimation using character-to-token heuristic
          const text = body.messages
            .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
            .join(" ");

          return { input_tokens: Math.ceil(text.length / 4) };
        },
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
    coolingUntil: undefined,
    backoffLevel: 0,
    consecutiveRefreshFailures: 0,
    permanentlyDisabled: false,
  };
  accountRuntimeState.set(accountKey, initial);
  return initial;
}

async function disableAccountUntilReauth(account: ProxyPassthroughAccount, state: RuntimeAccountState): Promise<void> {
  state.permanentlyDisabled = true;
  state.coolingUntil = undefined;
  state.backoffLevel = 0;

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

function summarizeErrorMessage(message: string, maxLength: number = 180): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }
  return `${compact.slice(0, maxLength)}...`;
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

const TRANSIENT_HTTP_STATUSES = new Set([408, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 529]);

type ParsedClaudeError = {
  errorType?: string;
  message?: string;
};

/**
 * Parse a Claude error payload when available.
 */
export function parseClaudeErrorBody(errBody: string): ParsedClaudeError {
  try {
    const parsed = JSON.parse(errBody) as {
      type?: unknown;
      error?: { type?: unknown; message?: unknown };
    };
    if (parsed && parsed.type === "error" && parsed.error && typeof parsed.error === "object") {
      return {
        errorType: typeof parsed.error.type === "string" ? parsed.error.type : undefined,
        message: typeof parsed.error.message === "string" ? parsed.error.message : undefined,
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
export function isInvalidRequestError(status: number, errBody: string): boolean {
  if (status === 422) {
    return true;
  }
  const parsed = parseClaudeErrorBody(errBody);
  return parsed.errorType === "invalid_request_error" || errBody.includes("invalid_request_error");
}

function normalizeClaudeRequestForAnthropic(body: ClaudeRequest): ClaudeRequest {
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
  const toolChoice = parsed.toolChoiceName
    ? { type: "tool" as const, toolName: parsed.toolChoiceName }
    : parsed.toolChoice;

  return {
    input: {
      text: parsed.prompt,
      ...(parsed.images.length > 0 ? { images: parsed.images } : {}),
    },
    ...(overrides.provider ? { provider: overrides.provider } : {}),
    ...(overrides.model ? { model: overrides.model } : {}),
    systemPrompt: parsed.systemPrompt,
    maxTokens: parsed.maxTokens,
    ...(parsed.temperature !== undefined ? { temperature: parsed.temperature } : {}),
    ...(parsed.topP !== undefined ? { topP: parsed.topP } : {}),
    ...(parsed.topK !== undefined ? { topK: parsed.topK } : {}),
    ...(parsed.stopSequences?.length ? { stopSequences: parsed.stopSequences } : {}),
    ...(parsed.thinkingConfig ? { thinkingConfig: parsed.thinkingConfig } : {}),
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
    ...(historyMessages.length > 0 ? { conversationMessages: historyMessages } : {}),
    disableInternalFallback: true,
    skipToolPromptInjection: true,
    maxSteps: 1,
  };
}

function buildProxyTranslationAttempts(
  primary: { provider: string; model?: string },
  modelRouter?: ModelRouter,
): ProxyTranslationAttempt[] {
  const attempts: ProxyTranslationAttempt[] = [
    {
      provider: primary.provider,
      model: primary.model,
      label: `${primary.provider}/${primary.model ?? "unknown"}`,
    },
  ];

  const chain = modelRouter?.getFallbackChain() ?? [];
  for (const fallback of chain) {
    if (fallback.provider === primary.provider && fallback.model === primary.model) {
      continue;
    }

    attempts.push({
      provider: fallback.provider,
      model: fallback.model,
      label: `${fallback.provider}/${fallback.model}`,
    });
  }

  if (chain.length === 0) {
    attempts.push({ label: "auto-provider" });
  }

  return attempts;
}

function hasTranslatedOutput(collectedText: string, toolCalls: unknown[] | undefined): boolean {
  return collectedText.trim().length > 0 || (toolCalls?.length ?? 0) > 0;
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
export function isTransientHttpFailure(status: number, errBody: string): boolean {
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

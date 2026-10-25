/**
 * Enhanced proxy-aware fetch implementation for AI SDK providers
 * Supports HTTP/HTTPS proxies, authentication, and NO_PROXY bypass.
 * SOCKS proxy URLs are recognized but not supported: a request that selects
 * one falls back to a direct connection, or fails under strict mode
 * (NEUROLINK_PROXY_STRICT, or `createProxyFetch({ strict: true })`).
 * Lightweight implementation extracted from research of major proxy packages
 */

import { logger } from "../utils/logger.js";
import { getPropagatedAttributesFromContext } from "@langfuse/core";
import { LangfuseOtelSpanAttributes } from "@langfuse/tracing";
import { SpanStatusCode, propagation, context } from "@opentelemetry/api";
import { tracers } from "../telemetry/tracers.js";
import type { Dispatcher, ProxyAgent } from "undici";
import { shouldBypassProxy } from "./utils/noProxyUtils.js";
import type {
  GoogleGenAIHttpOptions,
  ParsedProxyConfig,
  ProxyEnvironmentSnapshot,
  ProxyFetchOptions,
  ProxyTimeouts,
} from "../types/index.js";
import { createHash } from "node:crypto";
import { TRANSIENT_NETWORK_CODES } from "../constants/networkErrorCodes.js";

/**
 * Inject OTel trace context (traceparent/tracestate) and NeuroLink session context
 * into outgoing request headers. This enables:
 * - The NeuroLink proxy to link proxy spans as children of the calling SDK's trace
 * - Conversation-level session/user attribution on proxy spans
 */
function mergeTraceHeaders(
  input: RequestInfo | URL,
  init?: RequestInit,
): Headers {
  const existingHeaders = new Headers(
    input instanceof Request ? input.headers : undefined,
  );

  if (init?.headers) {
    const initHeaders = new Headers(init.headers);
    for (const [key, value] of initHeaders.entries()) {
      existingHeaders.set(key, value);
    }
  }

  return existingHeaders;
}

function injectTraceContext(
  input: RequestInfo | URL,
  init?: RequestInit,
): RequestInit {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);

  const propagated = getPropagatedAttributesFromContext(context.active());
  for (const [header, key] of [
    ["x-neurolink-session-id", LangfuseOtelSpanAttributes.TRACE_SESSION_ID],
    ["x-neurolink-user-id", LangfuseOtelSpanAttributes.TRACE_USER_ID],
    [
      "x-neurolink-conversation-id",
      `${LangfuseOtelSpanAttributes.TRACE_METADATA}.conversationId`,
    ],
  ]) {
    const value = propagated[key];
    if (typeof value === "string" && value) {
      carrier[header] = value;
    }
  }

  if (Object.keys(carrier).length === 0) {
    return init ?? {};
  }

  const existingHeaders = mergeTraceHeaders(input, init);
  for (const [key, value] of Object.entries(carrier)) {
    if (!existingHeaders.has(key)) {
      existingHeaders.set(key, value);
    }
  }

  return { ...init, headers: existingHeaders };
}

const fetchTracer = tracers.http;

/**
 * Extract hostname from a URL string for safe logging (no auth tokens or paths).
 * Returns "[unknown]" if parsing fails.
 */
function extractHostname(url: string | URL | RequestInfo): string {
  try {
    const urlStr =
      typeof url === "string"
        ? url
        : url instanceof URL
          ? url.href
          : (url as Request).url;
    const parsed = new URL(urlStr);
    return parsed.hostname;
  } catch {
    return "[unknown]";
  }
}

/**
 * Classify a fetch failure as a transient network error worth retrying.
 *
 * undici's `fetch()` wraps the real failure in `TypeError: fetch failed`
 * with the actionable code (`ECONNRESET`, `UND_ERR_SOCKET`, ...) on
 * `error.cause` — sometimes nested another level (e.g. SocketError inside
 * a ConnectTimeoutError). Walk the cause chain so those are recognized;
 * checking only the top-level error silently classified every undici
 * connection death as non-retryable.
 *
 * Deliberately NOT retried: `UND_ERR_HEADERS_TIMEOUT` / `UND_ERR_BODY_TIMEOUT`
 * — those already waited out undici's own long deadline (default 300s), and
 * replaying them can triple a stall under the caller's wall-clock budget.
 *
 * Exported for direct coverage by the no-API test suite.
 */
export function isTransientNetworkError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    const err = current as { code?: string; message?: string; cause?: unknown };
    if (err.code && TRANSIENT_NETWORK_CODES.has(err.code)) {
      return true;
    }
    if (
      err.message?.includes("socket hang up") ||
      err.message?.includes("network socket disconnected") ||
      err.message?.includes("other side closed")
    ) {
      return true;
    }
    current = err.cause;
  }
  return false;
}

/**
 * Retry-aware fetch wrapper for transient network errors (ECONNRESET, ETIMEDOUT, socket hang up).
 * Protects all LLM API calls and token refreshes that go through createProxyFetch().
 * Instrumented with OpenTelemetry spans for retry visibility.
 */
async function fetchWithRetry(
  url: string | URL | RequestInfo,
  init: RequestInit | undefined,
  maxRetries = 3,
  baseDelay = 500,
): Promise<Response> {
  const hostname = extractHostname(url);

  return fetchTracer.startActiveSpan("http.fetchWithRetry", async (span) => {
    span.setAttribute("http.request.max_retries", maxRetries);
    span.setAttribute("http.request.hostname", hostname);
    span.setAttribute("http.request.method", init?.method || "GET");

    // eslint-disable-next-line no-useless-assignment
    let totalAttempts = 0;

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        totalAttempts = attempt + 1;
        try {
          const response = await fetch(url as RequestInfo | URL, init);

          // Record success attributes
          span.setAttribute("http.request.total_attempts", totalAttempts);
          span.setAttribute("http.response.status_code", response.status);
          span.setStatus({ code: SpanStatusCode.OK });

          return response;
        } catch (error: unknown) {
          const isRetryable = isTransientNetworkError(error);
          const err = error as { code?: string; message?: string };

          if (!isRetryable || attempt === maxRetries) {
            // Final failure — record on span and rethrow
            span.setAttribute("http.request.total_attempts", totalAttempts);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message:
                err?.message || err?.code || "fetchWithRetry final failure",
            });
            span.recordException(
              error instanceof Error ? error : new Error(String(error)),
            );
            throw error;
          }

          // Transient error — add retry event and continue loop
          const delay = baseDelay * Math.pow(2, attempt);
          span.addEvent("http.request.retry", {
            "retry.attempt": attempt + 1,
            "retry.delay_ms": delay,
            "retry.error": (err?.code || err?.message || String(error)).slice(
              0,
              256,
            ),
          });

          logger.debug(
            `[fetchWithRetry] Transient error (${err?.code || err?.message}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
      throw new Error("fetchWithRetry exhausted"); // unreachable
    } finally {
      span.end();
    }
  });
}

/**
 * Parse request body to readable format for debug logging
 */
function parseBody(body: BodyInit | null | undefined): {
  parsed: unknown;
  size: number;
  type: string;
} {
  if (!body) {
    return { parsed: null, size: 0, type: "empty" };
  }
  if (typeof body === "string") {
    try {
      return { parsed: JSON.parse(body), size: body.length, type: "json" };
    } catch {
      return { parsed: body, size: body.length, type: "text" };
    }
  }
  if (body instanceof ArrayBuffer) {
    return {
      parsed: "[ArrayBuffer]",
      size: body.byteLength,
      type: "arraybuffer",
    };
  }
  if (body instanceof Uint8Array) {
    return { parsed: "[Uint8Array]", size: body.length, type: "uint8array" };
  }
  return { parsed: "[Stream]", size: -1, type: "stream" };
}

/**
 * Sensitive header names whose values should be redacted in logs
 */
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "api-key",
  "x-goog-api-key",
  "proxy-authorization",
  "cookie",
  "set-cookie",
]);

/**
 * Clone response and read body + headers for debug logging
 */
async function readResponseBody(
  response: Response | import("undici").Response,
): Promise<{
  parsed: unknown;
  size: number;
  type: string;
  headers: Record<string, string>;
}> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = SENSITIVE_HEADERS.has(key.toLowerCase())
      ? `${value.substring(0, 4)}***`
      : value;
  });
  try {
    const cloned = response.clone();
    const text = await cloned.text();
    try {
      return {
        parsed: JSON.parse(text),
        size: text.length,
        type: "json",
        headers,
      };
    } catch {
      return { parsed: text, size: text.length, type: "text", headers };
    }
  } catch {
    return {
      parsed: "[unable to read body]",
      size: -1,
      type: "error",
      headers,
    };
  }
}

// ==================== LIGHTWEIGHT PROXY IMPLEMENTATIONS ====================

// ParsedProxyConfig interface moved to ../types/utilities.js

/**
 * Parse proxy URL with authentication support
 */
function parseProxyUrl(proxyUrl: string): ParsedProxyConfig {
  try {
    const url = new URL(proxyUrl);

    const config: ParsedProxyConfig = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: parseInt(url.port) || getDefaultPort(url.protocol),
      cleanUrl: `${url.protocol}//${url.hostname}:${url.port || getDefaultPort(url.protocol)}`,
    };

    // Extract authentication if present
    if (url.username && url.password) {
      config.auth = {
        username: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
      };
    }

    return config;
  } catch (error) {
    // Sanitize proxy URL to avoid leaking credentials in logs/errors
    let safeUrl: string;
    try {
      const u = new URL(proxyUrl);
      u.username = "";
      u.password = "";
      safeUrl = u.toString();
    } catch {
      safeUrl = "[invalid-url]";
    }
    logger.error("[Proxy] Failed to parse proxy URL", {
      proxyUrl: safeUrl,
      error,
    });
    throw new Error(`Invalid proxy URL: ${safeUrl}`, { cause: error });
  }
}

/**
 * Get default port for protocol
 */
function getDefaultPort(protocol: string): number {
  switch (protocol) {
    case "http:":
      return 8080;
    case "https:":
      return 8080;
    case "socks:":
    case "socks4:":
    case "socks4a:":
    case "socks5:":
    case "socks5h:":
      return 1080;
    default:
      return 8080;
  }
}

/**
 * Select appropriate proxy URL based on target and environment
 */
function selectProxyUrl(targetUrl: string): string | null {
  // Check NO_PROXY bypass first
  if (shouldBypassProxy(targetUrl)) {
    logger.debug("[Proxy] Bypassing proxy due to NO_PROXY", { targetUrl });
    return null;
  }

  try {
    const url = new URL(targetUrl);
    const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
    const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
    const socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;

    // Priority: Protocol-specific > ALL_PROXY > SOCKS_PROXY
    if (url.protocol === "https:" && httpsProxy) {
      return httpsProxy;
    }
    if (url.protocol === "http:" && httpProxy) {
      return httpProxy;
    }
    if (allProxy) {
      return allProxy;
    }
    if (socksProxy) {
      return socksProxy;
    }

    return null;
  } catch (error) {
    logger.warn("[Proxy] Error selecting proxy URL", { targetUrl, error });
    return null;
  }
}

/**
 * Create appropriate proxy agent based on protocol
 */
async function createProxyAgent(
  proxyUrl: string,
  timeouts: ProxyTimeouts = {},
): Promise<ProxyAgent> {
  const parsed = parseProxyUrl(proxyUrl);

  logger.debug("[Proxy] Creating proxy agent", {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port,
    hasAuth: !!parsed.auth,
  });

  switch (parsed.protocol) {
    case "http:":
    case "https:": {
      // Use existing undici ProxyAgent for HTTP/HTTPS
      const { ProxyAgent } = await import("undici");
      return new ProxyAgent({ uri: proxyUrl, ...timeouts });
    }

    case "socks4:":
    case "socks4a:":
    case "socks5:":
    case "socks5h:":
    case "socks:": {
      // No SOCKS client ships with the package, and installing one does not
      // change that: this module never loads it.
      throw new Error(
        `SOCKS proxies (${parsed.protocol}//) are not supported. ` +
          `Use an HTTP(S) proxy, or an HTTP-to-SOCKS bridge in front of the SOCKS proxy`,
      );
    }

    default:
      throw new Error(`Unsupported proxy protocol: ${parsed.protocol}`);
  }
}

/**
 * One ProxyAgent per proxy URL for the whole process, so connections to the
 * proxy are pooled and an agent is not rebuilt per request. Hashing the full
 * URL keeps credentials out of map keys without mixing distinct proxy logins.
 */
async function getOrCreateProxyAgent(
  proxyUrl: string,
  timeouts: ProxyTimeouts = {},
): Promise<ProxyAgent> {
  const globalWithCache = globalThis as {
    __NL_PROXY_AGENT_CACHE__?: Map<string, ProxyAgent>;
  };
  if (!globalWithCache.__NL_PROXY_AGENT_CACHE__) {
    globalWithCache.__NL_PROXY_AGENT_CACHE__ = new Map();
  }
  const agentCache: Map<string, ProxyAgent> =
    globalWithCache.__NL_PROXY_AGENT_CACHE__;
  const cacheKey = createHash("sha256")
    .update(proxyUrl)
    .update(JSON.stringify(timeouts))
    .digest("hex");
  const dispatcher =
    agentCache.get(cacheKey) || (await createProxyAgent(proxyUrl, timeouts));
  agentCache.set(cacheKey, dispatcher);
  return dispatcher;
}

/**
 * The dispatcher a request to `targetUrl` must use to go through the proxy the
 * environment configures, or `null` when none applies (no proxy variable for
 * the URL's scheme, or the host is listed in NO_PROXY).
 *
 * Unlike the fetch from {@link createProxyFetch}, a caller that needs a
 * request to be proxied or refused (a download whose destination was vetted
 * under proxy rules) gets no fallback to a direct connection from this: a proxy
 * that cannot be used (an unsupported SOCKS URL, an unparsable URL) throws.
 */
export async function getProxyDispatcherForUrl(
  targetUrl: string,
  timeouts: ProxyTimeouts = {},
): Promise<ProxyAgent | null> {
  const proxyUrl = selectProxyUrl(targetUrl);
  return proxyUrl ? getOrCreateProxyAgent(proxyUrl, timeouts) : null;
}

/**
 * Fetch for the proxy command's own outbound requests. A configured proxy is
 * mandatory for its target: a failed proxy connection must never retry direct.
 * The optional dispatcher preserves callers' direct-connection tuning.
 */
export async function fetchProxyAware(
  url: string | URL,
  init?: RequestInit,
  directDispatcher?: Dispatcher,
  proxyTimeouts?: ProxyTimeouts,
): Promise<Response> {
  const proxyDispatcher = await getProxyDispatcherForUrl(
    url.toString(),
    proxyTimeouts,
  );
  if (!proxyDispatcher) {
    return fetch(
      url,
      directDispatcher
        ? ({ ...init, dispatcher: directDispatcher } as RequestInit)
        : init,
    );
  }

  const { fetch: undiciFetch } = await import("undici");
  // Undici and lib.dom describe the same runtime Response with different
  // iterator types.
  const response = (await undiciFetch(url, {
    ...init,
    dispatcher: proxyDispatcher,
  } as import("undici").RequestInit)) as Response | import("undici").Response;
  return response as Response;
}

/**
 * Whether NEUROLINK_PROXY_STRICT asks for "proxy or nothing": `true`, `1`,
 * `yes` or `on` (any case). Any other value, or none, keeps the default of
 * retrying a failed proxy attempt over a direct connection.
 */
export function isProxyStrictMode(): boolean {
  return /^(true|1|yes|on)$/i.test(
    process.env.NEUROLINK_PROXY_STRICT?.trim() ?? "",
  );
}

/**
 * The WebSocket clients (`ws`) are built without a proxy agent, so they always
 * connect directly. Call this before opening one: when a proxy is configured
 * for `wsUrl` (and NO_PROXY does not exempt it), strict mode refuses the
 * connection, and otherwise a warning says the socket bypasses the proxy.
 * `label` names the client in the message; the URL itself is never logged,
 * since some carry an API key in the query string.
 */
export function assertWebSocketProxyPolicy(wsUrl: string, label: string): void {
  let host: string;
  let httpEquivalent: string;
  try {
    const url = new URL(wsUrl);
    host = url.host;
    url.protocol =
      url.protocol === "wss:" || url.protocol === "https:" ? "https:" : "http:";
    url.search = "";
    httpEquivalent = url.toString();
  } catch {
    return;
  }
  if (!selectProxyUrl(httpEquivalent)) {
    return;
  }
  if (isProxyStrictMode()) {
    throw new Error(
      `[Proxy] ${label} WebSocket to ${host} cannot be sent through the configured proxy, ` +
        `and NEUROLINK_PROXY_STRICT forbids a direct connection`,
    );
  }
  logger.warn(
    `[Proxy] ${label} WebSocket to ${host} connects directly: WebSocket clients do not use the configured proxy. ` +
      `Set NEUROLINK_PROXY_STRICT=true to refuse the connection instead.`,
  );
}

function sanitizeProxyUrl(url: string | undefined): string {
  return maskProxyUrl(url) ?? "NOT_SET";
}

function getTargetUrl(input: RequestInfo | URL): string {
  return typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : (input as Request).url;
}

function createDirectFetchHandler(): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const enrichedInit = injectTraceContext(input, init);
    const reqId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTs = Date.now();
    const url = getTargetUrl(input);

    if (logger.shouldLog("debug")) {
      const { size: bodySize, type: bodyType } = parseBody(enrichedInit?.body);
      logger.debug("[Observability] HTTP request to LLM provider", {
        requestId: reqId,
        url,
        method: enrichedInit?.method || "POST",
        bodySize,
        bodyType,
      });
    }

    try {
      const response = await fetchWithRetry(input, enrichedInit);

      if (logger.shouldLog("debug")) {
        const {
          parsed: responseBody,
          size: responseSize,
          type: responseType,
          headers: responseHeaders,
        } = await readResponseBody(response);
        logger.debug("[Observability] HTTP response from LLM provider", {
          requestId: reqId,
          url,
          status: response.status,
          statusText: response.statusText,
          durationMs: Date.now() - startTs,
          contentLength: responseSize,
          hasContent: !!responseBody,
          bodyType: responseType,
          responseHeaders,
        });
      }

      return response;
    } catch (error: unknown) {
      logger.debug("[Observability] HTTP request failed", {
        requestId: reqId,
        url,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTs,
      });
      throw error;
    }
  };
}

async function executeProxiedFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  proxyEnv: ProxyEnvironmentSnapshot,
  strict: boolean,
): Promise<Response> {
  const { httpsProxy, httpProxy, allProxy, socksProxy, noProxy } = proxyEnv;
  init = injectTraceContext(input, init);
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  const requestStartTime = Date.now();
  const targetUrl = getTargetUrl(input);

  if (logger.shouldLog("debug")) {
    const { size: bodySize, type: bodyType } = parseBody(init?.body);
    logger.debug("[Observability] HTTP request to LLM provider", {
      requestId,
      url: targetUrl,
      method: init?.method || "POST",
      bodySize,
      bodyType,
    });
  }

  logger.debug(`[Proxy Fetch] ENHANCED REQUEST START`, {
    requestId,
    targetUrl,
    timestamp: new Date().toISOString(),
    httpProxy: sanitizeProxyUrl(httpProxy),
    httpsProxy: sanitizeProxyUrl(httpsProxy),
    allProxy: sanitizeProxyUrl(allProxy),
    socksProxy: sanitizeProxyUrl(socksProxy),
    noProxy: noProxy || "NOT_SET",
    initMethod: init?.method || "GET",
  });

  // Clone the request before any proxy attempt so that if the proxy path
  // consumes the body stream and then fails, the fallback still has an intact
  // body to send.
  const requestClone = input instanceof Request ? input.clone() : null;

  try {
    const proxyUrl = selectProxyUrl(targetUrl);

    if (proxyUrl) {
      const url = new URL(targetUrl);
      logger.debug(`[Proxy Fetch] 🔗 ENHANCED URL ANALYSIS`, {
        requestId,
        targetUrl,
        urlHostname: url.hostname,
        urlProtocol: url.protocol,
        urlPort: url.port,
        selectedProxyUrl: sanitizeProxyUrl(proxyUrl),
        timestamp: new Date().toISOString(),
      });
      logger.debug(`[Proxy Fetch] 🎯 ENHANCED PROXY AGENT CREATION`, {
        requestId,
        proxyUrl: sanitizeProxyUrl(proxyUrl),
        targetHostname: url.hostname,
        targetProtocol: url.protocol,
        aboutToCreateProxyAgent: true,
        timestamp: new Date().toISOString(),
      });

      const dispatcher = await getOrCreateProxyAgent(proxyUrl);

      logger.debug(`[Proxy Fetch] ✅ ENHANCED PROXY AGENT CREATED`, {
        requestId,
        hasDispatcher: !!dispatcher,
        dispatcherType: typeof dispatcher,
        dispatcherConstructor: dispatcher?.constructor?.name || "unknown",
        timestamp: new Date().toISOString(),
      });

      let fetchInput: string | URL;
      let fetchInit = { ...init };

      if (input instanceof Request) {
        fetchInput = input.url;
        fetchInit = {
          method: input.method,
          headers: input.headers,
          body: input.body,
          ...init,
        };
      } else {
        fetchInput = input;
      }

      const undici = await import("undici");
      // undici's fetch types and lib.dom's diverge on iterator helper details,
      // so the runtime-identical response is typed as either flavor (widening
      // assertion so control flow keeps the union) and narrowed
      // (overlap-checked) back to the DOM flavor at the return boundary.
      const response = (await undici.fetch(fetchInput, {
        ...fetchInit,
        dispatcher,
      } as import("undici").RequestInit)) as
        | Response
        | import("undici").Response;

      if (logger.shouldLog("debug")) {
        const {
          parsed: responseBody,
          size: responseSize,
          type: responseType,
          headers: responseHeaders,
        } = await readResponseBody(response);
        logger.debug("[Observability] HTTP response from LLM provider", {
          requestId,
          url: targetUrl,
          status: response?.status,
          statusText: response?.statusText,
          durationMs: Date.now() - requestStartTime,
          contentLength: responseSize,
          hasContent: !!responseBody,
          bodyType: responseType,
          proxied: true,
          responseHeaders,
        });
      }

      logger.debug(`[Proxy Fetch] ENHANCED PROXY SUCCESS`, {
        requestId,
        responseStatus: response?.status,
        responseOk: response?.ok,
        proxyUsed: true,
        timestamp: new Date().toISOString(),
      });

      return response as Response;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.debug("[Observability] HTTP request failed", {
      requestId,
      url: targetUrl,
      error: errorMessage,
      durationMs: Date.now() - requestStartTime,
    });
    logger.debug(`[Proxy Fetch] ENHANCED ERROR ANALYSIS`, {
      requestId,
      error: errorMessage,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      willFallback: !strict,
      timestamp: new Date().toISOString(),
    });
    if (strict) {
      let host = "[unknown-host]";
      try {
        host = new URL(targetUrl).host;
      } catch {
        // keep the placeholder
      }
      logger.warn(
        `[Proxy Fetch] Request to ${host} through the proxy failed (${errorMessage}); strict proxy mode is on, so it is not retried over a direct connection`,
      );
      // The original error, unwrapped: callers classify it (abort, transient
      // network codes on `cause`) exactly as they would any fetch failure.
      throw error;
    }
    logger.warn(
      `[Proxy Fetch] Enhanced proxy failed (${errorMessage}), falling back to direct connection. Set NEUROLINK_PROXY_STRICT=true to fail instead.`,
    );
  }

  logger.debug(`[Proxy Fetch] ENHANCED FALLBACK TO STANDARD FETCH`, {
    requestId,
    fallbackReason: "No proxy configured or proxy failed",
    timestamp: new Date().toISOString(),
  });

  // Use the cloned request for the fallback so that the body stream is not
  // already consumed from the proxy attempt above.
  const fallbackInput: RequestInfo | URL = (
    input instanceof Request ? (requestClone ?? input) : input
  ) as RequestInfo | URL;

  try {
    const response = await fetchWithRetry(fallbackInput, init);

    if (logger.shouldLog("debug")) {
      const {
        parsed: responseBody,
        size: responseSize,
        type: responseType,
        headers: responseHeaders,
      } = await readResponseBody(response);
      logger.debug("[Observability] HTTP response from LLM provider", {
        requestId,
        url: targetUrl,
        status: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - requestStartTime,
        contentLength: responseSize,
        hasContent: !!responseBody,
        bodyType: responseType,
        proxied: false,
        responseHeaders,
      });
    }

    return response;
  } catch (fallbackError: unknown) {
    const fallbackMessage =
      fallbackError instanceof Error
        ? fallbackError.message
        : String(fallbackError);

    logger.debug("[Observability] HTTP request failed", {
      requestId,
      url: targetUrl,
      error: fallbackMessage,
      durationMs: Date.now() - requestStartTime,
    });
    throw fallbackError;
  }
}

function createProxiedFetchHandler(
  proxyEnv: ProxyEnvironmentSnapshot,
  strict: boolean,
): typeof fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => executeProxiedFetch(input, init, proxyEnv, strict);
}

// ==================== ENHANCED PROXY FETCH FUNCTION ====================

/**
 * Create a proxy-aware fetch function with enhanced capabilities
 * Supports HTTP/HTTPS proxies, authentication, and NO_PROXY bypass.
 *
 * By default a request whose proxy attempt fails is retried once over a
 * direct connection, with a warning. Strict mode (`options.strict`, or
 * NEUROLINK_PROXY_STRICT when the option is omitted) fails it instead. Strict
 * mode never blocks a request NO_PROXY exempts, or one sent while no proxy is
 * configured: those go direct by design.
 */
export function createProxyFetch(options?: ProxyFetchOptions): typeof fetch {
  const strict = options?.strict ?? isProxyStrictMode();
  // Detect ALL proxy-related environment variables
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
  const socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;
  const proxyEnv: ProxyEnvironmentSnapshot = {
    httpsProxy,
    httpProxy,
    allProxy,
    socksProxy,
    noProxy,
  };

  // ENHANCED LOGGING: Capture ALL proxy-related environment variables — credentials redacted
  if (logger.shouldLog("debug")) {
    const allProxyRelatedEnvVars = Object.keys(process.env)
      .filter((key) => key.toLowerCase().includes("proxy"))
      .reduce(
        (acc, key) => {
          const val = process.env[key] || "NOT_SET";
          acc[key] =
            key.toLowerCase() === "no_proxy" ? val : sanitizeProxyUrl(val);
          return acc;
        },
        {} as Record<string, string>,
      );
    logger.debug("[Proxy Fetch] ENHANCED_PROXY_ENV_DETECTION", {
      httpProxy: sanitizeProxyUrl(httpProxy),
      httpsProxy: sanitizeProxyUrl(httpsProxy),
      allProxy: sanitizeProxyUrl(allProxy),
      socksProxy: sanitizeProxyUrl(socksProxy),
      noProxy: noProxy || "NOT_SET",
      allProxyRelatedEnvVars,
      message: "Enhanced proxy environment detection — credentials redacted",
    });
  }

  // If no proxy configured, return instrumented standard fetch
  if (!httpsProxy && !httpProxy && !allProxy && !socksProxy) {
    logger.debug(
      "[Proxy Fetch] No proxy environment variables found - using standard fetch",
    );
    return createDirectFetchHandler();
  }

  logger.debug(
    `[Proxy Fetch] Configuring enhanced proxy with multiple protocol support`,
  );
  logger.debug(`[Proxy Fetch] HTTP_PROXY: ${sanitizeProxyUrl(httpProxy)}`);
  logger.debug(`[Proxy Fetch] HTTPS_PROXY: ${sanitizeProxyUrl(httpsProxy)}`);
  logger.debug(`[Proxy Fetch] ALL_PROXY: ${sanitizeProxyUrl(allProxy)}`);
  logger.debug(`[Proxy Fetch] SOCKS_PROXY: ${sanitizeProxyUrl(socksProxy)}`);
  logger.debug(`[Proxy Fetch] NO_PROXY: ${noProxy || "not set"}`);
  logger.debug(`[Proxy Fetch] Strict mode: ${strict}`);

  return createProxiedFetchHandler(proxyEnv, strict);
}

/**
 * Mask credentials in a proxy URL for safe logging/reporting.
 *
 * Exported so provider-side fetch loggers (lmStudio, llamaCpp, deepseek,
 * nvidiaNim) can sanitize upstream URLs before emitting warnings — reverse-
 * proxied deployments can embed credentials or signed query params in the
 * base URL, and those should never reach application logs verbatim.
 */
export function maskProxyUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const u = new URL(url);
    if (u.username || u.password) {
      u.username = "***";
      u.password = "***";
    }
    return u.toString();
  } catch {
    return "[invalid-url]";
  }
}

/**
 * Get enhanced proxy status information
 */
export function getProxyStatus() {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const allProxy = process.env.ALL_PROXY || process.env.all_proxy;
  const socksProxy = process.env.SOCKS_PROXY || process.env.socks_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  return {
    enabled: !!(httpsProxy || httpProxy || allProxy || socksProxy),
    httpProxy: maskProxyUrl(httpProxy),
    httpsProxy: maskProxyUrl(httpsProxy),
    allProxy: maskProxyUrl(allProxy),
    socksProxy: maskProxyUrl(socksProxy),
    noProxy: noProxy || null,
    strict: isProxyStrictMode(),
    method: "enhanced-proxy-agent",
    capabilities: [
      "HTTP/HTTPS Proxy",
      "Proxy Authentication",
      "Strict (fail-closed) Mode",
      "NO_PROXY Bypass",
      "CIDR Range Matching",
      "Wildcard Domain Matching",
    ],
  };
}

/**
 * `httpOptions` fragment that routes the @google/genai SDK through the
 * configured proxy, or nothing when none is configured.
 *
 * The SDK calls global `fetch` unless `HttpOptions.fetch` is set (declared and
 * used from 2.23.0), and global `fetch` does not read HTTP_PROXY / HTTPS_PROXY
 * unless Node itself was started with env-proxy support. The proxy-aware fetch
 * is passed only when a proxy is configured: with none, the SDK keeps its own
 * request path instead of gaining this module's trace headers and retries.
 *
 * Covers the SDK's `generateContent`, `generateContentStream` and
 * `embedContent` requests. It does not reach Gemini Live websockets or the
 * Application Default Credentials token requests.
 */
export function googleSdkProxyHttpOptions(): GoogleGenAIHttpOptions {
  return getProxyStatus().enabled ? { fetch: createProxyFetch() } : {};
}

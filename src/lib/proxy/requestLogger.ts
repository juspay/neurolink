/**
 * Proxy Request Logger
 * Logs proxy request/response metadata to a rotating log file.
 * Also emits OTLP log records to OpenObserve (or any OTLP-compatible backend)
 * when a LoggerProvider is configured via OpenTelemetry instrumentation.
 * Useful for debugging and auditing proxy traffic.
 */

import { join } from "path";
import { homedir } from "os";
import { logger } from "../utils/logger.js";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
} from "fs";
import { appendFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { promisify } from "util";
import { gzip as gzipCallback } from "zlib";
import type {
  RequestAttemptLogEntry,
  RequestLogEntry,
} from "../types/index.js";
import { OtelBridge } from "../observability/otelBridge.js";
import { SeverityNumber } from "@opentelemetry/api-logs";
import type { LoggerProvider } from "@opentelemetry/sdk-logs";

let logDir: string | null = null;
let logEnabled = false;

/**
 * Lazily-resolved LoggerProvider from OTel instrumentation.
 * null = not resolved yet (will retry), LoggerProvider = resolved, false = permanently unavailable.
 */
let otelLoggerProvider: LoggerProvider | null | false = null;
/** Number of times we've tried to resolve the LoggerProvider. */
let otelResolveAttempts = 0;
/** Max number of resolve attempts before giving up. */
const MAX_RESOLVE_ATTEMPTS = 10;

/** Maximum body chunk size emitted to OTLP logs. */
const BODY_OTLP_CHUNK_SIZE = 16_000;
/** Maximum redacted body bytes persisted per capture entry. */
const MAX_CAPTURED_BODY_BYTES = 1024 * 1024;
const BODY_TRUNCATION_MARKER = "\n...[TRUNCATED]";

const gzip = promisify(gzipCallback);

/** Headers whose values must always be redacted. */
const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
]);

/** Pattern that matches header names likely to contain secrets. */
const SENSITIVE_HEADER_PATTERN = /token|secret|key|password|credential/i;

/** JSON keys whose values should be redacted in request/response bodies. */
const SENSITIVE_BODY_KEYS =
  /("(?:password|access_token|refresh_token|api_key|apiKey|secret|authorization|token|credential|x-api-key)"\s*:\s*)"(?:[^"\\]|\\.)*"/gi;

export function initRequestLogger(
  enabled: boolean = true,
  customLogsDir?: string,
): void {
  logEnabled = enabled;
  if (!enabled) {
    return;
  }

  try {
    logDir = customLogsDir ?? join(homedir(), ".neurolink", "logs");
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true, mode: 0o700 });
    }
    chmodSync(logDir, 0o700);
  } catch (err) {
    logEnabled = false;
    logDir = null;
    logger.warn(
      `[proxy] Request logging disabled — failed to create log directory: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function logRequest(entry: RequestLogEntry): Promise<void> {
  if (!logEnabled || !logDir) {
    return;
  }

  // Only use OtelBridge if traceId not already provided by caller.
  // Deferred .then() callbacks lose async context, so OtelBridge would
  // return undefined and overwrite the valid traceId the caller passed.
  if (!entry.traceId) {
    const bridge = new OtelBridge();
    const traceCtx = bridge.getCurrentTraceContext();
    if (traceCtx) {
      entry.traceId = traceCtx.traceId;
      entry.spanId = traceCtx.spanId;
    }
  }

  const logFile = join(
    logDir,
    `proxy-${new Date().toISOString().split("T")[0]}.jsonl`,
  );
  const line = JSON.stringify(entry) + "\n";

  try {
    await appendFile(logFile, line, { mode: 0o600 });
  } catch {
    // Non-fatal — don't crash proxy for logging failures
  }

  // Emit OTLP log record (additive — file logging is the primary sink)
  emitOtlpLogRecord(entry);
}

/**
 * Log an upstream attempt separately from the final request outcome.
 * Attempt logs are local-only and must not pollute the final request summary
 * or OTLP-derived dashboard panels.
 */
export async function logRequestAttempt(
  entry: RequestAttemptLogEntry,
): Promise<void> {
  if (!logEnabled || !logDir) {
    return;
  }

  if (!entry.traceId) {
    const bridge = new OtelBridge();
    const traceCtx = bridge.getCurrentTraceContext();
    if (traceCtx) {
      entry.traceId = traceCtx.traceId;
      entry.spanId = traceCtx.spanId;
    }
  }

  const logFile = join(
    logDir,
    `proxy-attempts-${new Date().toISOString().split("T")[0]}.jsonl`,
  );
  const line = JSON.stringify(entry) + "\n";

  try {
    await appendFile(logFile, line, { mode: 0o600 });
  } catch {
    // Non-fatal — don't crash proxy for logging failures
  }
}

/**
 * Lazily resolve the LoggerProvider from OTel instrumentation.
 * Uses dynamic import to avoid hard dependency — if instrumentation.ts
 * hasn't been loaded or OTLP is not configured, this is a no-op.
 * Retries up to MAX_RESOLVE_ATTEMPTS times to handle race conditions
 * where OTel initialization completes after the first log request.
 */
async function resolveLoggerProvider(): Promise<LoggerProvider | undefined> {
  if (otelLoggerProvider === false) {
    return undefined;
  } // permanently unavailable
  if (otelLoggerProvider !== null) {
    return otelLoggerProvider;
  }
  // Not resolved yet — try to resolve
  otelResolveAttempts++;
  try {
    const { getLoggerProvider } =
      await import("../services/server/ai/observability/instrumentation.js");
    const provider = getLoggerProvider();
    if (provider) {
      otelLoggerProvider = provider;
      return provider;
    }
    // Provider not available yet — if we've exceeded max attempts, give up
    if (otelResolveAttempts >= MAX_RESOLVE_ATTEMPTS) {
      otelLoggerProvider = false; // permanently unavailable
    }
    // Otherwise leave as null so we retry next time
    return undefined;
  } catch {
    // instrumentation.ts not available (e.g. standalone mode) — disable permanently
    otelLoggerProvider = false;
    return undefined;
  }
}

/**
 * Emit a RequestLogEntry as an OTLP log record.
 * Non-blocking, non-fatal — failures are silently swallowed.
 */
function emitOtlpLogRecord(entry: RequestLogEntry): void {
  resolveLoggerProvider()
    .then((provider) => {
      if (!provider) {
        return;
      }

      const otelLogger = provider.getLogger("neurolink-proxy", "1.0.0");

      // Determine severity based on response status
      const isError = (entry.responseStatus ?? 0) >= 400;
      const isRateLimit = entry.responseStatus === 429;
      const severityNumber = isError
        ? isRateLimit
          ? SeverityNumber.WARN
          : SeverityNumber.ERROR
        : SeverityNumber.INFO;
      const severityText = isError ? (isRateLimit ? "WARN" : "ERROR") : "INFO";

      otelLogger.emit({
        severityNumber,
        severityText,
        body: `${entry.method} ${entry.path} → ${entry.responseStatus} (${entry.responseTimeMs}ms)`,
        attributes: {
          // Core request fields
          "request.id": entry.requestId,
          "http.method": entry.method,
          "http.path": entry.path,
          "http.status_code": entry.responseStatus,
          "response.time_ms": entry.responseTimeMs,

          // AI-specific fields
          "ai.model": entry.model,
          "ai.stream": entry.stream,
          "ai.tool_count": entry.toolCount,

          // Account info
          "account.name": entry.account,
          "account.type": entry.accountType,

          // Token usage (when available)
          ...(entry.inputTokens !== undefined && {
            "ai.input_tokens": entry.inputTokens,
          }),
          ...(entry.outputTokens !== undefined && {
            "ai.output_tokens": entry.outputTokens,
          }),
          ...(entry.cacheCreationTokens !== undefined && {
            "ai.cache_creation_tokens": entry.cacheCreationTokens,
          }),
          ...(entry.cacheReadTokens !== undefined && {
            "ai.cache_read_tokens": entry.cacheReadTokens,
          }),

          // Error info (when present)
          ...(entry.errorType && { "error.type": entry.errorType }),
          ...(entry.errorMessage && { "error.message": entry.errorMessage }),

          // Trace correlation
          ...(entry.traceId && { "trace.id": entry.traceId }),
          ...(entry.spanId && { "span.id": entry.spanId }),

          // Derived fields for dashboards (matches backfill script)
          is_success: entry.responseStatus === 200,
          is_rate_limited: entry.responseStatus === 429,
          is_overloaded: entry.responseStatus === 529,
          is_error: isError,
          source: "otlp",
        },
      });
    })
    .catch(() => {
      // Non-fatal — never crash proxy for OTLP log failures
    });
}

export function getLogDir(): string | null {
  return logDir;
}

/**
 * Redact sensitive header values in-place.
 */
function redactHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) {
    return headers;
  }
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_HEADER_NAMES.has(lower) ||
      SENSITIVE_HEADER_PATTERN.test(lower)
    ) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

type ProxyBodyCaptureEntry = {
  timestamp: string;
  requestId: string;
  phase: string;
  model: string;
  stream: boolean;
  headers?: Record<string, string>;
  body?: unknown;
  bodySize?: number;
  contentType?: string;
  responseStatus?: number;
  durationMs?: number;
  account?: string;
  accountType?: string;
  attempt?: number;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, unknown>;
};

type StoredBodyArtifact = {
  bodyPath?: string;
  bodySha256?: string;
  redactedBodyBytes?: number;
  storedFileBytes?: number;
  redactedBody?: string;
  bodyTruncated?: boolean;
};

function serializeBody(body: unknown): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  return typeof body === "string" ? body : JSON.stringify(body);
}

/**
 * Redact sensitive keys from a JSON body string without truncation.
 */
function redactBody(body: unknown): string | undefined {
  const str = serializeBody(body);
  if (str === undefined) {
    return undefined;
  }
  return str.replace(SENSITIVE_BODY_KEYS, '$1"[REDACTED]"');
}

function sanitizePhase(phase: string): string {
  return phase.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function truncateUtf8String(
  input: string,
  maxBytes: number,
  marker: string = BODY_TRUNCATION_MARKER,
): { value: string; bytes: number; truncated: boolean } {
  const inputBytes = utf8ByteLength(input);
  if (inputBytes <= maxBytes) {
    return { value: input, bytes: inputBytes, truncated: false };
  }

  const markerBytes = utf8ByteLength(marker);
  if (maxBytes <= markerBytes) {
    return { value: marker, bytes: markerBytes, truncated: true };
  }

  let value = "";
  let bytes = 0;
  for (const char of input) {
    const charBytes = utf8ByteLength(char);
    if (bytes + charBytes + markerBytes > maxBytes) {
      break;
    }
    value += char;
    bytes += charBytes;
  }

  const truncatedValue = `${value}${marker}`;
  return {
    value: truncatedValue,
    bytes: utf8ByteLength(truncatedValue),
    truncated: true,
  };
}

function splitUtf8StringByBytes(input: string, maxBytes: number): string[] {
  if (!input) {
    return [""];
  }

  const chunks: string[] = [];
  let currentChunk = "";
  let currentBytes = 0;

  for (const char of input) {
    const charBytes = utf8ByteLength(char);
    if (currentChunk && currentBytes + charBytes > maxBytes) {
      chunks.push(currentChunk);
      currentChunk = char;
      currentBytes = charBytes;
      continue;
    }

    currentChunk += char;
    currentBytes += charBytes;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function prepareRedactedBody(body: unknown): {
  value?: string;
  bytes?: number;
  truncated: boolean;
} {
  const redacted = redactBody(body);
  if (redacted === undefined) {
    return { truncated: false };
  }

  return truncateUtf8String(redacted, MAX_CAPTURED_BODY_BYTES);
}

type ManagedLogFile = {
  path: string;
  mtime: number;
  size: number;
};

function collectManagedLogFiles(rootDir: string): ManagedLogFile[] {
  const managedFiles: ManagedLogFile[] = [];

  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      const isTopLevelProxyLog =
        directory === rootDir &&
        /^proxy(?:-attempts|-debug)?-.*\.jsonl$/.test(entry.name);
      const isBodyArtifact =
        entry.name.endsWith(".json.gz") &&
        entryPath.includes(`${join(rootDir, "bodies")}`);

      if (!isTopLevelProxyLog && !isBodyArtifact) {
        continue;
      }

      try {
        const stat = statSync(entryPath);
        managedFiles.push({
          path: entryPath,
          mtime: stat.mtimeMs,
          size: stat.size,
        });
      } catch {
        // Non-fatal
      }
    }
  };

  walk(rootDir);
  return managedFiles;
}

function pruneEmptyDirectories(directory: string, stopAt: string): void {
  if (!existsSync(directory)) {
    return;
  }

  try {
    const entries = readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        pruneEmptyDirectories(join(directory, entry.name), stopAt);
      }
    }

    if (directory !== stopAt && readdirSync(directory).length === 0) {
      rmSync(directory, { recursive: true, force: true });
    }
  } catch {
    // Non-fatal
  }
}

async function writeBodyArtifact(
  entry: ProxyBodyCaptureEntry,
  redactedHeaders: Record<string, string> | undefined,
  redactedBody: string | undefined,
  bodyTruncated: boolean,
): Promise<StoredBodyArtifact> {
  if (!logDir || redactedBody === undefined) {
    return {};
  }

  const dateStr = new Date(entry.timestamp).toISOString().split("T")[0];
  const bodyDir = join(logDir, "bodies", dateStr, entry.requestId);
  if (!existsSync(bodyDir)) {
    mkdirSync(bodyDir, { recursive: true, mode: 0o700 });
  }
  chmodSync(bodyDir, 0o700);

  const fileName =
    `${Date.now()}-${sanitizePhase(entry.phase)}` +
    (entry.attempt !== undefined ? `-attempt-${entry.attempt}` : "") +
    `.json.gz`;
  const bodyPath = join(bodyDir, fileName);
  const payload = JSON.stringify({
    timestamp: entry.timestamp,
    requestId: entry.requestId,
    phase: entry.phase,
    model: entry.model,
    stream: entry.stream,
    account: entry.account,
    accountType: entry.accountType,
    attempt: entry.attempt,
    responseStatus: entry.responseStatus,
    durationMs: entry.durationMs,
    contentType: entry.contentType,
    headers: redactedHeaders,
    body: redactedBody,
    traceId: entry.traceId,
    spanId: entry.spanId,
    metadata: entry.metadata,
  });
  const compressed = await gzip(payload);
  await writeFile(bodyPath, compressed, { mode: 0o600 });

  return {
    bodyPath,
    bodySha256: sha256(redactedBody),
    redactedBodyBytes: utf8ByteLength(redactedBody),
    storedFileBytes: compressed.byteLength,
    redactedBody,
    bodyTruncated,
  };
}

function emitOtlpBodyLogRecord(
  entry: ProxyBodyCaptureEntry,
  stored: StoredBodyArtifact,
): void {
  resolveLoggerProvider()
    .then((provider) => {
      if (!provider || stored.redactedBody === undefined) {
        return;
      }

      const otelLogger = provider.getLogger("neurolink-proxy-bodies", "1.0.0");
      const chunks = splitUtf8StringByBytes(
        stored.redactedBody,
        BODY_OTLP_CHUNK_SIZE,
      );
      const totalChunks = Math.max(1, chunks.length);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const chunk = chunks[chunkIndex] ?? "";

        otelLogger.emit({
          severityNumber:
            (entry.responseStatus ?? 0) >= 400
              ? SeverityNumber.WARN
              : SeverityNumber.INFO,
          severityText: (entry.responseStatus ?? 0) >= 400 ? "WARN" : "INFO",
          body: chunk,
          attributes: {
            "event.name": "proxy.body_capture",
            "request.id": entry.requestId,
            "body.phase": entry.phase,
            "body.chunk_index": chunkIndex,
            "body.chunk_count": totalChunks,
            "body.content_type": entry.contentType ?? "application/json",
            "ai.model": entry.model,
            "ai.stream": entry.stream,
            ...(entry.account && { "account.name": entry.account }),
            ...(entry.accountType && { "account.type": entry.accountType }),
            ...(entry.attempt !== undefined && {
              "proxy.attempt": entry.attempt,
            }),
            ...(entry.responseStatus !== undefined && {
              "http.status_code": entry.responseStatus,
            }),
            ...(entry.durationMs !== undefined && {
              "response.time_ms": entry.durationMs,
            }),
            ...(stored.bodySha256 && { "body.sha256": stored.bodySha256 }),
            ...(stored.bodyPath && {
              "body.path": stored.bodyPath.split("/").slice(-2).join("/"),
            }),
            ...(stored.redactedBodyBytes !== undefined && {
              "body.bytes": stored.redactedBodyBytes,
            }),
            ...(stored.bodyTruncated !== undefined && {
              "body.truncated": stored.bodyTruncated,
            }),
            ...(entry.traceId && { "trace.id": entry.traceId }),
            ...(entry.spanId && { "span.id": entry.spanId }),
            ...(entry.metadata && {
              "body.metadata_json": JSON.stringify(entry.metadata),
            }),
            source: "otlp",
          },
        });
      }
    })
    .catch(() => {
      // Non-fatal — never crash proxy for OTLP log failures
    });
}

export async function logBodyCapture(
  entry: ProxyBodyCaptureEntry,
): Promise<void> {
  if (!logEnabled || !logDir) {
    return;
  }

  const bridge = new OtelBridge();
  const traceCtx =
    entry.traceId && entry.spanId
      ? { traceId: entry.traceId, spanId: entry.spanId }
      : bridge.getCurrentTraceContext();
  const redactedHeaders = redactHeaders(entry.headers);
  const preparedBody = prepareRedactedBody(entry.body);

  let stored: StoredBodyArtifact;
  try {
    stored = await writeBodyArtifact(
      entry,
      redactedHeaders,
      preparedBody.value,
      preparedBody.truncated,
    );
  } catch (writeError) {
    logger.warn(
      "[RequestLogger] writeBodyArtifact failed, falling back to in-memory body for OTLP",
      { error: writeError },
    );
    stored = {
      redactedBody: preparedBody.value,
      redactedBodyBytes: preparedBody.bytes,
      bodyTruncated: preparedBody.truncated,
    };
  }

  const dateStr = new Date(entry.timestamp).toISOString().split("T")[0];
  const logFile = join(logDir, `proxy-debug-${dateStr}.jsonl`);
  const indexEntry: Record<string, unknown> = {
    timestamp: entry.timestamp,
    type: "body_capture",
    requestId: entry.requestId,
    phase: entry.phase,
    model: entry.model,
    stream: entry.stream,
    headers: redactedHeaders,
    contentType: entry.contentType,
    responseStatus: entry.responseStatus,
    durationMs: entry.durationMs,
    account: entry.account,
    accountType: entry.accountType,
    attempt: entry.attempt,
    bodyPath: stored.bodyPath,
    bodySha256: stored.bodySha256,
    observedBodyBytes: entry.bodySize,
    redactedBodyBytes: stored.redactedBodyBytes ?? preparedBody.bytes,
    storedFileBytes: stored.storedFileBytes,
    bodyTruncated: stored.bodyTruncated ?? preparedBody.truncated,
    metadata: entry.metadata,
  };

  if (traceCtx) {
    indexEntry.traceId = traceCtx.traceId;
    indexEntry.spanId = traceCtx.spanId;
  }

  try {
    await appendFile(logFile, JSON.stringify(indexEntry) + "\n", {
      mode: 0o600,
    });
  } catch {
    // Non-fatal
  }

  emitOtlpBodyLogRecord(
    {
      ...entry,
      traceId: traceCtx?.traceId ?? entry.traceId,
      spanId: traceCtx?.spanId ?? entry.spanId,
    },
    stored,
  );
}

/**
 * Log the FULL raw request and response for debugging.
 * Legacy helper kept for compatibility. New call sites should prefer
 * logBodyCapture() so each phase can be indexed and persisted separately.
 */
export async function logFullRequestResponse(entry: {
  timestamp: string;
  requestId: string;
  account: string;
  model: string;
  stream: boolean;
  requestHeaders: Record<string, string>;
  requestBody: unknown;
  requestBodySize: number;
  responseStatus: number;
  responseHeaders?: Record<string, string>;
  responseBody?: string;
  responseBodySize?: number;
  durationMs: number;
}): Promise<void> {
  await Promise.all([
    logBodyCapture({
      timestamp: entry.timestamp,
      requestId: entry.requestId,
      phase: "legacy_upstream_request",
      model: entry.model,
      stream: entry.stream,
      headers: entry.requestHeaders,
      body: entry.requestBody,
      bodySize: entry.requestBodySize,
      contentType: entry.requestHeaders["content-type"] ?? "application/json",
      account: entry.account,
      responseStatus: entry.responseStatus,
      durationMs: entry.durationMs,
    }),
    logBodyCapture({
      timestamp: entry.timestamp,
      requestId: entry.requestId,
      phase: "legacy_upstream_response",
      model: entry.model,
      stream: entry.stream,
      headers: entry.responseHeaders,
      body: entry.responseBody,
      bodySize: entry.responseBodySize,
      contentType:
        entry.responseHeaders?.["content-type"] ?? "application/json",
      account: entry.account,
      responseStatus: entry.responseStatus,
      durationMs: entry.durationMs,
    }),
  ]);
}

/**
 * Log a mid-stream error that occurs after the initial 200 was sent.
 * These are invisible in normal request logs since the 200 was already recorded.
 */
export async function logStreamError(entry: {
  timestamp: string;
  requestId: string;
  account: string;
  model: string;
  errorMessage: string;
  durationMs: number;
}): Promise<void> {
  if (!logEnabled || !logDir) {
    return;
  }

  const bridge = new OtelBridge();
  const traceCtx = bridge.getCurrentTraceContext();

  const logFile = join(
    logDir,
    `proxy-${new Date().toISOString().split("T")[0]}.jsonl`,
  );
  const logEntry: Record<string, unknown> = {
    ...entry,
    responseStatus: 200,
    errorType: "stream_error",
    note: "mid-stream failure after initial 200",
  };
  if (traceCtx) {
    logEntry.traceId = traceCtx.traceId;
    logEntry.spanId = traceCtx.spanId;
  }

  try {
    await appendFile(logFile, JSON.stringify(logEntry) + "\n", {
      mode: 0o600,
    });
  } catch {
    // Non-fatal — don't crash proxy for logging failures
  }
}

/**
 * Clean up old log files by age and total size.
 * - Deletes files older than maxAgeDays
 * - If remaining files exceed maxSizeMb, deletes oldest until under limit
 * Non-fatal — proxy keeps working even if cleanup fails.
 */
export function cleanupLogs(
  maxAgeDays: number = 7,
  maxSizeMb: number = 500,
): void {
  if (!logDir || !existsSync(logDir)) {
    return;
  }

  try {
    const activeLogDir = logDir;
    const files = collectManagedLogFiles(activeLogDir).sort(
      (a, b) => a.mtime - b.mtime,
    ); // oldest first

    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let freedBytes = 0;

    // Pass 1: delete files older than maxAgeDays
    const remaining = [];
    for (const file of files) {
      if (file.mtime < cutoff) {
        unlinkSync(file.path);
        deletedCount++;
        freedBytes += file.size;
      } else {
        remaining.push(file);
      }
    }

    const bodiesDir = join(logDir, "bodies");
    if (existsSync(bodiesDir)) {
      pruneEmptyDirectories(bodiesDir, bodiesDir);
    }

    // Pass 2: if total size exceeds maxSizeMb, delete oldest until under limit
    const maxBytes = maxSizeMb * 1024 * 1024;
    let totalSize = remaining.reduce((sum, f) => sum + f.size, 0);

    while (totalSize > maxBytes && remaining.length > 0) {
      const oldest = remaining.shift();
      if (!oldest) {
        break;
      }
      unlinkSync(oldest.path);
      totalSize -= oldest.size;
      deletedCount++;
      freedBytes += oldest.size;
    }

    if (existsSync(bodiesDir)) {
      pruneEmptyDirectories(bodiesDir, bodiesDir);
    }

    if (deletedCount > 0) {
      logger.info(
        `[proxy] log cleanup: deleted ${deletedCount} file(s), freed ${(freedBytes / 1024 / 1024).toFixed(1)} MB`,
      );
    }
  } catch {
    // Non-fatal
  }
}

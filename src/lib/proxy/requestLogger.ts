/**
 * Proxy Request Logger
 * Logs proxy request/response metadata to a rotating log file.
 * Also emits OTLP log records to OpenObserve (or any OTLP-compatible backend)
 * when a LoggerProvider is configured via OpenTelemetry instrumentation.
 * Useful for debugging and auditing proxy traffic.
 */

import {
  emitProxyOtelEvent,
  getProxyOtelLogSnapshot,
  initializeProxyOtelLogs,
  isProxyOtelOnly,
  publishProxyOtelBody,
} from "./otelLogSink.js";
import { randomUUID } from "node:crypto";
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
import { writeFile } from "fs/promises";
import { setImmediate as yieldToRequests } from "node:timers/promises";
import {
  captureProxyBody,
  getBodyCaptureWorkerSnapshot,
  PROXY_BODY_CAPTURE_DEADLINE_MS,
} from "./bodyCaptureWorker.js";
import {
  prepareProxyBodyForLogging as prepareRedactedBody,
  redactProxyHeadersForLogging as redactHeaders,
  splitUtf8StringByBytes,
} from "./bodyCaptureProcessing.js";
import type {
  ManagedLogFile,
  ProxyBodyCaptureEntry,
  RequestAttemptLogEntry,
  RequestLogEntry,
  StoredBodyArtifact,
  ProcessedProxyBodyCapture,
  ProxyBodyDeliveryResult,
  ProxyRequestLoggerSnapshot,
  ProxyRequestLogSinkSnapshot,
} from "../types/index.js";
import { isBorrowedRequest } from "./shareContext.js";
import { OtelBridge } from "../observability/otelBridge.js";
import { SeverityNumber } from "@opentelemetry/api-logs";
import type { LoggerProvider } from "@opentelemetry/sdk-logs";
import { configureProxyLifecycleLogger } from "./proxyLifecycle.js";
import { notifyProxyFinalLog, notifyProxyAttemptLog } from "./proxyActivity.js";
import { withTimeout } from "../utils/async/withTimeout.js";

let logDir: string | null = null;
let logEnabled = false;
const pendingLogOperations = new Set<Promise<unknown>>();
const REQUEST_LOG_IO_TIMEOUT_MS = 5_000;
const MAX_PENDING_METADATA_RECORDS = 4_096;
const appendChains = new Map<string, Promise<void>>();
let appendMetadataFile: typeof writeFile = writeFile;
const createSinkSnapshot = (): ProxyRequestLogSinkSnapshot => ({
  attempted: 0,
  written: 0,
  inFlight: 0,
  pending: 0,
  dropped: 0,
  writeTimeouts: 0,
  unconfirmedWrites: 0,
});
const metadataSinks = {
  requests: createSinkSnapshot(),
  attempts: createSinkSnapshot(),
  debug: createSinkSnapshot(),
};

/**
 * Expose independent metadata-sink and body-capture counters for incident reconciliation.
 */
export function getRequestLoggerSnapshot(): ProxyRequestLoggerSnapshot {
  return {
    enabled: logEnabled,
    diskEnabled: logEnabled && !isProxyOtelOnly(),
    otel: getProxyOtelLogSnapshot(),
    requests: { ...metadataSinks.requests },
    attempts: { ...metadataSinks.attempts },
    debug: { ...metadataSinks.debug },
    bodyCapture: getBodyCaptureWorkerSnapshot(),
  };
}

/**
 * Serialize append ownership; capture callers retain their memory lease until the write settles.
 */
async function appendMetadataRecord(
  file: string,
  line: string,
  kind: keyof typeof metadataSinks,
  options: { waitForPersistence?: boolean } = {},
): Promise<void> {
  const sink = metadataSinks[kind];
  sink.attempted += 1;
  if (sink.pending + sink.inFlight >= MAX_PENDING_METADATA_RECORDS) {
    sink.dropped += 1;
    return;
  }
  sink.pending += 1;
  // writeFile may perform multiple append syscalls for a large record. Order
  // them per destination so concurrent records cannot interleave in this worker.
  const operation = trackLogOperation(
    (appendChains.get(file) ?? Promise.resolve()).then(async () => {
      sink.pending -= 1;
      sink.inFlight += 1;
      const timer = setTimeout(() => {
        sink.writeTimeouts += 1;
      }, REQUEST_LOG_IO_TIMEOUT_MS);
      timer.unref?.();
      try {
        await appendMetadataFile(file, line, { mode: 0o600, flag: "a" });
        sink.written += 1;
      } catch (error) {
        // A failed append may have written a prefix; never replay it.
        sink.unconfirmedWrites += 1;
        sink.lastErrorCode =
          (error as NodeJS.ErrnoException)?.code ?? "UNKNOWN";
      } finally {
        clearTimeout(timer);
        sink.inFlight -= 1;
      }
    }),
  );
  appendChains.set(file, operation);
  void operation.then(() => {
    if (appendChains.get(file) === operation) {
      appendChains.delete(file);
    }
  });
  if (options.waitForPersistence) {
    // Bulk capture owns a memory lease until publication settles. A caller
    // timeout must not release that lease while the serialized index is queued.
    return operation;
  }
  // Bound the caller's wait, not the lifetime/ownership of the underlying write.
  await withTimeout(
    operation,
    REQUEST_LOG_IO_TIMEOUT_MS,
    "Proxy metadata write remains pending",
  ).catch(() => undefined);
}

/**
 * Retain asynchronous log ownership until settlement so shutdown can await admitted publication.
 */
function trackLogOperation<T>(operation: Promise<T>): Promise<T> {
  pendingLogOperations.add(operation);
  void operation.then(
    () => pendingLogOperations.delete(operation),
    () => pendingLogOperations.delete(operation),
  );
  return operation;
}

/** Wait, up to a bounded deadline, for admitted request/body writes to settle. */
export async function flushRequestLogs(
  timeoutMs: number = PROXY_BODY_CAPTURE_DEADLINE_MS +
    2 * REQUEST_LOG_IO_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + Math.max(1, timeoutMs);
  while (pendingLogOperations.size > 0) {
    const admitted = [...pendingLogOperations];
    const remainingMs = Math.max(1, deadline - Date.now());
    await withTimeout(
      Promise.allSettled(admitted),
      remainingMs,
      `Timed out flushing ${admitted.length} proxy request log operation(s)`,
    );
    if (Date.now() >= deadline && pendingLogOperations.size > 0) {
      const remaining = pendingLogOperations.size;
      throw new Error(
        `Timed out flushing ${remaining} proxy request log operation(s)`,
      );
    }
  }
}

/** @internal Test-only hook for exercising shutdown behavior without real I/O. */
export const __requestLoggerTestHooks = {
  pendingOperationCount: () => pendingLogOperations.size,
  trackLogOperation,
  setAppendFileForTests: (writer: typeof writeFile) => {
    appendMetadataFile = writer;
  },
  restoreAppendFileForTests: () => {
    appendMetadataFile = writeFile;
  },
};

/**
 * Lazily-resolved LoggerProvider from OTel instrumentation.
 * null = not resolved yet (will retry), LoggerProvider = resolved, false = permanently unavailable.
 */
let otelLoggerProvider: LoggerProvider | null | false = null;
/** Number of times we've tried to resolve the LoggerProvider. */
let otelResolveAttempts = 0;
/** Max number of resolve attempts before giving up. */
const MAX_RESOLVE_ATTEMPTS = 10;

const BODY_OTLP_CHUNK_SIZE = 16_000;

/**
 * Initialize private request logs and preserve required lifecycle admission on startup failures.
 */
export function initRequestLogger(
  enabled: boolean = true,
  customLogsDir?: string,
): void {
  // Lifecycle metadata deliberately shares the request logger's enablement,
  // directory permissions, retention boundary, and operator privacy control.
  logEnabled = enabled;
  if (!enabled) {
    configureProxyLifecycleLogger({ enabled: false });
    return;
  }

  if (isProxyOtelOnly()) {
    initializeProxyOtelLogs();
    logDir = null;
    configureProxyLifecycleLogger({ enabled: true });
    return;
  }

  try {
    logDir = customLogsDir ?? join(homedir(), ".neurolink", "logs");
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true, mode: 0o700 });
    }
    chmodSync(logDir, 0o700);
    configureProxyLifecycleLogger({ enabled: true, logDir });
  } catch (err) {
    logEnabled = false;
    logDir = null;
    configureProxyLifecycleLogger({
      enabled: true,
      logDir: customLogsDir ?? join(homedir(), ".neurolink", "logs"),
    });
    logger.warn(
      `[proxy] Request logging disabled — failed to create log directory: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function logRequest(entry: RequestLogEntry): Promise<void> {
  entry.terminalOutcome ??=
    entry.errorType === "client_cancelled" || entry.responseStatus === 499
      ? "client_cancelled"
      : entry.errorType?.includes("stream")
        ? "stream_error"
        : entry.responseStatus >= 400 || entry.errorType
          ? "handler_error"
          : "completed";
  notifyProxyFinalLog(entry);
  if (!logEnabled || (!logDir && !isProxyOtelOnly())) {
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

  if (isProxyOtelOnly()) {
    await emitOtlpLogRecord(entry);
    return;
  }
  const logFile = join(
    logDir!,
    `proxy-${new Date().toISOString().split("T")[0]}.jsonl`,
  );
  const line = JSON.stringify(entry) + "\n";

  try {
    await appendMetadataRecord(logFile, line, "requests");
  } catch {
    // Non-fatal — don't crash proxy for logging failures
  }

  // Emit OTLP log record (additive — file logging is the primary sink)
  void emitOtlpLogRecord(entry);
}

/**
 * Log an upstream attempt separately from the final request outcome.
 * Attempt logs are local-only and must not pollute the final request summary
 * or OTLP-derived dashboard panels.
 */
export async function logRequestAttempt(
  entry: RequestAttemptLogEntry,
): Promise<void> {
  if (!entry.traceId) {
    const bridge = new OtelBridge();
    const traceCtx = bridge.getCurrentTraceContext();
    if (traceCtx) {
      entry.traceId = traceCtx.traceId;
      entry.spanId = traceCtx.spanId;
    }
  }

  notifyProxyAttemptLog(entry);
  if (!logEnabled || (!logDir && !isProxyOtelOnly())) {
    return;
  }

  if (isProxyOtelOnly()) {
    emitProxyOtelEvent("attempt", entry);
    return;
  }
  const logFile = join(
    logDir!,
    `proxy-attempts-${new Date().toISOString().split("T")[0]}.jsonl`,
  );
  const line = JSON.stringify(entry) + "\n";

  try {
    await appendMetadataRecord(logFile, line, "attempts");
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
  if (isProxyOtelOnly()) {
    return initializeProxyOtelLogs();
  }
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
function emitOtlpLogRecord(entry: RequestLogEntry): Promise<void> {
  return resolveLoggerProvider()
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
        body: isProxyOtelOnly()
          ? JSON.stringify(entry)
          : `${entry.method} ${entry.path} → ${entry.responseStatus} (${entry.responseTimeMs}ms)`,
        attributes: {
          "proxy.record_kind": "request_final",
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

          // Compact routing summary. Full candidate evidence stays in JSONL.
          ...(entry.routingDecision && {
            "routing.mode": entry.routingDecision.mode,
            "routing.strategy": entry.routingDecision.strategy,
            "routing.selection_reason": entry.routingDecision.selectionReason,
            "routing.initial_account": entry.routingDecision.initialAccount,
            "routing.candidate_count": entry.routingDecision.candidates.length,
            "routing.final_account_changed":
              entry.routingDecision.initialAccount !== entry.account &&
              entry.routingDecision.candidates.some(
                (candidate) =>
                  candidate.account === entry.account &&
                  candidate.accountType === entry.accountType,
              ),
          }),

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
export function redactProxyHeadersForLogging(
  headers: Record<string, string> | undefined,
) {
  return redactHeaders(headers);
}
/** Return a redacted body representation suitable for persisted request diagnostics. */
export function prepareProxyBodyForLogging(body: unknown) {
  return prepareRedactedBody(body);
}

/** Enumerate recognized proxy journals and body artifacts for retention accounting. */
function collectManagedLogFiles(rootDir: string): ManagedLogFile[] {
  const managedFiles: ManagedLogFile[] = [];

  /** Collect file sizes and modification times while descending the log directory. */
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      const isTopLevelProxyLog =
        directory === rootDir &&
        /^proxy(?:-attempts|-debug|-lifecycle|-supervisor)?-.*\.jsonl$/.test(
          entry.name,
        );
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

/** Publish redacted UTF-8 chunks, yielding between groups to keep requests responsive. */
function emitOtlpBodyLogRecord(
  entry: ProxyBodyCaptureEntry,
  stored: StoredBodyArtifact,
): Promise<ProxyBodyDeliveryResult | undefined> {
  return resolveLoggerProvider()
    .then(async (provider): Promise<ProxyBodyDeliveryResult | undefined> => {
      if (!provider || stored.redactedBody === undefined) {
        return undefined;
      }

      const otelLogger = provider.getLogger("neurolink-proxy-bodies", "1.0.0");
      const captureId = entry.captureId ?? randomUUID();
      const emit = (
        chunk: string,
        chunkIndex: number,
        totalChunks: number,
      ): void => {
        otelLogger.emit({
          severityNumber:
            (entry.responseStatus ?? 0) >= 400
              ? SeverityNumber.WARN
              : SeverityNumber.INFO,
          severityText: (entry.responseStatus ?? 0) >= 400 ? "WARN" : "INFO",
          body: chunk,
          attributes: {
            "event.name": "proxy.body_capture",
            "proxy.record_kind": "body",
            "request.id": entry.requestId,
            "body.phase": entry.phase,
            "body.capture_id": captureId,
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
      };
      if (isProxyOtelOnly()) {
        return publishProxyOtelBody(captureId, stored.redactedBody, emit);
      }
      const chunks = splitUtf8StringByBytes(
        stored.redactedBody,
        BODY_OTLP_CHUNK_SIZE,
      );
      for (let i = 0; i < chunks.length; i++) {
        if (i > 0 && i % 4 === 0) {
          await yieldToRequests();
        }
        emit(chunks[i], i, chunks.length);
      }
      return undefined;
    })
    .catch(() => {
      // Non-fatal — never crash proxy for OTLP log failures
      return undefined;
    });
}

/** Capture an owned request body with bounded processing and tracked index/export publication. */
export async function logBodyCapture(
  entry: ProxyBodyCaptureEntry,
): Promise<void> {
  if (!logEnabled || (!logDir && !isProxyOtelOnly())) {
    return;
  }
  // Borrowed traffic is somebody else's conversation. Capturing it would leave
  // a peer's prompts and the model's replies on this machine's disk, which is
  // not something a share token can be read as consenting to. The request is
  // still logged; only the bodies are dropped.
  if (isBorrowedRequest()) {
    return;
  }

  const bridge = new OtelBridge();
  const traceCtx =
    entry.traceId && entry.spanId
      ? { traceId: entry.traceId, spanId: entry.spanId }
      : bridge.getCurrentTraceContext();
  const destination = logDir;
  // Publication callbacks retain metadata and the bounded redacted result,
  // never the original unbounded body while a sink is slow.
  const metadata = {
    ...entry,
    captureId: entry.captureId ?? randomUUID(),
    body: undefined,
  };
  /** Persist the processed capture index and publish its redacted body before releasing capacity. */
  const consume = async (
    processed: ProcessedProxyBodyCapture,
  ): Promise<void> => {
    const redactedHeaders = processed.headers;
    const stored = processed.stored;

    const dateStr = new Date(metadata.timestamp).toISOString().split("T")[0];
    const logFile = destination
      ? join(destination, `proxy-debug-${dateStr}.jsonl`)
      : undefined;
    const indexEntry: Record<string, unknown> = {
      timestamp: metadata.timestamp,
      type: "body_capture",
      requestId: metadata.requestId,
      captureId: metadata.captureId,
      phase: metadata.phase,
      model: metadata.model,
      stream: metadata.stream,
      headers: redactedHeaders,
      contentType: metadata.contentType,
      responseStatus: metadata.responseStatus,
      durationMs: metadata.durationMs,
      account: metadata.account,
      accountType: metadata.accountType,
      attempt: metadata.attempt,
      bodyPath: stored.bodyPath,
      bodySha256: stored.bodySha256,
      observedBodyBytes: metadata.bodySize,
      redactedBodyBytes: stored.redactedBodyBytes,
      storedFileBytes: stored.storedFileBytes,
      bodyTruncated: stored.bodyTruncated,
      bodyCaptureLimitBytes: stored.bodyCaptureLimitBytes,
      originalRedactedBodyBytes: stored.originalRedactedBodyBytes,
      bodyWriteFailed: stored.bodyWriteFailed,
      captureError: processed.error,
      captureQueueWaitMs: processed.queueWaitMs,
      captureProcessingMs: processed.processingMs,
      metadata: processed.error ? undefined : metadata.metadata,
    };

    if (traceCtx) {
      indexEntry.traceId = traceCtx.traceId;
      indexEntry.spanId = traceCtx.spanId;
    }

    if (isProxyOtelOnly()) {
      const delivery = await emitOtlpBodyLogRecord(
        {
          ...metadata,
          traceId: traceCtx?.traceId ?? metadata.traceId,
          spanId: traceCtx?.spanId ?? metadata.spanId,
        },
        stored,
      );
      indexEntry.bodyDelivery = delivery ?? {
        status: processed.error
          ? "capture_rejected"
          : stored.redactedBody === undefined
            ? "no_body"
            : "export_unconfirmed",
        ...(processed.error ? { reason: processed.error } : {}),
      };
      emitProxyOtelEvent("body_capture_index", indexEntry);
      return;
    }
    try {
      if (logFile) {
        await appendMetadataRecord(
          logFile,
          JSON.stringify(indexEntry) + "\n",
          "debug",
          { waitForPersistence: true },
        );
      }
    } catch {
      // Non-fatal
    }

    // Emission yields between chunk groups. Keep it in the shutdown flush set
    // so an exporter flush cannot race unfinished body-log publication.
    await emitOtlpBodyLogRecord(
      {
        ...metadata,
        traceId: traceCtx?.traceId ?? metadata.traceId,
        spanId: traceCtx?.spanId ?? metadata.spanId,
      },
      stored,
    );
  };
  const operation = trackLogOperation(
    captureProxyBody(entry, destination, consume),
  );
  // HTTP handlers may await this function. Collector latency must never hold
  // their response open; shutdown uses flushRequestLogs as the completion fence.
  if (isProxyOtelOnly()) {
    void operation;
    return;
  }
  return operation;
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
  if (!logEnabled || (!logDir && !isProxyOtelOnly())) {
    return;
  }

  const bridge = new OtelBridge();
  const traceCtx = bridge.getCurrentTraceContext();

  const logEntry: Record<string, unknown> = {
    ...entry,
    responseStatus: 200,
    terminalStatus: 502,
    terminalOutcome: "stream_error",
    errorType: "stream_error",
    note: "mid-stream failure after initial 200",
  };
  if (traceCtx) {
    logEntry.traceId = traceCtx.traceId;
    logEntry.spanId = traceCtx.spanId;
  }

  if (isProxyOtelOnly()) {
    emitProxyOtelEvent("stream_error", logEntry);
    return;
  }
  const logFile = join(
    logDir!,
    `proxy-${new Date().toISOString().split("T")[0]}.jsonl`,
  );
  try {
    await appendMetadataRecord(
      logFile,
      JSON.stringify(logEntry) + "\n",
      "requests",
    );
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
  if (!logDir) {
    return;
  }

  try {
    cleanupLogsAt(logDir, maxAgeDays, maxSizeMb);
  } catch {
    // Non-fatal for legacy in-process callers.
  }
}

/**
 * Path-scoped retention implementation used by the proxy cleanup worker.
 * This function is intentionally synchronous: callers must run it outside the
 * request-serving process when the directory can contain many artifacts.
 */
export function cleanupLogsAt(
  activeLogDir: string,
  maxAgeDays: number = 7,
  maxSizeMb: number = 500,
): void {
  if (!existsSync(activeLogDir)) {
    return;
  }

  const files = collectManagedLogFiles(activeLogDir).sort(
    (a, b) => a.mtime - b.mtime,
  ); // oldest first
  const currentDate = new Date().toISOString().split("T")[0];
  const currentMetadataLogs = new Set(
    [
      "proxy",
      "proxy-attempts",
      "proxy-debug",
      "proxy-lifecycle",
      "proxy-supervisor",
    ].map((prefix) => join(activeLogDir, `${prefix}-${currentDate}.jsonl`)),
  );
  const canDelete = (file: ManagedLogFile) =>
    !currentMetadataLogs.has(file.path);

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  let freedBytes = 0;

  // Pass 1: delete files older than maxAgeDays
  const remaining = [];
  for (const file of files) {
    if (file.mtime < cutoff && canDelete(file)) {
      unlinkSync(file.path);
      deletedCount++;
      freedBytes += file.size;
    } else {
      remaining.push(file);
    }
  }

  const bodiesDir = join(activeLogDir, "bodies");
  if (existsSync(bodiesDir)) {
    pruneEmptyDirectories(bodiesDir, bodiesDir);
  }

  // Pass 2: if total size exceeds maxSizeMb, delete oldest until under limit
  const maxBytes = maxSizeMb * 1024 * 1024;
  let totalSize = remaining.reduce((sum, f) => sum + f.size, 0);
  const deletionCandidates = remaining.filter(canDelete);

  // Current-day metadata is the only reliable source for final-request,
  // attempt, lifecycle, and body-index reconciliation. Keep those indexes
  // intact during size cleanup; body artifacts and older indexes remain
  // eligible for eviction.
  while (totalSize > maxBytes && deletionCandidates.length > 0) {
    const oldest = deletionCandidates.shift();
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
}

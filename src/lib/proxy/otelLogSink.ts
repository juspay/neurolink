/* eslint-disable no-console -- This proxy-only sink replaces console methods with OTLP emission. */
import { inspect } from "node:util";
import { randomUUID } from "node:crypto";
import {
  getProxyRequestTraceContext,
  proxyLogContext,
} from "./proxyTraceContext.js";
import { setImmediate as yieldToRequests } from "node:timers/promises";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { ExportResultCode } from "@opentelemetry/core";
import type { ExportResult } from "@opentelemetry/core";
import {
  createProxyOtlpLogTransport,
  getProxyOtlpRetryAfter,
} from "./otlpLogTransport.js";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import type {
  LogRecordExporter,
  LogRecordProcessor,
  ReadableLogRecord,
} from "@opentelemetry/sdk-logs";
import { sanitizeForLog } from "../utils/logSanitize.js";
import { splitUtf8StringByBytes } from "./bodyCaptureProcessing.js";
import type {
  ProxyBodyChunkEmitter,
  ProxyBodyDeliveryResult,
  ProxyBodyPublicationProgress,
  ProxyOtelExportFailure,
} from "../types/index.js";

let provider: LoggerProvider | undefined;
let restoreConsole: (() => void) | undefined;
const queues: Array<ReturnType<typeof createTrackedProcessor>> = [];
const bodyPublications = new Map<string, ProxyBodyPublicationProgress>();
const bodyPublicationDeadlines = new WeakMap<
  ProxyBodyPublicationProgress,
  number
>();
const bodyPublicationOperations = new Set<Promise<ProxyBodyDeliveryResult>>();
let shuttingDown = false;
const BODY_OTLP_CHUNK_SIZE = 128 * 1024;
const OTLP_EXPORT_TIMEOUT_MS = 30_000;
const OTLP_EXPORT_CALLBACK_DEADLINE_MS = OTLP_EXPORT_TIMEOUT_MS + 1_000;
const BODY_PUBLICATION_ACTIVE_DEADLINE_MS = 20_000;
const METADATA_RETENTION_MS = 120_000;
const DIAGNOSTIC_KINDS = new Set(["console", "runtime", "telemetry_delivery"]);

/** Payload accounting includes UTF-8 attributes and fixed per-record overhead. */
function retainedRecordBytes(record: ReadableLogRecord): number {
  try {
    return (
      512 +
      Buffer.byteLength(
        typeof record.body === "string"
          ? record.body
          : (JSON.stringify(record.body) ?? ""),
        "utf8",
      ) +
      Buffer.byteLength(JSON.stringify(record.attributes), "utf8")
    );
  } catch {
    return Infinity;
  }
}
const bodyDelivery = {
  attempted: 0,
  transportAcknowledged: 0,
  exportUnconfirmed: 0,
  rejected: 0,
  partial: 0,
  pending: 0,
  pendingBytes: 0,
  highWaterPending: 0,
  highWaterBytes: 0,
  maxPending: 64,
  maxPendingBytes: 32 * 1024 * 1024,
};

/** Explicit opt-in; configuration never silently falls back to file logging. */
export function isProxyOtelOnly(): boolean {
  return process.env.NEUROLINK_PROXY_LOG_SINK === "otel";
}

/** Reserve capacity including exports in flight, independently for metadata and bodies. */
function createTrackedProcessor(
  url: string,
  capacity: number,
  kind: "metadata" | "indexes" | "bodies" | "diagnostics",
  byteCapacity: number,
) {
  const unsettled = new Set<ReadableLogRecord>();
  const enqueuedAt = new WeakMap<ReadableLogRecord, number>();
  const retainedBytes = new WeakMap<ReadableLogRecord, number>();
  const stopRetentionWaiters = new Set<() => void>();
  const retentionMs =
    kind === "metadata" || kind === "indexes" ? METADATA_RETENTION_MS : 0;
  const capacityWaiters = new Set<() => void>();
  const flushWaiters = new Set<() => void>();
  const state = {
    attempted: 0,
    submitted: 0,
    transportAcknowledged: 0,
    exportUnconfirmed: 0,
    dropped: 0,
    outstanding: 0,
    outstandingBytes: 0,
    highWaterBytes: 0,
    byteLimitDrops: 0,
    retryingRecords: 0,
    retriedBatches: 0,
    retentionExpired: 0,
    lastTransientFailureAt: undefined as string | undefined,
    lastAcknowledgedAt: undefined as string | undefined,
    lastFailureAt: undefined as string | undefined,
    highWaterOutstanding: 0,
    recentFailures: [] as ProxyOtelExportFailure[],
    failureHistoryEvicted: 0,
  };
  const diagnostics: ProxyOtelExportFailure[] = [];
  let diagnosticScheduled = false;
  const rememberFailure = (
    records: ReadableLogRecord[],
    reason: ProxyOtelExportFailure["reason"],
    error?: Error,
  ): void => {
    const stringAttribute = (
      record: ReadableLogRecord,
      name: string,
    ): string | undefined => {
      const value = record.attributes[name];
      return typeof value === "string" ? value.slice(0, 128) : undefined;
    };
    const failure: ProxyOtelExportFailure = {
      id: randomUUID(),
      at: new Date().toISOString(),
      reason,
      ...(error ? { error: sanitizeForLog(error.message).slice(0, 256) } : {}),
      records: records.slice(0, 64).map((record) => ({
        eventId: stringAttribute(record, "proxy.event_id") ?? "unavailable",
        kind: stringAttribute(record, "proxy.record_kind"),
        requestId: stringAttribute(record, "request.id"),
        captureId: stringAttribute(record, "body.capture_id"),
      })),
    };
    if (state.recentFailures.length === 16) {
      state.recentFailures.shift();
      state.failureHistoryEvicted++;
    }
    state.recentFailures.push(failure);
    // A failed diagnostic must not generate another diagnostic recursively.
    if (
      records.some(
        (record) =>
          record.attributes["proxy.record_kind"] !== "telemetry_delivery",
      )
    ) {
      if (diagnostics.length === 16) {
        diagnostics.shift();
      }
      diagnostics.push(failure);
    }
  };
  const publishRecoveredDiagnostics = (): void => {
    if (diagnosticScheduled || !diagnostics.length || shuttingDown) {
      return;
    }
    diagnosticScheduled = true;
    queueMicrotask(() => {
      diagnosticScheduled = false;
      for (const failure of diagnostics.splice(0)) {
        emitProxyOtelEvent("telemetry_delivery", { queue: kind, ...failure });
      }
    });
  };
  const transport = createProxyOtlpLogTransport(url, OTLP_EXPORT_TIMEOUT_MS);
  const exporter: LogRecordExporter = {
    export(records, callback) {
      const exportStartedAt = performance.now();
      for (const record of records) {
        const id = record.attributes["body.capture_id"];
        const publication =
          typeof id === "string" ? bodyPublications.get(id) : undefined;
        if (publication) {
          publication.maxChunkQueueWaitMs = Math.max(
            publication.maxChunkQueueWaitMs ?? 0,
            exportStartedAt - (enqueuedAt.get(record) ?? exportStartedAt),
          );
        }
      }
      let settled = false;
      let retrying = false;
      let retryTimer: NodeJS.Timeout | undefined;
      let deadline: NodeJS.Timeout | undefined;
      let lastFailure: ExportResult | undefined;
      let attempt = 0;
      const oldestEnqueuedAt = Math.min(
        ...records.map((record) => enqueuedAt.get(record) ?? exportStartedAt),
      );
      const retainUntil = oldestEnqueuedAt + retentionMs;
      const stopRetention = (): void => {
        // Only a waiting retry is settled early. An active HTTP export keeps
        // ownership until its callback/deadline so capacity stays truthful.
        if (retryTimer && lastFailure) {
          settle(lastFailure);
        }
      };
      stopRetentionWaiters.add(stopRetention);
      const settle = (result: ExportResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(deadline);
        clearTimeout(retryTimer);
        stopRetentionWaiters.delete(stopRetention);
        if (retrying) {
          state.retryingRecords -= records.length;
        }
        state.outstanding -= records.length;
        if (result.code === ExportResultCode.SUCCESS) {
          state.transportAcknowledged += records.length;
          state.lastAcknowledgedAt = new Date().toISOString();
          publishRecoveredDiagnostics();
        } else {
          state.exportUnconfirmed += records.length;
          state.lastFailureAt = new Date().toISOString();
          rememberFailure(records, "export_unconfirmed", result.error);
        }
        for (const record of records) {
          unsettled.delete(record);
          state.outstandingBytes -= retainedBytes.get(record) ?? 0;
          const id = record.attributes?.["body.capture_id"];
          const publication =
            typeof id === "string" ? bodyPublications.get(id) : undefined;
          if (publication) {
            publication.maxChunkExportMs = Math.max(
              publication.maxChunkExportMs ?? 0,
              performance.now() - exportStartedAt,
            );
            const activeDeadline = bodyPublicationDeadlines.get(publication);
            if (
              result.code === ExportResultCode.SUCCESS &&
              (activeDeadline === undefined || Date.now() < activeDeadline)
            ) {
              publication.acknowledged++;
            } else {
              publication.unconfirmed++;
            }
            publication.notify?.();
          }
        }
        for (const notify of capacityWaiters) {
          notify();
        }
        for (const notify of flushWaiters) {
          notify();
        }
        callback(result);
      };
      const send = (): void => {
        retryTimer = undefined;
        if (retentionMs && performance.now() >= retainUntil) {
          state.retentionExpired += records.length;
          settle({
            code: ExportResultCode.FAILED,
            error: new Error("OTLP metadata retention budget exceeded"),
          });
          return;
        }
        attempt++;
        if (attempt > 1) {
          state.retriedBatches++;
        }
        let attemptSettled = false;
        const completed = (result: ExportResult): void => {
          if (attemptSettled || settled) {
            return;
          }
          attemptSettled = true;
          clearTimeout(deadline);
          const retryAfter =
            result.code === ExportResultCode.FAILED
              ? getProxyOtlpRetryAfter(result.error)
              : undefined;
          if (retentionMs && retryAfter !== undefined && !shuttingDown) {
            state.lastTransientFailureAt = new Date().toISOString();
            const wait = Math.max(
              retryAfter,
              Math.min(10_000, 1000 * 2 ** Math.min(attempt - 1, 4)) *
                (0.8 + Math.random() * 0.4),
            );
            if (performance.now() + wait < retainUntil) {
              if (!retrying) {
                retrying = true;
                state.retryingRecords += records.length;
              }
              lastFailure = result;
              retryTimer = setTimeout(send, wait);
              retryTimer.unref();
              return;
            }
            state.retentionExpired += records.length;
          }
          settle(result);
        };
        deadline = setTimeout(
          () =>
            completed({
              code: ExportResultCode.FAILED,
              error: new Error("OTLP export callback deadline exceeded"),
            }),
          OTLP_EXPORT_CALLBACK_DEADLINE_MS,
        );
        deadline.unref();
        try {
          transport.export(records, completed);
        } catch (error) {
          completed({
            code: ExportResultCode.FAILED,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      };
      send();
    },
    shutdown: () => transport.shutdown(),
  };
  const batch = new BatchLogRecordProcessor(exporter, {
    maxQueueSize: capacity,
    maxExportBatchSize: 64,
    scheduledDelayMillis: kind === "bodies" ? 25 : 1000,
    exportTimeoutMillis: retentionMs + OTLP_EXPORT_CALLBACK_DEADLINE_MS + 1000,
  });
  const processor: LogRecordProcessor = {
    onEmit(record) {
      record.attributes["proxy.event_id"] ??= randomUUID();
      state.attempted++;
      const id = record.attributes?.["body.capture_id"];
      const publication =
        typeof id === "string" ? bodyPublications.get(id) : undefined;
      if (publication) {
        publication.emitted++;
      }
      const bytes = retainedRecordBytes(record);
      if (
        state.outstanding >= capacity ||
        state.outstandingBytes + bytes > byteCapacity
      ) {
        state.dropped++;
        if (state.outstandingBytes + bytes > byteCapacity) {
          state.byteLimitDrops++;
        }
        rememberFailure([record], "queue_full");
        if (publication) {
          publication.dropped++;
          publication.notify?.();
        }
        return;
      }
      state.submitted++;
      state.outstanding++;
      state.outstandingBytes += bytes;
      state.highWaterBytes = Math.max(
        state.highWaterBytes,
        state.outstandingBytes,
      );
      retainedBytes.set(record, bytes);
      unsettled.add(record);
      enqueuedAt.set(record, performance.now());
      state.highWaterOutstanding = Math.max(
        state.highWaterOutstanding,
        state.outstanding,
      );
      batch.onEmit(record);
    },
    forceFlush: async () => {
      const boundary = new Set(unsettled);
      try {
        await batch.forceFlush();
      } finally {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (![...boundary].some((record) => unsettled.has(record))) {
              flushWaiters.delete(check);
              resolve();
            }
          };
          flushWaiters.add(check);
          check();
        });
      }
    },
    shutdown: async () => {
      try {
        await processor.forceFlush();
      } finally {
        await batch.shutdown();
      }
    },
  };
  /** Wait for a shared queue slot without force-flushing or owning another capture. */
  const waitForCapacity = (deadline: number): Promise<boolean> =>
    new Promise((resolve) => {
      const timer = setTimeout(
        () => finish(false),
        Math.max(0, deadline - Date.now()),
      );
      timer.unref?.();
      const finish = (available: boolean) => {
        clearTimeout(timer);
        capacityWaiters.delete(check);
        resolve(available);
      };
      const check = () => {
        if (Date.now() >= deadline) {
          finish(false);
        } else if (state.outstanding < capacity) {
          finish(true);
        }
      };
      capacityWaiters.add(check);
      check();
    });
  return {
    state,
    processor,
    capacity,
    byteCapacity,
    retentionMs,
    kind,
    waitForCapacity,
    abortPending: () => transport.abortPending(),
    stopRetention: () => {
      for (const stop of stopRetentionWaiters) {
        stop();
      }
    },
    oldestOutstandingAgeMs: () => {
      let oldest = performance.now();
      for (const record of unsettled) {
        oldest = Math.min(oldest, enqueuedAt.get(record) ?? oldest);
      }
      return unsettled.size ? Math.max(0, performance.now() - oldest) : 0;
    },
  };
}

/**
 * Publish bounded captures concurrently into a shared batch queue. Transport
 * callbacks settle each chunk once; a flush is a process fence, not a per-body
 * network round trip. Metadata has a separate queue and transport.
 */
export async function publishProxyOtelBody(
  captureId: string,
  body: string,
  emit: ProxyBodyChunkEmitter,
): Promise<ProxyBodyDeliveryResult> {
  bodyDelivery.attempted++;
  const bytes = Buffer.byteLength(body, "utf8");
  if (
    !provider ||
    shuttingDown ||
    bodyPublications.has(captureId) ||
    bodyDelivery.pending >= bodyDelivery.maxPending ||
    bodyDelivery.pendingBytes + bytes > bodyDelivery.maxPendingBytes
  ) {
    bodyDelivery.rejected++;
    return {
      status: "rejected",
      acknowledgedChunks: 0,
      unconfirmedChunks: 0,
      droppedChunks: 0,
      reason: bodyPublications.has(captureId)
        ? "body_capture_id_in_use"
        : !provider || shuttingDown
          ? "body_exporter_unavailable"
          : "body_publication_queue_full",
    };
  }
  bodyDelivery.pending++;
  bodyDelivery.pendingBytes += bytes;
  bodyDelivery.highWaterPending = Math.max(
    bodyDelivery.highWaterPending,
    bodyDelivery.pending,
  );
  bodyDelivery.highWaterBytes = Math.max(
    bodyDelivery.highWaterBytes,
    bodyDelivery.pendingBytes,
  );
  const progress: ProxyBodyPublicationProgress = {
    acknowledged: 0,
    unconfirmed: 0,
    dropped: 0,
    emitted: 0,
  };
  bodyPublications.set(captureId, progress);
  let deferredRelease: Promise<void> | undefined;
  const operation = (async (): Promise<ProxyBodyDeliveryResult> => {
    const queue = queues.find((candidate) => candidate.kind === "bodies");
    if (!queue) {
      return {
        status: "rejected",
        acknowledgedChunks: 0,
        unconfirmedChunks: 0,
        droppedChunks: 0,
        reason: "body_exporter_unavailable",
      };
    }
    const startedAt = performance.now();
    const deadline = Date.now() + BODY_PUBLICATION_ACTIVE_DEADLINE_MS;
    bodyPublicationDeadlines.set(progress, deadline);
    const chunks = splitUtf8StringByBytes(body, BODY_OTLP_CHUNK_SIZE);
    let capacityWaitMs = 0;
    let reason: string | undefined;
    try {
      for (let index = 0; index < chunks.length; index++) {
        while (queue.state.outstanding >= queue.capacity) {
          const waitingAt = performance.now();
          const available = await queue.waitForCapacity(deadline);
          capacityWaitMs += performance.now() - waitingAt;
          if (!available) {
            reason = "body_publication_deadline";
            break;
          }
        }
        if (Date.now() >= deadline) {
          reason = "body_publication_deadline";
          break;
        }
        emit(chunks[index], index, chunks.length);
        // Multiple waiters can wake together; the next iteration checks the
        // shared capacity synchronously before emitting its next chunk.
        if (index % 4 === 3) {
          await yieldToRequests();
        }
      }
    } catch {
      reason = "body_publication_failed";
    }
    const settlement = new Promise<void>((resolve) => {
      const check = () => {
        if (
          progress.acknowledged + progress.unconfirmed + progress.dropped >=
          progress.emitted
        ) {
          progress.notify = undefined;
          resolve();
        }
      };
      progress.notify = check;
      check();
    });
    let timer: NodeJS.Timeout | undefined;
    const completed = await Promise.race([
      settlement.then(() => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(
          () => resolve(false),
          Math.max(0, deadline - Date.now()),
        );
        timer.unref?.();
      }),
    ]).finally(() => clearTimeout(timer));
    if (!completed) {
      // Keep identity/bytes until the real callback or callback deadline settles
      // submitted chunks. Late success cannot rewrite an uncertainty result.
      deferredRelease = settlement;
    }
    if (!completed || Date.now() >= deadline) {
      reason ??= "body_publication_deadline";
    }
    if (!reason && progress.unconfirmed) {
      reason = "body_export_unconfirmed";
    } else if (!reason && progress.dropped) {
      reason = "body_export_queue_full";
    }
    const pending = Math.max(
      0,
      progress.emitted -
        progress.acknowledged -
        progress.unconfirmed -
        progress.dropped,
    );
    const unconfirmedChunks = progress.unconfirmed + pending;
    const status =
      progress.emitted === 0
        ? "rejected"
        : progress.dropped || progress.emitted !== chunks.length
          ? "partial"
          : unconfirmedChunks
            ? "export_unconfirmed"
            : "transport_acknowledged";
    return {
      status,
      expectedChunks: chunks.length,
      acknowledgedChunks: progress.acknowledged,
      unconfirmedChunks,
      droppedChunks: progress.dropped,
      notSubmittedChunks: chunks.length - progress.emitted,
      publicationMs: performance.now() - startedAt,
      capacityWaitMs,
      maxChunkQueueWaitMs: progress.maxChunkQueueWaitMs ?? 0,
      maxChunkExportMs: progress.maxChunkExportMs ?? 0,
      ...(reason ? { reason } : {}),
    };
  })();
  bodyPublicationOperations.add(operation);
  try {
    const result = await operation;
    if (result.status === "transport_acknowledged") {
      bodyDelivery.transportAcknowledged++;
    } else if (result.status === "export_unconfirmed") {
      bodyDelivery.exportUnconfirmed++;
    } else if (result.status === "rejected") {
      bodyDelivery.rejected++;
    } else {
      bodyDelivery.partial++;
    }
    return result;
  } finally {
    bodyPublicationOperations.delete(operation);
    const release = () => {
      bodyPublications.delete(captureId);
      bodyDelivery.pending--;
      bodyDelivery.pendingBytes -= bytes;
    };
    if (deferredRelease) {
      void deferredRelease.then(release, release);
    } else {
      release();
    }
  }
}

/** Initialize a log-only provider in every proxy process, including the supervisor. */
export function initializeProxyOtelLogs(
  role = "worker",
): LoggerProvider | undefined {
  if (!isProxyOtelOnly()) {
    return undefined;
  }
  if (provider) {
    return provider;
  }
  const endpoint =
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ??
    (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/logs`
      : undefined);
  if (!endpoint) {
    throw new Error("OTel-only proxy logging requires an OTLP endpoint");
  }
  const bodyEndpoint =
    process.env.NEUROLINK_PROXY_OTLP_BODIES_ENDPOINT ?? endpoint;
  for (const target of [endpoint, bodyEndpoint]) {
    const url = new URL(target);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Proxy OTLP logs endpoint must use HTTP or HTTPS");
    }
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.protocol === "http:" && !loopback) {
      throw new Error(
        "Proxy OTLP logs require HTTPS for non-loopback collectors",
      );
    }
  }
  const metadata = createTrackedProcessor(
    endpoint,
    2048,
    "metadata",
    8 * 1024 * 1024,
  );
  const bodies = createTrackedProcessor(
    bodyEndpoint,
    256,
    "bodies",
    40 * 1024 * 1024,
  );
  const diagnostics = createTrackedProcessor(
    endpoint,
    512,
    "diagnostics",
    2 * 1024 * 1024,
  );
  const indexes = createTrackedProcessor(
    endpoint,
    1024,
    "indexes",
    8 * 1024 * 1024,
  );
  queues.push(metadata, bodies, diagnostics, indexes);
  provider = new LoggerProvider({
    forceFlushTimeoutMillis:
      METADATA_RETENTION_MS + OTLP_EXPORT_CALLBACK_DEADLINE_MS + 2000,
    resource: resourceFromAttributes({
      "service.name": process.env.OTEL_SERVICE_NAME ?? "neurolink-proxy",
      "service.instance.id": `${role}-${process.pid}`,
      "process.pid": process.pid,
      "proxy.process.role": role,
    }),
    processors: [
      {
        onEmit(record, context) {
          (record.attributes?.["proxy.record_kind"] === "body"
            ? bodies
            : record.attributes?.["proxy.record_kind"] === "body_capture_index"
              ? indexes
              : record.attributes?.["proxy.lifecycle.event"] ===
                    "runtime_sample" ||
                  DIAGNOSTIC_KINDS.has(
                    String(record.attributes?.["proxy.record_kind"]),
                  )
                ? diagnostics
                : metadata
          ).processor.onEmit(record, context);
        },
        forceFlush: async () => {
          await Promise.all(queues.map((q) => q.processor.forceFlush()));
        },
        shutdown: async () => {
          await Promise.all(queues.map((q) => q.processor.shutdown()));
        },
      },
    ],
  });
  return provider;
}

/** Structured evidence without final-request dashboard fields on auxiliary events. */
export function emitProxyOtelEvent(
  kind: string,
  record: Record<string, unknown>,
): void {
  if (!isProxyOtelOnly()) {
    return;
  }
  try {
    const ids =
      typeof record.requestId === "string" && !record.traceId
        ? getProxyRequestTraceContext(record.requestId)
        : undefined;
    const correlated = ids ? { ...record, ...ids } : record;
    initializeProxyOtelLogs()
      ?.getLogger("neurolink-proxy-events")
      .emit({
        context: proxyLogContext(correlated),
        severityNumber: SeverityNumber.INFO,
        severityText: "INFO",
        body: JSON.stringify(correlated),
        attributes: {
          "proxy.record_kind": kind,
          "event.name": `proxy.${kind}`,
          ...(typeof record.requestId === "string"
            ? { "request.id": record.requestId }
            : {}),
          ...(typeof record.event === "string"
            ? { "proxy.lifecycle.event": record.event }
            : {}),
        },
      });
  } catch {
    // Telemetry must never fail a model request. Invalid records are observable.
    invalidRecords++;
  }
}
let invalidRecords = 0;

/** Capture application console diagnostics only inside proxy service processes. */
export function routeProxyConsoleToOtel(): void {
  if (!isProxyOtelOnly() || restoreConsole) {
    return;
  }
  initializeProxyOtelLogs();
  const originals = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };
  let emitting = false;
  for (const level of Object.keys(originals) as Array<keyof typeof originals>) {
    console[level] = (...args: unknown[]) => {
      if (emitting) {
        return;
      }
      emitting = true;
      try {
        const body = args
          .map((value) =>
            typeof value === "string"
              ? value
              : inspect(value, {
                  depth: 4,
                  maxArrayLength: 30,
                  maxStringLength: 16000,
                }),
          )
          .join(" ");
        provider?.getLogger("neurolink-proxy-console").emit({
          body: sanitizeForLog(body, 32000),
          severityText: level.toUpperCase(),
          severityNumber:
            level === "error"
              ? SeverityNumber.ERROR
              : level === "warn"
                ? SeverityNumber.WARN
                : level === "debug"
                  ? SeverityNumber.DEBUG
                  : SeverityNumber.INFO,
          attributes: { "proxy.record_kind": "console" },
        });
      } catch {
        invalidRecords++;
      } finally {
        emitting = false;
      }
    };
  }
  restoreConsole = () => Object.assign(console, originals);
}

/** Counters acknowledge collector transport only, never backend persistence. */
export function getProxyOtelLogSnapshot() {
  return {
    mode: isProxyOtelOnly() ? "otel" : "file-and-otel",
    initialized: provider !== undefined,
    deliveryGuarantee:
      "best-effort; HTTP success is not per-record acceptance or backend persistence",
    invalidRecords,
    bodyDelivery: { ...bodyDelivery },
    queues: queues.map((q) => ({
      kind: q.kind,
      capacity: q.capacity,
      byteCapacity: q.byteCapacity,
      retentionMs: q.retentionMs,
      oldestOutstandingAgeMs: q.oldestOutstandingAgeMs(),
      ...q.state,
      recentFailures: q.state.recentFailures.map((failure) => ({
        ...failure,
        records: failure.records.map((record) => ({ ...record })),
      })),
    })),
  };
}

/** Bounded provider flush belongs after final request and lifecycle publication. */
export async function flushProxyOtelLogs(): Promise<void> {
  await Promise.allSettled([...bodyPublicationOperations]);
  await provider?.forceFlush();
}

/** Release this process's exporter and restore console ownership. */
export async function shutdownProxyOtelLogs(): Promise<void> {
  shuttingDown = true;
  for (const queue of queues) {
    queue.stopRetention();
  }
  // Service cleanup gives telemetry five seconds. End waiting retries now,
  // then let healthy exports drain; cancel unfinished HTTP work before that
  // outer deadline. Cancellation remains unconfirmed, never acknowledged.
  const deadline = setTimeout(() => {
    for (const queue of queues) {
      queue.abortPending();
    }
  }, 4000);
  deadline.unref();
  try {
    await Promise.allSettled([...bodyPublicationOperations]);
    restoreConsole?.();
    restoreConsole = undefined;
    await provider?.shutdown();
  } finally {
    clearTimeout(deadline);
  }
  provider = undefined;
  queues.length = 0;
  invalidRecords = 0;
  bodyPublications.clear();
  bodyPublicationOperations.clear();
  shuttingDown = false;
  for (const key of [
    "attempted",
    "transportAcknowledged",
    "exportUnconfirmed",
    "rejected",
    "partial",
    "pending",
    "pendingBytes",
    "highWaterPending",
    "highWaterBytes",
  ] as const) {
    bodyDelivery[key] = 0;
  }
}

/** Flush short-lived proxy command diagnostics on every normal return or exception. */
export function withProxyOtelLogShutdown<TArg>(
  handler: (arg: TArg) => Promise<void>,
): (arg: TArg) => Promise<void> {
  return async (arg) => {
    try {
      await handler(arg);
    } finally {
      await shutdownProxyOtelLogs().catch(() => undefined);
    }
  };
}

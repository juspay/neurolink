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
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
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
let bodyPublicationChain = Promise.resolve();
let shuttingDown = false;
const BODY_OTLP_CHUNK_SIZE = 128 * 1024;
const OTLP_EXPORT_TIMEOUT_MS = 30_000;
const OTLP_EXPORT_CALLBACK_DEADLINE_MS = OTLP_EXPORT_TIMEOUT_MS + 1_000;
const BODY_PUBLICATION_ACTIVE_DEADLINE_MS = 20_000;
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
  kind: "metadata" | "bodies",
) {
  const unsettled = new Set<ReadableLogRecord>();
  const flushWaiters = new Set<() => void>();
  const state = {
    attempted: 0,
    submitted: 0,
    transportAcknowledged: 0,
    exportUnconfirmed: 0,
    dropped: 0,
    outstanding: 0,
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
  const transport = new OTLPLogExporter({
    url,
    timeoutMillis: OTLP_EXPORT_TIMEOUT_MS,
  });
  const exporter: LogRecordExporter = {
    export(records, callback) {
      let settled = false;
      const deadline = setTimeout(
        () =>
          settle({
            code: ExportResultCode.FAILED,
            error: new Error("OTLP export callback deadline exceeded"),
          }),
        OTLP_EXPORT_CALLBACK_DEADLINE_MS,
      );
      deadline.unref();
      const settle = (result: ExportResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(deadline);
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
          const id = record.attributes?.["body.capture_id"];
          const publication =
            typeof id === "string" ? bodyPublications.get(id) : undefined;
          if (publication) {
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
        for (const notify of flushWaiters) {
          notify();
        }
        callback(result);
      };
      try {
        transport.export(records, settle);
      } catch (error) {
        settle({
          code: ExportResultCode.FAILED,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },
    shutdown: () => transport.shutdown(),
  };
  const batch = new BatchLogRecordProcessor(exporter, {
    maxQueueSize: capacity,
    maxExportBatchSize: 64,
    scheduledDelayMillis: 1000,
    exportTimeoutMillis: OTLP_EXPORT_CALLBACK_DEADLINE_MS,
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
      if (state.outstanding >= capacity) {
        state.dropped++;
        rememberFailure([record], "queue_full");
        if (publication) {
          publication.dropped++;
          publication.notify?.();
        }
        return;
      }
      state.submitted++;
      state.outstanding++;
      unsettled.add(record);
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
  return { state, processor, capacity, kind };
}

/**
 * Own a whole capture within byte/count bounds, then pace its chunks by actual
 * export callbacks. SDK forceFlush alone does not await an automatic export
 * already in flight. Serial publication prevents bursts from dropping tails.
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
  const operation = bodyPublicationChain.then(
    async (): Promise<ProxyBodyDeliveryResult> => {
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
      // A capture owns bounded publication memory while waiting behind earlier
      // captures. Start its active deadline only when it reaches the head of
      // the chain; healthy queued captures must not expire solely because an
      // earlier export used its transport timeout.
      const deadline = Date.now() + BODY_PUBLICATION_ACTIVE_DEADLINE_MS;
      bodyPublicationDeadlines.set(progress, deadline);
      const chunks = splitUtf8StringByBytes(body, BODY_OTLP_CHUNK_SIZE);
      const awaitSettlement = () =>
        new Promise<void>((resolve) => {
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
      const resultFromProgress = (
        snapshot: Pick<
          ProxyBodyPublicationProgress,
          "acknowledged" | "unconfirmed" | "dropped" | "emitted"
        >,
        reason?: string,
      ): ProxyBodyDeliveryResult => {
        const pending = Math.max(
          0,
          snapshot.emitted -
            snapshot.acknowledged -
            snapshot.unconfirmed -
            snapshot.dropped,
        );
        const unconfirmedChunks = snapshot.unconfirmed + pending;
        const status =
          snapshot.emitted === 0 && chunks.length > 0
            ? "rejected"
            : snapshot.dropped || snapshot.emitted !== chunks.length
              ? "partial"
              : unconfirmedChunks
                ? "export_unconfirmed"
                : "transport_acknowledged";
        return {
          status,
          expectedChunks: chunks.length,
          acknowledgedChunks: snapshot.acknowledged,
          unconfirmedChunks,
          droppedChunks: snapshot.dropped,
          notSubmittedChunks: chunks.length - snapshot.emitted,
          ...(reason ? { reason } : {}),
        };
      };
      const settleCurrentBatch = async (): Promise<
        ProxyBodyDeliveryResult | undefined
      > => {
        const currentProgress = () => ({
          acknowledged: progress.acknowledged,
          unconfirmed: progress.unconfirmed,
          dropped: progress.dropped,
          emitted: progress.emitted,
        });
        const settlement = queue.processor.forceFlush().then(awaitSettlement);
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
          deferredRelease = settlement.catch(() => undefined);
          return resultFromProgress(
            currentProgress(),
            "body_publication_deadline",
          );
        }
        let timer: NodeJS.Timeout | undefined;
        const completed = await Promise.race([
          settlement.then(() => true),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), remainingMs);
            timer.unref?.();
          }),
        ]).finally(() => clearTimeout(timer));
        if (!completed || Date.now() >= deadline) {
          if (!completed) {
            // The exporter callback owns the submitted records until it settles.
            // Keep the capture identity and memory reservation alive meanwhile.
            deferredRelease = settlement.catch(() => undefined);
          }
          return resultFromProgress(
            currentProgress(),
            "body_publication_deadline",
          );
        }
        return undefined;
      };
      let reason: string | undefined;
      try {
        for (let offset = 0; offset < chunks.length; offset += 64) {
          if (Date.now() >= deadline) {
            reason = "body_publication_deadline";
            break;
          }
          // Ordinary body records from an external logger may share this queue.
          // Wait for them before admitting any part of this batch.
          while (queue.state.outstanding > queue.capacity - 64) {
            const deadlineResult = await settleCurrentBatch();
            if (deadlineResult) {
              return deadlineResult;
            }
          }
          for (let i = offset; i < Math.min(offset + 64, chunks.length); i++) {
            emit(chunks[i], i, chunks.length);
          }
          const deadlineResult = await settleCurrentBatch();
          if (deadlineResult) {
            return deadlineResult;
          }
          if (progress.unconfirmed || progress.dropped) {
            reason = "body_export_unconfirmed";
            break;
          }
          await yieldToRequests();
        }
      } catch (error) {
        reason =
          error instanceof Error &&
          error.message === "body_publication_deadline"
            ? "body_publication_deadline"
            : "body_publication_failed";
        // Do not let error cleanup hold the serial publication chain past this
        // capture's deadline. Exporter callbacks still own submitted chunks, so
        // retain the capture identity and memory reservation until they settle.
        const settlement = queue.processor
          .forceFlush()
          .catch(() => undefined)
          .then(awaitSettlement);
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
          deferredRelease = settlement;
        } else {
          let timer: NodeJS.Timeout | undefined;
          const completed = await Promise.race([
            settlement.then(() => true),
            new Promise<boolean>((resolve) => {
              timer = setTimeout(() => resolve(false), remainingMs);
              timer.unref?.();
            }),
          ]).finally(() => clearTimeout(timer));
          if (!completed) {
            deferredRelease = settlement;
          }
        }
      }
      return resultFromProgress(progress, reason);
    },
  );
  bodyPublicationChain = operation.then(
    () => undefined,
    () => undefined,
  );
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
    const release = () => {
      bodyPublications.delete(captureId);
      bodyDelivery.pending--;
      bodyDelivery.pendingBytes -= bytes;
    };
    if (deferredRelease) {
      void deferredRelease.finally(release);
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
  const url = new URL(endpoint);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Proxy OTLP logs endpoint must use HTTP or HTTPS");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol === "http:" && !loopback) {
    throw new Error(
      "Proxy OTLP logs require HTTPS for non-loopback collectors",
    );
  }
  const metadata = createTrackedProcessor(endpoint, 2048, "metadata");
  const bodies = createTrackedProcessor(endpoint, 256, "bodies");
  queues.push(metadata, bodies);
  provider = new LoggerProvider({
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
  await bodyPublicationChain;
  await provider?.forceFlush();
}

/** Release this process's exporter and restore console ownership. */
export async function shutdownProxyOtelLogs(): Promise<void> {
  shuttingDown = true;
  await bodyPublicationChain;
  restoreConsole?.();
  restoreConsole = undefined;
  await provider?.shutdown();
  provider = undefined;
  queues.length = 0;
  invalidRecords = 0;
  bodyPublications.clear();
  bodyPublicationChain = Promise.resolve();
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
      await flushProxyOtelLogs().catch(() => undefined);
      await shutdownProxyOtelLogs().catch(() => undefined);
    }
  };
}

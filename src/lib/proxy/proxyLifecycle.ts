import {
  emitProxyOtelEvent,
  isProxyOtelOnly,
  initializeProxyOtelLogs,
} from "./otelLogSink.js";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { withTimeout } from "../utils/async/withTimeout.js";
import { logger } from "../utils/logger.js";
import { startProxyRuntimeMetrics } from "./proxyRuntimeMetrics.js";
import type {
  ProxyLifecycleEventInput,
  ProxyLifecycleLoggerOptions,
  ProxyLifecycleLoggerSnapshot,
  QueuedProxyLifecycleEvent,
} from "../types/index.js";

const SCHEMA_VERSION = 1;
const DEFAULT_QUEUE_CAPACITY = 10_000;
const DEFAULT_BATCH_SIZE = 256;
const DEFAULT_FLUSH_INTERVAL_MS = 25;
const DEFAULT_MAX_WRITE_RETRIES = 3;
const MAX_WRITE_RETRY_DELAY_MS = 1_000;
const LIFECYCLE_APPEND_TIMEOUT_MS = 2_000;
const MAX_SHORT_FIELD_LENGTH = 256;
const SESSION_KEY_FILE = ".proxy-lifecycle-session-key";

let chmodLifecycleDirectory: typeof chmodSync = chmodSync;
let loggerEnabled = false;
let loggerRequired = false;
let stopRuntimeMetrics: (() => void) | undefined;
let lifecycleLogDir: string | undefined;
let filePrefix = "proxy-lifecycle";
let queueCapacity = DEFAULT_QUEUE_CAPACITY;
let batchSize = DEFAULT_BATCH_SIZE;
let flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS;
let maxWriteRetries = DEFAULT_MAX_WRITE_RETRIES;
let processInstanceId = randomUUID();
let sessionHashKey: Buffer = randomBytes(32);
let nextSequence = 1;
let attempted = 0;
let otelSubmitted = 0;
let enqueued = 0;
let written = 0;
let dropped = 0;
let queueDrops = 0;
let invalidDrops = 0;
let writeDrops = 0;
let writeFailures = 0;
let writeRetries = 0;
let writeTimeouts = 0;
let unconfirmedWrites = 0;
let inFlight = 0;
let queue: QueuedProxyLifecycleEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushInFlight: Promise<void> | undefined;
let nextFlushDelayMs: number | undefined;
let appendLifecycleFile: typeof appendFile = appendFile;

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && (value ?? 0) > 0
    ? (value as number)
    : fallback;
}

function clip(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return value.length <= MAX_SHORT_FIELD_LENGTH
    ? value
    : value.slice(0, MAX_SHORT_FIELD_LENGTH);
}

function finiteNonNegative(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function nonNegativeInteger(value: number | undefined): number | undefined {
  const finite = finiteNonNegative(value);
  return finite === undefined ? undefined : Math.floor(finite);
}

function formatTimestamp(timestampMs: number | undefined): string {
  const candidate =
    typeof timestampMs === "number" && Number.isFinite(timestampMs)
      ? timestampMs
      : Date.now();
  const date = new Date(candidate);
  return Number.isFinite(date.getTime())
    ? date.toISOString()
    : new Date().toISOString();
}

function readPersistedSessionHashKey(path: string): Buffer | undefined {
  try {
    const key = Buffer.from(readFileSync(path, "utf8").trim(), "base64");
    if (key.length !== 32) {
      throw new Error("persisted lifecycle session key must contain 32 bytes");
    }
    chmodSync(path, 0o600);
    return key;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function resolveSessionHashKey(logDir: string): Buffer {
  const configuredSecret = process.env.NEUROLINK_PROXY_SESSION_SECRET?.trim();
  if (configuredSecret) {
    return createHash("sha256").update(configuredSecret).digest();
  }

  const keyPath = join(logDir, SESSION_KEY_FILE);
  const existing = readPersistedSessionHashKey(keyPath);
  if (existing) {
    return existing;
  }

  const generated = randomBytes(32);
  try {
    writeFileSync(keyPath, generated.toString("base64"), {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    return generated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      const concurrentlyCreated = readPersistedSessionHashKey(keyPath);
      if (concurrentlyCreated) {
        return concurrentlyCreated;
      }
    }
    throw error;
  }
}

export function hashProxyLifecycleSessionId(
  sessionId: string | undefined,
): string | undefined {
  if (!sessionId) {
    return undefined;
  }
  return createHmac("sha256", sessionHashKey)
    .update(sessionId)
    .digest("hex")
    .slice(0, 24);
}

function clearScheduledFlush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = undefined;
  }
}

function scheduleFlush(delayMs: number = flushIntervalMs): void {
  if (flushTimer || flushInFlight || queue.length === 0) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void startFlush();
  }, delayMs);
  flushTimer.unref?.();
}

/**
 * Append a bounded metadata batch and confirm each admission without
 * replaying ambiguous writes.
 */
async function flushBatch(): Promise<void> {
  if (queue.length === 0) {
    return;
  }

  const batch = queue.splice(0, batchSize);
  inFlight += batch.length;
  try {
    const byPath = new Map<string, QueuedProxyLifecycleEvent[]>();
    for (const item of batch) {
      const path = join(
        item.logDir,
        `${item.filePrefix ?? "proxy-lifecycle"}-${item.date}.jsonl`,
      );
      const items = byPath.get(path) ?? [];
      items.push(item);
      byPath.set(path, items);
    }

    const retries: QueuedProxyLifecycleEvent[] = [];
    let retryDelayMs = 0;
    for (const [path, items] of byPath) {
      const lines = items.map((item) => `${JSON.stringify(item.record)}\n`);
      // A timeout does not cancel appendFile. Keep ownership of the original
      // operation until it settles; retrying it while it is still running can
      // append the same batch twice. The request path remains non-blocking.
      const timeout = setTimeout(() => {
        writeTimeouts += 1;
      }, LIFECYCLE_APPEND_TIMEOUT_MS);
      timeout.unref?.();
      try {
        // OS-acknowledged append survives serving-process death. This is not
        // an fsync/power-loss guarantee. Admission waits on its own record.
        await appendLifecycleFile(path, lines.join(""), { mode: 0o600 });
        written += lines.length;
        for (const item of items) {
          item.onPersisted?.(true);
        }
      } catch (error) {
        writeFailures += 1;
        // These errors prevent opening the destination. Other failures (for
        // example ENOSPC/EIO) can follow a partial append. Replaying those is
        // unsafe; expose uncertainty instead of claiming either loss or success.
        const code = (error as NodeJS.ErrnoException)?.code;
        const definitelyNotWritten = new Set([
          "ENOENT",
          "EACCES",
          "EPERM",
          "EROFS",
          "EMFILE",
          "ENFILE",
        ]).has(code ?? "");
        if (!definitelyNotWritten) {
          unconfirmedWrites += items.length;
          for (const item of items) {
            item.onPersisted?.(false);
          }
          logger.warn(
            "[proxy] lifecycle metadata append outcome is uncertain",
            {
              path,
              records: items.length,
              code,
            },
          );
          continue;
        }
        const retryable = items.filter(
          (item) => item.writeRetries < maxWriteRetries,
        );
        const exhausted = items.length - retryable.length;
        if (retryable.length > 0) {
          const nextRetries = retryable.map((item) => ({
            ...item,
            writeRetries: item.writeRetries + 1,
          }));
          retries.push(...nextRetries);
          writeRetries += nextRetries.length;
          retryDelayMs = Math.max(
            retryDelayMs,
            Math.min(
              MAX_WRITE_RETRY_DELAY_MS,
              flushIntervalMs *
                2 ** Math.max(...nextRetries.map((item) => item.writeRetries)),
            ),
          );
        }
        if (exhausted > 0) {
          dropped += exhausted;
          writeDrops += exhausted;
          for (const item of items) {
            if (item.writeRetries >= maxWriteRetries) {
              item.onPersisted?.(false);
            }
          }
        }
        logger.warn("[proxy] lifecycle metadata write failed", {
          path,
          retrying: retryable.length,
          dropped: exhausted,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        clearTimeout(timeout);
      }
    }
    if (retries.length > 0) {
      // Keep retried records ahead of newly admitted records. This preserves
      // per-file sequence order while continuing to keep request paths async.
      queue.unshift(...retries);
      nextFlushDelayMs = Math.max(
        nextFlushDelayMs ?? 0,
        retryDelayMs || flushIntervalMs,
      );
    }
  } finally {
    inFlight = Math.max(0, inFlight - batch.length);
  }
}

/**
 * Serialize batch ownership so timeouts cannot create overlapping append
 * retries.
 */
function startFlush(): Promise<void> {
  if (flushInFlight) {
    return flushInFlight;
  }

  const currentFlush = flushBatch();
  flushInFlight = currentFlush;
  void currentFlush.then(
    () => {
      if (flushInFlight === currentFlush) {
        flushInFlight = undefined;
      }
      const delayMs = nextFlushDelayMs;
      nextFlushDelayMs = undefined;
      scheduleFlush(delayMs);
    },
    () => {
      if (flushInFlight === currentFlush) {
        flushInFlight = undefined;
      }
      const delayMs = nextFlushDelayMs;
      nextFlushDelayMs = undefined;
      scheduleFlush(delayMs);
    },
  );
  return currentFlush;
}

/**
 * Configure private journal storage while retaining required admission
 * when initialization fails.
 */
export function configureProxyLifecycleLogger(
  options: ProxyLifecycleLoggerOptions,
): void {
  stopRuntimeMetrics?.();
  stopRuntimeMetrics = undefined;
  clearScheduledFlush();
  nextFlushDelayMs = undefined;
  loggerEnabled = false;
  loggerRequired = options.enabled;
  filePrefix = options.filePrefix ?? "proxy-lifecycle";
  lifecycleLogDir = undefined;
  queueCapacity = positiveInteger(
    options.queueCapacity,
    DEFAULT_QUEUE_CAPACITY,
  );
  batchSize = positiveInteger(options.batchSize, DEFAULT_BATCH_SIZE);
  maxWriteRetries = positiveInteger(
    options.maxWriteRetries,
    DEFAULT_MAX_WRITE_RETRIES,
  );
  flushIntervalMs = positiveInteger(
    options.flushIntervalMs,
    DEFAULT_FLUSH_INTERVAL_MS,
  );

  if (options.enabled && isProxyOtelOnly()) {
    initializeProxyOtelLogs(
      options.filePrefix === "proxy-supervisor" ? "supervisor" : "worker",
    );
    loggerEnabled = true;
    sessionHashKey = process.env.NEUROLINK_PROXY_SESSION_SECRET
      ? createHash("sha256")
          .update(process.env.NEUROLINK_PROXY_SESSION_SECRET)
          .digest()
      : sessionHashKey;
    stopRuntimeMetrics = startProxyRuntimeMetrics((runtimeSample) => {
      logProxyLifecycleEvent({
        event: "runtime_sample",
        requestId: "-",
        method: "-",
        path: "-",
        runtimeSample,
      });
    });
    return;
  }

  if (options.enabled && options.logDir) {
    try {
      mkdirSync(options.logDir, { recursive: true, mode: 0o700 });
      // mkdir mode does not harden an existing directory. Keep admission
      // required but the sink disabled if its privacy boundary cannot be set.
      chmodLifecycleDirectory(options.logDir, 0o700);
      sessionHashKey = resolveSessionHashKey(options.logDir);
      lifecycleLogDir = options.logDir;
      loggerEnabled = true;
      stopRuntimeMetrics = startProxyRuntimeMetrics((runtimeSample) => {
        logProxyLifecycleEvent({
          event: "runtime_sample",
          requestId: "-",
          method: "-",
          path: "-",
          runtimeSample,
        });
      });
    } catch (error) {
      logger.warn("[proxy] lifecycle metadata logging disabled", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Queued records retain their enqueue-time destination. Reconfiguration is
  // therefore atomic for new events while an in-flight or pending batch safely
  // drains to its original directory.
  scheduleFlush();
}

/** Enqueue fixed-size lifecycle metadata without awaiting filesystem work. */
export function logProxyLifecycleEvent(input: ProxyLifecycleEventInput): void {
  enqueueLifecycleEvent(input);
}

/**
 * Enqueue bounded metadata and resolve admission failure immediately when
 * capacity is unavailable.
 */
function enqueueLifecycleEvent(
  input: ProxyLifecycleEventInput,
  onPersisted?: (confirmed: boolean) => void,
): void {
  if (!loggerEnabled || (!lifecycleLogDir && !isProxyOtelOnly())) {
    onPersisted?.(false);
    return;
  }

  try {
    attempted += 1;
    const sequence = nextSequence++;
    if (queue.length + inFlight >= queueCapacity) {
      dropped += 1;
      queueDrops += 1;
      onPersisted?.(false);
      return;
    }

    const timestamp = formatTimestamp(input.timestampMs);
    const monotonicMs =
      finiteNonNegative(input.monotonicMs) ?? performance.now();
    const toolCount = nonNegativeInteger(input.toolCount);
    const requestBytes = nonNegativeInteger(input.requestBytes);
    const responseStatus = nonNegativeInteger(input.responseStatus);
    const observedBodyBytes = nonNegativeInteger(input.observedBodyBytes);
    const responseChunks = nonNegativeInteger(input.responseChunks);
    const elapsedMs = finiteNonNegative(input.elapsedMs);
    const requestTimeoutMs = finiteNonNegative(input.requestTimeoutMs);
    const parentRequestId = clip(input.parentRequestId);
    const model = clip(input.model);
    const sessionHash = clip(input.sessionHash);
    const terminalOutcome = clip(input.terminalOutcome);
    const errorType = clip(input.errorType);
    const errorCode = clip(input.errorCode);

    const record: Record<string, unknown> = {
      schemaVersion: SCHEMA_VERSION,
      timestamp,
      monotonicMs: Number(monotonicMs.toFixed(3)),
      processInstanceId,
      sequence,
      event: clip(input.event) ?? "unknown",
      requestId: clip(input.requestId) ?? "unknown",
      ...(parentRequestId !== undefined ? { parentRequestId } : {}),
      ...(input.accountingScope !== undefined
        ? { accountingScope: input.accountingScope }
        : {}),
      ...(requestTimeoutMs !== undefined ? { requestTimeoutMs } : {}),
      method: clip(input.method) ?? "unknown",
      path: clip(input.path) ?? "unknown",
      ...(model !== undefined ? { model } : {}),
      ...(input.stream !== undefined ? { stream: input.stream } : {}),
      ...(toolCount !== undefined ? { toolCount } : {}),
      ...(sessionHash !== undefined ? { sessionHash } : {}),
      ...(requestBytes !== undefined ? { requestBytes } : {}),
      ...(responseStatus !== undefined ? { responseStatus } : {}),
      ...(input.finalStatus !== undefined
        ? { finalStatus: nonNegativeInteger(input.finalStatus) }
        : {}),
      ...(input.telemetryStatus
        ? { telemetryStatus: input.telemetryStatus }
        : {}),
      ...(input.transportOutcome
        ? { transportOutcome: input.transportOutcome }
        : {}),
      ...(input.outcomeSource ? { outcomeSource: input.outcomeSource } : {}),
      ...(observedBodyBytes !== undefined ? { observedBodyBytes } : {}),
      ...(responseChunks !== undefined ? { responseChunks } : {}),
      ...(elapsedMs !== undefined
        ? { elapsedMs: Number(elapsedMs.toFixed(3)) }
        : {}),
      ...(terminalOutcome !== undefined ? { terminalOutcome } : {}),
      ...(errorType !== undefined ? { errorType } : {}),
      ...(errorCode !== undefined ? { errorCode } : {}),
      ...(input.supervisorEvent
        ? {
            supervisorEvent: {
              ...input.supervisorEvent,
              reason: clip(input.supervisorEvent.reason),
            },
          }
        : {}),
      ...(input.runtimeSample ? { runtimeSample: input.runtimeSample } : {}),
    };
    if (isProxyOtelOnly()) {
      emitProxyOtelEvent(
        filePrefix === "proxy-supervisor" ? "supervisor" : "lifecycle",
        record,
      );
      otelSubmitted += 1;
      return;
    }
    queue.push({
      filePrefix,
      logDir: lifecycleLogDir!,
      date: String(record.timestamp).slice(0, 10),
      record,
      writeRetries: 0,
      onPersisted,
    });
    enqueued += 1;
    scheduleFlush();
  } catch {
    dropped += 1;
    invalidDrops += 1;
    onPersisted?.(false);
  }
}

/** Confirm admission before upstream dispatch, without waiting for later traffic.
 * Disabled logging is explicit; an enabled but unhealthy sink refuses dispatch.
 * A timeout never retries an ambiguous provider request or the pending append.
 */
export async function persistProxyLifecycleAcceptance(
  input: Omit<ProxyLifecycleEventInput, "event">,
  timeoutMs = LIFECYCLE_APPEND_TIMEOUT_MS,
): Promise<void> {
  if (!loggerRequired) {
    return;
  }
  if (isProxyOtelOnly()) {
    enqueueLifecycleEvent({ ...input, event: "request_accepted" });
    return;
  }
  const confirmed = new Promise<boolean>((resolve) => {
    enqueueLifecycleEvent({ ...input, event: "request_accepted" }, resolve);
  });
  // Yield one turn for concurrent admissions to share a bounded batch.
  clearScheduledFlush();
  scheduleFlush(0);
  const persisted = await withTimeout(
    confirmed,
    timeoutMs,
    "Proxy admission metadata append is still pending",
  ).catch(() => false);
  if (!persisted) {
    throw Object.assign(
      new Error("Proxy admission metadata could not be confirmed"),
      {
        code: "PROXY_TELEMETRY_UNAVAILABLE",
      },
    );
  }
}

export async function flushProxyLifecycleEvents(
  timeoutMs = 5_000,
): Promise<void> {
  clearScheduledFlush();
  const deadline = performance.now() + timeoutMs;
  while (queue.length > 0 || flushInFlight) {
    await withTimeout(
      flushInFlight ?? startFlush(),
      Math.max(1, deadline - performance.now()),
      "Timed out flushing proxy lifecycle metadata; writes remain pending",
    );
    clearScheduledFlush();
    if (performance.now() >= deadline && (queue.length > 0 || flushInFlight)) {
      throw new Error(
        "Proxy lifecycle flush deadline exceeded; writes remain pending",
      );
    }
  }
}

/**
 * Expose journal accounting, process identity, and outstanding writes
 * without changing them.
 */
export function getProxyLifecycleLoggerSnapshot(): ProxyLifecycleLoggerSnapshot {
  return {
    enabled: loggerEnabled,
    sink: isProxyOtelOnly() ? "otel" : "file",
    admissionPolicy: isProxyOtelOnly() ? "best-effort" : "durable-file",
    schemaVersion: SCHEMA_VERSION,
    processInstanceId,
    nextSequence,
    attempted,
    otelSubmitted,
    enqueued,
    written,
    dropped,
    queueDrops,
    invalidDrops,
    writeDrops,
    writeFailures,
    writeRetries,
    writeTimeouts,
    unconfirmedWrites,
    pending: queue.length,
    inFlight,
    flushing: flushInFlight !== undefined,
  };
}

/**
 * Reset timers, accounting, and injected I/O after isolated tests have
 * drained their work.
 */
export function resetProxyLifecycleLoggerForTests(): void {
  stopRuntimeMetrics?.();
  stopRuntimeMetrics = undefined;
  clearScheduledFlush();
  loggerEnabled = false;
  loggerRequired = false;
  lifecycleLogDir = undefined;
  queueCapacity = DEFAULT_QUEUE_CAPACITY;
  batchSize = DEFAULT_BATCH_SIZE;
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS;
  maxWriteRetries = DEFAULT_MAX_WRITE_RETRIES;
  processInstanceId = randomUUID();
  sessionHashKey = randomBytes(32);
  nextSequence = 1;
  attempted = 0;
  otelSubmitted = 0;
  enqueued = 0;
  written = 0;
  dropped = 0;
  queueDrops = 0;
  invalidDrops = 0;
  writeDrops = 0;
  writeFailures = 0;
  writeRetries = 0;
  writeTimeouts = 0;
  unconfirmedWrites = 0;
  inFlight = 0;
  queue = [];
  flushInFlight = undefined;
  nextFlushDelayMs = undefined;
  appendLifecycleFile = appendFile;
  chmodLifecycleDirectory = chmodSync;
}

/** Isolated failure injection for lifecycle durability tests. */
export const __proxyLifecycleTestHooks = {
  /**
   * Inject directory-hardening failures without altering real filesystem permissions.
   */
  setChmodForTests(chmod: typeof chmodSync): void {
    chmodLifecycleDirectory = chmod;
  },
  /**
   * Inject controlled append outcomes while preserving the production admission and queue paths.
   */
  setAppendFileForTests(append: typeof appendFile): void {
    appendLifecycleFile = append;
  },
};

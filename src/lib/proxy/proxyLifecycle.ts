import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { withTimeout } from "../utils/async/withTimeout.js";
import { logger } from "../utils/logger.js";
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
const LIFECYCLE_APPEND_TIMEOUT_MS = 2_000;
const MAX_SHORT_FIELD_LENGTH = 256;
const SESSION_KEY_FILE = ".proxy-lifecycle-session-key";

let loggerEnabled = false;
let lifecycleLogDir: string | undefined;
let queueCapacity = DEFAULT_QUEUE_CAPACITY;
let batchSize = DEFAULT_BATCH_SIZE;
let flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS;
let processInstanceId = randomUUID();
let sessionHashKey: Buffer = randomBytes(32);
let nextSequence = 1;
let attempted = 0;
let enqueued = 0;
let written = 0;
let dropped = 0;
let queueDrops = 0;
let invalidDrops = 0;
let writeDrops = 0;
let writeFailures = 0;
let inFlight = 0;
let queue: QueuedProxyLifecycleEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushInFlight: Promise<void> | undefined;

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

function scheduleFlush(): void {
  if (flushTimer || flushInFlight || queue.length === 0) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void startFlush();
  }, flushIntervalMs);
  flushTimer.unref?.();
}

async function flushBatch(): Promise<void> {
  if (queue.length === 0) {
    return;
  }

  const batch = queue.splice(0, batchSize);
  inFlight += batch.length;
  try {
    const byPath = new Map<string, string[]>();
    for (const item of batch) {
      const path = join(item.logDir, `proxy-lifecycle-${item.date}.jsonl`);
      const lines = byPath.get(path) ?? [];
      lines.push(`${JSON.stringify(item.record)}\n`);
      byPath.set(path, lines);
    }

    for (const [path, lines] of byPath) {
      try {
        // This best-effort telemetry sink intentionally avoids fsync so request
        // throughput is not coupled to storage latency. Loss is surfaced by
        // writeDrops/writeFailures rather than delaying proxy responses.
        await withTimeout(
          appendFile(path, lines.join(""), { mode: 0o600 }),
          LIFECYCLE_APPEND_TIMEOUT_MS,
          "Timed out writing proxy lifecycle metadata",
        );
        written += lines.length;
      } catch (error) {
        dropped += lines.length;
        writeDrops += lines.length;
        writeFailures += 1;
        logger.warn("[proxy] lifecycle metadata write failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    inFlight = Math.max(0, inFlight - batch.length);
  }
}

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
      scheduleFlush();
    },
    () => {
      if (flushInFlight === currentFlush) {
        flushInFlight = undefined;
      }
      scheduleFlush();
    },
  );
  return currentFlush;
}

export function configureProxyLifecycleLogger(
  options: ProxyLifecycleLoggerOptions,
): void {
  clearScheduledFlush();
  loggerEnabled = false;
  lifecycleLogDir = undefined;
  queueCapacity = positiveInteger(
    options.queueCapacity,
    DEFAULT_QUEUE_CAPACITY,
  );
  batchSize = positiveInteger(options.batchSize, DEFAULT_BATCH_SIZE);
  flushIntervalMs = positiveInteger(
    options.flushIntervalMs,
    DEFAULT_FLUSH_INTERVAL_MS,
  );

  if (options.enabled && options.logDir) {
    try {
      mkdirSync(options.logDir, { recursive: true, mode: 0o700 });
      sessionHashKey = resolveSessionHashKey(options.logDir);
      lifecycleLogDir = options.logDir;
      loggerEnabled = true;
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
  if (!loggerEnabled || !lifecycleLogDir) {
    return;
  }

  try {
    attempted += 1;
    const sequence = nextSequence++;
    if (queue.length >= queueCapacity) {
      dropped += 1;
      queueDrops += 1;
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
      method: clip(input.method) ?? "unknown",
      path: clip(input.path) ?? "unknown",
      ...(model !== undefined ? { model } : {}),
      ...(input.stream !== undefined ? { stream: input.stream } : {}),
      ...(toolCount !== undefined ? { toolCount } : {}),
      ...(sessionHash !== undefined ? { sessionHash } : {}),
      ...(requestBytes !== undefined ? { requestBytes } : {}),
      ...(responseStatus !== undefined ? { responseStatus } : {}),
      ...(observedBodyBytes !== undefined ? { observedBodyBytes } : {}),
      ...(responseChunks !== undefined ? { responseChunks } : {}),
      ...(elapsedMs !== undefined
        ? { elapsedMs: Number(elapsedMs.toFixed(3)) }
        : {}),
      ...(terminalOutcome !== undefined ? { terminalOutcome } : {}),
      ...(errorType !== undefined ? { errorType } : {}),
      ...(errorCode !== undefined ? { errorCode } : {}),
    };
    queue.push({
      logDir: lifecycleLogDir,
      date: String(record.timestamp).slice(0, 10),
      record,
    });
    enqueued += 1;
    scheduleFlush();
  } catch {
    dropped += 1;
    invalidDrops += 1;
  }
}

export async function flushProxyLifecycleEvents(): Promise<void> {
  clearScheduledFlush();
  while (queue.length > 0 || flushInFlight) {
    if (flushInFlight) {
      await flushInFlight;
    } else {
      await startFlush();
    }
    clearScheduledFlush();
  }
}

export function getProxyLifecycleLoggerSnapshot(): ProxyLifecycleLoggerSnapshot {
  return {
    enabled: loggerEnabled,
    schemaVersion: SCHEMA_VERSION,
    processInstanceId,
    nextSequence,
    attempted,
    enqueued,
    written,
    dropped,
    queueDrops,
    invalidDrops,
    writeDrops,
    writeFailures,
    pending: queue.length,
    inFlight,
    flushing: flushInFlight !== undefined,
  };
}

export function resetProxyLifecycleLoggerForTests(): void {
  clearScheduledFlush();
  loggerEnabled = false;
  lifecycleLogDir = undefined;
  queueCapacity = DEFAULT_QUEUE_CAPACITY;
  batchSize = DEFAULT_BATCH_SIZE;
  flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS;
  processInstanceId = randomUUID();
  sessionHashKey = randomBytes(32);
  nextSequence = 1;
  attempted = 0;
  enqueued = 0;
  written = 0;
  dropped = 0;
  queueDrops = 0;
  invalidDrops = 0;
  writeDrops = 0;
  writeFailures = 0;
  inFlight = 0;
  queue = [];
  flushInFlight = undefined;
}

import { Worker } from "node:worker_threads";
import type {
  ProcessedProxyBodyCapture,
  ProxyBodyCaptureEntry,
  ProxyBodyCaptureWorkerSnapshot,
} from "../types/index.js";

const MAX_PENDING = 64;
const MAX_PENDING_BYTES = 32 * 1024 * 1024;
// Bound retained UTF-16 strings rather than a 3x UTF-8 guess. This accommodates
// the observed 7.3 MB JSON requests while retaining a 32 MiB aggregate pool.
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
export const PROXY_BODY_CAPTURE_DEADLINE_MS = 20_000;
let worker: Worker | undefined;
let workerUrl: URL | undefined;
let retryAfter = 0;
let nextId = 0;
const snapshot: ProxyBodyCaptureWorkerSnapshot = {
  attempted: 0,
  completed: 0,
  rejected: 0,
  failed: 0,
  pending: 0,
  pendingBytes: 0,
  maxPending: MAX_PENDING,
  maxPendingBytes: MAX_PENDING_BYTES,
  highWaterPending: 0,
  highWaterBytes: 0,
  rejectionReasons: {},
};
const pending = new Map<
  number,
  {
    resolve: (result: ProcessedProxyBodyCapture) => void;
    timer: NodeJS.Timeout;
  }
>();

// Bound traversal as well as the structured clone sent to the worker. Never
// invoke getters/toJSON or stringify a large body on the serving event loop.
/**
 * Conservatively bound clone size and traversal work without invoking
 * getters or serializers.
 */
function estimateCloneBytes(value: unknown, maxEntryBytes: number): number {
  const stack = [value];
  const seen = new Set<object>();
  let bytes = 0,
    nodes = 0;
  while (stack.length) {
    if (++nodes > 100_000) {
      throw new Error("body_capture_traversal_limit");
    }
    if (bytes > maxEntryBytes) {
      return bytes;
    }
    const item = stack.pop();
    if (typeof item === "string") {
      bytes += 16 + item.length * 2;
      continue;
    }
    bytes += 16;
    if (!item || typeof item !== "object") {
      continue;
    }
    if (seen.has(item)) {
      throw new Error("body_capture_unsupported_value");
    }
    seen.add(item);
    if (
      !Array.isArray(item) &&
      Object.getPrototypeOf(item) !== Object.prototype &&
      Object.getPrototypeOf(item) !== null
    ) {
      throw new Error("body_capture_unsupported_value");
    }
    for (const key of Object.keys(item)) {
      bytes += 16 + key.length * 2;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor || descriptor.get || descriptor.set) {
        throw new Error("body_capture_unsupported_value");
      }
      stack.push(descriptor.value);
      if (stack.length > 100_000) {
        throw new Error("body_capture_traversal_limit");
      }
      if (bytes > maxEntryBytes) {
        return bytes;
      }
    }
  }
  return bytes;
}

/**
 * Settle IPC ownership once while publication retains the capture memory
 * lease.
 */
function settle(id: number, result: ProcessedProxyBodyCapture): void {
  const task = pending.get(id);
  if (!task) {
    return;
  }
  pending.delete(id);
  clearTimeout(task.timer);
  task.resolve(result);
  if (!pending.size) {
    worker?.unref();
  }
}

/**
 * Fail every pending capture explicitly and back off without moving bulk
 * work to the caller.
 */
function failWorker(current: Worker, reason: string): void {
  if (worker !== current) {
    return;
  }
  worker = undefined;
  retryAfter = Date.now() + 5_000;
  for (const id of pending.keys()) {
    settle(id, {
      error: reason,
      stored: { bodyWriteFailed: true },
    });
  }
  void current.terminate().catch(() => undefined);
}

/**
 * Lazily create the bounded worker; only admitted processing keeps it
 * referenced.
 */
function getWorker(): Worker {
  if (worker) {
    return worker;
  }
  const current = new Worker(
    workerUrl ?? new URL("./bodyCaptureWorkerEntry.js", import.meta.url),
    {
      execArgv: process.execArgv.filter(
        (arg) => !arg.startsWith("--input-type"),
      ),
      resourceLimits: { maxOldGenerationSizeMb: 128 },
    },
  );
  worker = current;
  current.on(
    "message",
    (message: { id: number; result: ProcessedProxyBodyCapture }) => {
      if (worker === current) {
        settle(message.id, message.result);
      }
    },
  );
  current.on("error", () => failWorker(current, "body_worker_error"));
  current.on("exit", () => failWorker(current, "body_worker_exit"));
  current.unref();
  return current;
}

/** Bounded bulk capture. Failures are indexed; never fall back to blocking work. */
export async function captureProxyBody(
  entry: ProxyBodyCaptureEntry,
  logDir: string | null,
  consume: (result: ProcessedProxyBodyCapture) => Promise<void>,
): Promise<void> {
  snapshot.attempted += 1;
  // An OTel capture can use the existing byte pool when it is otherwise idle.
  // Raising the slot count does not raise the aggregate retained-memory bound.
  const maxEntryBytes = logDir === null ? MAX_PENDING_BYTES : MAX_ENTRY_BYTES;
  let bytes: number;
  let admissionError: string | undefined;
  try {
    bytes = estimateCloneBytes(entry, maxEntryBytes);
  } catch (error) {
    bytes = Infinity;
    admissionError =
      error instanceof Error &&
      [
        "body_capture_entry_too_large",
        "body_capture_traversal_limit",
        "body_capture_unsupported_value",
      ].includes(error.message)
        ? error.message
        : "body_capture_unsupported_value";
  }
  if (
    bytes > maxEntryBytes ||
    snapshot.pending >= MAX_PENDING ||
    snapshot.pendingBytes + bytes > MAX_PENDING_BYTES ||
    Date.now() < retryAfter
  ) {
    snapshot.rejected += 1;
    const error =
      bytes > maxEntryBytes
        ? (admissionError ?? "body_capture_entry_too_large")
        : Date.now() < retryAfter
          ? "body_worker_backoff"
          : "body_capture_queue_full";
    snapshot.lastError = error;
    snapshot.lastRejectedAt = new Date().toISOString();
    snapshot.rejectionReasons[error] =
      (snapshot.rejectionReasons[error] ?? 0) + 1;
    return consume({
      error,
      stored: { bodyWriteFailed: true },
      admission: {
        limitingResource:
          bytes > maxEntryBytes
            ? "entry"
            : Date.now() < retryAfter
              ? "worker"
              : snapshot.pending >= MAX_PENDING
                ? "captures"
                : "bytes",
        estimatedBytes: Number.isFinite(bytes) ? bytes : undefined,
        maxEntryBytes,
        pending: snapshot.pending,
        pendingBytes: snapshot.pendingBytes,
        maxPending: MAX_PENDING,
        maxPendingBytes: MAX_PENDING_BYTES,
      },
    });
  }
  let current: Worker;
  try {
    current = getWorker();
  } catch {
    snapshot.failed += 1;
    retryAfter = Date.now() + 5_000;
    return consume({
      error: "body_worker_start_failed",
      stored: { bodyWriteFailed: true },
    });
  }
  const id = ++nextId;
  return new Promise((resolve) => {
    const timer = setTimeout(
      () => failWorker(current, "body_worker_timeout"),
      PROXY_BODY_CAPTURE_DEADLINE_MS,
    );
    timer.unref();
    pending.set(id, {
      timer,
      resolve: (result) => {
        // Keep the byte/count lease through index writes and OTLP publication,
        // so completed worker results cannot form an unbounded parent backlog.
        void consume(result)
          .catch(() => {
            result.error ??= "body_capture_publication_failed";
          })
          .finally(() => {
            snapshot.pending -= 1;
            snapshot.pendingBytes -= bytes;
            if (result.error || result.stored.bodyWriteFailed) {
              snapshot.failed += 1;
            } else {
              snapshot.completed += 1;
            }
            if (result.error) {
              snapshot.lastError = result.error;
            }
            resolve();
          });
      },
    });
    snapshot.pending += 1;
    snapshot.highWaterPending = Math.max(
      snapshot.highWaterPending,
      snapshot.pending,
    );
    snapshot.pendingBytes += bytes;
    snapshot.highWaterBytes = Math.max(
      snapshot.highWaterBytes,
      snapshot.pendingBytes,
    );
    current.ref();
    try {
      current.postMessage({ id, entry, logDir, queuedAt: Date.now() });
    } catch {
      settle(id, {
        error: "body_capture_clone_failed",
        stored: { bodyWriteFailed: true },
      });
    }
  });
}

/**
 * Return independent counters for processing, rejection, failure, and
 * retained publication work.
 */
export function getBodyCaptureWorkerSnapshot(): ProxyBodyCaptureWorkerSnapshot {
  return { ...snapshot, rejectionReasons: { ...snapshot.rejectionReasons } };
}

/** Isolated tests point at a separately executed built worker. */
export const __bodyCaptureWorkerTestHooks = {
  /**
   * Reset an isolated worker after capture publications drain, optionally selecting a fixture entry.
   */
  async reset(url?: URL): Promise<void> {
    if (worker) {
      const current = worker;
      failWorker(current, "body_worker_test_reset");
      await current.terminate();
    }
    workerUrl = url;
    retryAfter = 0;
    Object.assign(snapshot, {
      attempted: 0,
      completed: 0,
      rejected: 0,
      failed: 0,
      pending: 0,
      pendingBytes: 0,
      lastError: undefined,
      lastRejectedAt: undefined,
      highWaterPending: 0,
      highWaterBytes: 0,
      rejectionReasons: {},
    });
  },
};

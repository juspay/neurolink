import { Worker } from "node:worker_threads";
import type {
  ProcessedProxyBodyCapture,
  ProxyBodyCaptureEntry,
  ProxyBodyCaptureWorkerSnapshot,
} from "../types/index.js";

const MAX_PENDING = 64;
const MAX_PENDING_BYTES = 32 * 1024 * 1024;
// OTel publication is asynchronous. Absorb one additional bounded burst
// without expanding the active structured-clone pool or blocking model
// responses; sustained overload still expires with an explicit index failure.
const MAX_OTEL_WAITING = 64;
const MAX_OTEL_WAITING_BYTES = 32 * 1024 * 1024;
const OTEL_ADMISSION_WAIT_MS = 20_000;
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
  waiting: 0,
  waitingBytes: 0,
  maxWaiting: MAX_OTEL_WAITING,
  maxWaitingBytes: MAX_OTEL_WAITING_BYTES,
  highWaterWaiting: 0,
  highWaterWaitingBytes: 0,
  admissionWaits: 0,
  admissionTimeouts: 0,
  rejectionReasons: {},
};
const pending = new Map<
  number,
  {
    resolve: (result: ProcessedProxyBodyCapture) => void;
    timer: NodeJS.Timeout;
  }
>();
const otelAdmissionWaiters: Array<{
  bytes: number;
  resolve: (result: "admitted" | "queue_full" | "timeout") => void;
  timer: NodeJS.Timeout;
}> = [];
let admissionRetryTimer: NodeJS.Timeout | undefined;

/** Atomically reserve the active clone/publication lease. */
function reserveCapture(bytes: number): boolean {
  if (
    Date.now() < retryAfter ||
    snapshot.pending >= MAX_PENDING ||
    snapshot.pendingBytes + bytes > MAX_PENDING_BYTES
  ) {
    return false;
  }
  snapshot.pending += 1;
  snapshot.pendingBytes += bytes;
  snapshot.highWaterPending = Math.max(
    snapshot.highWaterPending,
    snapshot.pending,
  );
  snapshot.highWaterBytes = Math.max(
    snapshot.highWaterBytes,
    snapshot.pendingBytes,
  );
  return true;
}

/** Admit every compatible OTel waiter as active leases settle. */
function drainOtelAdmissionWaiters(): void {
  if (!otelAdmissionWaiters.length) {
    return;
  }
  if (Date.now() < retryAfter) {
    if (!admissionRetryTimer) {
      admissionRetryTimer = setTimeout(
        () => {
          admissionRetryTimer = undefined;
          drainOtelAdmissionWaiters();
        },
        Math.max(1, retryAfter - Date.now()),
      );
      admissionRetryTimer.unref?.();
    }
    return;
  }
  for (let index = 0; index < otelAdmissionWaiters.length; ) {
    if (snapshot.pending >= MAX_PENDING) {
      break;
    }
    const waiter = otelAdmissionWaiters[index];
    if (!reserveCapture(waiter.bytes)) {
      // Byte pressure can block a large capture while a later small capture
      // still fits. Keep the large capture's original timeout and scan the
      // rest of the bounded queue once.
      index += 1;
      continue;
    }
    otelAdmissionWaiters.splice(index, 1);
    clearTimeout(waiter.timer);
    snapshot.waiting -= 1;
    snapshot.waitingBytes -= waiter.bytes;
    waiter.resolve("admitted");
  }
}

/** Retain bounded OTel overflow instead of dropping a transient burst. */
function waitForOtelAdmission(
  bytes: number,
): Promise<"admitted" | "queue_full" | "timeout"> {
  if (
    snapshot.waiting >= MAX_OTEL_WAITING ||
    snapshot.waitingBytes + bytes > MAX_OTEL_WAITING_BYTES
  ) {
    return Promise.resolve("queue_full");
  }
  snapshot.admissionWaits += 1;
  snapshot.waiting += 1;
  snapshot.waitingBytes += bytes;
  snapshot.highWaterWaiting = Math.max(
    snapshot.highWaterWaiting,
    snapshot.waiting,
  );
  snapshot.highWaterWaitingBytes = Math.max(
    snapshot.highWaterWaitingBytes,
    snapshot.waitingBytes,
  );
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const index = otelAdmissionWaiters.findIndex(
        (waiter) => waiter.timer === timer,
      );
      if (index < 0) {
        return;
      }
      otelAdmissionWaiters.splice(index, 1);
      snapshot.waiting -= 1;
      snapshot.waitingBytes -= bytes;
      snapshot.admissionTimeouts += 1;
      resolve("timeout");
      drainOtelAdmissionWaiters();
    }, OTEL_ADMISSION_WAIT_MS);
    timer.unref?.();
    otelAdmissionWaiters.push({ bytes, resolve, timer });
  });
}

function releaseCapture(bytes: number): void {
  snapshot.pending -= 1;
  snapshot.pendingBytes -= bytes;
  drainOtelAdmissionWaiters();
}

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
  const queuedAt = Date.now();
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
  let admission: "admitted" | "queue_full" | "timeout" = "queue_full";
  if (bytes <= maxEntryBytes && Date.now() >= retryAfter) {
    admission = reserveCapture(bytes)
      ? "admitted"
      : logDir === null
        ? await waitForOtelAdmission(bytes)
        : "queue_full";
  }
  if (admission !== "admitted") {
    snapshot.rejected += 1;
    const error =
      bytes > maxEntryBytes
        ? (admissionError ?? "body_capture_entry_too_large")
        : Date.now() < retryAfter
          ? "body_worker_backoff"
          : admission === "timeout"
            ? "body_capture_admission_timeout"
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
    retryAfter = Date.now() + 5_000;
    releaseCapture(bytes);
    snapshot.failed += 1;
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
            releaseCapture(bytes);
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
    current.ref();
    try {
      current.postMessage({ id, entry, logDir, queuedAt });
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
    if (otelAdmissionWaiters.length) {
      throw new Error(
        "Cannot reset body capture worker with admission waiters",
      );
    }
    if (worker) {
      const current = worker;
      failWorker(current, "body_worker_test_reset");
      await current.terminate();
    }
    workerUrl = url;
    retryAfter = 0;
    if (admissionRetryTimer) {
      clearTimeout(admissionRetryTimer);
      admissionRetryTimer = undefined;
    }
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
      waiting: 0,
      waitingBytes: 0,
      highWaterWaiting: 0,
      highWaterWaitingBytes: 0,
      admissionWaits: 0,
      admissionTimeouts: 0,
      rejectionReasons: {},
    });
  },
};

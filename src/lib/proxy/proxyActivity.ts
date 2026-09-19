import { AsyncLocalStorage } from "node:async_hooks";
import type {
  ProxyActivitySnapshot,
  ProxyResponseTerminalOutcome,
  ProxyResponseTrackingObserver,
  RequestLogEntry,
  RequestAttemptLogEntry,
} from "../types/index.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { logger } from "../utils/logger.js";

const PROXY_RESPONSE_CANCEL_TIMEOUT_MS = 1_000;

// Bridge identity is registered by this process, never trusted from an inbound
// parent-id header. One-use capabilities expire even if loopback dispatch fails.
const internalRequests = new Map<
  string,
  { parentRequestId: string; requestId: string }
>();
const bridgeResults = new Map<string, RequestLogEntry>();
export function getProxyBridgeResult(requestId: string) {
  return bridgeResults.get(requestId);
}
const requestAccounting = new Map<
  string,
  {
    parentRequestId?: string;
    accountingScope?: "client" | "internal";
    usageOwnerRequestId?: string;
  }
>();
export function registerInternalProxyRequest(parentRequestId: string) {
  if (internalRequests.size >= 5000) {
    throw Object.assign(new Error("Internal proxy dispatch capacity is full"), {
      status: 503,
      code: "PROXY_INTERNAL_CAPACITY",
      retryable: false,
    });
  }
  const token = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  internalRequests.set(token, { parentRequestId, requestId });
  requestAccounting.set(parentRequestId, {
    accountingScope: "client",
    usageOwnerRequestId: requestId,
  });
  const timer = setTimeout(() => {
    if (internalRequests.delete(token)) {
      requestAccounting.delete(parentRequestId);
      bridgeResults.delete(parentRequestId);
    }
  }, 300_000);
  timer.unref?.();
  return {
    token,
    requestId,
    dispose() {
      clearTimeout(timer);
      internalRequests.delete(token);
    },
  };
}
export function consumeInternalProxyRequest(token: string | null) {
  if (!token) {
    return undefined;
  }
  const result = internalRequests.get(token);
  internalRequests.delete(token);
  if (result) {
    requestAccounting.set(result.requestId, {
      parentRequestId: result.parentRequestId,
      accountingScope: "internal",
      usageOwnerRequestId: result.requestId,
    });
  }
  return result;
}
export function getProxyRequestAccounting(requestId: string) {
  return requestAccounting.get(requestId);
}
export function releaseProxyRequestAccounting(requestId: string) {
  requestAccounting.delete(requestId);
  bridgeResults.delete(requestId);
}

let activeRequests = 0;
let lastActivityAtMs: number | null = null;

// Route handlers can attach terminal observers to their request context without
// wrapping the response body a second time. The HTTP runtime drains every
// response through one tracker, which fans these observers out at the point
// where bytes actually leave the proxy.
const responseObserversByMetadata = new WeakMap<
  object,
  ProxyResponseTrackingObserver[]
>();

const finalOwnership = new Map<
  string,
  { requestId: string; finalized: boolean }
>();
const finalOwnershipContext = new AsyncLocalStorage<{
  requestId: string;
  finalized: boolean;
}>();
/** Deferred native callbacks retain this owner even after transport cleanup. */
export function withProxyFinalLogOwnership<T>(
  requestId: string,
  run: () => T,
): T {
  const owner = finalOwnership.get(requestId);
  return owner ? finalOwnershipContext.run(owner, run) : run();
}
const finalLogObservers = new Map<string, (entry: RequestLogEntry) => void>();
const attemptLogObservers = new Map<
  string,
  (entry: RequestAttemptLogEntry) => void
>();

/** Join route accounting to the HTTP lifecycle without relying on write order. */
export function observeProxyFinalLog(
  requestId: string,
  observer: (entry: RequestLogEntry) => void,
  attemptObserver?: (entry: RequestAttemptLogEntry) => void,
): () => void {
  finalLogObservers.set(requestId, observer);
  finalOwnership.set(requestId, { requestId, finalized: false });
  if (attemptObserver) {
    attemptLogObservers.set(requestId, attemptObserver);
  } else {
    attemptLogObservers.delete(requestId);
  }
  return () => {
    if (finalLogObservers.get(requestId) === observer) {
      finalLogObservers.delete(requestId);
      finalOwnership.delete(requestId);
      attemptLogObservers.delete(requestId);
    }
  };
}

/** Check without claiming: aggregate accounting must not revive a cancelled request. */
export function isProxyRequestFinalized(requestId: string): boolean {
  const contextual = finalOwnershipContext.getStore();
  return (
    (contextual?.requestId === requestId
      ? contextual
      : finalOwnership.get(requestId)
    )?.finalized ?? false
  );
}

export function notifyProxyFinalLog(entry: RequestLogEntry): boolean {
  const contextual = finalOwnershipContext.getStore();
  const owner =
    contextual?.requestId === entry.requestId
      ? contextual
      : finalOwnership.get(entry.requestId);
  if (owner) {
    if (owner.finalized) {
      return false;
    }
    owner.finalized = true;
  }
  const parent = requestAccounting.get(entry.requestId)?.parentRequestId;
  if (parent && requestAccounting.has(parent)) {
    bridgeResults.set(parent, entry);
  }
  finalLogObservers.get(entry.requestId)?.(entry);
  return true;
}

/** Retain only the last attempt for a currently observed HTTP request. */
export function notifyProxyAttemptLog(entry: RequestAttemptLogEntry): void {
  const observer = attemptLogObservers.get(entry.requestId);
  observer?.(entry);
  if (entry.parentRequestId && entry.parentRequestId !== entry.requestId) {
    const parentObserver = attemptLogObservers.get(entry.parentRequestId);
    if (parentObserver !== observer) {
      parentObserver?.(entry);
    }
  }
}

export function registerProxyResponseObserver(
  metadata: object,
  observer: ProxyResponseTrackingObserver,
): void {
  const existing = responseObserversByMetadata.get(metadata);
  if (existing) {
    existing.push(observer);
    return;
  }
  responseObserversByMetadata.set(metadata, [observer]);
}

export function takeProxyResponseObservers(
  metadata: object,
): ProxyResponseTrackingObserver[] {
  const observers = responseObserversByMetadata.get(metadata) ?? [];
  responseObserversByMetadata.delete(metadata);
  return observers;
}

function touchActivity(): void {
  lastActivityAtMs = Date.now();
}

function safelyNotifyObserver(callback: (() => void) | undefined): void {
  try {
    callback?.();
  } catch (error) {
    // Observability must never alter response handling.
    if (logger.shouldLog("debug")) {
      logger.debug("[proxy] response lifecycle observer failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/** Track one client-facing proxy request until its response body settles. */
export function beginProxyRequest(): () => void {
  activeRequests += 1;
  touchActivity();
  let finished = false;

  return () => {
    if (finished) {
      return;
    }
    finished = true;
    activeRequests = Math.max(0, activeRequests - 1);
    touchActivity();
  };
}

export function getProxyActivitySnapshot(): ProxyActivitySnapshot {
  return {
    activeRequests,
    lastActivityAt:
      lastActivityAtMs === null ? null : new Date(lastActivityAtMs),
  };
}

export function isProxyActivityQuiet(
  snapshot: ProxyActivitySnapshot,
  quietThresholdMs: number,
  nowMs: number = Date.now(),
): boolean {
  if (snapshot.activeRequests > 0) {
    return false;
  }
  if (snapshot.lastActivityAt === null) {
    return true;
  }
  return nowMs - snapshot.lastActivityAt.getTime() >= quietThresholdMs;
}

/** Keep activity open until the response body completes, errors, or is cancelled. */
export function trackProxyResponse(
  response: Response,
  finishRequest: () => void,
  observer?: ProxyResponseTrackingObserver,
  abortSignal?: AbortSignal,
): Response {
  if (!response.body) {
    try {
      const notified = observer?.onTerminal?.({
        outcome: "bodyless",
        observedBodyBytes: 0,
        responseChunks: 0,
      });
      void withTimeout(
        Promise.resolve(notified),
        4000,
        "Timed out finalizing proxy response accounting",
      ).then(finishRequest, finishRequest);
    } catch {
      finishRequest();
    }
    return response;
  }

  const reader = response.body.getReader();
  let observedBodyBytes = 0;
  let responseChunks = 0;
  let settled = false;
  let sourceClosed = false;
  const settle = (
    outcome: ProxyResponseTerminalOutcome,
    error?: unknown,
  ): void => {
    if (settled) {
      return;
    }
    settled = true;
    abortSignal?.removeEventListener("abort", onAbort);
    // Keep drain accounting open through bounded terminal bookkeeping, but
    // never hold back the client's response body while telemetry is written.
    try {
      const notified = observer?.onTerminal?.({
        outcome,
        error,
        observedBodyBytes,
        responseChunks,
      });
      void withTimeout(
        Promise.resolve(notified),
        4000,
        "Timed out finalizing proxy response accounting",
      ).then(finishRequest, finishRequest);
    } catch {
      finishRequest();
    }
  };

  const onAbort = () => {
    settle(
      abortSignal?.reason?.name === "TimeoutError"
        ? "stream_error"
        : "client_cancelled",
      abortSignal?.reason,
    );
    void withTimeout(
      reader.cancel(abortSignal?.reason),
      PROXY_RESPONSE_CANCEL_TIMEOUT_MS,
      "Timed out cancelling the upstream proxy response",
    ).catch(() => undefined);
  };
  abortSignal?.addEventListener("abort", onAbort, { once: true });
  if (abortSignal?.aborted) {
    onAbort();
  }
  // A failed source cannot be observed only on a future downstream pull: a
  // stalled reader might never pull again, leaving admission/drain open forever.
  void reader.closed.then(
    () => {
      sourceClosed = true;
    },
    (error) => {
      settle("stream_error", error);
    },
  );

  const trackedBody = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          settle("completed");
          controller.close();
          return;
        }
        controller.enqueue(value);
        observedBodyBytes += value.byteLength;
        responseChunks += 1;
        if (responseChunks === 1) {
          safelyNotifyObserver(() =>
            observer?.onFirstChunk?.({
              observedBodyBytes,
              responseChunks: 1,
            }),
          );
        }
      } catch (error) {
        settle("stream_error", error);
        controller.error(error);
      }
    },
    async cancel(reason) {
      // Read the state before cancelling: reader.cancel() itself rejects the
      // closed promise for a genuinely active source, which is too late to
      // distinguish it from a source that had already ended normally.
      await Promise.resolve();
      settle(sourceClosed ? "completed" : "client_cancelled");
      await withTimeout(
        reader.cancel(reason),
        PROXY_RESPONSE_CANCEL_TIMEOUT_MS,
        "Timed out cancelling the upstream proxy response",
      );
    },
  });

  return new Response(trackedBody, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export function resetProxyActivityForTests(): void {
  activeRequests = 0;
  lastActivityAtMs = null;
}

import type {
  ProxyActivitySnapshot,
  ProxyResponseTerminalOutcome,
  ProxyResponseTrackingObserver,
} from "../types/index.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { logger } from "../utils/logger.js";

const PROXY_RESPONSE_CANCEL_TIMEOUT_MS = 1_000;

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
): Response {
  if (!response.body) {
    finishRequest();
    safelyNotifyObserver(() =>
      observer?.onTerminal?.({
        outcome: "bodyless",
        observedBodyBytes: 0,
        responseChunks: 0,
      }),
    );
    return response;
  }

  const reader = response.body.getReader();
  let observedBodyBytes = 0;
  let responseChunks = 0;
  let settled = false;
  let sourceClosed = false;
  // A framework can cancel its adapter after the upstream stream has already
  // closed. Snapshot reader.closed before cancel() so that normal cleanup is
  // not recorded as a client-aborted request.
  void reader.closed.then(
    () => {
      sourceClosed = true;
    },
    () => undefined,
  );

  const settle = (outcome: ProxyResponseTerminalOutcome): void => {
    if (settled) {
      return;
    }
    settled = true;
    finishRequest();
    safelyNotifyObserver(() =>
      observer?.onTerminal?.({
        outcome,
        observedBodyBytes,
        responseChunks,
      }),
    );
  };

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
        settle("stream_error");
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

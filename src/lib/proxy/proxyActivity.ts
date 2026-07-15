import type { ProxyActivitySnapshot } from "../types/index.js";

let activeRequests = 0;
let lastActivityAtMs: number | null = null;

function touchActivity(): void {
  lastActivityAtMs = Date.now();
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
): Response {
  if (!response.body) {
    finishRequest();
    return response;
  }

  const reader = response.body.getReader();
  const trackedBody = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await reader.read();
        if (done) {
          finishRequest();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        finishRequest();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        finishRequest();
      }
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

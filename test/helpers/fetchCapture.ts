/**
 * Real-fetch capture helper.
 *
 * Wraps `globalThis.fetch` BEFORE NeuroLink is imported so every outbound
 * HTTP request from any provider (including those using `createProxyFetch`)
 * is observed. The real fetch still runs — this is instrumentation, not
 * mocking. The body is inspected to confirm whether the SDK actually
 * compacted an oversized conversation before dispatch.
 *
 * IMPORTANT: callers must `installFetchCapture()` BEFORE importing NeuroLink
 * from `dist/`.
 */

export type FetchCapture = {
  url: string;
  method: string;
  bodyBytes: number;
  approxTokens: number;
  ts: number;
};

let installed = false;
const records: FetchCapture[] = [];

function bytesOf(body: BodyInit | null | undefined): number {
  if (body === null || body === undefined) {
    return 0;
  }
  if (typeof body === "string") {
    // Byte length, not UTF-16 code-unit length, so the threshold below is
    // accurate for non-ASCII payloads as well.
    return Buffer.byteLength(body, "utf8");
  }
  if (body instanceof ArrayBuffer) {
    return body.byteLength;
  }
  if (ArrayBuffer.isView(body)) {
    return body.byteLength;
  }
  if (body instanceof Blob) {
    return body.size;
  }
  // ReadableStream / FormData / URLSearchParams — can't be measured without
  // consuming. Return -1 so callers know.
  return -1;
}

export function installFetchCapture(): {
  list(): FetchCapture[];
  reset(): void;
  forHostname(pattern: string): FetchCapture[];
  forBodyOver(bytes: number): FetchCapture[];
} {
  if (!installed) {
    const original = globalThis.fetch;
    globalThis.fetch = async function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      // Per fetch spec: when init.method is omitted and input is a Request,
      // fall back to the Request's method; otherwise default to "GET".
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      // Same fallback for body: AI SDK passes plain URL+init in practice,
      // but Request inputs carry their own body (a ReadableStream which
      // bytesOf returns -1 for — accurately reflecting that we can't
      // measure it without consuming the stream).
      const body =
        init?.body ??
        (input instanceof Request
          ? (input.body as BodyInit | null | undefined)
          : undefined);
      const bodyBytes = bytesOf(body as BodyInit | null | undefined);
      records.push({
        url,
        method,
        bodyBytes,
        // Rough English-token estimate: ~4 bytes/token. Used only for
        // human-readable log output; assertions use the byte count directly.
        approxTokens: bodyBytes > 0 ? Math.round(bodyBytes / 4) : 0,
        ts: Date.now(),
      });
      return original.call(globalThis, input as RequestInfo, init);
    } as typeof globalThis.fetch;
    installed = true;
  }
  return {
    list: () => [...records],
    reset: () => {
      records.length = 0;
    },
    forHostname: (pattern) => records.filter((r) => r.url.includes(pattern)),
    // Reviewer nitpick: include unmeasurable streaming bodies (-1) so callers
    // don't silently miss a potentially-oversized payload. Consumers that
    // need a strict measured-only filter can post-filter on bodyBytes > 0.
    forBodyOver: (bytes) =>
      records.filter((r) => r.bodyBytes === -1 || r.bodyBytes > bytes),
  };
}

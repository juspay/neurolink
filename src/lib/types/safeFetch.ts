/**
 * Types for the safe-fetch utility (SSRF-hardened binary downloads).
 *
 * Runtime helper lives in `src/lib/utils/safeFetch.ts`.
 */

/**
 * One validated address the pinned connect layer is allowed to dial.
 * Produced by `ssrfGuard.ts:validateAndResolveUrl`, consumed by
 * `safeFetch.ts:buildPinnedAgent`.
 */
export type PinnedAddress = {
  ip: string;
  family: 4 | 6;
};

export type SafeDownloadOptions = {
  /** Hard cap on response size in bytes. Pass MAX_VIDEO_BYTES/MAX_AUDIO_BYTES/MAX_IMAGE_BYTES from sizeGuard. */
  maxBytes: number;
  /** Human-readable identifier used in error messages (e.g. "HeyGen video"). */
  label: string;
  /** Optional abort signal for caller-driven cancellation. */
  signal?: AbortSignal;
  /** Optional HTTP transfer timeout (ms), covering headers and body after URL validation. Default: 60_000. */
  timeoutMs?: number;
  /**
   * Headers for the FIRST request only. Never replayed to a redirect target:
   * a credential meant for one host must not be handed to the host it
   * redirects to. Default: none.
   */
  headers?: Record<string, string>;
  /**
   * How many redirect hops to follow, each re-validated by the SSRF guard and
   * sent without the caller's headers. Default 0: a 3xx is refused, which is
   * the server path's behaviour.
   */
  maxRedirects?: number;
  /** Accept `http:` as well as `https:`. Default false (HTTPS only). */
  allowInsecure?: boolean;
  /**
   * Skip the private/loopback/link-local/metadata range check. The connection
   * is still pinned to the resolved addresses. Default false.
   */
  allowPrivateNetwork?: boolean;
  /** `HEAD` returns the headers with an empty body. Default `GET`. */
  method?: "GET" | "HEAD";
};

/** `safeDownloadWithMeta()` — the body plus what the response said about it. */
export type SafeDownloadResult = {
  buffer: Buffer;
  /** `Content-Type` of the final response, `""` when absent. */
  contentType: string;
  /** `Content-Encoding` of the final response, `""` when absent. */
  contentEncoding: string;
  /** The URL that produced the body — differs from the request URL after a redirect. */
  finalUrl: string;
  /** Redirect hops that were followed. */
  redirects: number;
};

/** Per-call switches for `validateAndResolveUrl()` / `assertSafeUrlForProxy()`. */
export type SsrfGuardOptions = {
  /** Accept `http:` as well as `https:`. Default false. */
  allowInsecure?: boolean;
  /** Skip the blocked-range check (addresses are still resolved and returned). Default false. */
  allowPrivateNetwork?: boolean;
};

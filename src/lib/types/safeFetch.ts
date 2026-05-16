/**
 * Types for the safe-fetch utility (SSRF-hardened binary downloads).
 *
 * Runtime helper lives in `src/lib/utils/safeFetch.ts`.
 */

export type SafeDownloadOptions = {
  /** Hard cap on response size in bytes. Pass MAX_VIDEO_BYTES/MAX_AUDIO_BYTES/MAX_IMAGE_BYTES from sizeGuard. */
  maxBytes: number;
  /** Human-readable identifier used in error messages (e.g. "HeyGen video"). */
  label: string;
  /** Optional abort signal for caller-driven cancellation. */
  signal?: AbortSignal;
  /** Optional per-call request timeout (ms). Default: 60_000. */
  timeoutMs?: number;
};

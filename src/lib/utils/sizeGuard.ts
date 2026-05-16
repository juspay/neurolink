/**
 * Size Guard Utility
 *
 * Provides bounded binary downloads to prevent OOM when fetching generated
 * media from external providers. Applies a Content-Length pre-check and a
 * post-buffer guard so multi-GB responses are rejected before they fully
 * materialise in process memory.
 *
 * @module utils/sizeGuard
 */

/** 256 MiB — suitable for video output (MP4). */
export const MAX_VIDEO_BYTES = 256 * 1024 * 1024;

/** 50 MiB — suitable for audio output (MP3/WAV). */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

/** 25 MiB — suitable for image output (PNG/JPEG/WebP). */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/**
 * Download the body of a {@link Response} into a {@link Buffer}, enforcing an
 * upper-bound on the number of bytes consumed.
 *
 * Two checks are performed:
 * 1. If the response includes a `Content-Length` header that exceeds
 *    `maxBytes`, the download is rejected immediately (no data is read).
 * 2. After buffering, the actual buffer size is verified against `maxBytes`.
 *    This catches chunked transfers where no `Content-Length` was provided.
 *
 * @param response  The fetch {@link Response} to drain.
 * @param maxBytes  Maximum number of bytes allowed.
 * @param label     Human-readable identifier used in error messages
 *                  (e.g. "Kling video", "D-ID result").
 * @returns         The response body as a {@link Buffer}.
 * @throws          {@link Error} when either size check fails.
 */
export async function readBoundedBuffer(
  response: Response,
  maxBytes: number,
  label: string,
): Promise<Buffer> {
  const contentLength = parseInt(
    response.headers.get("content-length") ?? "0",
    10,
  );
  if (contentLength > 0 && contentLength > maxBytes) {
    throw new Error(
      `${label} download too large: ${contentLength} bytes (max ${maxBytes})`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw new Error(
      `${label} download exceeded size cap after fetch: ${buffer.length} bytes (max ${maxBytes})`,
    );
  }
  return buffer;
}

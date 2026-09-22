/**
 * Size Guard Utility
 *
 * Provides bounded binary downloads to prevent OOM when fetching generated
 * media from external providers. Applies a Content-Length pre-check and
 * counts bytes while streaming, so multi-GB responses are rejected before
 * they fully materialise in process memory.
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
 * 2. The body is read as a stream and the reader is cancelled as soon as
 *    more than `maxBytes` arrive. This catches chunked transfers where no
 *    `Content-Length` was provided (or it understated the body) without
 *    buffering the excess. A response without a readable stream falls back
 *    to buffering and checking afterwards.
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
  const exceeded = (bytes: number): Error =>
    new Error(
      `${label} download exceeded size cap after fetch: ${bytes} bytes (max ${maxBytes})`,
    );

  const body: ReadableStream<Uint8Array> | null | undefined = response.body;
  if (!body || typeof body.getReader !== "function") {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw exceeded(buffer.length);
    }
    return buffer;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw exceeded(received);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, received);
}

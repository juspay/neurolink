/**
 * Image format detection from magic bytes.
 *
 * The native Vertex+Anthropic image block needs the correct `mimeType` for
 * each inline image. Buffer and bare-base64 inputs (e.g. Slack / REST uploads)
 * carry no mime hint, so the format must be sniffed from the leading bytes —
 * otherwise a wrong default (historically `image/jpeg`) makes Anthropic reject
 * PNG/GIF/WebP with a media-type mismatch 400.
 */

/**
 * Detect an image's MIME type from its magic bytes. Returns `image/png` for
 * buffers that match no known signature (the safest neutral default for the
 * Vertex image path).
 */
export function detectImageMimeType(buffer: Buffer): string {
  // PNG: 89 50 4E 47
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  // WebP: "RIFF"...."WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // GIF: "GIF"
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return "image/gif";
  }

  // Unknown — neutral default.
  return "image/png";
}

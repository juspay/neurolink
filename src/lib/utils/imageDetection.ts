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
 * Detect an image's MIME type from its magic bytes, or `null` when the bytes
 * match no known signature.
 *
 * Use this when the answer "not an image" has to be distinguishable from a
 * default. `detectImageMimeType` collapses that distinction on purpose, which
 * is right for a caller that already knows it holds an image and wrong for one
 * deciding whether it does.
 */
export function sniffImageMimeType(buffer: Buffer): string | null {
  // PNG: the full 8-byte signature 89 50 4E 47 0D 0A 1A 0A. The trailing four
  // bytes matter — a truncated `iVBORw==` carries only the first four and is
  // not a decodable image.
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
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

  // GIF: the full 6-byte header "GIF87a" or "GIF89a". The version stamp is
  // what separates a header from three coincidental letters — the old check
  // compared only "GIF" while guarding on `length >= 6`, so any six bytes
  // beginning with those letters (base64 `R0lGAAAA` decodes to 47 49 46 00
  // 00 00) were labelled image/gif. This gate is what decides whether bytes
  // are an image at all, so it is only as strict as its weakest signature.
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 && // G
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x38 && // 8
    (buffer[4] === 0x37 || buffer[4] === 0x39) && // 7 | 9
    buffer[5] === 0x61 // a
  ) {
    return "image/gif";
  }

  return null;
}

/**
 * Detect an image's MIME type from its magic bytes. Returns `image/png` for
 * buffers that match no known signature (the safest neutral default for the
 * Vertex image path).
 */
export function detectImageMimeType(buffer: Buffer): string {
  return sniffImageMimeType(buffer) ?? "image/png";
}

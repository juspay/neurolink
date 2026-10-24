/**
 * Image format detection from magic bytes.
 *
 * The native Vertex+Anthropic image block needs the correct `mimeType` for
 * each inline image. Buffer and bare-base64 inputs (e.g. Slack / REST uploads)
 * carry no mime hint, so the format must be sniffed from the leading bytes —
 * otherwise a wrong default (historically `image/jpeg`) makes Anthropic reject
 * PNG/GIF/WebP with a media-type mismatch 400.
 */

import { detectIsoBmffImageMimeType } from "./isoBmff.js";

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

/**
 * `DIB` header sizes a BMP file may carry after its 14-byte file header: OS/2
 * core (12, 16), `BITMAPINFOHEADER` (40) and its Adobe variants (52, 56), OS/2 2
 * (64), `BITMAPV4HEADER` (108) and `BITMAPV5HEADER` (124).
 */
const BMP_DIB_HEADER_SIZES: ReadonlySet<number> = new Set([
  12, 16, 40, 52, 56, 64, 108, 124,
]);

/**
 * The formats NeuroLink accepts as input but no vision provider takes verbatim,
 * plus HEIC, HEIF and AVIF (Google takes the first two natively).
 *
 * BMP and ICO open with two or four bytes that plain text could produce, so
 * each is held to the next structural field as well: a BMP to a known `DIB`
 * header size, an ICO to a non-empty directory whose first entry has its
 * reserved byte clear. Without that a payload that merely begins `BM` would be
 * an image.
 */
function sniffConvertibleImageMimeType(buffer: Buffer): string | null {
  // HEIC, HEIF and AVIF: the shared ISO-BMFF `ftyp` brand tables.
  const isoBmff = detectIsoBmffImageMimeType(buffer);
  if (isoBmff !== null) {
    return isoBmff;
  }

  // TIFF: "II*\0" (little-endian) or "MM\0*" (big-endian).
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x2a &&
      buffer[3] === 0x00) ||
      (buffer[0] === 0x4d &&
        buffer[1] === 0x4d &&
        buffer[2] === 0x00 &&
        buffer[3] === 0x2a))
  ) {
    return "image/tiff";
  }

  // BMP: "BM", then a file header whose DIB header size is one that exists.
  if (
    buffer.length >= 18 &&
    buffer[0] === 0x42 &&
    buffer[1] === 0x4d &&
    BMP_DIB_HEADER_SIZES.has(buffer.readUInt32LE(14))
  ) {
    return "image/bmp";
  }

  // ICO: 00 00 01 00, an entry count above zero and a clear reserved byte in
  // the first 16-byte directory entry.
  if (
    buffer.length >= 22 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x01 &&
    buffer[3] === 0x00 &&
    buffer.readUInt16LE(4) > 0 &&
    buffer[9] === 0x00
  ) {
    return "image/x-icon";
  }

  // JPEG 2000: the full 12-byte signature box. The trailing 0D 0A 87 0A is a
  // line-ending probe that a mangled transfer corrupts, so it is checked too.
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    buffer[2] === 0x00 &&
    buffer[3] === 0x0c &&
    buffer.toString("latin1", 4, 8) === "jP  " &&
    buffer[8] === 0x0d &&
    buffer[9] === 0x0a &&
    buffer[10] === 0x87 &&
    buffer[11] === 0x0a
  ) {
    return "image/jp2";
  }

  return null;
}

/**
 * Detect the MIME type of any raster image NeuroLink accepts as input, or `null`
 * when the bytes match none.
 *
 * {@link sniffImageMimeType} answers for the four formats every vision provider
 * takes as they are, and its callers depend on that set staying four. This is
 * the wider question for a caller deciding whether bytes are an image NeuroLink
 * can send at all: those four, plus HEIC, HEIF (Google takes both natively),
 * AVIF, BMP, TIFF, ICO and JPEG 2000, which the SDK converts to PNG before
 * dispatch (`SUPPORTED_INPUT_IMAGE_MIME_TYPES`). Every type it returns is in that
 * set, so a caller that relabels bytes with the answer is never handing the SDK
 * a type it refuses.
 *
 * SVG is deliberately absent. It is markup with no byte signature, and no
 * provider accepts it; a caller that wants it has to look for it separately.
 *
 * Only the leading bytes are read (a few hundred cover every signature), so a
 * prefix of a large image is enough. A signature is a claim about the opening of
 * the file, not proof the rest decodes.
 */
export function sniffInputImageMimeType(buffer: Buffer): string | null {
  return sniffImageMimeType(buffer) ?? sniffConvertibleImageMimeType(buffer);
}

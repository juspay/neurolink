/**
 * Vision-provider image format compatibility.
 *
 * NeuroLink identifies far more image formats than any vision API accepts. BMP,
 * TIFF, AVIF, ICO and JPEG 2000 are accepted by none of them; HEIC and HEIF are
 * accepted only by Google. Until this module existed those formats were
 * detected correctly, labelled correctly, and then forwarded verbatim — the
 * request reached the provider and came back as an opaque HTTP 400, which is
 * the least useful outcome available: the file was clearly an image, NeuroLink
 * knew exactly which kind, and still nothing worked.
 *
 * A phone photo is the common case. iOS writes HEIC by default, so "attach a
 * photo and ask what is in it" failed for every provider except Google.
 *
 * Anything outside the universal set is transcoded to PNG. PNG rather than JPEG
 * because the sources are frequently lossless (TIFF, BMP, ICO) or already
 * carry alpha, and a lossy re-encode of an image the model is about to read
 * closely is the wrong default.
 *
 * @module adapters/imageFormatSupport
 */

import type {
  ExifOrientationProbe,
  ImageOrientationNormalization,
  ImageWithAltText,
  VisionImageConversion,
  VisionTranscodeOptions,
} from "../types/index.js";
import { extensionForMimeType } from "../processors/config/fileTypeRegistry.js";
import { withTimeout } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import { tryImport } from "../utils/tryImport.js";
import { getFfmpegPath, runFfmpeg } from "./video/ffmpegAdapter.js";

/**
 * Per-backend ceiling for one image conversion.
 *
 * Generous enough for a large TIFF or a HEIC burst frame on a loaded machine,
 * short enough that a hung decoder cannot hold a generation request open.
 */
const IMAGE_TRANSCODE_TIMEOUT_MS = 30_000;

/**
 * MIME types every vision-capable provider accepts as-is.
 *
 * This is the intersection across OpenAI, Anthropic, Google (AI Studio and
 * Vertex), Bedrock, Azure and Mistral — deliberately the intersection and not
 * a per-provider matrix. Google additionally accepts HEIC/HEIF natively, but
 * converting those for Google as well costs one transcode and removes an
 * entire axis of provider-specific branching from the dispatch path.
 */
export const UNIVERSAL_VISION_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

/**
 * Formats that are transcoded to PNG before dispatch.
 *
 * An explicit allowlist rather than "anything not universal": a MIME type this
 * module does not recognise is more likely a mislabelled file than a format
 * sharp can decode, and passing it through unchanged preserves the provider's
 * own error message instead of replacing it with a decode failure here.
 */
const TRANSCODABLE_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/bmp",
  "image/x-ms-bmp",
  "image/tiff",
  "image/x-tiff",
  "image/avif",
  "image/heic",
  "image/heic-sequence",
  "image/heif",
  "image/heif-sequence",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/jp2",
  "image/jpx",
  "image/apng",
  // SVG reaches this module only when it arrives as raw bytes in `input.images`
  // rather than through detection (which routes .svg to the sanitizer). No
  // vision provider accepts image/svg+xml, and sharp rasterises SVG natively,
  // so converting is strictly better than shipping markup labelled as an image.
  "image/svg+xml",
]);

/**
 * Every image MIME type NeuroLink accepts as *input*.
 *
 * The union of what providers take as-is and what this module can convert for
 * them. Intake validation must use this rather than the universal set alone:
 * a format we can transcode is a format we accept, and gating intake on the
 * provider-acceptable list rejects the file before conversion ever runs.
 */
export const SUPPORTED_INPUT_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  ...UNIVERSAL_VISION_IMAGE_MIME_TYPES,
  ...TRANSCODABLE_IMAGE_MIME_TYPES,
]);

/**
 * True when a MIME type needs transcoding before it can be sent to a vision
 * provider. Cheap enough to call on every image; callers use it to avoid
 * reading a file off disk that would not have been converted anyway.
 */
export function needsVisionTranscode(mimeType: string): boolean {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  return (
    !UNIVERSAL_VISION_IMAGE_MIME_TYPES.has(normalized) &&
    TRANSCODABLE_IMAGE_MIME_TYPES.has(normalized)
  );
}

/**
 * Formats whose spec allows an EXIF/XMP orientation tag.
 *
 * PNG and GIF have no such field, so they are deliberately absent — gating on
 * this set (rather than running sharp's metadata probe on every image) means
 * those two formats never pay for a decode they cannot possibly need.
 */
const EXIF_ORIENTABLE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/tiff",
  "image/x-tiff",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heic-sequence",
  "image/heif",
  "image/heif-sequence",
]);

/**
 * True when a MIME type's format can carry an orientation tag at all. Cheap
 * enough to call on every image; callers use it to skip reading a file off
 * disk (or invoking sharp) for a format that structurally cannot need it.
 */
export function mayCarryExifOrientation(mimeType: string): boolean {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  return EXIF_ORIENTABLE_MIME_TYPES.has(normalized);
}

/**
 * Leading bytes {@link probeExifOrientation} needs to reach a verdict on the
 * containers it parses.
 *
 * A JPEG's EXIF block lives in an APP1 segment whose length field is 16 bits
 * wide, so the segment cannot exceed 64 KiB — and IFD0, which holds the
 * orientation tag, sits at the very front of it. One window this size
 * therefore spans the entire tag block of any file written EXIF-first, which
 * is every file a camera or phone produces. WebP settles in 21 bytes.
 *
 * Sized deliberately in terms of what the format guarantees rather than what
 * a sample of files happens to need: a window chosen by measurement would
 * turn an unusual-but-legal layout into a silent wrong answer, whereas
 * running out of this one returns `"inconclusive"` and costs only the read it
 * was trying to avoid.
 */
export const EXIF_PROBE_PREFIX_BYTES = 64 * 1024;

/** Orientation, tag 0x0112 of TIFF/EXIF IFD0. */
const EXIF_TAG_ORIENTATION = 0x0112;

/** TIFF field types this probe knows how to read a scalar out of. */
const TIFF_TYPE_SHORT = 3;
const TIFF_TYPE_LONG = 4;

function readUint16(
  buffer: Buffer,
  offset: number,
  littleEndian: boolean,
): number | undefined {
  if (offset < 0 || offset + 2 > buffer.length) {
    return undefined;
  }
  return littleEndian
    ? buffer.readUInt16LE(offset)
    : buffer.readUInt16BE(offset);
}

function readUint32(
  buffer: Buffer,
  offset: number,
  littleEndian: boolean,
): number | undefined {
  if (offset < 0 || offset + 4 > buffer.length) {
    return undefined;
  }
  return littleEndian
    ? buffer.readUInt32LE(offset)
    : buffer.readUInt32BE(offset);
}

/**
 * Read the orientation tag out of a TIFF header block — the payload of a JPEG
 * APP1 segment past its `Exif\0\0` signature, or a `.tif` file's own opening
 * bytes, which are the same structure.
 *
 * Only IFD0 is walked. That is where every writer puts orientation, and it is
 * also the only IFD libvips reads it from, so a deeper walk would find tags
 * that the decoder this probe is standing in for would itself ignore.
 */
function probeTiffBlockOrientation(tiff: Buffer): ExifOrientationProbe {
  const byteOrder = readUint16(tiff, 0, false);
  const littleEndian = byteOrder === 0x4949; // "II"
  if (!littleEndian && byteOrder !== 0x4d4d /* "MM" */) {
    return "inconclusive";
  }
  if (readUint16(tiff, 2, littleEndian) !== 42) {
    return "inconclusive";
  }
  const ifdOffset = readUint32(tiff, 4, littleEndian);
  if (ifdOffset === undefined) {
    return "inconclusive";
  }
  const entryCount = readUint16(tiff, ifdOffset, littleEndian);
  if (entryCount === undefined) {
    return "inconclusive";
  }
  // Every entry must be inside the window before "no orientation tag here"
  // can mean anything — a half-read IFD is a question, not an answer.
  if (ifdOffset + 2 + entryCount * 12 > tiff.length) {
    return "inconclusive";
  }
  for (let i = 0; i < entryCount; i++) {
    const entry = ifdOffset + 2 + i * 12;
    if (readUint16(tiff, entry, littleEndian) !== EXIF_TAG_ORIENTATION) {
      continue;
    }
    const fieldType = readUint16(tiff, entry + 2, littleEndian);
    // A scalar that fits in four bytes is stored left-justified in the value
    // field, so both widths start at the same place. An exotic field type is
    // left to the decoder rather than guessed at.
    const value =
      fieldType === TIFF_TYPE_SHORT
        ? readUint16(tiff, entry + 8, littleEndian)
        : fieldType === TIFF_TYPE_LONG
          ? readUint32(tiff, entry + 8, littleEndian)
          : undefined;
    if (value === undefined) {
      return "inconclusive";
    }
    // Matches `normalizeImageOrientation`'s own condition: 1 is upright and 0
    // is the absent/invalid encoding, and neither is worth a re-encode.
    return value <= 1 ? "absent" : "present";
  }
  return "absent";
}

/**
 * Walk a JPEG's marker segments looking for the EXIF APP1.
 *
 * Reaching SOS or EOI is a conclusive "absent": metadata segments are
 * required to precede the entropy-coded scan, so nothing past that point can
 * introduce one. Running off the end of the window is not conclusive and says
 * so.
 */
function probeJpegOrientation(prefix: Buffer): ExifOrientationProbe {
  if (prefix.length < 4 || prefix.readUInt16BE(0) !== 0xffd8 /* SOI */) {
    // The extension claimed JPEG and the bytes disagree. Whatever this is,
    // the decoder gets to say so.
    return "inconclusive";
  }
  let offset = 2;
  while (offset + 4 <= prefix.length) {
    if (prefix[offset] !== 0xff) {
      return "inconclusive";
    }
    // Any run of 0xFF ahead of the marker id is legal fill.
    let markerAt = offset + 1;
    while (markerAt < prefix.length && prefix[markerAt] === 0xff) {
      markerAt++;
    }
    if (markerAt >= prefix.length) {
      return "inconclusive";
    }
    const marker = prefix[markerAt];
    if (marker === 0xd9 /* EOI */ || marker === 0xda /* SOS */) {
      return "absent";
    }
    // Standalone markers carry no length field to skip over.
    if (
      marker === 0x01 ||
      marker === 0xd8 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      offset = markerAt + 1;
      continue;
    }
    const length = readUint16(prefix, markerAt + 1, false);
    if (length === undefined || length < 2) {
      return "inconclusive";
    }
    const payloadStart = markerAt + 3;
    const segmentEnd = markerAt + 1 + length;
    if (marker === 0xe1 /* APP1 */) {
      if (segmentEnd > prefix.length) {
        return "inconclusive";
      }
      const payload = prefix.subarray(payloadStart, segmentEnd);
      if (
        payload.length > 6 &&
        payload.subarray(0, 4).toString("latin1") === "Exif" &&
        payload[4] === 0x00 &&
        payload[5] === 0x00
      ) {
        return probeTiffBlockOrientation(payload.subarray(6));
      }
      // Some other APP1 — an XMP packet, most often. Keep walking; the EXIF
      // one may still be ahead.
    }
    offset = segmentEnd;
  }
  return "inconclusive";
}

/**
 * Read the VP8X feature flags of a WebP container.
 *
 * A simple-format file (`VP8 ` / `VP8L` as its only chunk) has nowhere to put
 * metadata, which settles it outright. An extended file advertises whether an
 * EXIF chunk exists anywhere in the file, and that flag alone is enough to
 * clear the common case — the chunk itself is conventionally written after
 * the image data, so a set flag is where a header prefix stops being able to
 * answer.
 */
function probeWebpOrientation(prefix: Buffer): ExifOrientationProbe {
  if (
    prefix.length < 16 ||
    prefix.subarray(0, 4).toString("latin1") !== "RIFF" ||
    prefix.subarray(8, 12).toString("latin1") !== "WEBP"
  ) {
    return "inconclusive";
  }
  const firstChunk = prefix.subarray(12, 16).toString("latin1");
  if (firstChunk === "VP8 " || firstChunk === "VP8L") {
    return "absent";
  }
  // fourCC (4) + chunk length (4) puts the flags byte at 20.
  if (firstChunk !== "VP8X" || prefix.length < 21) {
    return "inconclusive";
  }
  const EXIF_CHUNK_FLAG = 0x08;
  return (prefix[20] & EXIF_CHUNK_FLAG) === 0 ? "absent" : "inconclusive";
}

/**
 * Decide from a bounded header prefix whether an image carries an EXIF
 * orientation worth acting on — without decoding it, and without needing all
 * of its bytes.
 *
 * This exists because the orientation question is asked of every JPEG and
 * WebP a caller supplies, while the answer is "no" for almost all of them.
 * Answering it with a decoder means reading the whole file into memory and
 * loading sharp to look at a header; answering it here costs
 * {@link EXIF_PROBE_PREFIX_BYTES} at most, and usually far less.
 *
 * The verdict is deliberately three-valued. `"absent"` is a promise — the
 * container was parsed far enough to rule an actionable tag out — and callers
 * may skip the expensive path on it. Everything else, including every
 * container this probe does not parse (HEIC, HEIF, AVIF: ISOBMFF, where
 * orientation is an item property rather than a header field), comes back
 * `"inconclusive"` and must fall through to the decoder.
 *
 * @param prefix - Leading bytes of the image; the whole image is also fine.
 * @param mimeType - Detected MIME type of the image `prefix` came from.
 */
export function probeExifOrientation(
  prefix: Buffer,
  mimeType: string,
): ExifOrientationProbe {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  switch (normalized) {
    case "image/jpeg":
      return probeJpegOrientation(prefix);
    case "image/webp":
      return probeWebpOrientation(prefix);
    case "image/tiff":
    case "image/x-tiff":
      return probeTiffBlockOrientation(prefix);
    default:
      return "inconclusive";
  }
}

/**
 * Decode with sharp. Covers TIFF, AVIF, GIF and SVG in-process with no temp
 * files, which is the fast path.
 *
 * Deliberately does NOT cover every transcodable format: sharp's prebuilt
 * binaries report `heif` as an input format but that is AV1-in-HEIF (AVIF)
 * only — actual HEVC-coded HEIC fails inside libheif, and BMP, ICO and
 * JPEG 2000 are not compiled in at all. Those fall through to ffmpeg below.
 */
async function transcodeWithSharp(
  buffer: Buffer,
  autoOrient: boolean,
): Promise<Buffer> {
  const sharpModule = await tryImport<typeof import("sharp")>(
    "sharp",
    "Image format conversion for vision providers",
  );
  // A shape guard, not a crash guard: an absent or malformed sharp already
  // fails safely, because `tryImport` throws a named install error and any
  // TypeError from calling a non-function is caught by the backend loop, which
  // then tries ffmpeg. What this adds is a legible reason in that loop's
  // failure list instead of "sharpModule.default is not a function".
  //
  // It deliberately throws rather than returning `buffer`: returning the input
  // would report a successful conversion and relabel the original bytes as PNG,
  // and would also skip the ffmpeg backend — the one that actually handles
  // HEIC, BMP, ICO and JPEG 2000.
  if (typeof sharpModule?.default !== "function") {
    throw new Error(
      "the installed sharp package does not expose a callable default export",
    );
  }
  // `pages: 1` keeps a multi-frame source (animated AVIF, a .heics sequence,
  // a multi-page TIFF) from being flattened into one tall strip — the first
  // frame is what a vision model should receive.
  const pipeline = sharpModule.default(buffer, { pages: 1 });
  // The instance shape is checked as well as the factory: a build that exports
  // a callable but returns something without `.png()` would otherwise fail as
  // an opaque TypeError inside the backend loop.
  if (typeof pipeline?.png !== "function") {
    throw new Error(
      "the installed sharp package returned a pipeline without a png() encoder",
    );
  }
  if (autoOrient && typeof pipeline.rotate !== "function") {
    throw new Error(
      "the installed sharp package returned a pipeline without a rotate() transform",
    );
  }
  // `.rotate()` with no argument auto-orients from the EXIF tag, and the PNG
  // encoder then writes already-upright pixels with no tag left to carry. It
  // rides along inside the decode the transcode was going to do anyway, so an
  // image needing both costs one decode and one encode rather than two of
  // each — and, for a source sharp writes lossily (TIFF defaults to JPEG
  // compression), skips a whole generation of quality loss on the way.
  return (autoOrient ? pipeline.rotate() : pipeline).png().toBuffer();
}

/**
 * Decode with ffmpeg, which handles what sharp cannot — most importantly HEIC,
 * the format iPhones write by default and therefore the single most common
 * "why can't the model see my photo" case.
 *
 * ffmpeg is already a soft dependency for video keyframe extraction and is
 * resolved through the same `FFMPEG_PATH` → `ffmpeg-static` → system-PATH
 * chain, so this adds a code path rather than a new requirement.
 *
 * Requires temp files: ffmpeg's image demuxers seek, so piping through stdin is
 * not reliable for these formats. The temp directory is removed in `finally`
 * whether or not the conversion succeeded.
 *
 * The Node builtins are imported dynamically rather than at module scope
 * because the browser bundle stubs `node:fs/promises` and its stub has no
 * `mkdtemp`. This whole path is server-only — nothing in a browser is going to
 * spawn ffmpeg — so the import belongs where it is used.
 */
async function transcodeWithFfmpeg(
  buffer: Buffer,
  extension: string,
  binaryPath?: string,
): Promise<Buffer> {
  const [
    { randomUUID },
    { mkdtemp, readFile, rm, writeFile },
    { tmpdir },
    { join },
  ] = await Promise.all([
    import("node:crypto"),
    import("node:fs/promises"),
    import("node:os"),
    import("node:path"),
  ]);
  const workDir = await mkdtemp(join(tmpdir(), "neurolink-img-"));
  const inputPath = join(workDir, `${randomUUID()}${extension}`);
  const outputPath = join(workDir, `${randomUUID()}.png`);
  try {
    await writeFile(inputPath, buffer);
    await runFfmpeg(
      [
        "-y",
        "-v",
        "error",
        "-i",
        inputPath,
        // Take a single frame so a multi-image container yields one PNG rather
        // than ffmpeg erroring on a missing output-sequence pattern.
        "-frames:v",
        "1",
        "-f",
        "image2",
        "-c:v",
        "png",
        outputPath,
      ],
      binaryPath ? { binaryPath } : {},
    );
    return await readFile(outputPath);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/**
 * The decode backends to try, in order, cheapest first.
 *
 * The two ffmpeg entries are not redundant. `getFfmpegPath()` prefers the
 * `ffmpeg-static` package, whose LGPL build omits HEVC and therefore cannot
 * read HEIC — the format iPhones write by default. A system ffmpeg usually can,
 * so when the resolved binary is not already the system one it is retried
 * explicitly rather than reporting a photo as unsupported.
 */
async function* transcodeBackends(
  buffer: Buffer,
  extension: string,
  autoOrient: boolean,
): AsyncGenerator<{ name: string; run: () => Promise<Buffer> }> {
  yield { name: "sharp", run: () => transcodeWithSharp(buffer, autoOrient) };
  const resolved = await getFfmpegPath().catch(() => "ffmpeg");
  yield {
    name: "ffmpeg",
    run: () => transcodeWithFfmpeg(buffer, extension),
  };
  if (resolved !== "ffmpeg") {
    yield {
      name: "system ffmpeg",
      run: () => transcodeWithFfmpeg(buffer, extension, "ffmpeg"),
    };
  }
}

/**
 * Return image bytes every vision provider can read, transcoding to PNG when
 * the source format is one no provider accepts.
 *
 * Never throws for image reasons. When neither backend can decode the input,
 * the original bytes are returned with a warning naming the format — the
 * request then fails at the provider exactly as it did before, rather than this
 * compatibility step becoming a new way for a previously working request to
 * break.
 *
 * `options.autoOrient` folds an EXIF orientation correction into the same
 * decode, for a format that needs both (HEIC, HEIF, TIFF, AVIF are in both
 * sets). Only the sharp backend honours it: ffmpeg's image encoders do not
 * apply EXIF orientation, so a source ffmpeg transcodes comes back unrotated.
 * `autoOrient` is therefore a request rather than a guarantee, exactly like
 * `converted`.
 *
 * That it costs nothing today rests on {@link transcodeBackends}' **ordering**,
 * not on which formats each backend supports. ffmpeg is a fallback: it is
 * reached only once sharp has thrown on this exact buffer, and a buffer sharp
 * cannot decode is one the sharp-based `normalizeImageOrientation` could not
 * have oriented either. The two sets are disjoint by construction, which is
 * why replacing the old orientation-then-transcode pair with this lost no
 * rotation.
 *
 * ⚠️ That makes the ordering load-bearing. Reordering the backends, or
 * preferring ffmpeg for some format sharp can also read, would silently stop
 * applying rotations the two-pass code did apply — and nothing would fail,
 * because the fused path still reports `converted: true`. A change like that
 * needs `autoOrient` to grow its own fallback rather than inheriting this
 * one's guarantee.
 *
 * @param buffer - Raw image bytes.
 * @param mimeType - Detected MIME type of `buffer`.
 * @param options - See {@link VisionTranscodeOptions}.
 */
export async function toVisionCompatibleImage(
  buffer: Buffer,
  mimeType: string,
  options?: VisionTranscodeOptions,
): Promise<VisionImageConversion> {
  if (!needsVisionTranscode(mimeType)) {
    return { buffer, mimeType, converted: false };
  }

  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  const extension = extensionForMimeType(normalized) ?? ".bin";
  const autoOrient = options?.autoOrient === true;
  const failures: string[] = [];

  for await (const backend of transcodeBackends(
    buffer,
    extension,
    autoOrient,
  )) {
    try {
      // Both backends can stall — sharp on a malformed stream, ffmpeg on a
      // container it half-understands — and this runs inline on the request
      // path. A bounded failure falls through to the next backend and finally
      // to pass-through, which is the same degradation as a decode error.
      const converted = await withTimeout(
        backend.run(),
        IMAGE_TRANSCODE_TIMEOUT_MS,
        new Error(
          `${backend.name} image transcode exceeded ${IMAGE_TRANSCODE_TIMEOUT_MS}ms`,
        ),
      );
      if (converted.length === 0) {
        throw new Error("produced an empty image");
      }
      logger.debug(
        `[imageFormatSupport] Transcoded ${normalized} → image/png via ${backend.name} ` +
          `(${buffer.length} → ${converted.length} bytes) for vision compatibility`,
      );
      return { buffer: converted, mimeType: "image/png", converted: true };
    } catch (error) {
      failures.push(
        `${backend.name}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      );
    }
  }

  logger.warn(
    `[imageFormatSupport] Could not transcode ${normalized} to PNG — sending the ` +
      `original bytes, which most vision providers will reject. Install a full ` +
      `ffmpeg build (or set FFMPEG_PATH to one) to enable this format. ` +
      `Tried ${failures.join("; ")}`,
  );
  return { buffer, mimeType, converted: false };
}

/**
 * Auto-orient an image from its EXIF/XMP tag and strip the tag, so a photo
 * that was stored rotated (the common case for phone cameras, since the
 * sensor is read in one fixed orientation and rotation is recorded as a flag
 * rather than baked into the pixels) is sent upright instead of sideways.
 *
 * Three costs are guarded deliberately, matching how `toVisionCompatibleImage`
 * guards its own:
 * - **Cost**: `mayCarryExifOrientation` skips formats that cannot carry the
 *   tag; `probeExifOrientation` then settles the formats that can from their
 *   own header bytes, so the overwhelmingly common orientation-less JPEG or
 *   WebP never loads sharp at all. Only a container the probe cannot rule
 *   out reaches a `metadata()` call, and only a tag that is present and not
 *   the already-upright value `1` reaches the decode-and-re-encode.
 * - **Availability**: sharp is an optional dependency (the ffmpeg fallback
 *   path above exists precisely because it can be absent). Any failure —
 *   missing package, malformed pixels, a timeout — is caught here and
 *   degrades to returning the original bytes unchanged, never throwing.
 * - **Size**: re-encoding changes byte length. This function only returns the
 *   new bytes; it does not itself re-validate size limits. Callers that
 *   re-encode must re-run their size guard on the returned buffer.
 *
 * Never throws for image reasons — mirrors `toVisionCompatibleImage`.
 *
 * @param buffer - Raw image bytes.
 * @param mimeType - Detected MIME type of `buffer`.
 */
export async function normalizeImageOrientation(
  buffer: Buffer,
  mimeType: string,
): Promise<ImageOrientationNormalization> {
  if (!mayCarryExifOrientation(mimeType)) {
    return { buffer, normalized: false };
  }
  // Only "absent" is actionable here. "inconclusive" means the parse ran out
  // of container it understands, which is a question for the decoder rather
  // than a no — see {@link probeExifOrientation}.
  if (probeExifOrientation(buffer, mimeType) === "absent") {
    return { buffer, normalized: false };
  }

  try {
    const sharpModule = await tryImport<typeof import("sharp")>(
      "sharp",
      "EXIF orientation normalization",
    );
    if (typeof sharpModule?.default !== "function") {
      throw new Error(
        "the installed sharp package does not expose a callable default export",
      );
    }

    const metadata = await withTimeout(
      sharpModule.default(buffer).metadata(),
      IMAGE_TRANSCODE_TIMEOUT_MS,
      new Error(`EXIF metadata read exceeded ${IMAGE_TRANSCODE_TIMEOUT_MS}ms`),
    );
    // 1 is "already upright" (and the implicit value when the tag is absent
    // altogether) — nothing to correct, so skip the re-encode entirely.
    if (!metadata.orientation || metadata.orientation === 1) {
      return { buffer, normalized: false };
    }

    const rotated = await withTimeout(
      sharpModule.default(buffer).rotate().toBuffer(),
      IMAGE_TRANSCODE_TIMEOUT_MS,
      new Error(`EXIF auto-orient exceeded ${IMAGE_TRANSCODE_TIMEOUT_MS}ms`),
    );
    if (rotated.length === 0) {
      throw new Error("auto-orient produced an empty image");
    }

    logger.debug(
      `[imageFormatSupport] Normalized EXIF orientation ${metadata.orientation} for ` +
        `${mimeType} (${buffer.length} → ${rotated.length} bytes)`,
    );
    return { buffer: rotated, normalized: true };
  } catch (error) {
    logger.warn(
      `[imageFormatSupport] Could not normalize EXIF orientation for ${mimeType} — ` +
        `sending the original bytes as-is: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
    return { buffer, normalized: false };
  }
}

/**
 * Whether an `input.images` entry is the `{ data, altText }` wrapper.
 *
 * Narrowing on the `data` property rather than on `typeof entry === "object"`:
 * a Buffer is also an object, so the looser test leaves `ImageWithAltText` in
 * the union on the false branch and only compiles behind a cast.
 */
function isImageWithAltTextEntry(
  entry: Buffer | string | ImageWithAltText,
): entry is ImageWithAltText {
  return (
    typeof entry === "object" &&
    entry !== null &&
    !Buffer.isBuffer(entry) &&
    "data" in entry
  );
}

/**
 * Unwrap an `input.images` entry to its payload.
 *
 * `ImageWithAltText` (`{ data, altText }`) is a documented public input shape,
 * but the provider image loops typed the array as `Buffer | string` and so
 * treated a wrapper as raw bytes — `toString("base64")` on the object yields
 * the literal "[object Object]", which is valid base64 that decodes to seven
 * bytes of garbage. The request therefore reached the API and failed as
 * "invalid image data", with nothing pointing at the stringification.
 *
 * Alt text has no representation in Vertex's `inlineData` part, so it is
 * dropped here deliberately rather than corrupting the payload to carry it.
 */
export function unwrapImagePayload(
  entry: Buffer | string | ImageWithAltText,
): Buffer | string {
  return isImageWithAltTextEntry(entry) ? entry.data : entry;
}

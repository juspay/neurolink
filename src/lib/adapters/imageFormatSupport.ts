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
  ImageWithAltText,
  VisionImageConversion,
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
 * Decode with sharp. Covers TIFF, AVIF, GIF and SVG in-process with no temp
 * files, which is the fast path.
 *
 * Deliberately does NOT cover every transcodable format: sharp's prebuilt
 * binaries report `heif` as an input format but that is AV1-in-HEIF (AVIF)
 * only — actual HEVC-coded HEIC fails inside libheif, and BMP, ICO and
 * JPEG 2000 are not compiled in at all. Those fall through to ffmpeg below.
 */
async function transcodeWithSharp(buffer: Buffer): Promise<Buffer> {
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
  return pipeline.png().toBuffer();
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
): AsyncGenerator<{ name: string; run: () => Promise<Buffer> }> {
  yield { name: "sharp", run: () => transcodeWithSharp(buffer) };
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
 * @param buffer - Raw image bytes.
 * @param mimeType - Detected MIME type of `buffer`.
 */
export async function toVisionCompatibleImage(
  buffer: Buffer,
  mimeType: string,
): Promise<VisionImageConversion> {
  if (!needsVisionTranscode(mimeType)) {
    return { buffer, mimeType, converted: false };
  }

  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  const extension = extensionForMimeType(normalized) ?? ".bin";
  const failures: string[] = [];

  for await (const backend of transcodeBackends(buffer, extension)) {
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

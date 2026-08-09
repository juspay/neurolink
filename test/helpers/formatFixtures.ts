/**
 * Token-bearing fixture generation for every format in the canonical registry.
 *
 * ## Why every fixture carries a secret
 *
 * The point of these fixtures is to be attached to a real `generate()` call and
 * to prove the *content* survived the trip. That only works if the file carries
 * something the model cannot produce without reading it. So every fixture here
 * embeds the same caller-supplied token — painted into the pixels, spoken into
 * the audio, written into the document text — and the suite asserts the model
 * says it back.
 *
 * A fixture that merely *is* a valid file of its format proves nothing
 * end-to-end: "describe this image" answers plausibly for an image that never
 * arrived. An earlier version of this file generated exactly that — a 96x96
 * test pattern and the string "format fixture" — which was adequate for
 * checking a detector and worthless for checking delivery.
 *
 * ## Sizes are realistic on purpose
 *
 * Fixtures are rendered at photo-like resolution rather than shrunk to the
 * smallest valid file. Small fixtures hid a real bug: files under
 * `SIZE_TIER_THRESHOLDS.TINY_MAX` (10 KB) take an eager path and larger ones
 * take a lazy reference path, and every image fixture in the suites happened to
 * land under 10 KB. The lazy path dropped images entirely, and nothing caught
 * it. Anything that compresses too well to clear that line is not exercising
 * what a user's file would.
 *
 * ## Availability is reported, never faked
 *
 * Not every environment can produce every format: ffmpeg builds vary by
 * licensing (the LGPL build has no HEVC), ImageMagick delegates vary by
 * install, HEIC generation on macOS goes through `sips`, and speech synthesis
 * is `say` on macOS and `espeak` elsewhere. A generator that cannot run returns
 * `null` and the caller records the format as *unavailable* — never as passing.
 */

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { findFfmpeg } from "./mediaFixtures.js";

const run = promisify(execFile);

/** Cache tool lookups — `which` on every one of ~60 fixtures adds up. */
const toolCache = new Map<string, string | null>();

function findTool(name: string): string | null {
  if (!toolCache.has(name)) {
    const candidates = [
      `/opt/homebrew/bin/${name}`,
      `/usr/local/bin/${name}`,
      `/usr/bin/${name}`,
      `/bin/${name}`,
    ];
    toolCache.set(name, candidates.find((c) => fs.existsSync(c)) ?? null);
  }
  return toolCache.get(name) ?? null;
}

function findMagick(): string | null {
  return findTool("magick") ?? findTool("convert");
}

/**
 * Modalities a fixture can belong to.
 *
 * Mirrors the registry's own `modality` field rather than inventing a parallel
 * vocabulary, because the suite groups its assertions by modality and a drift
 * between the two would silently test the wrong question.
 */
export type FixtureModality =
  | "image"
  | "audio"
  | "video"
  | "document"
  | "data"
  | "archive";

/**
 * Resolution of the rendered image every raster fixture derives from.
 *
 * Chosen so that even the best-compressing target (WebP, AVIF) lands well clear
 * of the 10 KB tier threshold. A flat colour would defeat that — a solid white
 * 1600x900 WebP is 6 KB — so the background is a blurred plasma fractal, which
 * is both incompressible enough to be realistic and smooth enough that the
 * painted token stays legible after a lossy re-encode.
 */
const IMAGE_WIDTH = 1200;
const IMAGE_HEIGHT = 800;

/**
 * Fixed seed for the plasma background.
 *
 * Without it ImageMagick seeds from the clock and every run produces a
 * different-sized file, so a size assertion near the tier threshold would flake
 * rather than fail honestly.
 */
const PLASMA_SEED = "1729";

/** Rendered token image, built once per run and reused by every raster target. */
let tokenPngPath: string | null = null;

/**
 * Render the token into a photo-like PNG.
 *
 * White fill over a black stroke keeps the digits readable against both light
 * and dark regions of the plasma, which matters after a lossy re-encode: a
 * thin unstroked glyph survives PNG and disappears into AVIF at low bitrate.
 */
async function ensureTokenPng(
  dir: string,
  token: string,
): Promise<string | null> {
  if (tokenPngPath && fs.existsSync(tokenPngPath)) {
    return tokenPngPath;
  }
  const magick = findMagick();
  if (!magick) {
    return null;
  }
  const out = path.join(dir, "__token.png");
  await run(magick, [
    "-size",
    `${IMAGE_WIDTH}x${IMAGE_HEIGHT}`,
    "-seed",
    PLASMA_SEED,
    "plasma:fractal",
    "-blur",
    "0x2",
    "-fill",
    "white",
    "-stroke",
    "black",
    "-strokewidth",
    "6",
    "-pointsize",
    "300",
    "-gravity",
    "center",
    "-annotate",
    "0",
    token,
    out,
  ]);
  tokenPngPath = out;
  return out;
}

/** Convert the rendered token image to another raster format via ImageMagick. */
async function viaMagick(
  dir: string,
  filename: string,
  token: string,
  extraArgs: string[] = [],
): Promise<string | null> {
  const magick = findMagick();
  const seed = await ensureTokenPng(dir, token);
  if (!magick || !seed) {
    return null;
  }
  const out = path.join(dir, filename);
  await run(magick, [seed, ...extraArgs, out]);
  return out;
}

/** Convert the rendered token image via ffmpeg, for formats magick lacks. */
async function viaFfmpegImage(
  dir: string,
  filename: string,
  token: string,
  extraArgs: string[] = [],
): Promise<string | null> {
  const ffmpeg = findFfmpeg();
  const seed = await ensureTokenPng(dir, token);
  if (!ffmpeg || !seed) {
    return null;
  }
  const out = path.join(dir, filename);
  await run(ffmpeg, ["-y", "-v", "error", "-i", seed, ...extraArgs, out]);
  return out;
}

/**
 * The sentence spoken into every audio fixture.
 *
 * Repeated so the utterance runs long enough that even the most efficient codec
 * clears the tier threshold — a four-second MP3 is under 9 KB. The digits are
 * spoken individually because a synthesiser reads "4827" as "four thousand
 * eight hundred twenty-seven", which a transcript then renders as words a digit
 * assertion would miss.
 */
function spokenPhrase(token: string): string {
  const spaced = token.split("").join(" ");
  return `${`The access code is ${spaced}. `.repeat(6)}`;
}

/** Synthesised speech, built once per run and reused by every audio target. */
let spokenAiffPath: string | null = null;

/**
 * Synthesise the spoken token to an AIFF every audio encoder can read from.
 *
 * `say` on macOS, `espeak`/`espeak-ng` elsewhere. Neither is guaranteed, and a
 * missing synthesiser makes every audio format unavailable rather than failed —
 * there is no way to assert on audio content without content in the audio.
 */
async function ensureSpokenAiff(
  dir: string,
  token: string,
): Promise<string | null> {
  if (spokenAiffPath && fs.existsSync(spokenAiffPath)) {
    return spokenAiffPath;
  }
  const phrase = spokenPhrase(token);
  const out = path.join(dir, "__spoken.aiff");

  const say = findTool("say");
  if (say) {
    await run(say, ["-o", out, phrase]);
    if (fs.existsSync(out) && fs.statSync(out).size > 0) {
      spokenAiffPath = out;
      return out;
    }
  }

  // espeak writes WAV; ffmpeg re-wraps it so the downstream encoders see one
  // consistent source regardless of which synthesiser produced it.
  const espeak = findTool("espeak-ng") ?? findTool("espeak");
  const ffmpeg = findFfmpeg();
  if (espeak && ffmpeg) {
    const wav = path.join(dir, "__spoken.wav");
    await run(espeak, ["-w", wav, phrase]);
    if (fs.existsSync(wav) && fs.statSync(wav).size > 0) {
      await run(ffmpeg, ["-y", "-v", "error", "-i", wav, out]);
      spokenAiffPath = out;
      return out;
    }
  }
  return null;
}

/** Re-encode the spoken token into another audio container. */
async function viaFfmpegAudio(
  dir: string,
  filename: string,
  token: string,
  extraArgs: string[] = [],
): Promise<string | null> {
  const ffmpeg = findFfmpeg();
  const source = await ensureSpokenAiff(dir, token);
  if (!ffmpeg || !source) {
    return null;
  }
  const out = path.join(dir, filename);
  await run(ffmpeg, ["-y", "-v", "error", "-i", source, ...extraArgs, out]);
  return out;
}

/**
 * Encode a short clip whose every frame shows the token.
 *
 * A still image looped rather than a moving scene: keyframe extraction samples
 * a handful of frames, and a token that is only visible in some of them turns a
 * content assertion into a sampling lottery.
 */
async function viaFfmpegVideo(
  dir: string,
  filename: string,
  token: string,
  extraArgs: string[] = [],
): Promise<string | null> {
  const ffmpeg = findFfmpeg();
  const seed = await ensureTokenPng(dir, token);
  if (!ffmpeg || !seed) {
    return null;
  }
  const out = path.join(dir, filename);
  await run(ffmpeg, [
    "-y",
    "-v",
    "error",
    "-loop",
    "1",
    "-i",
    seed,
    "-t",
    "3",
    "-r",
    "10",
    "-pix_fmt",
    "yuv420p",
    "-an",
    ...extraArgs,
    out,
  ]);
  return out;
}

/** Write `content` verbatim — for the text-shaped formats. */
function writeText(dir: string, filename: string, content: string): string {
  const out = path.join(dir, filename);
  fs.writeFileSync(out, content, "utf8");
  return out;
}

/** The sentence written into every text-bearing document fixture. */
function documentSentence(token: string): string {
  return `The access code for this document is ${token}.`;
}

/**
 * Padding that pushes a text fixture past the tier threshold.
 *
 * Every line is distinct. A repeated sentence looks like plenty of text and
 * then compresses to nothing — the first version of this produced a 1.1 KB
 * DOCX and a 263-byte GZIP from 13 KB of prose, landing the whole document and
 * archive set back under the threshold it was written to clear. Varying the
 * line defeats the compressor the way real content does.
 */
function documentFiller(lines = 1600): string {
  return Array.from(
    { length: lines },
    (_unused, index) =>
      `Paragraph ${index}: this file is deliberately a realistic size rather ` +
      `than a minimal one, because size decides which processing path it ` +
      `takes; entry ${index * 7919} keeps the line distinct so it does not ` +
      `simply compress away.`,
  ).join("\n");
}

/**
 * Build a valid PDF carrying the token as extractable text.
 *
 * Written by hand rather than through a PDF library: none is installed, and the
 * structure needed for text extraction is small — a catalog, a page tree, one
 * page, an uncompressed content stream and a base-14 font. Offsets in the xref
 * table are computed from the assembled string, so the file stays valid if the
 * content changes.
 */
function buildPdf(token: string): Buffer {
  const LINES_PER_PAGE = 34;
  const allLines = [
    documentSentence(token),
    ...documentFiller(200).split("\n"),
  ];
  const pages: string[][] = [];
  for (let index = 0; index < allLines.length; index += LINES_PER_PAGE) {
    pages.push(allLines.slice(index, index + LINES_PER_PAGE));
  }

  // Object numbering: 1 catalog, 2 page tree, then one page per sheet, then one
  // content stream per sheet, then the font last.
  const firstPageObject = 3;
  const firstContentObject = firstPageObject + pages.length;
  const fontObject = firstContentObject + pages.length;

  const pageObjects = pages.map(
    (_unused, index) =>
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontObject} 0 R >> >> ` +
      `/Contents ${firstContentObject + index} 0 R >>`,
  );
  const contentObjects = pages.map((lines) => {
    const stream = lines
      .map(
        (line, index) =>
          `BT /F1 11 Tf 50 ${740 - index * 21} Td ` +
          `(${line.replace(/([()\\])/g, "\\$1")}) Tj ET`,
      )
      .join("\n");
    return `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  const kids = pages
    .map((_unused, index) => `${firstPageObject + index} 0 R`)
    .join(" ");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
    ...pageObjects,
    ...contentObjects,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;
  // latin1 keeps every byte one octet, so the computed offsets stay correct.
  return Buffer.from(pdf, "latin1");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Assemble an OOXML word-processing package carrying the token. */
async function buildDocx(dir: string, token: string): Promise<string | null> {
  const AdmZip = await import("adm-zip").catch(() => null);
  if (!AdmZip) {
    return null;
  }
  const paragraphs = [documentSentence(token), documentFiller()];
  const body = paragraphs
    .map(
      (text) =>
        `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`,
    )
    .join("");
  const zip = new AdmZip.default();
  zip.addFile(
    "[Content_Types].xml",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
        `</Types>`,
    ),
  );
  zip.addFile(
    "_rels/.rels",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
        `</Relationships>`,
    ),
  );
  zip.addFile(
    "word/document.xml",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:body>${body}</w:body></w:document>`,
    ),
  );
  const out = path.join(dir, "doc.docx");
  zip.writeZip(out);
  return out;
}

/**
 * Assemble an OpenDocument package carrying the token.
 *
 * The `mimetype` entry must be first and stored uncompressed — that is what
 * makes an ODF package identifiable from its first bytes rather than looking
 * like an anonymous ZIP.
 */
async function buildOdf(
  dir: string,
  filename: string,
  mimetype: string,
  token: string,
): Promise<string | null> {
  const AdmZip = await import("adm-zip").catch(() => null);
  if (!AdmZip) {
    return null;
  }
  const zip = new AdmZip.default();
  zip.addFile("mimetype", Buffer.from(mimetype, "utf8"), "", 0);
  zip.addFile(
    "META-INF/manifest.xml",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?>` +
        `<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">` +
        `<manifest:file-entry manifest:full-path="/" manifest:media-type="${mimetype}"/>` +
        `<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>` +
        `</manifest:manifest>`,
    ),
  );
  zip.addFile(
    "content.xml",
    Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?>` +
        `<office:document-content ` +
        `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" ` +
        `xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">` +
        `<office:body><office:text>` +
        `<text:p>${escapeXml(documentSentence(token))}</text:p>` +
        `<text:p>${escapeXml(documentFiller())}</text:p>` +
        `</office:text></office:body></office:document-content>`,
    ),
  );
  const out = path.join(dir, filename);
  zip.writeZip(out);
  return out;
}

/** Compress a token-bearing payload with a single-file compressor. */
async function viaCompressor(
  dir: string,
  filename: string,
  tool: string,
  token: string,
  args: string[] = [],
): Promise<string | null> {
  const bin = findTool(tool);
  if (!bin) {
    return null;
  }
  const source = path.join(dir, `__payload-${filename}.txt`);
  // A larger payload than the other document fixtures: xz and zstd reach past
  // 40:1 on prose, so the default filler still compressed to under 10 KB.
  fs.writeFileSync(
    source,
    `${documentSentence(token)}\n${documentFiller(5000)}\n`,
    "utf8",
  );
  const { stdout } = await run(bin, [...args, "-c", source], {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = path.join(dir, filename);
  fs.writeFileSync(out, stdout as unknown as Buffer);
  return out;
}

/**
 * How each registry extension is produced.
 *
 * Keyed by canonical extension. Aliases (`.jpeg` for `.jpg`) resolve through
 * the registry, so only one generator per format is needed.
 */
const GENERATORS: Record<
  string,
  (dir: string, token: string) => Promise<string | null> | string | null
> = {
  // --- images -------------------------------------------------------------
  ".png": (d, t) =>
    ensureTokenPng(d, t).then((p) => (p ? copyAs(d, p, "img.png") : null)),
  ".jpg": (d, t) => viaMagick(d, "img.jpg", t, ["-quality", "92"]),
  ".gif": (d, t) => viaMagick(d, "img.gif", t),
  ".webp": (d, t) => viaMagick(d, "img.webp", t),
  ".bmp": (d, t) => viaMagick(d, "img.bmp", t),
  ".tiff": (d, t) => viaMagick(d, "img.tiff", t),
  ".jp2": (d, t) => viaMagick(d, "img.jp2", t),
  // ICO is capped at 256x256 by the format itself, so this one target is
  // downscaled. Still ~150 KB, because ICO stores frames uncompressed.
  ".ico": (d, t) => viaMagick(d, "img.ico", t, ["-resize", "256x256"]),
  ".apng": (d, t) => viaFfmpegImage(d, "img.apng", t, ["-f", "apng"]),
  ".avif": async (d, t) => {
    // ImageMagick silently writes a PNG when it has no AVIF delegate, so go
    // through an AV1 encoder directly. Two are tried because builds ship one or
    // the other.
    for (const encoder of ["libsvtav1", "libaom-av1"]) {
      const file = await viaFfmpegImage(d, "img.avif", t, [
        "-c:v",
        encoder,
        "-f",
        "avif",
      ]).catch(() => null);
      if (file) {
        return file;
      }
    }
    return null;
  },
  ".heic": (d, t) => viaSips(d, "img.heic", "heic", t),
  ".heif": (d, t) => viaSips(d, "img.heif", "heic", t),
  ".svg": (d, t) =>
    writeText(
      d,
      "vector.svg",
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">\n` +
        `  <rect width="600" height="300" fill="#1d4ed8"/>\n` +
        // Decoration, so the file is a drawing rather than a two-element stub —
        // an SVG is markup and stays small, but it should at least look like
        // something a design tool would emit.
        Array.from(
          { length: 220 },
          (_unused, index) =>
            `  <circle cx="${(index * 37) % 600}" cy="${(index * 53) % 300}" ` +
            `r="${3 + (index % 11)}" fill="#93c5fd" opacity="0.${20 + (index % 60)}"/>`,
        ).join("\n") +
        `\n  <text x="300" y="190" font-family="Helvetica, Arial, sans-serif" font-size="150"\n` +
        `        fill="#ffffff" stroke="#0f172a" stroke-width="4" text-anchor="middle">${escapeXml(t)}</text>\n` +
        `</svg>\n`,
    ),

  // --- audio --------------------------------------------------------------
  ".mp3": (d, t) => viaFfmpegAudio(d, "spoken.mp3", t, ["-c:a", "libmp3lame"]),
  ".wav": (d, t) => viaFfmpegAudio(d, "spoken.wav", t, ["-c:a", "pcm_s16le"]),
  ".flac": (d, t) => viaFfmpegAudio(d, "spoken.flac", t, ["-c:a", "flac"]),
  ".ogg": (d, t) => viaFfmpegAudio(d, "spoken.ogg", t, ["-c:a", "libopus"]),
  ".opus": (d, t) => viaFfmpegAudio(d, "spoken.opus", t, ["-c:a", "libopus"]),
  ".m4a": (d, t) => viaFfmpegAudio(d, "spoken.m4a", t, ["-c:a", "aac"]),
  ".aac": (d, t) => viaFfmpegAudio(d, "spoken.aac", t, ["-c:a", "aac"]),
  ".wma": (d, t) => viaFfmpegAudio(d, "spoken.wma", t, ["-c:a", "wmav2"]),
  ".aiff": (d, t) => viaFfmpegAudio(d, "spoken.aiff", t, ["-c:a", "pcm_s16be"]),
  ".caf": (d, t) => viaFfmpegAudio(d, "spoken.caf", t, ["-c:a", "pcm_s16le"]),
  ".au": (d, t) => viaFfmpegAudio(d, "spoken.au", t, ["-c:a", "pcm_s16be"]),
  ".wv": (d, t) => viaFfmpegAudio(d, "spoken.wv", t, ["-c:a", "wavpack"]),
  ".amr": (d, t) =>
    viaFfmpegAudio(d, "spoken.amr", t, [
      "-ar",
      "8000",
      "-ac",
      "1",
      "-c:a",
      "libopencore_amrnb",
    ]).catch(() => null),
  ".ape": () => null, // No encoder ships in any common ffmpeg build.
  ".mid": () => null, // MIDI carries notes, not speech — no token can be embedded.

  // --- video --------------------------------------------------------------
  ".mp4": (d, t) => viaFfmpegVideo(d, "clip.mp4", t, ["-c:v", "libx264"]),
  ".mov": (d, t) => viaFfmpegVideo(d, "clip.mov", t, ["-c:v", "libx264"]),
  ".mkv": (d, t) => viaFfmpegVideo(d, "clip.mkv", t, ["-c:v", "libx264"]),
  ".webm": (d, t) => viaFfmpegVideo(d, "clip.webm", t, ["-c:v", "libvpx-vp9"]),
  ".avi": (d, t) => viaFfmpegVideo(d, "clip.avi", t, ["-c:v", "mpeg4"]),
  ".wmv": (d, t) => viaFfmpegVideo(d, "clip.wmv", t, ["-c:v", "wmv2"]),
  ".flv": (d, t) => viaFfmpegVideo(d, "clip.flv", t, ["-c:v", "flv1"]),
  ".mpg": (d, t) => viaFfmpegVideo(d, "clip.mpg", t, ["-c:v", "mpeg2video"]),
  ".m2ts": (d, t) => viaFfmpegVideo(d, "clip.m2ts", t, ["-c:v", "libx264"]),
  ".3gp": (d, t) =>
    viaFfmpegVideo(d, "clip.3gp", t, ["-c:v", "libx264", "-f", "3gp"]),
  ".3g2": (d, t) =>
    viaFfmpegVideo(d, "clip.3g2", t, ["-c:v", "libx264", "-f", "3g2"]),
  ".ogv": (d, t) =>
    viaFfmpegVideo(d, "clip.ogv", t, ["-c:v", "libtheora"]).catch(() => null),

  // --- documents ----------------------------------------------------------
  ".pdf": (d, t) => {
    const out = path.join(d, "doc.pdf");
    fs.writeFileSync(out, buildPdf(t));
    return out;
  },
  ".docx": (d, t) => buildDocx(d, t),
  ".xlsx": async (d, t) => {
    const ExcelJS = await import("exceljs").catch(() => null);
    if (!ExcelJS) {
      return null;
    }
    const workbook = new ExcelJS.default.Workbook();
    const sheet = workbook.addWorksheet("Codes");
    sheet.addRow(["field", "value"]);
    sheet.addRow(["access code", t]);
    for (let row = 0; row < 500; row++) {
      sheet.addRow([`filler ${row}`, `row ${row * 7919} of realistic content`]);
    }
    const out = path.join(d, "book.xlsx");
    await workbook.xlsx.writeFile(out);
    return out;
  },
  ".pptx": async (d, t) => {
    const PptxGenJS = await import("pptxgenjs").catch(() => null);
    if (!PptxGenJS) {
      return null;
    }
    const deck = new PptxGenJS.default();
    deck.addSlide().addText(documentSentence(t), { x: 1, y: 1, fontSize: 24 });
    deck.addSlide().addText(documentFiller().slice(0, 1200), { x: 1, y: 1 });
    const out = path.join(d, "deck.pptx");
    await deck.writeFile({ fileName: out });
    return out;
  },
  ".odt": (d, t) =>
    buildOdf(d, "doc.odt", "application/vnd.oasis.opendocument.text", t),
  ".ods": (d, t) =>
    buildOdf(
      d,
      "book.ods",
      "application/vnd.oasis.opendocument.spreadsheet",
      t,
    ),
  ".odp": (d, t) =>
    buildOdf(
      d,
      "deck.odp",
      "application/vnd.oasis.opendocument.presentation",
      t,
    ),
  ".rtf": (d, t) =>
    writeText(
      d,
      "doc.rtf",
      `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}\\f0\\fs24 ` +
        `${documentSentence(t)}\\par ${documentFiller()}\\par}`,
    ),
  // The legacy OLE compound formats have no writer available here. Producing a
  // byte-accurate .doc/.xls/.ppt by hand is a project in itself, and a
  // hand-rolled approximation would test the approximation.
  ".doc": () => null,
  ".xls": () => null,
  ".ppt": () => null,

  // --- tabular data -------------------------------------------------------
  ".csv": (d, t) =>
    writeText(
      d,
      "rows.csv",
      `field,value\naccess code,${t}\n` +
        Array.from(
          { length: 300 },
          (_unused, row) => `filler ${row},row ${row} of realistic content`,
        ).join("\n") +
        "\n",
    ),
  ".tsv": (d, t) =>
    writeText(
      d,
      "rows.tsv",
      `field\tvalue\naccess code\t${t}\n` +
        Array.from(
          { length: 300 },
          (_unused, row) => `filler ${row}\trow ${row} of realistic content`,
        ).join("\n") +
        "\n",
    ),

  // --- archives -----------------------------------------------------------
  ".zip": (d, t) => buildZip(d, "bundle.zip", t),
  ".jar": (d, t) => buildZip(d, "bundle.jar", t),
  ".tar": async (d, t) => {
    const tar = findTool("tar");
    if (!tar) {
      return null;
    }
    const member = path.join(d, "__tar-member.txt");
    fs.writeFileSync(member, `${documentSentence(t)}\n${documentFiller()}\n`);
    const out = path.join(d, "bundle.tar");
    await run(tar, ["-cf", out, "-C", d, path.basename(member)]);
    return out;
  },
  ".gz": (d, t) => viaCompressor(d, "bundle.gz", "gzip", t),
  ".bz2": (d, t) => viaCompressor(d, "bundle.bz2", "bzip2", t),
  ".xz": (d, t) => viaCompressor(d, "bundle.xz", "xz", t),
  ".zst": (d, t) => viaCompressor(d, "bundle.zst", "zstd", t, ["-q"]),
  ".7z": async (d, t) => {
    const bin = findTool("7z") ?? findTool("7zz");
    if (!bin) {
      return null;
    }
    const member = path.join(d, "__7z-member.txt");
    fs.writeFileSync(member, `${documentSentence(t)}\n${documentFiller()}\n`);
    const out = path.join(d, "bundle.7z");
    await run(bin, ["a", "-bso0", "-bsp0", out, member]);
    return out;
  },
  ".rar": async (d, t) => {
    // Only the proprietary `rar` can write the format; `unrar` cannot.
    const bin = findTool("rar");
    if (!bin) {
      return null;
    }
    const member = path.join(d, "__rar-member.txt");
    fs.writeFileSync(member, `${documentSentence(t)}\n${documentFiller()}\n`);
    const out = path.join(d, "bundle.rar");
    await run(bin, ["a", "-inul", out, member]);
    return out;
  },
};

/** Convert the rendered token image with macOS `sips`, the only local HEIC encoder. */
async function viaSips(
  dir: string,
  filename: string,
  format: string,
  token: string,
): Promise<string | null> {
  const sips = findTool("sips");
  const seed = await ensureTokenPng(dir, token);
  if (!sips || !seed) {
    return null;
  }
  const out = path.join(dir, filename);
  await run(sips, ["-s", "format", format, seed, "--out", out]);
  return fs.existsSync(out) ? out : null;
}

async function buildZip(
  dir: string,
  filename: string,
  token: string,
): Promise<string | null> {
  const AdmZip = await import("adm-zip").catch(() => null);
  if (!AdmZip) {
    return null;
  }
  const zip = new AdmZip.default();
  zip.addFile(
    "access-code.txt",
    Buffer.from(`${documentSentence(token)}\n${documentFiller()}\n`, "utf8"),
  );
  const out = path.join(dir, filename);
  zip.writeZip(out);
  return out;
}

function copyAs(dir: string, source: string, filename: string): string {
  const out = path.join(dir, filename);
  fs.copyFileSync(source, out);
  return out;
}

/** Every extension this module knows how to attempt, with its modality. */
export const FIXTURE_FORMATS: readonly {
  ext: string;
  modality: FixtureModality;
}[] = [
  ...(
    [
      ".png",
      ".jpg",
      ".gif",
      ".webp",
      ".bmp",
      ".tiff",
      ".jp2",
      ".ico",
      ".apng",
      ".avif",
      ".heic",
      ".heif",
      ".svg",
    ] as const
  ).map((ext) => ({ ext, modality: "image" as const })),
  ...(
    [
      ".mp3",
      ".wav",
      ".flac",
      ".ogg",
      ".opus",
      ".m4a",
      ".aac",
      ".wma",
      ".aiff",
      ".caf",
      ".au",
      ".wv",
      ".amr",
      ".ape",
      ".mid",
    ] as const
  ).map((ext) => ({ ext, modality: "audio" as const })),
  ...(
    [
      ".mp4",
      ".mov",
      ".mkv",
      ".webm",
      ".avi",
      ".wmv",
      ".flv",
      ".mpg",
      ".m2ts",
      ".3gp",
      ".3g2",
      ".ogv",
    ] as const
  ).map((ext) => ({ ext, modality: "video" as const })),
  ...(
    [
      ".pdf",
      ".docx",
      ".xlsx",
      ".pptx",
      ".odt",
      ".ods",
      ".odp",
      ".rtf",
      ".doc",
      ".xls",
      ".ppt",
    ] as const
  ).map((ext) => ({ ext, modality: "document" as const })),
  ...([".csv", ".tsv"] as const).map((ext) => ({
    ext,
    modality: "data" as const,
  })),
  ...(
    [
      ".zip",
      ".tar",
      ".gz",
      ".bz2",
      ".xz",
      ".zst",
      ".jar",
      ".7z",
      ".rar",
    ] as const
  ).map((ext) => ({ ext, modality: "archive" as const })),
];

/**
 * Produce a fixture for `ext` carrying `token`, or `null` when this environment
 * cannot encode that format.
 *
 * Errors from a generator are reported as unavailability rather than thrown: a
 * missing ffmpeg codec surfaces as a non-zero exit, and the caller's job is to
 * skip the format, not to fail the run.
 */
export async function makeTokenFixture(
  dir: string,
  ext: string,
  token: string,
): Promise<string | null> {
  const generator = GENERATORS[ext];
  if (!generator) {
    return null;
  }
  try {
    const file = await generator(dir, token);
    return file && fs.existsSync(file) && fs.statSync(file).size > 0
      ? file
      : null;
  } catch {
    return null;
  }
}

/** Discard cached seeds so a new run rebuilds them in its own directory. */
export function resetFixtureCache(): void {
  tokenPngPath = null;
  spokenAiffPath = null;
}

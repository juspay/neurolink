#!/usr/bin/env tsx
/**
 * Continuous Test Suite: EXIF orientation normalization for image intake.
 *
 * Issue #561 — a JPEG stored with `Orientation=6` (the common case for a
 * phone photo: the sensor is read in one fixed orientation and the rotation
 * the camera was held at is recorded as a tag, not baked into the pixels)
 * used to be sent to the provider exactly as stored, so the model saw it
 * rotated 90°. Universal formats (PNG/JPEG/GIF/WebP) skipped the transcode
 * path entirely (`needsVisionTranscode()` is false for all four), so nothing
 * in the intake pipeline ever looked at the tag.
 *
 * The fix adds an orientation-normalization pass — `normalizeImageOrientation`
 * in `src/lib/adapters/imageFormatSupport.ts`, wired into both
 * `processImageToBase64` and `normalizeVisionImageFormats` in
 * `src/lib/utils/messageBuilder.ts` — that runs for every image a caller
 * supplies, not only ones that happen to need transcoding. It uses sharp's
 * `.rotate()` with no arguments, which auto-orients from the EXIF tag and
 * strips it from the output.
 *
 * This suite proves that end-to-end: a mock chat server captures the exact
 * outbound request body `generate()` would have sent to OpenAI, so the
 * assertion is about what actually left the process, not about what a live
 * model reports back.
 *
 * Three costs are exercised directly:
 *  - **Cost** — the second case proves an image that carries no correction
 *    (orientation 1, or no tag at all) is sent byte-identical, i.e. the fix
 *    does not re-encode every image unconditionally.
 *  - **Availability** — covered by design, not by this suite: sharp is
 *    already a hard dependency of this test file (it builds the fixture), so
 *    a suite cannot exercise "sharp is absent" without uninstalling it from
 *    under itself. `normalizeImageOrientation`'s try/catch degrading to the
 *    original bytes is reviewable directly in `imageFormatSupport.ts`.
 *  - **Size** — the size guard re-applies after orientation normalization in
 *    both call sites (the `withinConversionLimit` calls immediately
 *    following each `normalizeImageOrientation` call in
 *    `messageBuilder.ts`). The "oriented re-encode over the limit" case
 *    below exercises the URL-download call site directly: a pathological
 *    fixture whose low-quality original stays under the limit while sharp's
 *    default-quality re-encode pushes it over, proving that path falls back
 *    to the original bytes rather than failing the request — matching the
 *    eager call site's behaviour, which relies on the same guard
 *    (`imageProcessor.ts`).
 *
 * ## What the later cases cover, and one thing they cannot
 *
 * Review of the first cut raised two performance findings, and the cases
 * below are split along the line of what is observable from out here.
 *
 * **Fusing the double encode IS observable.** A format that both carries an
 * orientation tag and needs a vision transcode (TIFF, HEIC, HEIF, AVIF) was
 * being oriented in one full decode/re-encode and transcoded in a second.
 * That is not merely slower: sharp writes TIFF JPEG-compressed by default, so
 * the intermediate re-encode spent a generation of image quality, and the
 * model then read the worse copy. Fusing both into one `sharp().rotate()
 * .png()` pipeline removes the intermediate entirely, and the outbound bytes
 * say so — the "single-pass" cases assert the image that left the process is
 * pixel-identical to one decode and one encode of the source. They fail on
 * the two-pass tree, which is the point.
 *
 * **Skipping the disk read is NOT observable.** Answering "does this JPEG
 * carry an orientation tag?" from a bounded header prefix instead of reading
 * the whole file produces, by construction, byte-identical output — that is
 * the entire claim. Nothing a caller can reach reports bytes read, and a
 * timing or memory threshold would be a flake, not a gate. So the local-file
 * cases below are regression guards on the outcome, not proof of the saving:
 * a tag inside the window is still honoured, a tag pushed past the window is
 * still honoured, and a file with no tag arrives byte-identical. The saving
 * itself is only reviewable in `probeFileExifOrientation`.
 *
 * Two of those guards were measured rather than assumed, and one came back
 * weaker than it looks. Rebuilding with `probeJpegOrientation` deliberately
 * returning `"absent"` on prefix exhaustion — the exact bug the past-the-
 * window case is written against — leaves all eight cases green. The reason
 * is that on that provider path a wrong "absent" only skips
 * `normalizeVisionImageFormats`; `processImageToBase64` then re-probes the
 * whole buffer, where the walk cannot run out, and orients the image anyway.
 * So that case gates the end-to-end behaviour, which is what a caller
 * experiences, but it does **not** gate the file probe's fallback on its own.
 *
 * The last two cases do. AI Studio's and Vertex's native paths each call
 * `normalizeVisionImageFormats` themselves and then read `input.images`
 * directly, with no second probe behind them, so there the verdict is the
 * only vote. Same fixture, same claim — and under that injected bug they are
 * the only two cases that go red, which is what says the coverage is real
 * rather than incidental.
 *
 * ## PNG
 *
 * PNG was originally excluded from the orientation gate on the claim that it
 * has no orientation field. That is wrong: PNG 1.5 added the `eXIf` chunk,
 * sharp both writes and honours it, and an orientation-bearing PNG was
 * therefore reaching providers with its stored dimensions and the display
 * transform still outstanding. The two PNG cases below cover the two shapes
 * that reach different code: a Buffer, normalized eagerly by
 * `normalizeVisionImageFormats`, and a URL, which has no bytes at that point
 * and is handled downstream by `processImageToBase64`. Both were watched
 * failing on the pre-PNG tree — 10 passed / 2 failed, and these were the two.
 *
 * ## Why there is no ffmpeg orientation case
 *
 * Review also asked whether the ffmpeg transcode fallback drops orientation.
 * Measured rather than assumed, for EXIF-IFD orientation: the exact argv
 * `toVisionCompatibleImage` runs turned a 300x150 JPEG tagged
 * `Orientation=6` into a 150x300 PNG with the tag consumed, on system ffmpeg
 * 8.1.1 and on the bundled `ffmpeg-static` 6.0 alike, while forcing
 * `-noautorotate` held both at 300x150 — the control showing the default did
 * the work.
 *
 * That result does not extend to HEIC/HEIF/AVIF, which carry orientation as
 * ISOBMFF `irot`/`imir` item properties rather than an EXIF IFD, and
 * HEVC-coded HEIC is the input that reaches this fallback most often. It is
 * untested in both directions here: a fixture attempt failed because the
 * available converter bakes the rotation into the pixels, which would have
 * made the case pass for the wrong reason. Writing it would also mean
 * asserting an external binary's default rather than anything this package
 * decides, so the scoped finding is recorded in `imageFormatSupport.ts` and
 * the ISOBMFF case is left explicitly unverified.
 *
 * Run: npx tsx test/continuous-test-suite-image-exif.ts
 */

import "dotenv/config";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { defineSuite, assert } from "./helpers/harness.js";
import {
  startMockChatServer,
  mockOpenAICredentials,
} from "./helpers/mockChatServer.js";
import { NeuroLink } from "../dist/index.js";
// Type-only, so it is erased and asserts nothing about which copy runs — the
// `e2e-tests-only` rule ignores these for exactly that reason.
import type { NeurolinkCredentials } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Image EXIF orientation normalization");

/** Rejects if `promise` has not settled within `ms`, as a defensive backstop. */
function withTimeoutMs<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms: ${label}`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err as Error);
      },
    );
  });
}

// Deliberately non-square so a 90° correction is visible as swapped
// dimensions rather than a no-op.
const RAW_WIDTH = 300;
const RAW_HEIGHT = 150;

/**
 * A JPEG whose stored pixels are the plain WIDTHxHEIGHT rectangle above, but
 * whose EXIF tag declares `Orientation=6` ("rotate 90° CW to display
 * upright") — the shape a phone camera produces when held rotated.
 */
async function buildRotatedJpegFixture(): Promise<Buffer> {
  return sharp({
    create: {
      width: RAW_WIDTH,
      height: RAW_HEIGHT,
      channels: 3,
      background: { r: 200, g: 40, b: 40 },
    },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

/**
 * A PNG carrying a real `eXIf` chunk with `Orientation=6`.
 *
 * PNG 1.5 added `eXIf`; sharp writes and consumes it, so excluding PNG from
 * the orientation gate sends these otherwise-valid bytes to a provider with
 * their stored dimensions and the display transform still outstanding.
 */
async function buildRotatedPngFixture(): Promise<Buffer> {
  return sharp({
    create: {
      width: RAW_WIDTH,
      height: RAW_HEIGHT,
      channels: 3,
      background: { r: 40, g: 40, b: 200 },
    },
  })
    .png()
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

/** Proves an outbound image had its orientation consumed and baked in. */
async function assertSentUpright(
  sent: Buffer,
  expectedFormat: string,
): Promise<void> {
  const sentMeta = await sharp(sent).metadata();
  assert(
    sentMeta.format === expectedFormat,
    "the outbound image format changed while applying its orientation",
  );
  assert(
    !sentMeta.orientation || sentMeta.orientation === 1,
    "the outbound image still carries a non-trivial orientation tag — it should have been consumed and stripped",
  );
  assert(
    sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
    "the outbound image's pixel dimensions were not swapped to match the orientation-corrected upright image",
  );
}

/** Pulls the first `data:<mime>;base64,<data>` image out of a request body. */
function extractDataUriImage(body: string): {
  mimeType: string;
  base64: string;
} {
  const match = body.match(/data:([^;"\\]+);base64,([A-Za-z0-9+/=]+)/);
  if (!match) {
    throw new Error(
      "outbound request body carried no recognizable image data URI",
    );
  }
  return { mimeType: match[1], base64: match[2] };
}

/**
 * Run one `generate()` against the mock chat server and hand back the image
 * bytes that actually left the process.
 */
async function captureOutboundImage(
  images: Array<Buffer | string>,
  label: string,
): Promise<Buffer> {
  const server = await startMockChatServer();
  try {
    await withTimeoutMs(
      new NeuroLink().generate({
        input: { text: "Describe this photo.", images },
        provider: "openai",
        credentials: mockOpenAICredentials(server),
        maxTokens: 32,
        timeout: 60_000,
      }),
      90_000,
      label,
    );
    assert(
      server.wasCalled(),
      "generate() never reached the mock chat server — nothing was sent to inspect",
    );
    const { base64 } = extractDataUriImage(server.getLastRequestBody() ?? "");
    return Buffer.from(base64, "base64");
  } finally {
    await server.close();
  }
}

/** Runs `fn` against a scratch directory and removes it afterwards. */
async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "neurolink-exif-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let fixtureUrlCounter = 0;

/**
 * Serve `body` from loopback for the duration of `fn`.
 *
 * An `http(s)` entry in `input.images` is the one shape that bypasses
 * `normalizeVisionImageFormats` — it has no bytes at download time — so it is
 * the only way to reach the second call site, in `processImageToBase64`.
 */
async function withImageServer<T>(
  body: Buffer,
  contentType: string,
  extension: string,
  fn: (url: string) => Promise<T>,
): Promise<T> {
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, {
      "content-type": contentType,
      "content-length": String(body.length),
    });
    res.end(body);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the fixture image server did not report a numeric port");
  }
  try {
    // A distinct path per call: downloaded images are cached by URL, and a
    // hit would replay an earlier case's bytes instead of this one's.
    fixtureUrlCounter++;
    return await fn(
      `http://127.0.0.1:${address.port}/fixture-${fixtureUrlCounter}${extension}`,
    );
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

/**
 * Minimal stand-in for Gemini's `generateContentStream`, capturing what was
 * sent. Modelled on the one in the AI Studio loop-characterization suite.
 */
type GeminiStandIn = {
  readonly port: number;
  lastInlineImage(): Buffer | undefined;
  close(): Promise<void>;
};

async function startGeminiStandIn(): Promise<GeminiStandIn> {
  const bodies: Record<string, unknown>[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        bodies.push(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        bodies.push({});
      }
      const payload = {
        candidates: [
          {
            content: { parts: [{ text: "mock reply" }], role: "model" },
            finishReason: "STOP",
            index: 0,
          },
        ],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 4,
          totalTokenCount: 9,
        },
      };
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(`data: ${JSON.stringify(payload)}\r\n\r\n`);
      res.end();
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("the Gemini stand-in did not report a numeric port");
  }
  return {
    port: address.port,
    lastInlineImage(): Buffer | undefined {
      const contents = (bodies[bodies.length - 1]?.contents ?? []) as Array<{
        parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
      }>;
      const data = contents
        .flatMap((c) => c.parts ?? [])
        .map((p) => p.inlineData?.data)
        .find((d): d is string => typeof d === "string" && d.length > 0);
      return data === undefined ? undefined : Buffer.from(data, "base64");
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/**
 * Point the provider at the stand-in and keep an ambient key or base URL from
 * a developer's environment out of the run.
 */
function withAiStudioEnv(): () => void {
  const touched = [
    "GOOGLE_AI_API_KEY",
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_AI_BASE_URL",
  ] as const;
  const saved: Record<string, string | undefined> = {};
  // Cleared, not just saved: leaving a developer's real GEMINI_API_KEY beside
  // the one this sets makes the provider log which of the two it picked, and
  // a suite whose behaviour depends on what is in someone's .env is a suite
  // that passes for reasons it did not choose.
  for (const key of touched) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env.GOOGLE_AI_API_KEY = "test-key";
  return () => {
    for (const key of touched) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

/**
 * Clear everything that could keep Vertex on the ADC path, so
 * `credentials.vertex` reaches the stand-in in Express Mode.
 *
 * All four project names matter: resolution falls back through
 * GOOGLE_CLOUD_PROJECT_ID, VERTEX_PROJECT_ID, GOOGLE_VERTEX_PROJECT and
 * GOOGLE_CLOUD_PROJECT, and a dev machine with any one of them set is exactly
 * where a half-cleared list hides. Same list as the Vertex loop
 * characterization suite, for the same reason.
 */
function withVertexEnv(): () => void {
  const touched = [
    "GOOGLE_CLOUD_PROJECT",
    "GOOGLE_CLOUD_PROJECT_ID",
    "VERTEX_PROJECT_ID",
    "GOOGLE_VERTEX_PROJECT",
    "GOOGLE_CLOUD_LOCATION",
    "VERTEX_LOCATION",
    "GOOGLE_VERTEX_LOCATION",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GOOGLE_VERTEX_API_KEY",
    "GOOGLE_VERTEX_BASE_URL",
    "GOOGLE_API_KEY",
    // Not needed by Express Mode, but the SDK logs which of several ambient
    // keys it chose when more than one is present, so clear them for the same
    // reason as above.
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
  ] as const;
  const saved: Record<string, string | undefined> = {};
  for (const key of touched) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  return () => {
    for (const key of touched) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

/**
 * Raw RGB for a hard-edged checkerboard.
 *
 * A flat fill survives a lossy re-encode almost exactly, which would let the
 * single-pass cases below pass on a two-pass tree. Sharp edges between
 * saturated colours are what a JPEG-compressed intermediate visibly destroys.
 */
function checkerboardPixels(): Buffer {
  const pixels = Buffer.alloc(RAW_WIDTH * RAW_HEIGHT * 3);
  for (let y = 0; y < RAW_HEIGHT; y++) {
    for (let x = 0; x < RAW_WIDTH; x++) {
      const offset = (y * RAW_WIDTH + x) * 3;
      const light = ((x >> 3) + (y >> 3)) % 2 === 0;
      pixels[offset] = light ? 240 : 10;
      pixels[offset + 1] = light ? 20 : 200;
      pixels[offset + 2] = light ? 60 : 230;
    }
  }
  return pixels;
}

/**
 * A TIFF carrying `Orientation=6`. TIFF is in both sets — it needs a vision
 * transcode *and* can carry an orientation tag — which is exactly the
 * overlap the fused pipeline exists for.
 */
function buildRotatedTiffFixture(): Promise<Buffer> {
  return sharp(checkerboardPixels(), {
    raw: { width: RAW_WIDTH, height: RAW_HEIGHT, channels: 3 },
  })
    .tiff()
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

/**
 * One decode, one encode — the pipeline the fused path runs.
 *
 * A two-phase implementation cannot reproduce these pixels: by the time it
 * writes the PNG it is encoding the output of an intermediate re-encode, not
 * the source.
 */
function singlePassReference(source: Buffer): Promise<Buffer> {
  return sharp(source, { pages: 1 }).rotate().png().toBuffer();
}

/** Decoded pixel data, so a comparison is about the image, not the container. */
function rawPixels(image: Buffer): Promise<Buffer> {
  return sharp(image).raw().toBuffer();
}

/**
 * Splice two maximum-length comment segments in ahead of a JPEG's EXIF block,
 * pushing the tag past any bounded header window a probe could read.
 *
 * A probe that reads "not in the prefix" as "not present" sends this image
 * sideways. One that reports the truth falls back to the decoder and gets it
 * right — which is the property that keeps the cheap path from being a
 * correctness trade.
 */
function padJpegAheadOfExif(jpeg: Buffer): Buffer {
  const maxPayload = 0xffff - 2;
  const segmentLength = maxPayload + 2;
  const comment = Buffer.concat([
    Buffer.from([
      0xff,
      0xfe,
      (segmentLength >> 8) & 0xff,
      segmentLength & 0xff,
    ]),
    Buffer.alloc(maxPayload, 0x20),
  ]);
  // Two of these clear 128 KiB, comfortably past a 64 KiB window.
  return Buffer.concat([
    jpeg.subarray(0, 2),
    comment,
    comment,
    jpeg.subarray(2),
  ]);
}

await test("a JPEG with EXIF Orientation=6 is auto-oriented and stripped before send", async () => {
  const fixture = await buildRotatedJpegFixture();

  // Precondition: the un-normalized fixture really does carry the tag with
  // its raw (unrotated) stored dimensions — otherwise this test would prove
  // nothing about the fix, only that an already-correct image stays correct.
  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — the source JPEG must be built carrying orientation 6",
  );
  assert(
    rawMeta.width === RAW_WIDTH && rawMeta.height === RAW_HEIGHT,
    "fixture precondition failed — the source JPEG's raw stored dimensions do not match what the fixture builder requested",
  );

  const server = await startMockChatServer();
  try {
    await withTimeoutMs(
      new NeuroLink().generate({
        input: { text: "Describe this photo.", images: [fixture] },
        provider: "openai",
        credentials: mockOpenAICredentials(server),
        maxTokens: 32,
        timeout: 60_000,
      }),
      90_000,
      "rotated-JPEG generate()",
    );

    assert(
      server.wasCalled(),
      "generate() never reached the mock chat server — nothing was sent to inspect",
    );
    const body = server.getLastRequestBody() ?? "";
    const { base64 } = extractDataUriImage(body);

    const sentBuffer = Buffer.from(base64, "base64");
    const sentMeta = await sharp(sentBuffer).metadata();

    // Format, not the data URI's declared label: whether an "image" content
    // part's data URI is labelled with the real MIME type is a pre-existing,
    // unrelated concern in the OpenAI request encoder (it derives the label
    // independently of what messageBuilder detected), so asserting on the
    // decoded bytes' actual format is what proves this fix neither transcoded
    // nor corrupted the image while correcting its orientation.
    assert(
      sentMeta.format === "jpeg",
      "the outbound image was no longer decodable as JPEG after orientation normalization",
    );
    assert(
      !sentMeta.orientation || sentMeta.orientation === 1,
      "the outbound image still carries a non-trivial EXIF orientation tag — it should have been consumed and stripped",
    );
    assert(
      sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
      "the outbound image's pixel dimensions were not swapped to match the orientation-corrected upright image",
    );
  } finally {
    await server.close();
  }
});

await test("a PNG eXIf orientation is applied on the eager image path", async () => {
  const fixture = await buildRotatedPngFixture();
  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — the source PNG must carry orientation 6 in an eXIf chunk",
  );
  assert(
    rawMeta.width === RAW_WIDTH && rawMeta.height === RAW_HEIGHT,
    "fixture precondition failed — the source PNG's stored dimensions do not match what the fixture builder requested",
  );

  const sent = await captureOutboundImage(
    [fixture],
    "rotated-PNG eager-path generate()",
  );
  await assertSentUpright(sent, "png");
});

await test("a PNG eXIf orientation is applied after a URL download", async () => {
  const fixture = await buildRotatedPngFixture();
  const sent = await withImageServer(fixture, "image/png", ".png", (url) =>
    captureOutboundImage([url], "rotated-PNG-by-URL generate()"),
  );
  await assertSentUpright(sent, "png");
});

await test("an already-upright JPEG (no orientation correction needed) is sent unmodified", async () => {
  const fixture = await sharp({
    create: {
      width: RAW_WIDTH,
      height: RAW_HEIGHT,
      channels: 3,
      background: { r: 40, g: 200, b: 40 },
    },
  })
    .jpeg()
    .toBuffer();

  // Precondition: confirm this fixture genuinely carries no correction-worthy
  // tag, so a pass below proves the "don't re-encode unconditionally" cost
  // guard, not merely that an untagged image happens to look unchanged.
  const rawMeta = await sharp(fixture).metadata();
  assert(
    !rawMeta.orientation || rawMeta.orientation === 1,
    "fixture precondition failed — an unrotated JPEG unexpectedly carries a non-trivial orientation tag",
  );

  const server = await startMockChatServer();
  try {
    await withTimeoutMs(
      new NeuroLink().generate({
        input: { text: "Describe this photo.", images: [fixture] },
        provider: "openai",
        credentials: mockOpenAICredentials(server),
        maxTokens: 32,
        timeout: 60_000,
      }),
      90_000,
      "upright-JPEG generate()",
    );

    assert(
      server.wasCalled(),
      "generate() never reached the mock chat server — nothing was sent to inspect",
    );
    const body = server.getLastRequestBody() ?? "";
    const { base64 } = extractDataUriImage(body);
    const sentBuffer = Buffer.from(base64, "base64");

    assert(
      sentBuffer.equals(fixture),
      "an image needing no orientation correction was re-encoded anyway — the cost guard should have skipped it",
    );
  } finally {
    await server.close();
  }
});

await test("a TIFF needing both orientation and transcoding is encoded once, not twice", async () => {
  const fixture = await buildRotatedTiffFixture();

  // Precondition: the fixture must genuinely sit in both sets, or a pass
  // below would only prove that a single-pass format stayed single-pass.
  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — the source TIFF must be built carrying orientation 6",
  );
  assert(
    rawMeta.width === RAW_WIDTH && rawMeta.height === RAW_HEIGHT,
    "fixture precondition failed — the source TIFF's raw stored dimensions do not match what the fixture builder requested",
  );

  const sent = await captureOutboundImage([fixture], "rotated-TIFF generate()");
  const sentMeta = await sharp(sent).metadata();

  assert(
    sentMeta.format === "png",
    "the outbound image was not transcoded to the vision-compatible format",
  );
  assert(
    sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
    "the outbound image's pixel dimensions were not swapped to match the orientation-corrected upright image",
  );

  // The discriminating assertion. Both a fused and a two-phase pipeline
  // produce an upright PNG of the right size, so dimensions alone cannot
  // tell them apart. The pixels can: a two-phase pipeline re-encodes to the
  // source format in between, and sharp writes TIFF JPEG-compressed by
  // default, so its output carries a generation of loss this reference does
  // not have.
  const expected = await rawPixels(await singlePassReference(fixture));
  const actual = await rawPixels(sent);
  assert(
    actual.equals(expected),
    "the outbound image does not match a single decode-and-encode of the source — it was re-encoded on the way, which costs both time and a generation of image quality",
  );
});

await test("a TIFF arriving by URL is also encoded once, not twice", async () => {
  // Same claim as above, at the other call site. An http(s) entry has no
  // bytes when `normalizeVisionImageFormats` runs, so it is handled later by
  // `processImageToBase64` — a separate copy of the same decision.
  const fixture = await buildRotatedTiffFixture();
  const expected = await rawPixels(await singlePassReference(fixture));

  const sent = await withImageServer(fixture, "image/tiff", ".tif", (url) =>
    captureOutboundImage([url], "rotated-TIFF-by-URL generate()"),
  );
  const sentMeta = await sharp(sent).metadata();

  assert(
    sentMeta.format === "png",
    "the outbound image was not transcoded to the vision-compatible format",
  );
  assert(
    sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
    "the outbound image's pixel dimensions were not swapped to match the orientation-corrected upright image",
  );
  assert(
    (await rawPixels(sent)).equals(expected),
    "the downloaded image does not match a single decode-and-encode of the source — the URL path is still running two encodes",
  );
});

await test("a local JPEG file with an orientation tag is still auto-oriented", async () => {
  // The header probe decides whether this file is read at all. If it were to
  // answer "no tag" for a file that has one, the photo would go out sideways
  // and nothing else in the pipeline would catch it.
  const fixture = await buildRotatedJpegFixture();

  const sent = await withTempDir(async (dir) => {
    const path = join(dir, "rotated.jpg");
    await writeFile(path, fixture);
    return captureOutboundImage([path], "rotated-JPEG-by-path generate()");
  });

  const sentMeta = await sharp(sent).metadata();
  assert(
    !sentMeta.orientation || sentMeta.orientation === 1,
    "the outbound image still carries a non-trivial EXIF orientation tag — it should have been consumed and stripped",
  );
  assert(
    sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
    "the outbound image's pixel dimensions were not swapped to match the orientation-corrected upright image",
  );
});

await test("a local JPEG whose orientation tag sits past the header window is still auto-oriented", async () => {
  const fixture = padJpegAheadOfExif(await buildRotatedJpegFixture());

  // Precondition: the tag must really be out past the window, and a decoder
  // must still be able to find it — otherwise this case proves nothing about
  // the fallback, only that a broken fixture is handled quietly.
  assert(
    fixture.length > 128 * 1024,
    "fixture precondition failed — the padded JPEG is not large enough to push its tag past the header window",
  );
  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — padding the JPEG lost the orientation tag a decoder is supposed to still find",
  );

  const sent = await withTempDir(async (dir) => {
    const path = join(dir, "padded.jpg");
    await writeFile(path, fixture);
    return captureOutboundImage([path], "padded-JPEG-by-path generate()");
  });

  const sentMeta = await sharp(sent).metadata();
  // End-to-end only. See the header: this stays green even when the file
  // probe's exhaustion path is broken, because the downstream re-probe on the
  // full buffer catches it on this provider path.
  assert(
    sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
    "the outbound image was sent as stored — a tag the header window could not reach must still be honoured somewhere in the pipeline",
  );
});

await test("a local JPEG with no orientation tag is sent through untouched", async () => {
  const fixture = await sharp({
    create: {
      width: RAW_WIDTH,
      height: RAW_HEIGHT,
      channels: 3,
      background: { r: 40, g: 200, b: 40 },
    },
  })
    .jpeg()
    .toBuffer();

  const sent = await withTempDir(async (dir) => {
    const path = join(dir, "upright.jpg");
    await writeFile(path, fixture);
    return captureOutboundImage([path], "upright-JPEG-by-path generate()");
  });

  assert(
    sent.equals(fixture),
    "a file needing no orientation correction did not arrive byte-identical — the cheap header path must skip the image, not rewrite it",
  );
});

await test("a local WebP with an orientation tag is still auto-oriented", async () => {
  // WebP reaches its verdict from the container's feature flags rather than a
  // tag walk, so it is a separate decision from the JPEG one above and gets
  // its own case.
  const fixture = await sharp(checkerboardPixels(), {
    raw: { width: RAW_WIDTH, height: RAW_HEIGHT, channels: 3 },
  })
    .webp()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — the source WebP must be built carrying orientation 6",
  );

  const sent = await withTempDir(async (dir) => {
    const path = join(dir, "rotated.webp");
    await writeFile(path, fixture);
    return captureOutboundImage([path], "rotated-WebP-by-path generate()");
  });

  const sentMeta = await sharp(sent).metadata();
  assert(
    sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
    "the outbound image's pixel dimensions were not swapped to match the orientation-corrected upright image",
  );
});

/**
 * Send a JPEG whose orientation tag sits past the probe's window through one
 * native provider path, and assert the image that left was upright.
 *
 * These are the only places the header probe's verdict is the sole vote. Both
 * providers call `normalizeVisionImageFormats` themselves and then read
 * `input.images` directly — AI Studio via `buildUserPartsWithMultimodal`,
 * Vertex in its own loop — and each `readFileSync`s a path straight into an
 * `inlineData` part. Nothing behind them re-probes the way
 * `processImageToBase64` does on the OpenAI path, so unlike the
 * past-the-window case above, these fail when the probe treats prefix
 * exhaustion as "no tag". Verified by rebuilding with exactly that bug
 * injected: these two went red and all eight others stayed green.
 */
async function assertNativePathOrients(spec: {
  provider: string;
  withEnv: () => () => void;
  credentials: (port: number) => NeurolinkCredentials;
  label: string;
}): Promise<void> {
  const fixture = padJpegAheadOfExif(await buildRotatedJpegFixture());
  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — padding the JPEG lost the orientation tag a decoder is supposed to still find",
  );

  const standIn = await startGeminiStandIn();
  const restoreEnv = spec.withEnv();
  try {
    await withTempDir(async (dir) => {
      const path = join(dir, "padded-native.jpg");
      await writeFile(path, fixture);
      await withTimeoutMs(
        new NeuroLink().generate({
          input: { text: "Describe this photo.", images: [path] },
          provider: spec.provider,
          model: "gemini-2.0-flash",
          maxTokens: 32,
          disableInternalFallback: true,
          credentials: spec.credentials(standIn.port),
          timeout: 60_000,
        }),
        90_000,
        spec.label,
      );
    });

    const sent = standIn.lastInlineImage();
    assert(
      sent !== undefined,
      "the native provider request carried no inline image part — nothing was sent to inspect",
    );
    const sentMeta = await sharp(sent).metadata();
    assert(
      sentMeta.width === RAW_HEIGHT && sentMeta.height === RAW_WIDTH,
      "the image reached the native provider path as stored — on this path the header probe is the only vote, so a tag it could not reach must send it back to the decoder",
    );
  } finally {
    restoreEnv();
    await standIn.close();
  }
}

await test("a local JPEG reaching AI Studio's native path is oriented with no second chance", () =>
  assertNativePathOrients({
    provider: "google-ai",
    withEnv: withAiStudioEnv,
    credentials: (port) => ({
      googleAiStudio: {
        apiKey: "test-key",
        baseURL: `http://127.0.0.1:${port}`,
      },
    }),
    label: "AI Studio native-path padded-JPEG generate()",
  }));

await test("a local JPEG reaching Vertex's native path is oriented with no second chance", () =>
  assertNativePathOrients({
    provider: "vertex",
    withEnv: withVertexEnv,
    credentials: (port) => ({
      vertex: { apiKey: "express-key", baseURL: `http://127.0.0.1:${port}` },
    }),
    label: "Vertex native-path padded-JPEG generate()",
  }));

// `ImageProcessor`'s size guard, mirrored here as a literal. This suite may
// only import from `../dist/index.js` and public types (see
// `neurolink/e2e-tests-only` in eslint.config.js) — `SIZE_LIMITS_BYTES` in
// `src/lib/processors/config/sizeLimits.ts` is a `src/`-internal and off
// limits from here.
const IMAGE_SIZE_LIMIT_BYTES = 10 * 1024 * 1024;

const OVERSIZED_REORIENT_SIDE = 13200;
const OVERSIZED_REORIENT_PERIOD = 32;

/**
 * A JPEG engineered so its low-quality original stays under the size limit
 * while sharp's default-quality re-encode — the one `normalizeImageOrientation`
 * produces while correcting orientation — pushes it over. A periodic
 * gradient survives `quality: 1` compression far more efficiently than a
 * default-quality re-encode does, so one source image straddles the limit in
 * both directions without needing an implausibly large fixture.
 */
async function buildOversizedReorientFixture(): Promise<Buffer> {
  const side = OVERSIZED_REORIENT_SIDE;
  const period = OVERSIZED_REORIENT_PERIOD;
  const raw = Buffer.alloc(side * side * 3);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const offset = (y * side + x) * 3;
      raw[offset] = (x % period) * (256 / period);
      raw[offset + 1] = (y % period) * (256 / period);
      raw[offset + 2] = ((x + y) % period) * (256 / period);
    }
  }
  return sharp(raw, { raw: { width: side, height: side, channels: 3 } })
    .jpeg({ quality: 1 })
    .withMetadata({ orientation: 6 })
    .toBuffer();
}

await test("an oriented re-encode that would exceed the size limit falls back to the original bytes instead of failing the request", async () => {
  const fixture = await buildOversizedReorientFixture();

  // Preconditions, proven independently of NeuroLink: the fixture must
  // actually straddle the limit in both directions, or a pass below would
  // prove nothing about the fallback this case exists to exercise.
  assert(
    fixture.length <= IMAGE_SIZE_LIMIT_BYTES,
    "fixture precondition failed — the low-quality original must stay under the size limit",
  );
  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — the source JPEG must carry orientation 6",
  );
  const reoriented = await sharp(fixture).rotate().toBuffer();
  assert(
    reoriented.length > IMAGE_SIZE_LIMIT_BYTES,
    "fixture precondition failed — the default-quality reorient must exceed the size limit, or this case does not exercise the fallback at all",
  );

  // A URL image is the one shape that bypasses `normalizeVisionImageFormats`
  // and reaches `processImageToBase64` — see `withImageServer`'s doc
  // comment. That is the call site under test.
  const sent = await withImageServer(fixture, "image/jpeg", ".jpg", (url) =>
    captureOutboundImage([url], "oversized-reorient JPEG-by-URL generate()"),
  );

  // The oriented re-encode was over the limit, so the fallback must have
  // kept the original bytes verbatim — not the (oversized) oriented
  // buffer, and not a silently truncated variant of either.
  assert(
    sent.equals(fixture),
    "the outbound image did not match the original bytes — an oversized oriented re-encode should fall back to the pre-orientation original, not fail the request or send a different buffer",
  );
});

/**
 * A PNG engineered to exceed the size limit while carrying no EXIF/eXIf
 * orientation tag at all — no `.withMetadata()` call, so sharp writes no
 * metadata chunk into the output. Each pixel is an integer scramble of its
 * coordinates rather than a smooth gradient, so PNG's predictive row filters
 * cannot compress it back under the limit — the same trade
 * `buildOversizedReorientFixture` makes with a low-quality JPEG, tuned here
 * for a lossless format instead.
 */
async function buildOversizedNoExifFixture(): Promise<Buffer> {
  const side = 2200;
  const raw = Buffer.alloc(side * side * 3);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const offset = (y * side + x) * 3;
      const scramble = (x * 374761393 + y * 668265263) >>> 0;
      raw[offset] = scramble & 0xff;
      raw[offset + 1] = (scramble >>> 8) & 0xff;
      raw[offset + 2] = (scramble >>> 16) & 0xff;
    }
  }
  return sharp(raw, { raw: { width: side, height: side, channels: 3 } })
    .png()
    .toBuffer();
}

await test("an oversized image with no EXIF orientation tag is sent unmodified instead of being rejected locally", async () => {
  const fixture = await buildOversizedNoExifFixture();

  // Preconditions, proven independently of NeuroLink: the fixture must
  // actually sit over the size limit and carry no orientation tag, or a pass
  // below would prove nothing about the regression this case guards
  // against.
  assert(
    fixture.length > IMAGE_SIZE_LIMIT_BYTES,
    "fixture precondition failed — the no-EXIF original must exceed the size limit, or this case does not exercise the guard at all",
  );
  const rawMeta = await sharp(fixture).metadata();
  assert(
    !rawMeta.orientation,
    "fixture precondition failed — the source PNG must carry no orientation tag",
  );

  // Supplied directly as a `data:` URI — not downloaded from a URL, which
  // has its own independent download-size cap — matching the shape
  // `processImageToBase64` receives after only being regex-matched, for a
  // MIME type (PNG) that never needed transcoding and was never locally
  // size-checked before this case's fix.
  const dataUri = `data:image/png;base64,${fixture.toString("base64")}`;
  const sent = await captureOutboundImage(
    [dataUri],
    "oversized no-EXIF PNG-by-data-URI generate()",
  );

  // Never touched, so it must leave exactly as it arrived — not rejected
  // locally, not re-encoded, not truncated.
  assert(
    sent.equals(fixture),
    "the outbound image did not match the original bytes — an oversized image with no orientation tag must reach the provider unmodified rather than being rejected locally or altered",
  );
});

await runSuite();

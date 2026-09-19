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
 *    both call sites (see `ImageProcessor.validateBufferSize` /
 *    `withinConversionLimit` calls immediately following each
 *    `normalizeImageOrientation` call in `messageBuilder.ts`); not
 *    separately exercised here because forcing the *re-encoded* buffer over
 *    the limit while the *original* stays under it needs a pathological
 *    fixture with no proportional relationship to what this suite already
 *    builds, and the guard is the same one every other image path already
 *    relies on (`imageProcessor.ts`), not new logic this fix introduces.
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
 * The last case does. Google AI Studio's native path calls
 * `normalizeVisionImageFormats` itself and then reads `input.images`
 * directly, with no second probe behind it, so there the verdict is the only
 * vote. Same fixture, same claim, and under the same injected bug it is the
 * one case that goes red.
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
  for (const key of touched) {
    saved[key] = process.env[key];
  }
  process.env.GOOGLE_AI_API_KEY = "test-key";
  delete process.env.GOOGLE_AI_BASE_URL;
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

await test("a local JPEG reaching a native provider path is oriented with no second chance", async () => {
  // The one place the header probe's verdict is the only vote.
  //
  // Google AI Studio does not go through the shared multimodal builder: it
  // calls `normalizeVisionImageFormats` itself and then hands `input.images`
  // to a helper that `readFileSync`s a path straight into an `inlineData`
  // part. There is no downstream re-probe to catch a wrong "absent" the way
  // `processImageToBase64` catches one on the OpenAI path — so unlike the
  // past-the-window case above, this one does fail when the probe treats
  // prefix exhaustion as "no tag". Verified by rebuilding with exactly that
  // bug injected: this case went red while the other eight stayed green.
  const fixture = padJpegAheadOfExif(await buildRotatedJpegFixture());
  const rawMeta = await sharp(fixture).metadata();
  assert(
    rawMeta.orientation === 6,
    "fixture precondition failed — padding the JPEG lost the orientation tag a decoder is supposed to still find",
  );

  const standIn = await startGeminiStandIn();
  const restoreEnv = withAiStudioEnv();
  try {
    await withTempDir(async (dir) => {
      const path = join(dir, "padded-native.jpg");
      await writeFile(path, fixture);
      await withTimeoutMs(
        new NeuroLink().generate({
          input: { text: "Describe this photo.", images: [path] },
          provider: "google-ai",
          model: "gemini-2.0-flash",
          maxTokens: 32,
          disableInternalFallback: true,
          credentials: {
            googleAiStudio: {
              apiKey: "test-key",
              baseURL: `http://127.0.0.1:${standIn.port}`,
            },
          },
          timeout: 60_000,
        }),
        90_000,
        "native-path padded-JPEG generate()",
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
});

await runSuite();

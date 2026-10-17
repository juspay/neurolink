#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";

/**
 * Continuous Test Suite — frame-based video on the OpenAI wire (VIDEO-028, #510).
 *
 * OpenAI cannot take a video file, so a clip reaches it as keyframes: the
 * processor extracts stills with ffmpeg, re-encodes each with sharp, and the
 * message builder sends them as `image_url` parts. Everything that shapes
 * those parts is a `videoOptions` knob — `frames`, `quality`, `format` — and
 * every one of them has been silently dropped before (#478). A dropped knob
 * does not fail anything: the model still answers, from the tier default.
 *
 * The live suites (`continuous-test-suite-video-frames.ts`,
 * `continuous-test-suite-video-native.ts`) need a funded OPENAI_API_KEY and so
 * cover this path only where someone runs them with one. This suite covers
 * what does not need a model: it points the real `openai` provider at a
 * loopback chat-completions stand-in, via the public
 * `credentials.openai.baseURL` override, and reads the request body
 * `generate()` actually sent. No credentials, no network egress:
 * `credentialFreeEnv` strips ambient keys, exporter endpoints and the home
 * directory before anything else loads.
 *
 *   1. Frame counts 4 and 8 each arrive as exactly that many `image_url`
 *      parts. 16 does not arrive at all: the `openai` provider caps a request
 *      at 10 images (`IMAGE_LIMITS` in `providerImageAdapter.ts`, the same for
 *      `azure`, `litellm` and `openrouter`), so a 16-frame budget is refused
 *      up front with the image-count error and nothing is sent. The error
 *      names the count, which is what proves the processor produced 16. The
 *      clip is 20 s, whose duration tier would give 10 frames, so none of the
 *      three requested counts can be met by the default: a dropped `frames`
 *      fails all three (4 and 8 get the wrong count, 16 is sent instead of
 *      refused), rather than passing the one that happens to equal it.
 *   2. `quality` reaches the encoder: the same four frames at quality 10 and
 *      at 95 are different sizes, frame for frame.
 *   3. `format` reaches the encoder: `"png"` puts a PNG on the wire, labelled
 *      `image/png`, where the default is a JPEG.
 *   4. A model the openai manifest marks as non-vision is refused when a video
 *      is attached, before any request is sent. Video keyframes are appended to
 *      `input.images`, so this is the same guard as for a photo — and the only
 *      place a user hears that the model they picked cannot see the frames.
 *      A vision model is called first with the same clip and options, so the
 *      refusal is attributable to the model and not to the fixture.
 *
 * Frame extraction needs ffmpeg, so every case skips without it. That is the
 * intended behaviour, not a gap: ffmpeg is deliberately absent in CI (see
 * CLAUDE.md), and this suite is local coverage like the other frame suites.
 * A run against the real OpenAI API is out of scope here; the stand-in proves
 * what is sent, not what a model makes of it.
 *
 * ALL-DIST module graph (rule 15): `NeuroLink` comes from `../dist/index.js`.
 *
 * Run: npx tsx test/continuous-test-suite-video-openai.ts
 *      pnpm run test:video-openai
 */

import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { hasFfmpeg, makeVideoFile } from "./helpers/mediaFixtures.js";
import {
  mockOpenAICredentials,
  startMockChatServer,
  type MockChatServer,
} from "./helpers/mockChatServer.js";

process.env.NEUROLINK_SKIP_MCP = "true";

assertDistFresh();

const { test, runSuite } = defineSuite("Video frames on the OpenAI wire", {
  offline: true,
});

const { NeuroLink } = await import("../dist/index.js");

// 20 s sits in the 30 s duration tier (one frame per 2 s = 10 frames), which
// is neither 4, 8 nor 16 — see the header.
const CLIP_SECONDS = 20;
const DELIVERED_FRAME_COUNTS = [4, 8] as const;
// Must stay above `IMAGE_LIMITS.openai` (10) in `providerImageAdapter.ts`,
// which is not exported; if that cap is raised to this value or beyond, raise
// this with it, or the refusal case below stops refusing.
const OVER_CAP_FRAMES = 16;
const VISION_MODEL = "gpt-4o-mini";
// The openai manifest lists this model with `vision: false`, and
// `supportsVision` consults the manifest before the legacy
// `VISION_CAPABILITIES.openai` table, so the manifest decides the outcome.
const NON_VISION_MODEL = "gpt-3.5-turbo";
const NON_VISION_ERROR = /does not support vision processing/;
const OVER_CAP_ERROR = new RegExp(
  `Image count \\(${OVER_CAP_FRAMES}\\) exceeds the maximum limit for openai`,
);

type ChatMessage = { role?: string; content?: unknown };
type ChatBody = { messages?: ChatMessage[] };

type WireImage = { mime: string; bytes: Buffer };

/** Every request body the stand-in received, parsed, oldest first. */
function requestBodies(standIn: MockChatServer): ChatBody[] {
  return standIn
    .getAllRequestBodies()
    .map((raw) => JSON.parse(raw) as ChatBody);
}

/** Every inline image in the LAST user message of a request, decoded. */
function wireImages(body: ChatBody | undefined): WireImage[] {
  const users = (body?.messages ?? []).filter((m) => m.role === "user");
  const content = users[users.length - 1]?.content;
  if (!Array.isArray(content)) {
    return [];
  }
  return content.flatMap((part: { type?: string; image_url?: unknown }) => {
    if (part.type !== "image_url") {
      return [];
    }
    const url =
      typeof part.image_url === "string"
        ? part.image_url
        : (part.image_url as { url?: string } | undefined)?.url;
    const match = /^data:([^;,]+);base64,(.*)$/s.exec(url ?? "");
    return match
      ? [{ mime: match[1], bytes: Buffer.from(match[2], "base64") }]
      : [];
  });
}

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function startsWith(bytes: Buffer, magic: Buffer): boolean {
  return bytes.subarray(0, magic.length).equals(magic);
}

let clipPromise: Promise<string> | undefined;

/** The shared fixture, or a Skip when ffmpeg cannot mint it. */
async function requireClip(): Promise<string> {
  if (!(await hasFfmpeg())) {
    throw new Skip("ffmpeg not available — cannot extract video frames");
  }
  clipPromise ??= makeVideoFile(
    tempDir("video-openai-"),
    "clip.mp4",
    CLIP_SECONDS,
  );
  return clipPromise;
}

type VideoOptionsArg = { frames?: number; quality?: number; format?: "png" };

function generateRaw(
  clip: string,
  standIn: MockChatServer,
  videoOptions: VideoOptionsArg,
  model: string,
): Promise<unknown> {
  return new NeuroLink().generate({
    input: { text: "describe this clip", files: [clip] },
    videoOptions,
    provider: "openai",
    model,
    disableTools: true,
    disableInternalFallback: true,
    credentials: mockOpenAICredentials(standIn),
  });
}

/** One real `generate()` against the stand-in; returns the images it sent. */
async function generateWith(
  clip: string,
  standIn: MockChatServer,
  videoOptions: VideoOptionsArg,
  model: string = VISION_MODEL,
): Promise<WireImage[]> {
  const before = standIn.getAllRequestBodies().length;
  await generateRaw(clip, standIn, videoOptions, model);
  const sent = requestBodies(standIn);
  assert(
    sent.length === before + 1,
    `expected exactly one chat request per generate(), saw ${sent.length - before}`,
  );
  return wireImages(sent[sent.length - 1]);
}

/** A `generate()` that must be refused before anything reaches the provider. */
async function generateRefused(
  clip: string,
  standIn: MockChatServer,
  videoOptions: VideoOptionsArg,
  model: string,
): Promise<Error> {
  const before = standIn.getAllRequestBodies().length;
  let thrown: unknown;
  try {
    await generateRaw(clip, standIn, videoOptions, model);
  } catch (error) {
    thrown = error;
  }
  if (!(thrown instanceof Error)) {
    throw new Error("generate() should have been rejected");
  }
  assert(
    standIn.getAllRequestBodies().length === before,
    "a refused request must not reach the provider",
  );
  return thrown;
}

for (const frames of DELIVERED_FRAME_COUNTS) {
  await test(`videoOptions.frames: ${frames} sends exactly ${frames} keyframes to OpenAI`, async () => {
    const clip = await requireClip();
    const standIn = await startMockChatServer();
    try {
      const images = await generateWith(clip, standIn, { frames });
      assert(
        images.length === frames,
        `asked for ${frames} keyframes, the request carried ${images.length}`,
      );
      assert(
        images.every((image) => startsWith(image.bytes, JPEG_MAGIC)),
        "every default keyframe should be a JPEG",
      );
    } finally {
      await standIn.close();
    }
  });
}

await test(`videoOptions.frames: ${OVER_CAP_FRAMES} is refused at the openai image cap, naming the count, with nothing sent`, async () => {
  const clip = await requireClip();
  const standIn = await startMockChatServer();
  try {
    const error = await generateRefused(
      clip,
      standIn,
      { frames: OVER_CAP_FRAMES },
      VISION_MODEL,
    );
    // The message carries the count, so a match means the processor really
    // produced 16 keyframes; a dropped budget would yield 10 and be sent.
    assert(
      OVER_CAP_ERROR.test(error.message),
      `the rejection should be the openai image-cap error for ${OVER_CAP_FRAMES} images`,
    );
  } finally {
    await standIn.close();
  }
});

await test("videoOptions.quality reaches the encoder: the same frames are smaller at quality 10 than at 95", async () => {
  const clip = await requireClip();
  const standIn = await startMockChatServer();
  try {
    const low = await generateWith(clip, standIn, { frames: 4, quality: 10 });
    const high = await generateWith(clip, standIn, { frames: 4, quality: 95 });

    assert(
      low.length === 4 && high.length === 4,
      `both requests should carry 4 keyframes (low ${low.length}, high ${high.length})`,
    );
    assert(
      [...low, ...high].every((image) => image.mime === "image/jpeg"),
      "quality alone must not change the image format",
    );
    // Same schedule, same source frames: any size difference is the encoder's.
    const notSmaller = low.findIndex(
      (image, i) => image.bytes.length >= high[i].bytes.length,
    );
    assert(
      notSmaller === -1,
      `frame ${notSmaller + 1} was not smaller at quality 10 than at 95, so quality did not reach the encoder`,
    );
  } finally {
    await standIn.close();
  }
});

await test("videoOptions.format reaches the encoder: png puts a PNG on the wire, the default a JPEG", async () => {
  const clip = await requireClip();
  const standIn = await startMockChatServer();
  try {
    const png = await generateWith(clip, standIn, {
      frames: 4,
      format: "png",
    });
    const jpeg = await generateWith(clip, standIn, { frames: 4 });

    assert(
      png.length === 4 && jpeg.length === 4,
      `both requests should carry 4 keyframes (png ${png.length}, default ${jpeg.length})`,
    );
    assert(
      png.every(
        (image) =>
          image.mime === "image/png" && startsWith(image.bytes, PNG_MAGIC),
      ),
      "format png should send image/png data URLs holding PNG bytes",
    );
    assert(
      jpeg.every(
        (image) =>
          image.mime === "image/jpeg" && startsWith(image.bytes, JPEG_MAGIC),
      ),
      "the default format should send image/jpeg data URLs holding JPEG bytes",
    );
  } finally {
    await standIn.close();
  }
});

await test("a model the manifest marks non-vision is refused when a video is attached, before any request", async () => {
  const clip = await requireClip();
  const standIn = await startMockChatServer();
  try {
    // The same clip and options on a vision model succeed and carry frames,
    // so the refusal below is about the model, not the fixture.
    const accepted = await generateWith(clip, standIn, { frames: 4 });
    assert(
      accepted.length === 4,
      `the vision model should receive 4 keyframes, received ${accepted.length}`,
    );

    const error = await generateRefused(
      clip,
      standIn,
      { frames: 4 },
      NON_VISION_MODEL,
    );
    assert(
      NON_VISION_ERROR.test(error.message),
      "the rejection should say the model does not support vision processing",
    );
  } finally {
    await standIn.close();
  }
});

await runSuite();

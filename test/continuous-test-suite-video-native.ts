#!/usr/bin/env tsx
/**
 * Continuous Test Suite: native video delivery.
 *
 * Covers VIDEO-007 (#421), VIDEO-013 (#439), VIDEO-014 (#444) and
 * VIDEO-019 (#463).
 *
 * ## Why this is not folded into continuous-test-suite-multimodal-sdk.ts
 *
 * Two reasons, and both matter.
 *
 * First, that suite builds its clip with `makeVideoFile`, which shells out to
 * ffmpeg and skips the whole group when ffmpeg is absent. Native delivery
 * exists precisely for the case where ffmpeg is absent — no binary, no
 * keyframes, and the video itself is the only visual content in the request —
 * so a suite that cannot run without ffmpeg cannot test it. Everything here
 * uses a committed 14 KB fixture instead and runs anywhere.
 *
 * Second, that suite's video assertions ask the model for the clip's pixel
 * resolution. That question is answered by the metadata summary
 * (`1920x1080 | avc | 30 fps`) that detection folds into the prompt text, so
 * it passes with zero frames and zero video attached — the exact trap
 * `adapters/audioFormatSupport.ts` documents for audio. The assertions here
 * are built the other way round: the fixture carries a spoken word, and
 * nothing in the metadata block or in a JPEG keyframe can convey it.
 *
 * ## The fixture
 *
 * `test/fixtures/media/sample-clip.mp4` — 3.6s, 160x120, H.264 + AAC. Three
 * solid colour segments (red, blue, green) and a voice saying "the secret
 * word is flamingo". The colours are readable from keyframes; the word is
 * readable only from the video's audio track. Asking for both in one prompt
 * makes a partial answer diagnostic rather than ambiguous.
 *
 * Live tests SKIP without credentials.
 *
 * Run: npx tsx test/continuous-test-suite-video-native.ts
 */

// See the multimodal-sdk suite for why: the tracked .mcp-config.json starts a
// filesystem server every NeuroLink instance would wait 60s on.
process.env.NEUROLINK_SKIP_MCP = "true";

import "dotenv/config";
import { existsSync, statSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assert,
  assertEqual,
  defineSuite,
  runCLI,
  Skip,
} from "./helpers/harness.js";
import {
  canDeliverVideoNatively,
  estimateVideoTokens,
  getVideoProviderConfig,
  isNativeVideoMimeType,
  NeuroLink,
  supportsNativeVideo,
  VIDEO_PROVIDER_CONFIGS,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("Native video delivery");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIP = path.join(HERE, "fixtures", "media", "sample-clip.mp4");

/** Gemini front end used for the live half. */
const NATIVE_PROVIDER = process.env.VIDEO_NATIVE_PROVIDER ?? "google-ai";
/** Frame-extraction provider used as the negative control. */
const FRAME_PROVIDER = process.env.VIDEO_FRAME_PROVIDER ?? "openai";

function hasGoogleKey(): boolean {
  return !!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY);
}

// ---------------------------------------------------------------------------
// The capability table, through the package's own exports
// ---------------------------------------------------------------------------

await test("the fixture is present and small enough to travel inline", () => {
  assert(existsSync(CLIP), "the committed video fixture must exist");
  const sizeMB = statSync(CLIP).size / (1024 * 1024);
  assert(
    sizeMB < 1,
    `the fixture must stay small enough to commit — measured ${sizeMB.toFixed(3)}MB`,
  );
});

await test("VIDEO_PROVIDER_CONFIGS describes both delivery modes", () => {
  const rows = Object.values(VIDEO_PROVIDER_CONFIGS);
  assert(rows.length > 0, "the capability table must not be empty");

  for (const [name, row] of Object.entries(VIDEO_PROVIDER_CONFIGS)) {
    // Every field the table promises, on every row — a partially-filled row
    // is how a caller ends up with `undefined` where it expected a ceiling.
    assertEqual(
      typeof row.supportsNativeVideo,
      "boolean",
      `supportsNativeVideo must be a boolean for ${name}`,
    );
    assertEqual(
      typeof row.maxSizeMB,
      "number",
      `maxSizeMB must be a number for ${name}`,
    );
    assertEqual(
      typeof row.maxDurationSec,
      "number",
      `maxDurationSec must be a number for ${name}`,
    );
    assertEqual(
      typeof row.supportsAudio,
      "boolean",
      `supportsAudio must be a boolean for ${name}`,
    );
    assert(
      row.recommendedFrameCount > 0,
      `recommendedFrameCount must be positive for ${name}`,
    );
    assert(
      row.apiType === "inline" || row.apiType === "frame-extraction",
      `apiType must name an implemented mechanism for ${name}`,
    );
    // The two must agree. A row claiming native video on the frame path (or
    // the reverse) would send the message builder and the cost estimator in
    // opposite directions.
    assertEqual(
      row.apiType === "inline",
      row.supportsNativeVideo,
      `apiType and supportsNativeVideo must agree for ${name}`,
    );
    // A ceiling on a provider that never receives bytes reads like a real
    // limit somebody could raise. It is 0 deliberately.
    if (!row.supportsNativeVideo) {
      assertEqual(
        row.maxSizeMB,
        0,
        `a frame-only provider must not advertise a size ceiling — ${name}`,
      );
    } else {
      assert(
        row.maxSizeMB > 0,
        `a native provider must advertise a size ceiling — ${name}`,
      );
    }
  }

  assert(
    rows.some((r) => r.supportsNativeVideo),
    "at least one provider must be on the native path",
  );
  assert(
    rows.some((r) => !r.supportsNativeVideo),
    "at least one provider must be on the frame path",
  );
});

await test("the getters answer for known and unknown providers", () => {
  assert(
    supportsNativeVideo("google-ai"),
    "Gemini AI Studio must be on the native path",
  );
  assert(supportsNativeVideo("vertex"), "Vertex must be on the native path");
  assert(
    !supportsNativeVideo("openai"),
    "OpenAI must not be on the native path",
  );

  // Case and surrounding whitespace are normalised: the provider string
  // reaching this table comes from a CLI flag as often as from code.
  assert(
    supportsNativeVideo("  GOOGLE-AI  "),
    "the lookup must normalise case and whitespace",
  );

  assert(
    getVideoProviderConfig("not-a-real-provider") === null,
    "an unlisted provider must return null rather than a default row",
  );
  assert(
    !supportsNativeVideo("not-a-real-provider"),
    "an unlisted provider must read as no native video",
  );
});

await test("estimateVideoTokens prices the two paths differently", () => {
  const seconds = 60;
  const native = estimateVideoTokens({
    provider: "google-ai",
    durationSec: seconds,
  });
  const frames = estimateVideoTokens({
    provider: "openai",
    durationSec: seconds,
    frameCount: 8,
  });

  assert(native > 0, "a native estimate must be positive");
  assert(frames > 0, "a frame estimate must be positive");
  // Not an arbitrary threshold: a minute of inline video is billed per
  // second, eight stills are billed per still. If these ever come out close,
  // one of the two formulas has stopped being applied.
  assert(
    native > frames * 2,
    "a minute of inline video must cost materially more than eight stills",
  );

  // Duration drives the native price; frames do not.
  assertEqual(
    estimateVideoTokens({
      provider: "google-ai",
      durationSec: seconds,
      frameCount: 99,
    }),
    native,
    "frameCount must not move a native estimate",
  );

  // A transcript adds to the frame price and is already included natively.
  assert(
    estimateVideoTokens({
      provider: "openai",
      durationSec: seconds,
      frameCount: 8,
      hasTranscription: true,
    }) > frames,
    "a transcript must add to a frame-path estimate",
  );

  assertEqual(
    estimateVideoTokens({ provider: "openai", durationSec: 0, frameCount: 0 }),
    0,
    "an empty request must cost nothing",
  );
});

await test("the delivery gate refuses for distinguishable reasons", () => {
  const small = {
    buffer: Buffer.alloc(1024),
    filename: "clip.mp4",
    mimeType: "video/mp4",
  };

  const ok = canDeliverVideoNatively("google-ai", small);
  assertEqual(ok.deliver, true, "a small mp4 must be deliverable to Gemini");

  const wrongProvider = canDeliverVideoNatively("openai", small);
  assertEqual(
    wrongProvider.deliver,
    false,
    "a frame-only provider must refuse the bytes",
  );
  assert(
    !!wrongProvider.reason,
    "a refusal must carry a reason the caller can log",
  );

  const config = getVideoProviderConfig("google-ai");
  assert(config !== null, "the Gemini row must exist");
  const oversized = canDeliverVideoNatively("google-ai", {
    ...small,
    buffer: Buffer.alloc((config.maxSizeMB + 1) * 1024 * 1024),
  });
  assertEqual(
    oversized.deliver,
    false,
    "a clip over the inline ceiling must be refused",
  );

  const wrongContainer = canDeliverVideoNatively("google-ai", {
    ...small,
    mimeType: "video/x-matroska",
  });
  assertEqual(
    wrongContainer.deliver,
    false,
    "an unsupported container must be refused",
  );
  assert(
    !isNativeVideoMimeType("video/x-matroska"),
    "the container check must agree with the gate",
  );

  // Every refusal above must be distinguishable. Identical wording is how
  // "shorten the clip" and "switch provider" become the same log line.
  const reasons = [
    wrongProvider.reason,
    oversized.reason,
    wrongContainer.reason,
  ];
  assertEqual(
    new Set(reasons).size,
    reasons.length,
    "each refusal must explain itself differently",
  );

  // An unmeasured duration must not by itself disqualify a clip — probing
  // fails exactly where the frames are missing too.
  assertEqual(
    canDeliverVideoNatively("google-ai", { ...small, durationSec: undefined })
      .deliver,
    true,
    "an unknown duration must not block delivery",
  );
  assertEqual(
    canDeliverVideoNatively("google-ai", {
      ...small,
      durationSec: config.maxDurationSec + 1,
    }).deliver,
    false,
    "a clip over the duration ceiling must be refused",
  );
});

// ---------------------------------------------------------------------------
// Through the built CLI: which parts actually go on the wire
// ---------------------------------------------------------------------------

const NATIVE_PART_LOG = /Added native video part/;
const VIDEO_PROCESSED_LOG = /Video processed:/;

await test("the CLI attaches the clip itself on a native provider", async () => {
  if (!hasGoogleKey()) {
    throw new Skip("no Google AI credentials");
  }
  const res = await runCLI(
    [
      "generate",
      "Reply with the single word OK.",
      "--file",
      CLIP,
      "--provider",
      NATIVE_PROVIDER,
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const combined = `${res.stdout}${res.stderr}`;

  // Precondition first: an assertion about a part being added is meaningless
  // if the video never reached the processor at all.
  assert(
    VIDEO_PROCESSED_LOG.test(combined),
    "precondition: the video must have been processed before any claim about its parts",
  );
  assert(
    NATIVE_PART_LOG.test(combined),
    "a native provider must receive the clip as a video part",
  );
});

await test("the CLI sends only frames on a frame-extraction provider", async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Skip("no OpenAI credentials");
  }
  const res = await runCLI(
    [
      "generate",
      "Reply with the single word OK.",
      "--file",
      CLIP,
      "--provider",
      FRAME_PROVIDER,
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const combined = `${res.stdout}${res.stderr}`;

  // The precondition carries the whole weight of the negative below: without
  // it, "no native video part" is equally true of a run where the file was
  // never opened, and the assertion would pass for the wrong reason.
  assert(
    VIDEO_PROCESSED_LOG.test(combined),
    "precondition: the video must have been processed before any claim about its parts",
  );
  assert(
    !NATIVE_PART_LOG.test(combined),
    "a frame-extraction provider must not receive a video part",
  );
});

// ---------------------------------------------------------------------------
// Live: the discriminating question
// ---------------------------------------------------------------------------

await test("Gemini hears the clip's audio track (live)", async () => {
  if (!hasGoogleKey()) {
    throw new Skip("no Google AI credentials");
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: {
      text:
        "A short video is attached. Answer both parts on one line. " +
        "(1) Say the secret word spoken aloud in it. " +
        "(2) List the colours shown. " +
        "If you received no audio at all, reply exactly: NO_AUDIO_RECEIVED",
      files: [CLIP],
    },
    provider: NATIVE_PROVIDER,
  });

  const answer = result.content.toLowerCase();
  assert(answer.length > 0, "the model must return an answer");
  assert(
    !answer.includes("no_audio_received"),
    "the model must have received the clip's audio track",
  );
  // The word is spoken, never shown. No keyframe and no line of the metadata
  // summary contains it, so this passes only if the video itself travelled.
  assert(
    answer.includes("flamingo"),
    "the model must report the spoken word, which only the video carries",
  );
  // Sanity: the visual content still arrives alongside the audio.
  assert(
    answer.includes("red") && answer.includes("blue"),
    "the model must still see the clip's colours",
  );
});

await test("a frame-only provider gets pictures but no sound (live)", async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Skip("no OpenAI credentials");
  }
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: {
      text:
        "A short video is attached. List the colours shown. " +
        "Then, if and only if you can hear its audio, say the secret word " +
        "spoken aloud in it; if you received no audio, write NO_AUDIO_RECEIVED.",
      files: [CLIP],
    },
    provider: FRAME_PROVIDER,
  });

  const answer = result.content.toLowerCase();
  // Precondition: this provider must have received the keyframes, or the
  // absence of the spoken word below proves nothing about audio.
  assert(
    answer.includes("red") || answer.includes("blue"),
    "precondition: the frame-path provider must have received the keyframes",
  );
  assert(
    !answer.includes("flamingo"),
    "a frame-path provider must not learn the spoken word",
  );
});

await runSuite();

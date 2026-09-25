#!/usr/bin/env tsx
/**
 * Continuous Test Suite: video keyframe timestamps and audio transcription.
 *
 * Covers VIDEO-011 (#433) and VIDEO-018 (#460).
 *
 * ## What these assertions are really guarding
 *
 * Every knob under `videoOptions` was unreachable. `NeuroLink.generate()`
 * rebuilt its options into `TextGenerationOptions` and carried `csvOptions`
 * and `pdfOptions` across but not `videoOptions`, and two more
 * reconstructions downstream dropped it the same way. So `--video-frames 2`
 * on a four-second clip produced the tier default of four frames, and
 * `--transcribe-audio` reached no code that could act on it. The plumbing at
 * the far end had been correct since #478; nothing ever arrived.
 *
 * That failure is invisible from a passing generation — the model answers
 * either way — which is why the frame-count assertion below reads the actual
 * number extracted rather than whether the request succeeded.
 *
 * ## The fixture
 *
 * `test/fixtures/media/sample-clip.mp4` — 3.6s, 160x120, H.264 + AAC, three
 * solid colour segments (red, blue, green) and a voice saying "the secret
 * word is flamingo". OpenAI is used throughout precisely because it is on
 * the frame-extraction path: it cannot hear the clip, so the spoken word is
 * a clean probe for whether a transcript was produced and attached.
 *
 * Frame extraction needs ffmpeg, so most of this suite skips without it.
 * That is the right behaviour rather than a gap — ffmpeg is deliberately
 * absent in CI, and native delivery (the path that needs none) is covered by
 * continuous-test-suite-video-native.ts.
 *
 * Run: npx tsx test/continuous-test-suite-video-frames.ts
 */

process.env.NEUROLINK_SKIP_MCP = "true";

import "dotenv/config";
import { existsSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { assert, defineSuite, runCLI, Skip } from "./helpers/harness.js";
import { hasFfmpeg } from "./helpers/mediaFixtures.js";

// The longest test runs two CLI calls in sequence, each allowed 240 s. A live
// suite reports a per-test timeout as SKIP, so the budget must outlast both
// calls or a slow-but-correct run hides its assertions.
const { test, runSuite } = defineSuite("Video keyframes and transcription", {
  perTestTimeoutMs: 540_000,
});

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIP = path.join(HERE, "fixtures", "media", "sample-clip.mp4");

const FRAME_PROVIDER = process.env.VIDEO_FRAME_PROVIDER ?? "openai";

/** `Video processed: <name> → <n> bytes text + <n> keyframes` */
const PROCESSED = /Video processed:[^\n]*?\+\s*(\d+)\s*keyframes/;

function requireFixtures(): void {
  if (!existsSync(CLIP)) {
    throw new Error("the committed video fixture is missing");
  }
}

async function requireFrameExtraction(): Promise<void> {
  requireFixtures();
  if (!(await hasFfmpeg())) {
    throw new Skip("ffmpeg is unavailable, so no frames can be extracted");
  }
}

function requireOpenAI(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Skip("no OpenAI credentials");
  }
}

/** Frames actually extracted, per the processor's own log line. */
function extractedFrameCount(output: string): number | null {
  const match = PROCESSED.exec(output);
  return match ? Number(match[1]) : null;
}

/**
 * The model's reply, with the CLI's own logging removed.
 *
 * `--debug` is required for the processor's log lines to appear at all, and
 * the CLI writes them to **stdout** alongside the answer. Asserting on raw
 * stdout therefore matches against several hundred lines of tool
 * registration and timing — a digit-matching assertion in particular would
 * pass on a model name. Every log line carries an ISO-8601 prefix, including
 * the trailing `Debug Information` block, so dropping those leaves the reply.
 */
function answerOnly(stdout: string): string {
  return stdout
    .split("\n")
    .filter((line) => !/^\[\d{4}-\d{2}-\d{2}T/.test(line))
    .join("\n")
    .trim();
}

// ---------------------------------------------------------------------------
// videoOptions reaches the processor at all
// ---------------------------------------------------------------------------

await test("the frame budget from the CLI is honoured", async () => {
  await requireFrameExtraction();
  requireOpenAI();

  const baseline = await runCLI(
    [
      "generate",
      "Reply OK.",
      "--file",
      CLIP,
      "--provider",
      FRAME_PROVIDER,
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const defaultFrames = extractedFrameCount(
    `${baseline.stdout}${baseline.stderr}`,
  );
  // Precondition: without a measured default there is nothing to compare a
  // request against, and "the budget was applied" would be unfalsifiable.
  assert(
    defaultFrames !== null && defaultFrames > 1,
    "precondition: the unconstrained run must extract more than one frame",
  );

  const budgeted = await runCLI(
    [
      "generate",
      "Reply OK.",
      "--file",
      CLIP,
      "--provider",
      FRAME_PROVIDER,
      "--video-frames",
      "1",
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const requestedFrames = extractedFrameCount(
    `${budgeted.stdout}${budgeted.stderr}`,
  );
  assert(
    requestedFrames === 1,
    "an explicit frame budget must reach the processor and be applied",
  );
});

await test("keyframes are labelled with the moment they came from", async () => {
  await requireFrameExtraction();
  requireOpenAI();

  const res = await runCLI(
    [
      "generate",
      "Answer with a number and nothing else: how many seconds into the " +
        "video does the first green frame appear? If the frames carry no " +
        "timing information at all, answer exactly UNTIMED.",
      "--file",
      CLIP,
      "--provider",
      FRAME_PROVIDER,
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const combined = `${res.stdout}${res.stderr}`;

  const frames = extractedFrameCount(combined);
  assert(
    frames !== null && frames > 1,
    "precondition: several keyframes must have been extracted and sent",
  );
  const answer = answerOnly(res.stdout);
  assert(
    !/UNTIMED/i.test(answer),
    "the model must be able to place the frames in time",
  );
  // The green segment starts at 2.4s, so the first green keyframe is the one
  // sampled at 3s. Both readings are accepted: the assertion is that a
  // timestamp reached the model at all, not that it rounded a particular way.
  assert(
    /\b[23](\.\d+)?\b/.test(answer),
    "the reported moment must match when the green frames were sampled",
  );
});

// ---------------------------------------------------------------------------
// Transcription: the discriminating pair
// ---------------------------------------------------------------------------

const SPOKEN_WORD = /flamingo/i;

await test("a frame-path provider cannot hear the clip by default", async () => {
  await requireFrameExtraction();
  requireOpenAI();

  const res = await runCLI(
    [
      "generate",
      "What is the secret word spoken aloud in this video? If you received " +
        "no audio and no transcript, reply exactly NO_AUDIO.",
      "--file",
      CLIP,
      "--provider",
      FRAME_PROVIDER,
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const combined = `${res.stdout}${res.stderr}`;

  // Precondition: the video must have been processed, or "it did not know
  // the word" is equally true of a run where no file was ever attached.
  assert(
    extractedFrameCount(combined) !== null,
    "precondition: the video must have been processed",
  );
  assert(
    !SPOKEN_WORD.test(answerOnly(res.stdout)),
    "without transcription the spoken word must not reach a frame-path provider",
  );
});

await test("--transcribe-audio carries the speech to a frame-path provider", async () => {
  await requireFrameExtraction();
  requireOpenAI();

  const res = await runCLI(
    [
      "generate",
      "The attached material includes a section headed Spoken Audio " +
        "(transcribed). Read that section and reply with the secret word it " +
        "contains, exactly one word and nothing else.",
      "--file",
      CLIP,
      "--provider",
      FRAME_PROVIDER,
      "--transcribe-audio",
      "--temperature",
      "0",
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 300_000 },
  );
  const combined = `${res.stdout}${res.stderr}`;

  assert(
    extractedFrameCount(combined) !== null,
    "precondition: the video must have been processed",
  );
  assert(
    SPOKEN_WORD.test(answerOnly(res.stdout)),
    "with transcription the spoken word must reach a frame-path provider",
  );
});

// ---------------------------------------------------------------------------
// Bedrock has its own `videoOptions` reconstruction (multimodalOptionsBuilder)
// that the three sites above do not cover — verify it separately.
// ---------------------------------------------------------------------------

function requireBedrock(): void {
  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY ||
    !process.env.AWS_REGION
  ) {
    throw new Skip("no AWS Bedrock credentials");
  }
}

await test("the frame budget reaches the processor on the Bedrock branch too", async () => {
  await requireFrameExtraction();
  requireBedrock();

  // Bedrock builds its own multimodal options object
  // (src/lib/utils/multimodalOptionsBuilder.ts) instead of going through the
  // three sites the tests above cover. The video is still extracted, and the
  // "Video processed" log fires, before Bedrock's own API call — whether or
  // not that call itself succeeds is irrelevant to this assertion.
  const budgeted = await runCLI(
    [
      "generate",
      "Reply OK.",
      "--file",
      CLIP,
      "--provider",
      "bedrock",
      "--video-frames",
      "1",
      "--debug",
    ],
    { env: { NEUROLINK_LOG_LEVEL: "debug" }, timeoutMs: 240_000 },
  );
  const combined = `${budgeted.stdout}${budgeted.stderr}`;
  const requestedFrames = extractedFrameCount(combined);
  assert(
    requestedFrames !== null,
    "precondition: the video must have been processed on the Bedrock branch",
  );
  assert(
    requestedFrames === 1,
    "an explicit frame budget must reach the processor on the Bedrock branch too",
  );
});

await test("a transcript that cannot be produced says why", async () => {
  await requireFrameExtraction();
  if (!(process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY)) {
    throw new Skip("no Google AI credentials for the non-OpenAI request");
  }

  // Asking for a transcript with no transcription backend configured. The
  // request must still succeed — transcription is additive — and the reason
  // must be stated rather than presenting as a clip with no speech in it.
  const res = await runCLI(
    [
      "generate",
      "Reply OK.",
      "--file",
      CLIP,
      "--provider",
      "google-ai",
      "--transcribe-audio",
      "--debug",
    ],
    {
      env: { NEUROLINK_LOG_LEVEL: "debug", OPENAI_API_KEY: "" },
      timeoutMs: 240_000,
    },
  );
  const combined = `${res.stdout}${res.stderr}`;

  assert(
    extractedFrameCount(combined) !== null,
    "precondition: the video must have been processed",
  );
  assert(
    res.exitCode === 0,
    `the request must still succeed without a transcription backend (exit ${res.exitCode})`,
  );
  assert(
    /No transcript for/.test(combined),
    "a skipped transcription must be reported, not silent",
  );
  assert(
    /OPENAI_API_KEY is not set/.test(combined),
    "the report must name the missing backend rather than the clip",
  );
});

await runSuite();

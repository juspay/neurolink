#!/usr/bin/env tsx
/**
 * Continuous Test Suite: video file support (no API).
 *
 * Covers VIDEO-025 (#495), VIDEO-026 (#498), VIDEO-027 (#502), VIDEO-028 (#510)
 * and VIDEO-030 (#518). `VideoProcessor` — probing, metadata, keyframe
 * extraction — shipped with no suite of its own.
 *
 * Fixtures are minted with ffmpeg at run time (helpers/mediaFixtures.ts).
 * ffprobe reads real container headers and keyframe extraction genuinely
 * decodes, so synthetic bytes would exercise nothing; committing sample video
 * would add binaries to the repo for every container under test.
 *
 * Tests SKIP where ffmpeg is absent. CI installs it (AnimMouse/setup-ffmpeg).
 *
 * Run: npx tsx test/continuous-test-suite-video.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  tempDir,
  Skip,
} from "./helpers/harness.js";
import {
  hasFfmpeg,
  makeVideoFile,
  makeCorruptFile,
} from "./helpers/mediaFixtures.js";
import {
  videoProcessor,
  isVideoFile,
} from "../src/lib/processors/media/VideoProcessor.js";

const { test, runSuite } = defineSuite("Video file support");

const dir = tempDir("neurolink-video-");
let ready = false;

async function ensureFixtures(): Promise<void> {
  if (ready) {
    return;
  }
  if (!(await hasFfmpeg())) {
    throw new Skip("ffmpeg not available — cannot synthesise video fixtures");
  }
  await makeVideoFile(dir, "clip.mp4", 2);
  makeCorruptFile(dir, "broken.mp4");
  ready = true;
}

function info(file: string, mimetype: string) {
  const full = path.join(dir, file);
  return {
    id: `video-${file}`,
    name: file,
    mimetype,
    size: fs.statSync(full).size,
    buffer: fs.readFileSync(full),
  };
}

// --- VIDEO-026 (#498): detection ---------------------------------------------

await test("isVideoFile accepts the common containers", () => {
  assert(isVideoFile("video/mp4", "clip.mp4"), "mp4");
  assert(isVideoFile("video/webm", "clip.webm"), "webm");
  assert(isVideoFile("video/quicktime", "clip.mov"), "mov");
  assert(isVideoFile("video/x-matroska", "clip.mkv"), "mkv");
});

await test("isVideoFile falls back to the extension", () => {
  assert(isVideoFile("", "clip.mp4"), "extension alone identifies mp4");
  assert(
    isVideoFile("application/octet-stream", "clip.mkv"),
    "generic MIME falls back to the extension",
  );
});

await test("isVideoFile rejects audio and images", () => {
  assertEqual(isVideoFile("audio/mpeg", "song.mp3"), false, "mp3 is not video");
  assertEqual(isVideoFile("image/png", "cat.png"), false, "png is not video");
});

// --- VIDEO-025 (#495): probing and metadata ----------------------------------

await test("probes a real mp4 for dimensions, duration and codec", async () => {
  await ensureFixtures();
  const result = await videoProcessor.processFile(
    info("clip.mp4", "video/mp4"),
  );
  assert(result.success, `mp4 processing failed: ${JSON.stringify(result)}`);
  if (!result.success) {
    return;
  }
  const { metadata } = result.data;
  assertEqual(metadata.width, 320, "width read from the stream");
  assertEqual(metadata.height, 240, "height read from the stream");
  assert(
    metadata.duration > 1.5 && metadata.duration < 3.5,
    `duration ${metadata.duration}s outside the band for a 2s clip`,
  );
  assert(metadata.codec.length > 0, "video codec reported");
  assert(metadata.fps > 0, "frame rate reported");
  assert(
    metadata.durationFormatted.length > 0,
    "a human-readable duration is produced",
  );
  // NOTE: VideoProcessor renders this as "2s" while AudioProcessor renders the
  // same field as "0:00" (m:ss). Both are reasonable in isolation, but they are
  // sibling processors feeding the same model, so the inconsistency is worth
  // settling. Asserted loosely here rather than blessing either format.
  assertEqual(metadata.audioCodec, "aac", "muxed audio codec identified");
});

await test("reports the audio track alongside the video track", async () => {
  await ensureFixtures();
  const result = await videoProcessor.processFile(
    info("clip.mp4", "video/mp4"),
  );
  assert(result.success, "processing succeeds");
  if (!result.success) {
    return;
  }
  // The fixture is muxed with a sine track; a processor that only probed the
  // video stream would silently drop the audio a transcription path needs.
  assert(
    Boolean(result.data.metadata.audioCodec),
    "audio codec is reported for a muxed file",
  );
});

await test("handles a second container (webm) the same way", async () => {
  await ensureFixtures();
  // Not every ffmpeg build ships the VP8/Vorbis encoders — a fixture we cannot
  // mint is a missing local codec, not a product defect, so skip rather than
  // fail and rather than let it poison the mp4 tests.
  try {
    await makeVideoFile(dir, "clip.webm", 2, [
      "-c:v",
      "libvpx",
      "-c:a",
      "libvorbis",
    ]);
  } catch {
    throw new Skip("this ffmpeg build cannot encode VP8/Vorbis webm");
  }
  const result = await videoProcessor.processFile(
    info("clip.webm", "video/webm"),
  );
  assert(result.success, `webm processing failed: ${JSON.stringify(result)}`);
  if (!result.success) {
    return;
  }
  assertEqual(result.data.metadata.width, 320, "webm width read");
  assert(result.data.metadata.duration > 0, "webm duration read");
});

// --- VIDEO-027 (#502) / VIDEO-028 (#510): keyframes for frame-based providers -

await test("extracts keyframes for frame-based providers", async () => {
  await ensureFixtures();
  const result = await videoProcessor.processFile(
    info("clip.mp4", "video/mp4"),
  );
  assert(result.success, "processing succeeds");
  if (!result.success) {
    return;
  }
  // Providers without native video (OpenAI, Anthropic) receive frames as
  // images, so an empty keyframe array means those providers get nothing.
  assert(Array.isArray(result.data.keyframes), "keyframes array is present");
  assert(
    result.data.keyframes.length > 0,
    "at least one keyframe is extracted — an empty array means frame-based providers receive nothing",
  );
  for (const frame of result.data.keyframes) {
    assert(Buffer.isBuffer(frame), "each keyframe is a Buffer");
    assert(frame.length > 0, "keyframe buffers are non-empty");
  }
});

await test("textContent describes the clip for the model", async () => {
  await ensureFixtures();
  const result = await videoProcessor.processFile(
    info("clip.mp4", "video/mp4"),
  );
  assert(result.success, "processing succeeds");
  if (!result.success) {
    return;
  }
  assertIncludes(
    result.data.textContent,
    "clip.mp4",
    "the filename appears in the text handed to the model",
  );
});

// --- error paths --------------------------------------------------------------

await test("a corrupt file with a video extension does not throw", async () => {
  await ensureFixtures();
  const result = await videoProcessor.processFile(
    info("broken.mp4", "video/mp4"),
  );
  // Whatever the verdict, the contract is a structured result — a mislabelled
  // upload must not surface as an ffprobe stack trace.
  assert(
    typeof result.success === "boolean",
    "returns a structured result rather than throwing",
  );
});

await test("an empty buffer does not throw", async () => {
  const result = await videoProcessor.processFile({
    id: "video-empty",
    name: "empty.mp4",
    mimetype: "video/mp4",
    size: 0,
    buffer: Buffer.alloc(0),
  });
  assert(
    typeof result.success === "boolean",
    "returns a structured result rather than throwing",
  );
});

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();

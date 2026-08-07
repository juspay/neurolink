#!/usr/bin/env tsx
/**
 * Continuous Test Suite: audio file support (no API).
 *
 * Covers AUDIO-029 (#477), AUDIO-030 (#483), AUDIO-032 (#491) and AUDIO-033
 * (#496). `AudioProcessor` and its FileDetector routing shipped without any
 * suite of their own — `ls test/ | grep audio` returned nothing — so every
 * assertion here is new ground rather than a restatement of existing coverage.
 *
 * Fixtures are minted with ffmpeg at run time (see helpers/mediaFixtures.ts).
 * `music-metadata` parses real container headers, so only real files exercise
 * the code path that matters.
 *
 * Run: npx tsx test/continuous-test-suite-audio.ts
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
  makeAudioFile,
  makeCorruptFile,
} from "./helpers/mediaFixtures.js";
import {
  audioProcessor,
  isAudioFile,
} from "../src/lib/processors/media/AudioProcessor.js";
import { FileDetector } from "../src/lib/utils/fileDetector.js";

const { test, runSuite } = defineSuite("Audio file support");

const dir = tempDir("neurolink-audio-");
let ffmpegReady = false;

/** Mint the fixture set once; individual tests skip when ffmpeg is absent. */
async function ensureFixtures(): Promise<void> {
  if (ffmpegReady) {
    return;
  }
  if (!(await hasFfmpeg())) {
    throw new Skip("ffmpeg not available — cannot synthesise audio fixtures");
  }
  await makeAudioFile(dir, "tone.mp3", 2);
  await makeAudioFile(dir, "tone.wav", 1);
  await makeAudioFile(dir, "tone.flac", 1);
  makeCorruptFile(dir, "broken.mp3");
  ffmpegReady = true;
}

function fileInfo(file: string, mimetype: string) {
  const full = path.join(dir, file);
  return {
    id: `audio-${file}`,
    name: file,
    mimetype,
    size: fs.statSync(full).size,
    buffer: fs.readFileSync(full),
  };
}

// --- AUDIO-030 (#483): FileDetector recognises audio ------------------------

await test("isAudioFile accepts audio MIME types", () => {
  assert(isAudioFile("audio/mpeg", "song.mp3"), "audio/mpeg is audio");
  assert(isAudioFile("audio/wav", "clip.wav"), "audio/wav is audio");
  assert(isAudioFile("audio/flac", "track.flac"), "audio/flac is audio");
});

await test("isAudioFile accepts a bare extension when MIME is missing", () => {
  // Uploads routinely arrive with an empty or generic MIME type; extension is
  // the only signal left, and rejecting those would silently drop real audio.
  assert(isAudioFile("", "recording.flac"), "extension alone identifies flac");
  assert(
    isAudioFile("application/octet-stream", "voice.m4a"),
    "generic MIME falls back to the extension",
  );
});

await test("isAudioFile rejects non-audio", () => {
  assertEqual(isAudioFile("image/png", "cat.png"), false, "png is not audio");
  assertEqual(isAudioFile("text/csv", "rows.csv"), false, "csv is not audio");
});

await test("FileDetector routes a real mp3 through the audio path", async () => {
  await ensureFixtures();
  const detected = await FileDetector.detectAndProcess(
    path.join(dir, "tone.mp3"),
  );
  assertIncludes(
    JSON.stringify(detected).toLowerCase(),
    "audio",
    "detector reports an audio type for a real mp3",
  );
});

// --- AUDIO-029 (#477): AudioProcessor metadata extraction -------------------

await test("processes a real mp3 and reports duration, codec and size", async () => {
  await ensureFixtures();
  const result = await audioProcessor.processFile(
    fileInfo("tone.mp3", "audio/mpeg"),
  );
  assert(result.success, `mp3 processing failed: ${JSON.stringify(result)}`);
  if (!result.success) {
    return;
  }
  const { metadata, textContent } = result.data;

  // 2s requested; encoders pad, so assert a band rather than equality.
  assert(
    metadata.duration > 1.5 && metadata.duration < 3.5,
    `duration ${metadata.duration}s outside the expected band for a 2s tone`,
  );
  assert(metadata.codec.length > 0, "codec is reported");
  assert(metadata.fileSize > 0, "file size is reported");
  // #1262 unified audio and video on the explicit-unit form ("2s", "1m 30s")
  // and deliberately dropped the ambiguous "m:ss" clock form — this assertion
  // was left behind still demanding a colon, so it has been failing on release
  // ever since. Assert the format the shared formatter actually produces.
  assert(
    /^(\d+h\s)?(\d+m\s)?\d+s$/.test(metadata.durationFormatted),
    "duration uses the shared explicit-unit format",
  );
  assert(textContent.length > 0, "LLM-facing text content is produced");
});

// --- AUDIO-009 (#416): a missing transcript must say why ---------------------

await test("#416: no-API-key is reported as a reason, not an empty transcript", async () => {
  await ensureFixtures();
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const result = await audioProcessor.processFile(
      fileInfo("tone.mp3", "audio/mpeg"),
    );
    assert(result.success, "processing still succeeds without transcription");
    if (!result.success) {
      return;
    }
    assertEqual(result.data.hasTranscript, false, "no transcript is produced");
    // Previously every failure path returned the same empty result, so a
    // missing key looked exactly like audio containing no speech.
    assert(
      typeof result.data.transcriptionSkippedReason === "string" &&
        result.data.transcriptionSkippedReason.includes("OPENAI_API_KEY"),
      "the missing-key reason is reported rather than left blank",
    );
  } finally {
    if (previousKey !== undefined) {
      process.env.OPENAI_API_KEY = previousKey;
    }
  }
});

await test("#416: an unsupported audio format names the format and the accepted list", async () => {
  await ensureFixtures();
  const previousKey = process.env.OPENAI_API_KEY;
  // A NON-EMPTY key must be present or the no-key branch short-circuits first
  // and this test silently passes for the wrong reason — the processor tests
  // `if (!apiKey)`, so "" counts as missing.
  process.env.OPENAI_API_KEY = previousKey?.trim()
    ? previousKey
    : "sk-not-used-no-request-is-made";
  try {
    // AAC is a format the processor itself handles but Whisper does not accept,
    // so this exercises the format branch rather than the file-validation one.
    // Real wav bytes, since music-metadata reads content, not the extension.
    const result = await audioProcessor.processFile({
      ...fileInfo("tone.wav", "audio/mpeg"),
      name: "tone.aac",
      mimetype: "audio/aac",
    });
    assert(result.success, "processing still succeeds");
    if (!result.success) {
      return;
    }
    assertEqual(result.data.hasTranscript, false, "no transcript is produced");
    const reason = result.data.transcriptionSkippedReason ?? "";
    assert(
      reason.includes("Whisper accepts") || reason.includes("supported:"),
      "the reason explains the format was rejected and lists what is accepted",
    );
  } finally {
    if (previousKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousKey;
    }
  }
});

await test("lossless flag distinguishes flac from mp3", async () => {
  await ensureFixtures();
  const flac = await audioProcessor.processFile(
    fileInfo("tone.flac", "audio/flac"),
  );
  const mp3 = await audioProcessor.processFile(
    fileInfo("tone.mp3", "audio/mpeg"),
  );
  assert(flac.success && mp3.success, "both fixtures process");
  if (!flac.success || !mp3.success) {
    return;
  }
  assertEqual(flac.data.metadata.lossless, true, "flac is lossless");
  assertEqual(mp3.data.metadata.lossless, false, "mp3 is lossy");
});

await test("wav reports sample rate and channels", async () => {
  await ensureFixtures();
  const result = await audioProcessor.processFile(
    fileInfo("tone.wav", "audio/wav"),
  );
  assert(result.success, "wav processing succeeds");
  if (!result.success) {
    return;
  }
  const { sampleRate, channels } = result.data.metadata;
  assert((sampleRate ?? 0) > 0, "sample rate is reported for wav");
  assert((channels ?? 0) > 0, "channel count is reported for wav");
});

// --- AUDIO-032 (#491): degraded input ---------------------------------------
//
// AudioProcessor documents "graceful degradation for corrupt or partially
// readable files", and that is what it does: unreadable input still returns
// success with zeroed metadata rather than an error. These tests pin that
// contract down, and pin down the part a caller needs — that the degradation
// is *detectable* (codec "unknown", duration 0) rather than silent.

await test("a corrupt file degrades instead of throwing", async () => {
  await ensureFixtures();
  const result = await audioProcessor.processFile(
    fileInfo("broken.mp3", "audio/mpeg"),
  );
  // A mislabelled or truncated upload is routine input, so the contract is a
  // structured result either way — never a thrown parser error.
  assert(result.success, "corrupt audio degrades rather than throwing");
  if (!result.success) {
    return;
  }
  assertEqual(
    result.data.metadata.codec,
    "unknown",
    "an unparseable stream reports codec 'unknown' so callers can detect it",
  );
  assertEqual(
    result.data.metadata.duration,
    0,
    "no duration is invented for an unparseable stream",
  );
});

await test("an empty buffer degrades and reports zero size", async () => {
  const result = await audioProcessor.processFile({
    id: "audio-empty",
    name: "empty.mp3",
    mimetype: "audio/mpeg",
    size: 0,
    buffer: Buffer.alloc(0),
  });
  assert(result.success, "zero-byte audio degrades rather than throwing");
  if (!result.success) {
    return;
  }
  assertEqual(result.data.metadata.fileSize, 0, "zero bytes reported as zero");
  assertEqual(
    result.data.metadata.codec,
    "unknown",
    "zero-byte input reports codec 'unknown'",
  );
  // NOTE: a 0-byte file and a valid silent recording currently produce the
  // same shape — nothing on the result marks it as degraded, so the text handed
  // to the model reads as a genuine audio file of zero length. That is the
  // audio analogue of #293 (IMG-010, empty-image handling) and is worth a
  // dedicated `degraded: true` flag; asserted here as the behaviour that
  // exists, so a future fix has to update this test deliberately.
});

await test("textContent names the file so the model has context", async () => {
  await ensureFixtures();
  const result = await audioProcessor.processFile(
    fileInfo("tone.mp3", "audio/mpeg"),
  );
  assert(result.success, "processing succeeds");
  if (!result.success) {
    return;
  }
  assertIncludes(
    result.data.textContent,
    "tone.mp3",
    "the filename appears in the text handed to the model",
  );
});

// Best-effort cleanup; the OS reclaims the temp dir regardless.
try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();

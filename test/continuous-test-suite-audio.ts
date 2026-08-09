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
import { buildUserPartsWithMultimodal } from "../src/lib/providers/googleNativeGemini3/utils.js";
import {
  needsAudioTranscode,
  supportsNativeAudio,
  toProviderCompatibleAudio,
} from "../src/lib/adapters/audioFormatSupport.js";

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

// --- Native audio delivery: capability map and conversion contract ---------
//
// The live format suite proves audio *arrives*, but it can only do so for the
// containers this machine can encode and only when credentials are present.
// These run offline and pin the decision logic itself — which provider is
// offered raw bytes, which container is re-encoded first, and the promise the
// converter makes to its caller when it cannot do the job.

await test("file preprocessing is idempotent for a reused input object", async () => {
  // Everything this produces is appended — the summary onto `text`, the bytes
  // onto `nativeAudioFiles` — and `files` is never consumed, so a second pass
  // over the same input attaches the same recording twice and doubles the
  // injected text. That is reachable: a provider preprocessing in both
  // generate() and executeStream() shares one input reference with
  // BaseProvider's real-stream → fake-stream fallback, so a retried stream
  // runs it again over the same object.
  await ensureFixtures();
  const { processUnifiedFilesArray } =
    await import("../src/lib/utils/messageBuilder.js");
  const options = {
    input: {
      text: "Describe this audio.",
      files: [path.join(dir, "tone.mp3")],
    },
  };
  const run = async () =>
    processUnifiedFilesArray(
      options as unknown as Parameters<typeof processUnifiedFilesArray>[0],
      100 * 1024 * 1024,
      "google-ai-studio",
    );

  await run();
  const input = options.input as {
    text?: string;
    nativeAudioFiles?: unknown[];
  };
  const audioAfterFirst = input.nativeAudioFiles?.length ?? 0;
  assert(audioAfterFirst === 1, "the first pass collects the recording once");

  await run();
  assertEqual(
    input.nativeAudioFiles?.length ?? 0,
    audioAfterFirst,
    "a second pass does not attach the same recording again",
  );
  assertEqual(
    (input.text ?? "").split("## Audio File").length - 1,
    1,
    "a second pass does not duplicate the injected metadata summary",
  );
});

await test("a failed file still fails loud on retry, and good files are not re-added", async () => {
  // The dedup guard must not swallow a retry. The loop throws on the first
  // file it cannot process (#273, fail loud) and the SDK's own retry path
  // re-invokes with the same input, so marking the whole run as done on entry
  // would turn attempt two into a silent success with the bad file simply
  // missing — the failure class this PR exists to remove. Marking on exit
  // instead would re-add the files that already succeeded. Per entry is the
  // only version that is right both ways, and this pins both directions.
  await ensureFixtures();
  const { processUnifiedFilesArray } =
    await import("../src/lib/utils/messageBuilder.js");
  const good = path.join(dir, "good-marker.txt");
  fs.writeFileSync(good, "GOODMARKER line\n".repeat(60));
  const options = {
    input: {
      text: "Read these.",
      files: [good, path.join(dir, "definitely-absent.pdf")],
    },
  };
  const run = () =>
    processUnifiedFilesArray(
      options as unknown as Parameters<typeof processUnifiedFilesArray>[0],
      100 * 1024 * 1024,
      "google-ai-studio",
    );

  let firstThrew = false;
  try {
    await run();
  } catch {
    firstThrew = true;
  }
  assert(firstThrew, "the first attempt fails loud on the unreadable file");
  const input = options.input as { text?: string };
  const occurrencesAfterFirst =
    (input.text ?? "").split("GOODMARKER").length - 1;

  let secondThrew = false;
  try {
    await run();
  } catch {
    secondThrew = true;
  }
  assert(
    secondThrew,
    "the retry fails loud too rather than silently skipping the bad file",
  );
  assertEqual(
    (input.text ?? "").split("GOODMARKER").length - 1,
    occurrencesAfterFirst,
    "the file that already succeeded is not added a second time",
  );
});

await test("AI Studio's stream path preprocesses files like its generate path", async () => {
  // AI Studio overrides both entry points and goes straight to the native SDK,
  // so neither reaches the shared message builder. generate() ran the file
  // preprocessing inline and stream() did not, which dropped every attached
  // file on the streaming path — the audio bytes AND the metadata summary.
  // Asserted offline: preprocessing mutates options.input in place before any
  // network call, so the credential failure that follows is irrelevant here.
  await ensureFixtures();
  const previousKey = process.env.GOOGLE_AI_API_KEY;
  process.env.GOOGLE_AI_API_KEY =
    previousKey?.trim() || "not-a-real-key-no-request-succeeds";
  try {
    const { GoogleAIStudioProvider } =
      await import("../src/lib/providers/googleAiStudio/client.js");
    const provider = new GoogleAIStudioProvider();
    const options = {
      input: {
        text: "Describe this audio.",
        files: [path.join(dir, "tone.mp3")],
      },
      disableTools: true,
    };
    try {
      await provider.stream(
        options as unknown as Parameters<typeof provider.stream>[0],
      );
    } catch {
      // Expected: the request itself cannot succeed here. Preprocessing has
      // already run by then, which is the whole point.
    }
    const input = options.input as {
      text?: string;
      nativeAudioFiles?: unknown[];
    };
    assert(
      (input.nativeAudioFiles?.length ?? 0) > 0,
      "the streaming path collected the audio bytes rather than dropping them",
    );
    assertIncludes(
      input.text ?? "",
      "## Audio File",
      "the streaming path also injected the metadata summary",
    );
  } finally {
    if (previousKey === undefined) {
      delete process.env.GOOGLE_AI_API_KEY;
    } else {
      process.env.GOOGLE_AI_API_KEY = previousKey;
    }
  }
});

await test("the AI Studio request builder attaches audio, not just Vertex", async () => {
  // The capability map claims Gemini on BOTH front ends, but AI Studio
  // overrides generate()/stream() and assembles its request through
  // buildUserPartsWithMultimodal rather than the shared message builder — so
  // wiring audio into the Vertex client alone left this path advertising
  // support and then dropping the bytes. Asserting on the parts the provider
  // would actually send is the only way to catch that; a supportsNativeAudio()
  // check passes either way, which is exactly why it went unnoticed.
  const parts = await buildUserPartsWithMultimodal(
    {
      text: "Please transcribe this.",
      nativeAudioFiles: [
        {
          buffer: Buffer.from("pretend mp3 bytes, enough of them to measure"),
          filename: "memo.mp3",
          mimeType: "audio/mpeg",
        },
      ],
    },
    "Please transcribe this.",
    "[audio-suite]",
  );
  const audioPart = parts.find(
    (part) =>
      "inlineData" in part &&
      part.inlineData &&
      (part.inlineData as { mimeType: string }).mimeType.startsWith("audio/"),
  );
  assert(
    audioPart !== undefined,
    "the AI Studio part builder attaches the recording as inlineData",
  );
  const payload =
    audioPart && "inlineData" in audioPart
      ? ((audioPart.inlineData as { data: string }).data ?? "")
      : "";
  assert(
    Buffer.from(payload, "base64").length > 0,
    "the inlineData part carries the audio bytes rather than an empty payload",
  );
});

await test("provider capability is matched on normalised names", () => {
  // Every spelling the registry and CLI accept for the same provider, because
  // this gates whether audio bytes are sent at all: a missed alias silently
  // downgrades the turn to a metadata summary.
  for (const provider of [
    "vertex",
    "google-vertex",
    "GoogleVertex",
    "  gemini  ",
    "google-ai-studio",
  ]) {
    assert(
      supportsNativeAudio(provider),
      `a Gemini-family provider spelling is recognised as accepting audio`,
    );
  }
  for (const provider of ["openai", "anthropic", "bedrock", "mistral", ""]) {
    assert(
      !supportsNativeAudio(provider),
      `a provider with no inline-audio support is not offered raw bytes`,
    );
  }
});

await test("transcode is required exactly outside Gemini's accepted set", () => {
  // Gemini's documented set passes through untouched...
  for (const mime of [
    "audio/wav",
    "audio/mpeg",
    "audio/aiff",
    "audio/aac",
    "audio/ogg",
    "audio/flac",
    "AUDIO/MPEG",
    "audio/wav; codecs=1",
  ]) {
    assert(
      !needsAudioTranscode(mime),
      `an accepted container is passed through without re-encoding`,
    );
  }
  // ...and everything else is converted rather than rejected, which is the
  // whole point: the container a voice memo happens to use says nothing about
  // whether the audio inside is worth hearing.
  for (const mime of [
    "audio/x-caf",
    "audio/x-ms-wma",
    "audio/x-wavpack",
    "audio/basic",
    "audio/amr",
  ]) {
    assert(
      needsAudioTranscode(mime),
      `an unsupported container is routed through conversion`,
    );
  }
});

await test("an already-native container is returned untouched", async () => {
  // No ffmpeg involved on this path, so it holds on any machine.
  const bytes = Buffer.from("not really audio, and deliberately so");
  const result = await toProviderCompatibleAudio(bytes, "audio/mpeg", ".mp3");
  assert(!result.converted, "an accepted container reports no conversion");
  assertEqual(result.mimeType, "audio/mpeg", "the MIME type is preserved");
  assert(result.buffer === bytes, "the original buffer is passed through");
});

await test("a mimetype parameter does not defeat the native check", async () => {
  const bytes = Buffer.from("still not audio");
  const result = await toProviderCompatibleAudio(
    bytes,
    "audio/mpeg; codecs=mp3",
    ".mp3",
  );
  assert(!result.converted, "the parameter is stripped before the lookup");
  assertEqual(result.mimeType, "audio/mpeg", "the normalised type comes back");
});

await test("an unconvertible input degrades instead of throwing", async () => {
  // The contract the caller depends on: this never throws for audio reasons.
  // Bytes that are not audio in a container that would need conversion is the
  // worst case — ffmpeg fails, or is absent entirely — and both must surface
  // as `converted: false` so the caller falls back to the metadata summary
  // rather than failing the generation.
  const garbage = Buffer.from("00000000 definitely not a WMA stream");
  const result = await toProviderCompatibleAudio(
    garbage,
    "audio/x-ms-wma",
    ".wma",
  );
  assert(!result.converted, "a failed conversion reports converted: false");
  assert(result.buffer === garbage, "the original bytes are handed back");
  assertEqual(
    result.mimeType,
    "audio/x-ms-wma",
    "the original MIME type is preserved so the caller can still skip delivery",
  );
});

await test("an empty buffer is handled on the same degrading path", async () => {
  // Raised in review as a case worth pre-checking. It needs no special guard:
  // an empty stream either fails in ffmpeg or produces empty output, and both
  // are already funnelled into the same fallback.
  const result = await toProviderCompatibleAudio(
    Buffer.alloc(0),
    "audio/x-ms-wma",
    ".wma",
  );
  assert(!result.converted, "an empty input cannot be converted");
  assertEqual(result.buffer.length, 0, "the empty buffer is returned as-is");
});

// Best-effort cleanup; the OS reclaims the temp dir regardless.
try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();

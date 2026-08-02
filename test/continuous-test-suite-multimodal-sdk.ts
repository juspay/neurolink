#!/usr/bin/env tsx
/**
 * Continuous Test Suite: multimodal through the SDK (live).
 *
 * Covers AUDIO-030 (#483), AUDIO-032 (#491), OFFICE-017 (#493), VIDEO-026
 * (#498), VIDEO-027 (#502) and VIDEO-028 (#510).
 *
 * The processor-level suites (audio/video/office) prove each processor reads
 * its format. They do NOT prove a file handed to `generate()` reaches the model
 * as usable content — which is what these six issues actually asked for, and
 * the seam where multimodal support really breaks: detection picks the wrong
 * processor, MessageBuilder drops the part, or the adapter formats it for the
 * wrong provider.
 *
 * Every assertion here goes through the public surface — `generate()`,
 * `stream()`, `FileDetector` and `buildMultimodalMessagesArray()` — with real
 * files, and checks BOTH sides: that the input was carried through, and that
 * the output reflects it.
 *
 * Live tests SKIP without credentials rather than failing.
 *
 * Run: npx tsx test/continuous-test-suite-multimodal-sdk.ts
 */

import "dotenv/config";
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
  makeVideoFile,
} from "./helpers/mediaFixtures.js";
import { hasPackage, makeDocx, makeXlsx } from "./helpers/officeFixtures.js";
import { FileDetector } from "../src/lib/utils/fileDetector.js";
import { buildMultimodalMessagesArray } from "../src/lib/utils/messageBuilder.js";
import { NeuroLink } from "../src/lib/neurolink.js";

const { test, runSuite } = defineSuite("Multimodal through the SDK");

const dir = tempDir("neurolink-sdk-mm-");
let media = false;

/** Live provider used for the generate()/stream() assertions. */
const PROVIDER = process.env.MM_TEST_PROVIDER ?? "vertex";

/**
 * Hard bound on every live provider call.
 *
 * Without one a stalled provider hangs the suite until the harness's own
 * per-test timeout fires, which is a far blunter signal. 60s is generous for a
 * multimodal turn that uploads a file and still fails fast on a wedged request.
 */
const LIVE_TIMEOUT_MS = 60_000;

/**
 * Duration of the fixture used for the Buffer-input assertion.
 *
 * A Buffer carries no filename, so the filename check the path-based test
 * relies on is unavailable and the assertion has to come from the audio's own
 * metadata instead. The value matters: asking for the *sample rate* was tried
 * first and proved worthless, because the model answers "44100" from priors
 * even with no file attached at all — a guessable fact is not evidence.
 * Duration has no such prior, and 7 is neither round nor a plausible default,
 * so a correct "7" can only have come from the container header.
 */
const ODD_SECONDS = 7;

/**
 * Turn-ending messages NeuroLink substitutes for model output when a turn hits
 * its wall-clock deadline, stalls, or is aborted (see
 * `buildTurnTimeoutMessage` and siblings in
 * `src/lib/providers/googleNativeGemini3/utils.ts`).
 *
 * These are non-empty and perfectly plausible prose, so they satisfy a
 * "response is not empty" check and any assertion phrased as the *absence* of
 * a refusal — while carrying no answer at all. Observed live at roughly one
 * call in three during this suite's development. Treated as a non-answer and
 * retried rather than asserted against.
 */
const TURN_ENDED_MARKERS = [
  "hit its processing time limit",
  "made no progress for",
  "ask me to continue and I'll pick up from there",
];

function isNonAnswer(content: string): boolean {
  if (content.trim().length === 0) {
    return true;
  }
  return TURN_ENDED_MARKERS.some((marker) => content.includes(marker));
}

/**
 * Credential check for the provider actually under test.
 *
 * This has to follow `PROVIDER`, not assume Vertex. `MM_TEST_PROVIDER` makes
 * the provider configurable, so a gate hardcoded to Vertex is wrong in both
 * directions: with Vertex credentials absent but the chosen provider's present
 * every live test skips for no reason, and with Vertex present but the chosen
 * provider's absent they run and die on provider auth instead of skipping
 * cleanly — which reads as a product failure rather than a missing key.
 *
 * An unrecognised provider returns false (skip) rather than true (attempt):
 * a skip naming the provider is diagnosable, an auth error from a live call is
 * not.
 */
function hasCredentialsFor(provider: string): boolean {
  switch (provider) {
    case "vertex":
    case "google-vertex":
      return Boolean(
        process.env.GOOGLE_VERTEX_PROJECT ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS,
      );
    case "openai":
      return Boolean(process.env.OPENAI_API_KEY);
    case "anthropic":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "google-ai":
    case "googleaistudio":
      return Boolean(process.env.GOOGLE_AI_API_KEY);
    case "bedrock":
    case "amazonbedrock":
      return Boolean(
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY,
      );
    default:
      return false;
  }
}

async function ensureMedia(): Promise<void> {
  if (media) {
    return;
  }
  if (!(await hasFfmpeg())) {
    throw new Skip("ffmpeg not available — cannot synthesise media fixtures");
  }
  await makeAudioFile(dir, "tone.mp3", 2);
  // 7s, deliberately not a round or common value — see ODD_SECONDS.
  await makeAudioFile(dir, "odd.mp3", ODD_SECONDS);
  await makeAudioFile(dir, "tone.wav", 1);
  await makeAudioFile(dir, "tone.m4a", 1);
  await makeAudioFile(dir, "tone.ogg", 1);
  await makeVideoFile(dir, "clip.mp4", 2);
  media = true;
}

function requireLive(): void {
  if (!hasCredentialsFor(PROVIDER)) {
    throw new Skip(
      `no credentials for provider "${PROVIDER}" — skipping live SDK assertions`,
    );
  }
}

/**
 * Run a live call, retrying past responses that carry no answer.
 *
 * Two distinct non-answers occur here. Vertex intermittently returns an empty
 * completion — the same request that yields a real answer can come back as "".
 * Separately, NeuroLink substitutes a turn-ended message when a turn exceeds
 * its deadline (see TURN_ENDED_MARKERS); that one is *non-empty*, so an
 * emptiness check alone lets it through to an assertion that then measures
 * nothing. Neither is a NeuroLink defect the multimodal path is responsible
 * for, so retry rather than redden the suite.
 *
 * If every attempt is a non-answer the caller's assertion still fails, which
 * is what we want if it becomes systematic.
 */
async function generateNonEmpty(
  nl: NeuroLink,
  options: Parameters<NeuroLink["generate"]>[0],
): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    // Merge rather than replace, so a caller-supplied timeout still wins.
    const result = await nl.generate({ timeout: LIVE_TIMEOUT_MS, ...options });
    last = result.content;
    if (!isNonAnswer(last)) {
      return last;
    }
  }
  return last;
}

// --- VIDEO-026 (#498) / AUDIO-030 (#483): FileDetector on real bytes ---------
//
// The detector is the first thing every multimodal call hits. These assert it
// against real container headers rather than an extension, because a file whose
// extension lies is the case that actually reaches production.

await test("FileDetector identifies each audio container from its bytes", async () => {
  await ensureMedia();
  for (const [file, expect] of [
    ["tone.mp3", "audio"],
    ["tone.wav", "audio"],
    ["tone.m4a", "audio"],
    ["tone.ogg", "audio"],
  ] as const) {
    const result = await FileDetector.detectAndProcess(path.join(dir, file));
    assertIncludes(
      JSON.stringify(result).toLowerCase(),
      expect,
      `${file} detected as ${expect}`,
    );
  }
});

await test("FileDetector identifies mp4 from its bytes", async () => {
  await ensureMedia();
  const result = await FileDetector.detectAndProcess(
    path.join(dir, "clip.mp4"),
  );
  assertIncludes(
    JSON.stringify(result).toLowerCase(),
    "video",
    "mp4 detected as video",
  );
});

await test("FileDetector trusts bytes over a lying extension", async () => {
  await ensureMedia();
  // An mp3 renamed .mp4 must not be routed to the video processor: magic-byte
  // detection is the whole point of not trusting the filename.
  const lying = path.join(dir, "actually-audio.mp4");
  fs.copyFileSync(path.join(dir, "tone.mp3"), lying);
  const result = await FileDetector.detectAndProcess(lying);
  const json = JSON.stringify(result).toLowerCase();
  assertIncludes(json, "audio", "content wins over the extension");
});

// --- VIDEO-027 (#502): MessageBuilder carries media into the message ---------

await test("buildMultimodalMessagesArray carries a video into message content", async () => {
  await ensureMedia();
  const messages = await buildMultimodalMessagesArray(
    {
      input: {
        text: "What is in this clip?",
        files: [path.join(dir, "clip.mp4")],
      },
    } as Parameters<typeof buildMultimodalMessagesArray>[0],
    "vertex",
    "gemini-2.5-flash",
  );

  assert(Array.isArray(messages) && messages.length > 0, "messages produced");
  const serialised = JSON.stringify(messages);
  assertIncludes(serialised, "What is in this clip?", "the prompt survives");
  // The whole point of the builder is that the file becomes model-visible
  // content; a message array carrying only the prompt means the video was
  // silently dropped.
  assert(
    serialised.length > 500,
    `expected media content in the message, got ${serialised.length} chars`,
  );
});

await test("buildMultimodalMessagesArray carries audio into message content", async () => {
  await ensureMedia();
  const messages = await buildMultimodalMessagesArray(
    {
      input: {
        text: "Describe this audio.",
        files: [path.join(dir, "tone.mp3")],
      },
    } as Parameters<typeof buildMultimodalMessagesArray>[0],
    "vertex",
    "gemini-2.5-flash",
  );
  const serialised = JSON.stringify(messages);
  assertIncludes(serialised, "Describe this audio.", "the prompt survives");
  assertIncludes(
    serialised.toLowerCase(),
    "tone.mp3",
    "the audio file is named in the message handed to the model",
  );
});

// --- AUDIO-032 (#491): audio through the SDK -------------------------------
//
// Assertions here use a value that exists ONLY inside the file, or an explicit
// sentinel. Asking the model to "reply with the word AUDIO" and asserting the
// response contains AUDIO is worthless: the refusal "No audio file is
// attached." contains it too, and a prompt that asserts a file is attached
// gets an obedient "RECEIVED" from a model that received nothing. Three tests
// here passed for exactly those reasons until they were checked against a
// live provider.

await test("audio reaches the model via input.files", async () => {
  await ensureMedia();
  requireLive();
  const nl = new NeuroLink();
  const content = await generateNonEmpty(nl, {
    input: {
      text: "Describe the attached file. If no file reached you, reply exactly: NOTHING_RECEIVED",
      files: [path.join(dir, "tone.mp3")],
    },
    provider: PROVIDER,
    maxTokens: 512,
  });
  assert(
    !content.includes("NOTHING_RECEIVED"),
    `the model reported receiving nothing; got: ${content.slice(0, 200)}`,
  );
  // Only obtainable by reading the container header.
  assertIncludes(
    content.toLowerCase(),
    "tone.mp3",
    `the model described the actual file; got: ${content.slice(0, 200)}`,
  );
});

await test("audio reaches the model as a Buffer via input.files", async () => {
  await ensureMedia();
  requireLive();
  const nl = new NeuroLink();
  // Asks for the duration rather than a description. A Buffer has no filename,
  // so the neighbouring path-based test's "tone.mp3" check is unavailable here
  // — and asserting only the ABSENCE of the sentinel proves nothing, because a
  // model that received no file still answers with plausible prose instead of
  // the sentinel. Verified against a live negative control: with no file
  // attached the reply was "I apologize for the confusion…", which satisfies a
  // sentinel-only assertion while containing no answer.
  const content = await generateNonEmpty(nl, {
    input: {
      text: "How many seconds long is the attached audio? Answer with the number only. If no file reached you, reply exactly: NOTHING_RECEIVED",
      files: [fs.readFileSync(path.join(dir, "odd.mp3"))],
    },
    provider: PROVIDER,
    maxTokens: 512,
  });
  assert(
    !content.includes("NOTHING_RECEIVED"),
    `buffer input reached the model; got: ${content.slice(0, 200)}`,
  );
  // Word-bounded so a stray "7" inside a larger number cannot satisfy it.
  assert(
    new RegExp(`\\b${ODD_SECONDS}\\b`).test(content),
    `the model read the real duration (${ODD_SECONDS}s) from the buffer; got: ${content.slice(0, 200)}`,
  );
});

await test("input.audioFiles delivers audio (regression for #1259)", async () => {
  await ensureMedia();
  requireLive();
  // #1259: audioFiles used to be dropped on every path that bypasses
  // buildMultimodalMessagesArray, so this returned NOTHING_RECEIVED while the
  // identical call through input.files answered correctly. Asserting the real
  // duration rather than the absence of the sentinel, for the reason given on
  // the Buffer test above.
  const nl = new NeuroLink();
  const content = await generateNonEmpty(nl, {
    input: {
      text: "How many seconds long is the attached audio? Answer with the number only. If no file reached you, reply exactly: NOTHING_RECEIVED",
      audioFiles: [path.join(dir, "odd.mp3")],
    },
    provider: PROVIDER,
    maxTokens: 512,
  });
  assert(
    !content.includes("NOTHING_RECEIVED"),
    `audioFiles reached the model; got: ${content.slice(0, 200)}`,
  );
  assert(
    new RegExp(`\\b${ODD_SECONDS}\\b`).test(content),
    `the model read the real duration (${ODD_SECONDS}s) via audioFiles; got: ${content.slice(0, 200)}`,
  );
});

// --- OFFICE-017 (#493): generate() with office documents ---------------------

await test("generate() reads content out of a .docx", async () => {
  if (!(await hasPackage("mammoth"))) {
    throw new Skip("mammoth not installed");
  }
  requireLive();
  const docx = path.join(dir, "report.docx");
  fs.writeFileSync(
    docx,
    makeDocx(["The project codename is FALCON.", "Budget approved."]),
  );
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: {
      text: "What is the project codename in this document? Answer with the codename only.",
      files: [docx],
    },
    provider: PROVIDER,
    maxTokens: 512,
    timeout: LIVE_TIMEOUT_MS,
  });
  // Asserting on content the model could only know by reading the file is the
  // difference between "the call succeeded" and "the document arrived".
  assertIncludes(
    result.content.toUpperCase(),
    "FALCON",
    `docx content reached the model; got: ${result.content.slice(0, 160)}`,
  );
});

await test("generate() reads cell values out of an .xlsx", async () => {
  if (!(await hasPackage("exceljs"))) {
    throw new Skip("exceljs not installed");
  }
  requireLive();
  const xlsx = path.join(dir, "book.xlsx");
  fs.writeFileSync(
    xlsx,
    await makeXlsx({
      Revenue: [
        ["region", "amount"],
        ["Zanzibar", 4242],
      ],
    }),
  );
  const nl = new NeuroLink();
  const result = await nl.generate({
    input: {
      text: "What amount is listed for Zanzibar in this spreadsheet? Answer with the number only.",
      files: [xlsx],
    },
    provider: PROVIDER,
    maxTokens: 512,
    timeout: LIVE_TIMEOUT_MS,
  });
  assertIncludes(
    result.content,
    "4242",
    `xlsx cell reached the model; got: ${result.content.slice(0, 160)}`,
  );
});

// --- VIDEO-028 (#510): video through the SDK --------------------------------

await test("video reaches the model via input.files", async () => {
  await ensureMedia();
  requireLive();
  const nl = new NeuroLink();
  const content = await generateNonEmpty(nl, {
    input: {
      text: "What is the pixel resolution of the attached video? Answer with WIDTHxHEIGHT only, e.g. 640x480. If no video reached you, reply exactly: NOTHING_RECEIVED",
      files: [path.join(dir, "clip.mp4")],
    },
    provider: PROVIDER,
    maxTokens: 512,
  });
  assert(
    !content.includes("NOTHING_RECEIVED"),
    `the model reported seeing nothing; got: ${content.slice(0, 200)}`,
  );
  // Asking for a specific fact rather than a free-form description: the model's
  // prose varies run to run (an earlier version asserted on whichever details it
  // happened to mention, and flaked). 320x240 is the fixture's real resolution,
  // obtainable only from the probed stream, and no refusal contains it.
  assertIncludes(
    content,
    "320x240",
    `the model read the real resolution; got: ${content.slice(0, 200)}`,
  );
});

await test("input.videoFiles delivers video (regression for #1259)", async () => {
  await ensureMedia();
  requireLive();
  const nl = new NeuroLink();
  const content = await generateNonEmpty(nl, {
    input: {
      text: "What is the pixel resolution of the attached video? Answer with WIDTHxHEIGHT only, e.g. 640x480. If no video reached you, reply exactly: NOTHING_RECEIVED",
      videoFiles: [path.join(dir, "clip.mp4")],
    },
    provider: PROVIDER,
    maxTokens: 512,
  });
  assert(
    !content.includes("NOTHING_RECEIVED"),
    `videoFiles reached the model; got: ${content.slice(0, 200)}`,
  );
  assertIncludes(
    content,
    "320x240",
    `the model read the real resolution via videoFiles; got: ${content.slice(0, 200)}`,
  );
});

// --- stream() parity ----------------------------------------------------------

await test("stream() carries a document through the same path as generate()", async () => {
  if (!(await hasPackage("mammoth"))) {
    throw new Skip("mammoth not installed");
  }
  // Pinned to anthropic, so the gate names that provider rather than
  // following PROVIDER.
  if (!hasCredentialsFor("anthropic")) {
    throw new Skip("no anthropic credentials — skipping stream parity");
  }
  const docx = path.join(dir, "stream.docx");
  fs.writeFileSync(docx, makeDocx(["The access code is ORCHID."]));
  const nl = new NeuroLink();
  // Deliberately a *second* provider. #1258 was a provider-specific break —
  // Vertex's native override ran file preprocessing in generate() but not in
  // executeStream() — so one provider's stream path passing says nothing about
  // another's. The PROVIDER-based parity test below covers the configured
  // provider; this one keeps a non-Vertex path under continuous assertion.
  const result = await nl.stream({
    input: {
      text: "What is the access code in this document? Answer with the code only.",
      files: [docx],
    },
    provider: "anthropic",
    maxTokens: 60,
    timeout: LIVE_TIMEOUT_MS,
  });
  let text = "";
  for await (const chunk of result.stream) {
    text += typeof chunk === "string" ? chunk : (chunk.content ?? "");
  }
  // generate() and stream() share MessageBuilder but not the whole path, so a
  // document that works in one can still be dropped in the other.
  assertIncludes(
    text.toUpperCase(),
    "ORCHID",
    `docx content reached the model via stream(); got: ${text.slice(0, 160)}`,
  );
});

await test("mixed multimodal input keeps every part", async () => {
  await ensureMedia();
  if (!(await hasPackage("exceljs"))) {
    throw new Skip("exceljs not installed");
  }
  requireLive();
  const xlsx = path.join(dir, "mixed.xlsx");
  fs.writeFileSync(xlsx, await makeXlsx({ Data: [["token"], ["PELICAN"]] }));
  const nl = new NeuroLink();
  const content = await generateNonEmpty(nl, {
    input: {
      text: "You have two attached files. Reply with the token from the spreadsheet, then the name of the audio file.",
      files: [xlsx, path.join(dir, "tone.mp3")],
    },
    provider: PROVIDER,
    maxTokens: 512,
    timeout: LIVE_TIMEOUT_MS,
  });
  const upper = content.toUpperCase();
  assertIncludes(
    upper,
    "PELICAN",
    `spreadsheet part survived; got: ${content.slice(0, 200)}`,
  );
  // The filename, not the word "AUDIO": a refusal such as "no audio file is
  // attached" contains "AUDIO" too, so that assertion passed whether or not
  // the audio ever arrived. Same false-pass shape this file's header warns
  // about — it survived one round of fixing those and was caught in review.
  assertIncludes(
    upper,
    "TONE.MP3",
    `audio part survived; got: ${content.slice(0, 200)}`,
  );
});

await test("stream() file parity on the configured provider (regression for #1258)", async () => {
  if (!(await hasPackage("mammoth"))) {
    throw new Skip("mammoth not installed");
  }
  requireLive();
  // #1258: Vertex overrides both generate() and executeStream() to reach the
  // native SDKs, but only generate() ran file preprocessing — so this exact
  // call answered "no documents attached" while generate() returned the code.
  // Runs against PROVIDER (not a provider known to be correct), which is what
  // makes it a parity test rather than a restatement of the test above.
  const docx = path.join(dir, "parity.docx");
  fs.writeFileSync(docx, makeDocx(["The access code is MERIDIAN."]));
  const nl = new NeuroLink();
  const result = await nl.stream({
    input: {
      text: "What is the access code in this document? Answer with the code only.",
      files: [docx],
    },
    provider: PROVIDER,
    maxTokens: 200,
    timeout: LIVE_TIMEOUT_MS,
  });
  let text = "";
  for await (const chunk of result.stream) {
    text += typeof chunk === "string" ? chunk : (chunk.content ?? "");
  }
  assertIncludes(
    text.toUpperCase(),
    "MERIDIAN",
    `docx content reached the model via stream() on ${PROVIDER}; got: ${text.slice(0, 160)}`,
  );
});

try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();

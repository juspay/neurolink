#!/usr/bin/env tsx
/**
 * Continuous Test Suite: every registry format, end to end (live).
 *
 * ## What this suite asserts, and why it looks like this
 *
 * NeuroLink claims to support ~60 file formats across six modalities. The only
 * evidence that actually backs that claim is: create a `NeuroLink` the way a
 * user does, attach a real file of that format, and check the model answers a
 * question it could only answer by reading the file's *content*.
 *
 * This suite previously did something else. It called `FileDetector.detect()`,
 * `lookupByExtension()` and `toVisionCompatibleImage()` directly — 35 tests
 * that verified the registry agreed with itself. Every one passed while a plain
 * 19 KB JPEG attached by path never reached the model at all, because nothing
 * in it ever went through `generate()`. A lookup table cannot tell you whether
 * a file arrives.
 *
 * So every format assertion here is one `generate()` call with one real file.
 *
 * ## Every fixture carries a secret
 *
 * Each file embeds the same un-guessable token — painted into the pixels,
 * spoken into the audio, written into the document text — and the assertion is
 * that the model says it back. This is the part that is easy to get wrong:
 *
 *   - "Describe this image" + asserting the reply is non-empty proves nothing;
 *     a model with no image attached writes a fluent paragraph anyway.
 *   - Asking for a *guessable* property is just as bad. An earlier suite asked
 *     for an audio file's sample rate and passed, because the model answers
 *     "44100" from priors with no file attached at all.
 *   - Asking the model to "reply RECEIVED if you got the file" gets an obedient
 *     RECEIVED from a model that got nothing.
 *
 * A random token has no prior. The only way to produce it is to have read the
 * file, which is exactly the claim under test. The prompt never contains it.
 *
 * ## Fixtures are realistic sizes
 *
 * Files under `SIZE_TIER_THRESHOLDS.TINY_MAX` (10 KB) take an eager path;
 * larger ones take a lazy reference path. Every image fixture across the suites
 * happened to be under 10 KB, so the lazy path went untested — and it dropped
 * images entirely. Every fixture here asserts it is above that line before it
 * is used, so this suite cannot quietly drift back to testing only the easy
 * path.
 *
 * ## Unavailable is not passing
 *
 * Format encoders vary by machine: the LGPL ffmpeg build has no HEVC, HEIC
 * generation needs macOS `sips`, `.rar` needs the proprietary archiver. A
 * format this environment cannot produce SKIPS with a named reason. To stop
 * that from becoming a suite that skips everything and reports success, one
 * guard asserts a coverage floor and another asserts the fixture table still
 * covers the registry.
 *
 * Live tests SKIP without credentials rather than failing.
 *
 * Run: npx tsx test/continuous-test-suite-file-formats.ts
 */

import "dotenv/config";
import * as fs from "node:fs";
import { defineSuite, assert, tempDir, Skip } from "./helpers/harness.js";
import {
  FIXTURE_FORMATS,
  makeTokenFixture,
  type FixtureModality,
} from "./helpers/formatFixtures.js";
import { FILE_TYPE_REGISTRY } from "../src/lib/processors/config/fileTypeRegistry.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import { SIZE_TIER_THRESHOLDS } from "../src/lib/types/index.js";
import type { GenerateOptions } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Exhaustive file-format support");

const dir = tempDir("neurolink-formats-");

/**
 * The value every fixture hides and every assertion looks for.
 *
 * Five digits: one in a hundred thousand by chance, and short enough that a
 * speech synthesiser reads it cleanly digit by digit.
 */
const TOKEN = "62519";

/** Live provider used for every assertion here. */
const PROVIDER = process.env.MM_TEST_PROVIDER ?? "vertex";

/** Hard bound on every live provider call, so a stalled request fails fast. */
const LIVE_TIMEOUT_MS = 90_000;

/**
 * How many formats this machine must manage before the suite trusts its own
 * result. Well under the 53 a fully-equipped macOS box produces, because CI
 * images legitimately lack HEIC and some codecs — but high enough that a broken
 * fixture generator (or a missing ffmpeg) fails loudly instead of turning the
 * whole suite into skips and a green tick.
 */
const COVERAGE_FLOOR = 30;

/**
 * Turn-ending messages NeuroLink substitutes for model output when a turn hits
 * its deadline, stalls, or is aborted. They are non-empty, plausible prose, so
 * an "is not empty" check passes while carrying no answer. Retried, not
 * asserted against.
 */
const TURN_ENDED_MARKERS = [
  "hit its processing time limit",
  "made no progress for",
  "ask me to continue and I'll pick up from there",
];

function isNonAnswer(content: string): boolean {
  return (
    content.trim().length === 0 ||
    TURN_ENDED_MARKERS.some((marker) => content.includes(marker)) ||
    // The sentinel is retried too, and it is worth being explicit about why
    // that does not blunt the assertion it exists to serve. A provider that
    // intermittently drops one attachment out of 57 produces a single
    // NOTHING_RECEIVED that says nothing about the code under test; a format
    // that genuinely does not arrive produces one on every attempt and still
    // fails, because `generateNonEmpty` returns the last reply either way.
    // Retrying therefore removes noise without removing signal. Observed live:
    // .flac failed once in a full run and passed 4/4 immediately after.
    content.includes("NOTHING_RECEIVED")
  );
}

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

function requireLive(): void {
  if (!hasCredentialsFor(PROVIDER)) {
    throw new Skip(
      `no credentials for provider "${PROVIDER}" — skipping live format assertions`,
    );
  }
}

/**
 * Text out of a stream chunk, ignoring the non-text members of the union.
 *
 * The chunk type covers audio and TTS payloads that carry no `content` at all,
 * so reading the field straight off the union is a type error and, on those
 * members, would silently append "undefined" if it were not.
 */
function textOfChunk(chunk: object): string {
  return "content" in chunk && typeof chunk.content === "string"
    ? chunk.content
    : "";
}

/**
 * Run a live call, retrying past responses that carry no answer.
 *
 * Vertex intermittently returns an empty completion for a request that
 * otherwise succeeds, and NeuroLink substitutes a turn-ended message when a
 * turn exceeds its deadline. Neither is a file-format defect, so neither should
 * redden this suite — but if every attempt is a non-answer the caller's
 * assertion still fails, which is what we want if it becomes systematic.
 */
async function generateNonEmpty(
  nl: NeuroLink,
  options: GenerateOptions,
): Promise<string> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await nl.generate({ timeout: LIVE_TIMEOUT_MS, ...options });
    last = result.content;
    if (!isNonAnswer(last)) {
      return last;
    }
  }
  return last;
}

/**
 * The question asked of each modality.
 *
 * Each ends with an explicit sentinel. Without one, a model that received
 * nothing says so in prose ("I don't see an attachment") and the digit
 * assertion fails with a message that looks like a wrong answer rather than a
 * missing file — the sentinel makes "the file never arrived" legible in the
 * failure output.
 */
const PROMPTS: Record<FixtureModality, string> = {
  image:
    "What number is painted on this image? Answer with the digits only. " +
    "If no image reached you, reply exactly: NOTHING_RECEIVED",
  video:
    "What number is shown in this video? Answer with the digits only. " +
    "If no video reached you, reply exactly: NOTHING_RECEIVED",
  audio:
    "What access code is spoken in this audio? Answer with the digits only. " +
    "If no audio reached you, reply exactly: NOTHING_RECEIVED",
  document:
    "What is the access code written in this file? Answer with the digits " +
    "only. If no file reached you, reply exactly: NOTHING_RECEIVED",
  data:
    "What is the access code in this file? Answer with the digits only. " +
    "If no file reached you, reply exactly: NOTHING_RECEIVED",
  archive:
    "What is the access code in the file inside this archive? Answer with " +
    "the digits only. If no file reached you, reply exactly: NOTHING_RECEIVED",
};

const DIGIT_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

/**
 * Collapse a reply to a bare digit string.
 *
 * Transcription models write a spoken "six two five one nine" as words, and a
 * reply may be formatted "6-2-5-1-9" or "6 2 5 1 9". All of those are correct
 * answers that a naive `includes(TOKEN)` would call failures, so the words are
 * mapped back to digits and every non-digit is dropped before comparing.
 */
function normalizeDigits(content: string): string {
  let text = content.toLowerCase();
  for (const [word, digit] of Object.entries(DIGIT_WORDS)) {
    text = text.split(word).join(digit);
  }
  return text.replace(/\D+/g, "");
}

/**
 * Assert on a live reply without putting the reply in the failure message.
 *
 * `defineSuite`'s `test()` classifies a thrown error as SKIP — not FAIL — when
 * its message matches `isExpectedProviderError()`, and that check reads the
 * message text. Quoting model output in an assertion therefore risks a real
 * failure being downgraded to a green skip the moment the reply happens to
 * contain "timeout", "not found" or any other provider-ish phrase — which is
 * exactly the false-green this suite was written to eliminate.
 *
 * The reply is still printed, to stderr, because diagnosing a format failure
 * without seeing what came back is miserable. It just stays out of the string
 * the harness inspects.
 */
function assertReply(condition: boolean, summary: string, reply: string): void {
  if (!condition) {
    console.error(
      `      ↳ model reply: ${reply.slice(0, 300).replace(/\s+/g, " ")}`,
    );
  }
  assert(condition, summary);
}

/** Fixtures built once and shared by the per-format tests. */
const fixtures = new Map<string, string>();
const unavailable: string[] = [];

async function buildFixtures(): Promise<void> {
  for (const { ext } of FIXTURE_FORMATS) {
    const file = await makeTokenFixture(dir, ext, TOKEN);
    if (file) {
      fixtures.set(ext, file);
    } else {
      unavailable.push(ext);
    }
  }
}

await buildFixtures();

// --- Suite-integrity guards -------------------------------------------------
//
// Not end-to-end assertions: these exist so the end-to-end assertions below
// cannot pass vacuously. Without them a machine with no ffmpeg would skip every
// format and the suite would exit 0, which is precisely how the previous
// version of this file reported success while proving nothing.

// The collected lists are printed rather than interpolated into the assertion
// message, for the reason this file's `assertReply` exists: `defineSuite` reads
// the message through `isExpectedProviderError()` to decide FAIL vs SKIP, and
// these lists are gathered at runtime — their contents move with the machine
// and the registry, so what is safe today is not a property the assertion can
// rely on. The diagnostic is not lost, only relocated.

await test("this environment can produce fixtures for most registry formats", () => {
  if (fixtures.size < COVERAGE_FLOOR) {
    console.error(`      ↳ unavailable formats: ${unavailable.join(", ")}`);
  }
  assert(
    fixtures.size >= COVERAGE_FLOOR,
    `fewer formats could be generated than the coverage floor requires — the ` +
      `remaining tests would skip rather than prove anything`,
  );
});

await test("every format in the registry has a fixture generator", () => {
  const known = new Set(FIXTURE_FORMATS.map((entry) => entry.ext));
  const missing = FILE_TYPE_REGISTRY.filter(
    (entry) => entry.modality && !known.has(entry.extensions[0]),
  ).map((entry) => entry.extensions[0]);
  if (missing.length > 0) {
    console.error(`      ↳ formats with no fixture: ${missing.join(", ")}`);
  }
  assert(
    missing.length === 0,
    `the registry claims formats this suite never attaches, so support for ` +
      `them is unproven`,
  );
});

// --- Every format, end to end ----------------------------------------------
//
// One live call per format. The fixture's size is asserted first: a fixture
// that slipped under the tier threshold would take the eager path and quietly
// stop testing the lazy one, which is where images were being dropped.

for (const { ext, modality } of FIXTURE_FORMATS) {
  await test(`${ext} content reaches the model (${modality})`, async () => {
    const file = fixtures.get(ext);
    if (!file) {
      throw new Skip(`${ext} cannot be encoded in this environment`);
    }
    requireLive();

    const size = fs.statSync(file).size;
    assert(
      size > SIZE_TIER_THRESHOLDS.TINY_MAX,
      `the ${ext} fixture is ${size} bytes, under the tier threshold — it ` +
        `would exercise the eager path and prove nothing about the lazy one`,
    );

    const nl = new NeuroLink();
    const content = await generateNonEmpty(nl, {
      input: { text: PROMPTS[modality], files: [file] },
      provider: PROVIDER,
      maxTokens: 256,
    });

    assertReply(
      !content.includes("NOTHING_RECEIVED"),
      `the ${ext} file never reached the model`,
      content,
    );
    assertReply(
      normalizeDigits(content).includes(TOKEN),
      `the model did not report the ${ext} file's hidden code`,
      content,
    );
  });
}

// --- The same content through stream() -------------------------------------
//
// `generate()` and `stream()` build their messages through the same builder but
// reach the provider by different calls, and a file dropped on only one of them
// is a real and previously-shipped failure mode. Two representative formats
// rather than all of them: this pins the streaming path without doubling an
// already long live suite.

for (const ext of [".png", ".pdf"]) {
  await test(`${ext} content reaches the model through stream() too`, async () => {
    const file = fixtures.get(ext);
    if (!file) {
      throw new Skip(`${ext} cannot be encoded in this environment`);
    }
    requireLive();

    const modality = FIXTURE_FORMATS.find((entry) => entry.ext === ext)
      ?.modality as FixtureModality;
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: PROMPTS[modality], files: [file] },
      provider: PROVIDER,
      maxTokens: 256,
      timeout: LIVE_TIMEOUT_MS,
    });

    let text = "";
    for await (const chunk of result.stream) {
      text += typeof chunk === "string" ? chunk : textOfChunk(chunk);
    }

    assertReply(
      !text.includes("NOTHING_RECEIVED"),
      `the streamed ${ext} file never reached the model`,
      text,
    );
    assertReply(
      normalizeDigits(text).includes(TOKEN),
      `the model did not report the streamed ${ext} file's hidden code`,
      text,
    );
  });
}

// Cleanup must precede runSuite(): it prints the summary and then calls
// process.exit, so anything after it never runs.
try {
  fs.rmSync(dir, { recursive: true, force: true });
} catch {
  /* ignore */
}

await runSuite();

#!/usr/bin/env tsx
/**
 * Continuous Test Suite: the `transcribe` inference type, end to end.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15):
 *
 *   - `new NeuroLink().transcribe()` / `.transcribeStream()` from
 *     `../dist/index.js`;
 *   - the built CLI, `node dist/cli/index.js transcribe …`, via `runCLI`;
 *   - the HTTP routes (`POST /api/agent/transcribe` and the OpenAI-compatible
 *     `POST /v1/audio/transcriptions`) mounted on an in-process Hono adapter
 *     built with the public `createServer` + `registerAllRoutes`, and driven
 *     through Hono's own `app.request()` — no port, no network.
 *
 * Engines are synthetic: `STTProcessor.registerHandler(<name>, stub)` is the
 * public injection hook (the same one `test/continuous-test-suite-stt-unit.ts`
 * uses), and it is used only as setup. Assertions read what `transcribe()`,
 * the CLI or the route returned, plus what the stub was handed — the only
 * place "language auto is not sent" or "dictionary terms reach the engine"
 * is observable.
 *
 * The CLI runs in a separate process, where a stub cannot be registered. Its
 * happy path therefore uses the built-in local engine (Whistle) on a WAV
 * spoken by macOS `say`, and only when Whistle's three files are already on
 * this machine; otherwise those cases skip and the CLI's error paths (which
 * need no engine) still run.
 *
 * No API keys are needed and none are read: every STT and decision-provider
 * key is blanked at the top, so the correction layer's `tryDecide` guard
 * takes its fail-open path and records why.
 *
 * Run: pnpm run test:transcribe
 *      (or: pnpm exec tsx test/continuous-test-suite-transcribe.ts)
 */
import { spawnSync } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import type { IncomingMessage, Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  assert,
  assertEqual,
  defineSuite,
  runCLI,
  Skip,
  tempDir,
} from "./helpers/harness.js";
import {
  NeuroLink,
  STTError,
  STTProcessor,
  STT_ERROR_CODES,
  createServer,
  registerAllRoutes,
  registerDefaultSTTHandlers,
} from "../dist/index.js";
import { attachTranscribeWebSocket } from "../dist/server/index.js";
import WebSocket from "ws";
import type {
  STTHandler,
  STTOptions,
  STTResult,
  TranscribeResult,
  TranscribeStreamEvent,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("Transcribe (inference type)", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Environment: nothing configured, so every default is the documented one.
// ---------------------------------------------------------------------------

/** Where Whistle's files are on this machine, resolved before the env is cleared. */
// The same order the SDK resolves: an explicit directory, a model root, the
// copy shipped in the repository (`models/whistle`), then the user's cache.
const REAL_WHISTLE_DIR = (() => {
  const explicit = process.env.NEUROLINK_WHISTLE_DIR?.trim();
  if (explicit) {
    return resolve(explicit);
  }
  const root = process.env.NEUROLINK_MODEL_DIR?.trim();
  if (root) {
    return resolve(root, "whistle");
  }
  const bundled = resolve("models", "whistle");
  return existsSync(join(bundled, "whistle.cact"))
    ? bundled
    : join(homedir(), ".neurolink", "models", "whistle");
})();
const WHISTLE_FILES_PRESENT = [
  "needle.js",
  "needle.wasm",
  "whistle.cact",
].every((name) => existsSync(join(REAL_WHISTLE_DIR, name)));

/** Every variable that would configure an STT or decision provider. */
const BLANKED_ENV = [
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_STT_API_KEY",
  "OPENAI_STT_BASE_URL",
  "DEEPGRAM_API_KEY",
  "DEEPGRAM_BASE_URL",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_STT_BASE_URL",
  "GOOGLE_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "AZURE_SPEECH_KEY",
  "AZURE_SPEECH_REGION",
  "NEUROLINK_STT_PROVIDER",
  "NEUROLINK_STT_MODEL",
  "NEUROLINK_STT_LANGUAGE",
  "NEUROLINK_STT_ENDPOINTS",
  "NEUROLINK_STT_REWRITE_PROVIDER",
  "NEUROLINK_STT_REWRITE_MODEL",
  "NEUROLINK_WHISTLE_KEYWORDS",
  "TYPESAFE_API_KEY",
  "AI_GATEWAY_API_KEY",
  "LAYA_API_KEY",
  "LAYA_BASE_URL",
  "XOR_API_KEY",
  "XOR_BASE_URL",
  "PERPLEXITY_API_KEY",
  "CLOUDFLARE_API_KEY",
  "CLOUDFLARE_ACCOUNT_ID",
] as const;
for (const name of BLANKED_ENV) {
  delete process.env[name];
}
const EMPTY_WHISTLE_DIR = tempDir("neurolink-whistle-empty-");
process.env.NEUROLINK_WHISTLE_AUTO_DOWNLOAD = "0";
process.env.NEUROLINK_WHISTLE_DIR = EMPTY_WHISTLE_DIR;

/**
 * Env for a CLI child. The child loads `.env` itself and dotenv does not
 * override a variable that is present, so each key is passed as "" rather
 * than left out (every reader treats a blank value as unset).
 */
function cliEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {
    NEUROLINK_WHISTLE_AUTO_DOWNLOAD: "0",
    NEUROLINK_WHISTLE_DIR: EMPTY_WHISTLE_DIR,
    NEUROLINK_LOG_LEVEL: "error",
  };
  for (const name of BLANKED_ENV) {
    env[name] = "";
  }
  return { ...env, ...extra };
}

/** Per-call slice that keeps Whistle off this machine's files and off the network. */
const WHISTLE_UNAVAILABLE = {
  stt: { whistle: { modelDir: EMPTY_WHISTLE_DIR, autoDownload: false } },
};

// Register the shipped handlers now, so the snapshot below holds them and
// the end of the file can put the registry back exactly.
registerDefaultSTTHandlers();
const baselineHandlers = STTProcessor.listProviders().map(
  (name) => [name, STTProcessor.getHandler(name)] as const,
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NS = "e2e-transcribe";
const SCRATCH = tempDir("neurolink-transcribe-");

/** 16-bit mono PCM WAV of `samples` (floats in [-1, 1]). */
function wavOf(samples: Float32Array, sampleRate = 16000): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** Seeded noise so every run feeds the same samples. */
function noise(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000 - 0.5;
  };
}

/** Bursts of shaped noise separated by near-silence: speech-like for an energy gate. */
function burstSamples(
  bursts: number,
  burstSeconds: number,
  gapSeconds: number,
  rate = 16000,
): Float32Array {
  const rand = noise(7);
  const out: number[] = [];
  const quiet = (seconds: number) => {
    for (let i = 0; i < seconds * rate; i++) {
      out.push(rand() * 0.002); // about -60 dBFS
    }
  };
  quiet(gapSeconds);
  for (let b = 0; b < bursts; b++) {
    const n = burstSeconds * rate;
    for (let i = 0; i < n; i++) {
      const envelope = Math.min(1, i / (0.05 * rate), (n - i) / (0.05 * rate));
      out.push(rand() * 0.6 * envelope);
    }
    quiet(gapSeconds);
  }
  return Float32Array.from(out);
}

const ONE_SECOND_WAV = wavOf(new Float32Array(16000));

type Call = { audio: Buffer; options: STTOptions };

/** What a stub answers: an `STTResult` without the fields a stub has no use for. */
type StubResult = Omit<Partial<STTResult>, "metadata"> & {
  text: string;
  metadata?: Record<string, unknown>;
};

/** Fills the fields `STTResult` requires (confidence, metadata.latency). */
function asResult(answer: StubResult): STTResult {
  return {
    confidence: 1,
    ...answer,
    metadata: { latency: 0, ...answer.metadata },
  };
}

/** A synthetic engine that records what it was handed. */
function stub(
  name: string,
  answer: (call: Call, index: number) => StubResult | Promise<StubResult>,
): { calls: Call[] } {
  const calls: Call[] = [];
  const handler: STTHandler = {
    isConfigured: () => true,
    getSupportedFormats: () => ["wav", "mp3", "ogg", "flac", "webm", "m4a"],
    transcribe: async (audio, options = {}) => {
      const call: Call = {
        audio: Buffer.isBuffer(audio) ? audio : Buffer.from(audio),
        options,
      };
      calls.push(call);
      return asResult(await answer(call, calls.length - 1));
    },
  };
  STTProcessor.registerHandler(name, handler);
  return { calls };
}

const fixed =
  (text: string, extra: Omit<StubResult, "text"> = {}) =>
  (): StubResult => ({ text, ...extra });

async function expectSTTError(
  run: () => Promise<unknown>,
): Promise<InstanceType<typeof STTError>> {
  try {
    await run();
  } catch (error) {
    if (!(error instanceof STTError)) {
      throw new Error("the error must be a typed STTError", { cause: error });
    }
    return error;
  }
  throw new Error("the call was expected to throw and did not");
}

/** A WAV of English speech from macOS `say`, or null where `say` is unavailable. */
function spokenWav(text: string, file: string): string | null {
  const out = join(SCRATCH, file);
  const run = spawnSync("say", ["-o", out, "--data-format=LEI16@16000", text], {
    stdio: "ignore",
  });
  return run.status === 0 && existsSync(out) ? out : null;
}

function requireWhistleSpeech(): string {
  if (!WHISTLE_FILES_PRESENT) {
    throw new Skip(
      "Whistle's files are not on this machine (no download in tests)",
    );
  }
  const wav = spokenWav(
    "The quick brown fox jumps over the lazy dog.",
    "fox.wav",
  );
  if (!wav) {
    throw new Skip("no `say` command to synthesize speech");
  }
  return wav;
}

const nl = new NeuroLink();

// ===========================================================================
// 1. Provider resolution
// ===========================================================================

await test("an explicit provider is used, and the result carries raw, engine, timings and steps", async () => {
  const { calls } = stub(
    `${NS}-explicit`,
    fixed("hello there", { language: "en", metadata: { model: "stub-v1" } }),
  );
  const result: TranscribeResult = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-explicit`,
  });
  assertEqual(calls.length, 1, "the named engine must be called once");
  assertEqual(result.text, "hello there", "text must be the engine text");
  assertEqual(result.raw, "hello there", "raw must be the engine text");
  assert(
    result.corrected === undefined,
    "corrected must be absent when nothing changed the text",
  );
  assertEqual(
    result.engine.provider,
    `${NS}-explicit`,
    "engine.provider must name the engine that ran",
  );
  assertEqual(
    result.engine.model,
    "stub-v1",
    "engine.model must be the model the engine reported",
  );
  assert(
    result.engine.fallbackUsed === undefined,
    "fallbackUsed must be absent when no fallback ran",
  );
  assert(
    typeof result.timings.transcribeMs === "number" &&
      typeof result.timings.totalMs === "number" &&
      result.timings.totalMs >= result.timings.transcribeMs,
    "timings must carry transcribeMs and a totalMs that covers it",
  );
  assert(
    Array.isArray(result.steps) &&
      result.steps[0] === `transcribed ${NS}-explicit`,
    "the first step must name the engine that transcribed",
  );
  assertEqual(result.language, "en", "the engine's language must survive");
});

await test("a provider alias resolves to its canonical name, case-insensitively", async () => {
  // "scribe" is an alias of the shipped elevenlabs-stt provider; a stub
  // registered under the canonical name stands in for it.
  const { calls } = stub("elevenlabs-stt", fixed("from scribe"));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: "SCRIBE",
  });
  assertEqual(calls.length, 1, "the aliased engine must be called");
  assertEqual(
    result.engine.provider,
    "elevenlabs-stt",
    "engine.provider must be the canonical name, not the alias",
  );
});

await test("NEUROLINK_STT_PROVIDER picks the engine, and NEUROLINK_STT_MODEL applies only to it", async () => {
  const { calls } = stub("deepgram", fixed("from deepgram"));
  process.env.NEUROLINK_STT_PROVIDER = "deepgram";
  process.env.NEUROLINK_STT_MODEL = "env-model";
  try {
    const implicit = await nl.transcribe({ audio: ONE_SECOND_WAV });
    assertEqual(
      implicit.engine.provider,
      "deepgram",
      "the env-named provider must be used when none is passed",
    );
    assertEqual(
      calls[0]?.options.model,
      "env-model",
      "the env model must reach the env-picked engine",
    );

    stub(`${NS}-explicit-model`, fixed("x"));
    const explicit = await nl.transcribe({
      audio: ONE_SECOND_WAV,
      provider: `${NS}-explicit-model`,
    });
    assertEqual(
      explicit.engine.provider,
      `${NS}-explicit-model`,
      "an explicit provider must beat NEUROLINK_STT_PROVIDER",
    );
    assert(
      explicit.engine.model === undefined,
      "the env model must not leak onto an explicitly named provider",
    );
  } finally {
    delete process.env.NEUROLINK_STT_PROVIDER;
    delete process.env.NEUROLINK_STT_MODEL;
  }
});

await test("with no provider named, the first configured provider in descriptor order wins", async () => {
  // deepgram precedes elevenlabs-stt in STT_PROVIDER_DESCRIPTORS.
  stub("deepgram", fixed("deepgram text"));
  stub("elevenlabs-stt", fixed("elevenlabs text"));
  process.env.DEEPGRAM_API_KEY = "dg-test-not-used";
  process.env.ELEVENLABS_API_KEY = "el-test-not-used";
  try {
    const both = await nl.transcribe({ audio: ONE_SECOND_WAV });
    assertEqual(
      both.engine.provider,
      "deepgram",
      "the earlier descriptor must win when two are configured",
    );
    delete process.env.DEEPGRAM_API_KEY;
    const one = await nl.transcribe({ audio: ONE_SECOND_WAV });
    assertEqual(
      one.engine.provider,
      "elevenlabs-stt",
      "the next configured descriptor must be used once the first is gone",
    );
  } finally {
    delete process.env.DEEPGRAM_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
  }
});

await test("with nothing configured the default is Whistle, and an unusable Whistle is a typed not-configured error", async () => {
  const error = await expectSTTError(() =>
    nl.transcribe({ audio: ONE_SECOND_WAV, credentials: WHISTLE_UNAVAILABLE }),
  );
  assertEqual(
    error.code,
    STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    "an unusable default engine must report PROVIDER_NOT_CONFIGURED",
  );
  assertEqual(
    (error.context as { provider?: unknown } | undefined)?.provider,
    "whistle",
    "the error must name whistle as the provider that was tried",
  );
});

await test("an unusable Whistle names the files it needs and where to fetch them", async () => {
  // docs/getting-started/providers/whistle.md promises that with auto-download
  // off the error lists each file, the directory it belongs in and its URL.
  const error = await expectSTTError(() =>
    nl.transcribe({ audio: ONE_SECOND_WAV, credentials: WHISTLE_UNAVAILABLE }),
  );
  for (const file of ["needle.js", "needle.wasm", "whistle.cact"]) {
    assert(
      error.message.includes(file),
      `the error message must name the ${file} file`,
    );
  }
  assert(
    error.message.includes("huggingface.co"),
    "the error message must say where the files are downloaded from",
  );
});

await test("an unknown NEUROLINK_STT_PROVIDER is ignored, falling to the default", async () => {
  process.env.NEUROLINK_STT_PROVIDER = `${NS}-not-a-provider`;
  try {
    const error = await expectSTTError(() =>
      nl.transcribe({
        audio: ONE_SECOND_WAV,
        credentials: WHISTLE_UNAVAILABLE,
      }),
    );
    assertEqual(
      (error.context as { provider?: unknown } | undefined)?.provider,
      "whistle",
      "an unknown env provider must fall through to the local default",
    );
  } finally {
    delete process.env.NEUROLINK_STT_PROVIDER;
  }
});

await test("an unknown explicit provider is a typed PROVIDER_NOT_SUPPORTED that lists what would configure one", async () => {
  const error = await expectSTTError(() =>
    nl.transcribe({ audio: ONE_SECOND_WAV, provider: `${NS}-missing` }),
  );
  assertEqual(
    error.code,
    STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "an unknown provider must be PROVIDER_NOT_SUPPORTED",
  );
  assert(
    error.message.includes("DEEPGRAM_API_KEY"),
    "the error must name the variables that would configure a provider",
  );
});

await test("with Whistle's files present, the zero-config default transcribes real speech", async () => {
  const wav = requireWhistleSpeech();
  const result = await nl.transcribe({
    audio: wav,
    credentials: { stt: { whistle: { modelDir: REAL_WHISTLE_DIR } } },
  });
  assertEqual(
    result.engine.provider,
    "whistle",
    "the default engine must be whistle when nothing else is configured",
  );
  assert(
    /\bfox\b/i.test(result.text) && /\bdog\b/i.test(result.text),
    "the local engine must recognise the spoken sentence",
  );
  assert(
    typeof result.confidence === "number" && result.confidence > 0.5,
    "a clean recording must carry a confidence above one half",
  );
});

await test("with no directory configured and downloads off, the copy shipped in the repository makes Whistle usable offline", async () => {
  // The suite points NEUROLINK_WHISTLE_DIR at an empty directory so the
  // "nothing usable" cases above are reachable; lift that for this one call.
  const saved = {
    dir: process.env.NEUROLINK_WHISTLE_DIR,
    root: process.env.NEUROLINK_MODEL_DIR,
  };
  delete process.env.NEUROLINK_WHISTLE_DIR;
  delete process.env.NEUROLINK_MODEL_DIR;
  try {
    const result = await new NeuroLink().transcribe({
      audio: ONE_SECOND_WAV,
      credentials: { stt: { whistle: { autoDownload: false } } },
      correction: { rewrite: false },
    });
    assertEqual(
      result.engine.provider,
      "whistle",
      "the zero-config default must be Whistle, from the bundled files",
    );
    assertEqual(
      typeof result.text,
      "string",
      "a second of silence must come back as (empty) text, not an error",
    );
  } finally {
    process.env.NEUROLINK_WHISTLE_DIR = saved.dir;
    if (saved.root === undefined) {
      delete process.env.NEUROLINK_MODEL_DIR;
    } else {
      process.env.NEUROLINK_MODEL_DIR = saved.root;
    }
  }
});

// ===========================================================================
// 2. Audio input forms
// ===========================================================================

await test("Buffer, ArrayBuffer, Uint8Array, path and file:// URL all reach the engine as the same bytes", async () => {
  const { calls } = stub(`${NS}-inputs`, fixed("ok"));
  const path = join(SCRATCH, "input.wav");
  writeFileSync(path, ONE_SECOND_WAV);
  const asArrayBuffer = new Uint8Array(ONE_SECOND_WAV).buffer;
  const inputs: Array<Buffer | ArrayBuffer | Uint8Array | string> = [
    ONE_SECOND_WAV,
    asArrayBuffer,
    new Uint8Array(ONE_SECOND_WAV),
    path,
    pathToFileURL(path).href,
  ];
  for (const audio of inputs) {
    await nl.transcribe({ audio, provider: `${NS}-inputs` });
  }
  assertEqual(calls.length, inputs.length, "every input form must transcribe");
  calls.forEach((call, i) => {
    assert(
      call.audio.equals(ONE_SECOND_WAV),
      `input form ${i} must reach the engine byte for byte`,
    );
    assertEqual(
      call.options.format,
      "wav",
      `input form ${i} must reach the engine with its container detected`,
    );
  });
});

await test("a path's extension is the format hint when the caller names none", async () => {
  const { calls } = stub(`${NS}-ext`, fixed("ok"));
  const path = join(SCRATCH, "named.mp3");
  writeFileSync(path, Buffer.from("not really an mp3 but named one"));
  await nl.transcribe({ audio: path, provider: `${NS}-ext` });
  assertEqual(
    calls[0]?.options.format,
    "mp3",
    "the .mp3 extension must set the format",
  );
  await nl.transcribe({ audio: path, provider: `${NS}-ext`, format: "ogg" });
  assertEqual(
    calls[1]?.options.format,
    "ogg",
    "an explicit format must win over the extension",
  );
});

await test("an async frame stream, a missing file and an empty buffer are typed errors", async () => {
  stub(`${NS}-bad-input`, fixed("never"));
  async function* frames(): AsyncGenerator<Buffer> {
    yield Buffer.alloc(320);
  }
  const streamed = await expectSTTError(() =>
    nl.transcribe({ audio: frames(), provider: `${NS}-bad-input` }),
  );
  assertEqual(
    streamed.code,
    STT_ERROR_CODES.STREAMING_NOT_SUPPORTED,
    "a frame stream must point the caller at transcribeStream()",
  );
  const missing = await expectSTTError(() =>
    nl.transcribe({
      audio: join(SCRATCH, "does-not-exist.wav"),
      provider: `${NS}-bad-input`,
    }),
  );
  assertEqual(
    missing.code,
    STT_ERROR_CODES.INVALID_AUDIO_FORMAT,
    "an unreadable path must be a typed load failure",
  );
  const empty = await expectSTTError(() =>
    nl.transcribe({ audio: Buffer.alloc(0), provider: `${NS}-bad-input` }),
  );
  assertEqual(
    empty.code,
    STT_ERROR_CODES.AUDIO_EMPTY,
    "empty audio must be AUDIO_EMPTY",
  );
});

// ===========================================================================
// 3. What the engine is handed
// ===========================================================================

await test('language "auto" (any case) and an omitted language are not sent; a pinned one is', async () => {
  const { calls } = stub(`${NS}-lang`, fixed("ok"));
  await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-lang`,
    language: "auto",
  });
  await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-lang`,
    language: "AUTO",
  });
  await nl.transcribe({ audio: ONE_SECOND_WAV, provider: `${NS}-lang` });
  await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-lang`,
    language: "hi",
  });
  assert(
    calls.slice(0, 3).every((c) => c.options.language === undefined),
    "auto or omitted must leave the language to the engine",
  );
  assertEqual(
    calls[3]?.options.language,
    "hi",
    "a pinned language must reach the engine",
  );
});

await test("NEUROLINK_STT_LANGUAGE is the default language, and auto there is not sent either", async () => {
  const { calls } = stub(`${NS}-envlang`, fixed("ok"));
  try {
    process.env.NEUROLINK_STT_LANGUAGE = "ta";
    await nl.transcribe({ audio: ONE_SECOND_WAV, provider: `${NS}-envlang` });
    process.env.NEUROLINK_STT_LANGUAGE = "auto";
    await nl.transcribe({ audio: ONE_SECOND_WAV, provider: `${NS}-envlang` });
  } finally {
    delete process.env.NEUROLINK_STT_LANGUAGE;
  }
  assertEqual(
    calls[0]?.options.language,
    "ta",
    "the env language must reach the engine",
  );
  assert(
    calls[1]?.options.language === undefined,
    "an env auto must not be sent",
  );
});

await test("dictionary terms reach the engine as vocabulary, merged with the caller's and de-duplicated; prompt and context ride in the prompt", async () => {
  const { calls } = stub(`${NS}-vocab`, fixed("nothing to correct"));
  await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-vocab`,
    vocabulary: ["Kubernetes", "neurolink"],
    dictionary: [
      { term: "NeuroLink", heardAs: ["neural link"] },
      // Only in the dictionary, not in the caller's vocabulary: proves the merge.
      { term: "Terraform", heardAs: ["terra form"] },
    ],
    prompt: "A product meeting.",
    correction: { rewrite: false, context: "Engineers discussing a release." },
  });
  const options = calls[0]?.options ?? {};
  const vocabulary = (options.vocabulary ?? []) as string[];
  assert(
    vocabulary.includes("Kubernetes"),
    "the caller's vocabulary must be kept",
  );
  assert(
    vocabulary.includes("Terraform"),
    "every dictionary term must reach the engine",
  );
  assertEqual(
    vocabulary.filter((v) => v.toLowerCase() === "neurolink").length,
    1,
    "a term the caller already listed must not be sent twice",
  );
  const prompt = (options as { prompt?: string }).prompt ?? "";
  assert(
    prompt.includes("A product meeting."),
    "the caller's prompt must reach the engine",
  );
  assert(
    prompt.includes("Engineers discussing a release."),
    "the correction context must ride along in the prompt",
  );
  const leaked = [
    "dictionary",
    "correction",
    "fallback",
    "streaming",
    "credentials",
  ].filter((key) => key in options);
  assertEqual(
    leaked.length,
    0,
    "orchestration-only options must not reach the engine",
  );
});

// ===========================================================================
// 4. Fallback and second opinion
// ===========================================================================

await test("the fallback takes over when the primary reports metadata.languageDetected === false", async () => {
  const primary = stub(
    `${NS}-unsure`,
    fixed("garbled words", { metadata: { languageDetected: false } }),
  );
  const fallback = stub(
    `${NS}-fb`,
    fixed("the words that were said", { language: "en" }),
  );
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-unsure`,
    fallback: { provider: `${NS}-fb`, model: "fb-model" },
  });
  assertEqual(primary.calls.length, 1, "the primary must run first");
  assertEqual(fallback.calls.length, 1, "the fallback must run once");
  assertEqual(
    fallback.calls[0]?.options.model,
    "fb-model",
    "the fallback model must reach the fallback",
  );
  assertEqual(
    result.text,
    "the words that were said",
    "the fallback text must be the transcript",
  );
  assertEqual(
    result.engine.provider,
    `${NS}-fb`,
    "engine.provider must name the fallback",
  );
  assertEqual(
    result.engine.fallbackUsed,
    true,
    "engine.fallbackUsed must be set",
  );
  assert(
    result.steps.includes(`fallback ${NS}-fb (unsure)`),
    "the steps must say the fallback ran because the primary was unsure",
  );
});

await test("the fallback takes over when the primary returns no text", async () => {
  stub(`${NS}-empty`, fixed("   "));
  stub(`${NS}-fb-empty`, fixed("recovered"));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-empty`,
    fallback: { provider: `${NS}-fb-empty` },
  });
  assertEqual(
    result.text,
    "recovered",
    "the fallback text must replace an empty primary",
  );
  assertEqual(
    result.engine.fallbackUsed,
    true,
    "engine.fallbackUsed must be set",
  );
  assert(
    result.steps.includes(`fallback ${NS}-fb-empty (empty)`),
    "the steps must say the fallback ran because the primary was empty",
  );
});

await test("a confident primary never calls the fallback, and a failing fallback keeps the primary", async () => {
  stub(
    `${NS}-sure`,
    fixed("all good", { metadata: { languageDetected: true } }),
  );
  const idle = stub(`${NS}-fb-idle`, fixed("unused"));
  const sure = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-sure`,
    fallback: { provider: `${NS}-fb-idle` },
  });
  assertEqual(
    idle.calls.length,
    0,
    "a confident primary must not call the fallback",
  );
  assert(sure.engine.fallbackUsed === undefined, "fallbackUsed must be absent");

  stub(
    `${NS}-unsure-2`,
    fixed("primary words", { metadata: { languageDetected: false } }),
  );
  stub(`${NS}-fb-broken`, () => {
    throw new Error("fallback engine exploded");
  });
  const kept = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-unsure-2`,
    fallback: { provider: `${NS}-fb-broken` },
  });
  assertEqual(
    kept.text,
    "primary words",
    "a failed fallback must keep the primary's words",
  );
  assert(
    kept.steps.includes(`fallback ${NS}-fb-broken failed · kept primary`),
    "the steps must record that the fallback failed",
  );
});

await test("a primary error reaches the fallback only when `when` includes error; otherwise it is thrown", async () => {
  stub(`${NS}-throws`, () => {
    throw new Error("primary engine down");
  });
  stub(`${NS}-fb-err`, fixed("served by fallback"));
  const thrown = await expectSTTError(() =>
    nl.transcribe({
      audio: ONE_SECOND_WAV,
      provider: `${NS}-throws`,
      fallback: { provider: `${NS}-fb-err` },
    }),
  );
  assertEqual(
    thrown.code,
    STT_ERROR_CODES.TRANSCRIPTION_FAILED,
    "with the default `when`, a primary error must surface as a typed failure",
  );
  const served = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-throws`,
    fallback: { provider: `${NS}-fb-err`, when: ["error"] },
  });
  assertEqual(
    served.text,
    "served by fallback",
    "when: [error] must route a failed primary to the fallback",
  );
  assertEqual(
    served.engine.fallbackUsed,
    true,
    "engine.fallbackUsed must be set",
  );
});

await test("a second opinion runs on the same audio and is reported; it leads only when the primary is unsure", async () => {
  const primary = stub(`${NS}-p2`, fixed("primary text"));
  const second = stub(`${NS}-second`, fixed("second text"));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-p2`,
    correction: { secondOpinion: { provider: `${NS}-second` }, rewrite: false },
  });
  assertEqual(
    second.calls.length,
    1,
    "the second-opinion engine must run once",
  );
  assert(
    second.calls[0]?.audio.equals(primary.calls[0]?.audio ?? Buffer.alloc(0)),
    "the second opinion must hear the same audio as the primary",
  );
  assertEqual(
    result.engine.secondOpinion,
    `${NS}-second`,
    "engine.secondOpinion must name it",
  );
  assert(
    typeof result.timings.secondOpinionMs === "number",
    "its time must be reported",
  );
  assert(
    result.steps.includes(`second opinion ${NS}-second`),
    "the steps must record it",
  );
  assertEqual(result.text, "primary text", "a confident primary must lead");

  stub(`${NS}-p3`, fixed("noise", { metadata: { languageDetected: false } }));
  const led = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-p3`,
    correction: { secondOpinion: { provider: `${NS}-second` }, rewrite: false },
  });
  assertEqual(
    led.raw,
    "second text",
    "an unsure primary must hand the lead to the second opinion",
  );
  assertEqual(led.languageDetected, false, "languageDetected must be reported");
});

// ===========================================================================
// 5. Correction (fails open; never loses words)
// ===========================================================================

await test("rewrite:false applies the dictionary and records fail-open decisions when no decision provider is configured", async () => {
  stub(`${NS}-dict`, fixed("please call jasper tomorrow"));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-dict`,
    dictionary: [
      { term: "Jaspr", heardAs: ["jasper"], meaning: "a colleague" },
    ],
    correction: { rewrite: false },
  });
  assertEqual(
    result.raw,
    "please call jasper tomorrow",
    "raw must keep the engine text",
  );
  assertEqual(
    result.text,
    "please call Jaspr tomorrow",
    "the dictionary must be applied",
  );
  assertEqual(
    result.corrected,
    result.text,
    "corrected must be set when the text changed",
  );
  assertEqual(
    result.decisions?.length,
    1,
    "one decision per candidate must be recorded",
  );
  const decision = result.decisions?.[0];
  assertEqual(
    decision?.heard,
    "jasper",
    "the decision must name what was heard",
  );
  assertEqual(decision?.term, "Jaspr", "the decision must name the term");
  assertEqual(decision?.choice, "term", "fail-open must apply the term");
  assert(
    typeof decision?.note === "string" && decision.note.length > 0,
    "a fail-open decision must carry a note saying why no model decided",
  );
  assert(
    decision?.probability === undefined,
    "a fail-open decision must not invent a probability",
  );
  assert(
    result.steps.some((s) => /^dictionary 1\/1 /.test(s)),
    "the steps must record the dictionary pass",
  );
  assert(
    typeof result.timings.decideMs === "number",
    "the guard's time must be reported",
  );
});

await test('guard: "none" applies the dictionary without asking, and says so', async () => {
  stub(`${NS}-guard-off`, fixed("ask jasper"));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-guard-off`,
    dictionary: [{ term: "Jaspr", heardAs: ["jasper"] }],
    correction: { rewrite: false, guard: "none" },
  });
  assertEqual(result.text, "ask Jaspr", "the dictionary must be applied");
  assertEqual(
    result.decisions?.[0]?.note,
    "guard off",
    "the record must say the guard was off",
  );
  assert(
    result.timings.decideMs === undefined,
    "no guard time when the guard did not run",
  );
});

await test("a dictionary term the engine already heard produces no candidate and no change", async () => {
  stub(`${NS}-already`, fixed("Jaspr met jasper"));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-already`,
    dictionary: [{ term: "Jaspr", heardAs: ["jasper"] }],
    correction: { rewrite: false },
  });
  assertEqual(
    result.text,
    "Jaspr met jasper",
    "the alias must be left alone when the term is present",
  );
  assert(result.corrected === undefined, "corrected must be absent");
});

await test("a rewrite that fails keeps the dictionary-applied text (never loses words)", async () => {
  stub(`${NS}-rewrite-fails`, fixed("we shipped neural link today"));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-rewrite-fails`,
    dictionary: [{ term: "NeuroLink", heardAs: ["neural link"] }],
    // OPENAI_API_KEY is blank, so this rewrite fails before any request.
    correction: {
      rewrite: { provider: "openai", timeoutMs: 5000 },
      guard: "none",
    },
  });
  assertEqual(
    result.text,
    "we shipped NeuroLink today",
    "a failed rewrite must keep the dictionary-applied text",
  );
  assert(
    result.steps.some(
      (s) => s.startsWith("rewrite failed") && s.endsWith("· kept text"),
    ),
    "the steps must record that the rewrite failed and the text was kept",
  );
});

await test("an empty engine transcript stays empty rather than being invented, and correction is skipped", async () => {
  stub(`${NS}-silent`, fixed(""));
  const result = await nl.transcribe({
    audio: ONE_SECOND_WAV,
    provider: `${NS}-silent`,
    dictionary: [{ term: "Jaspr", heardAs: ["jasper"] }],
    correction: { rewrite: false },
  });
  assertEqual(result.text, "", "nothing heard must stay nothing");
  assert(result.decisions === undefined, "no candidates means no decisions");
});

// ===========================================================================
// 6. transcribeStream through the public surface
// ===========================================================================

await test("transcribeStream streams a batch engine through the chunked adapter, one final per utterance", async () => {
  // Three 2 s bursts separated by 1.2 s of near-silence; the stub reports one
  // word per half second of the audio it was handed.
  const { calls } = stub(`${NS}-stream`, (call) => {
    const seconds = (call.audio.length - 44) / 32000;
    const words = Array.from(
      { length: Math.max(1, Math.floor(seconds * 2)) },
      (_, i) => `w${i + 1}`,
    );
    return { text: words.join(" ") };
  });
  const pcm = wavOf(burstSamples(3, 2, 1.2)).subarray(44);
  async function* frames(): AsyncGenerator<Buffer> {
    for (let at = 0; at < pcm.length; at += 3200) {
      yield pcm.subarray(at, at + 3200);
      await new Promise<void>((r) => setImmediate(r));
    }
  }
  const events: TranscribeStreamEvent[] = [];
  for await (const event of nl.transcribeStream({
    audio: frames(),
    provider: `${NS}-stream`,
    language: "auto",
  })) {
    events.push(event);
  }
  const finals = events.filter((e) => e.type === "final");
  assertEqual(finals.length, 3, "three bursts must yield three finals");
  const ids = finals.map((f) => (f.type === "final" ? f.utterance : -1));
  assert(
    ids.every((id, i) => i === 0 || id > ids[i - 1]),
    "finals must arrive in utterance order",
  );
  assert(
    events.every((e) => e.type !== "error"),
    "a clean stream must not report an error",
  );
  assert(
    calls.length >= 3,
    "the engine must be called at least once per utterance",
  );
  assert(
    calls.every(
      (c) => c.options.language === undefined && c.options.format === "wav",
    ),
    "stream passes must send 16 kHz WAV and leave an auto language to the engine",
  );
});

// ===========================================================================
// 7. CLI
// ===========================================================================

await test("CLI: transcribe a spoken WAV with the zero-config default and print the TranscribeResult as JSON", async () => {
  const wav = requireWhistleSpeech();
  const res = await runCLI(["transcribe", wav, "--format", "json"], {
    env: cliEnv({ NEUROLINK_WHISTLE_DIR: REAL_WHISTLE_DIR }),
    timeoutMs: 120_000,
  });
  assertEqual(
    res.exitCode,
    0,
    "the CLI must exit 0 on a successful transcription",
  );
  const start = res.stdout.indexOf("{");
  assert(start >= 0, "stdout must hold a JSON object");
  const parsed = JSON.parse(
    res.stdout.slice(start),
  ) as Partial<TranscribeResult>;
  assertEqual(
    parsed.engine?.provider,
    "whistle",
    "the CLI default engine must be whistle",
  );
  assert(
    typeof parsed.text === "string" && /\bfox\b/i.test(parsed.text),
    "the JSON text must hold the spoken words",
  );
  assert(typeof parsed.raw === "string", "the JSON must carry raw");
  assert(Array.isArray(parsed.steps), "the JSON must carry steps");
  assert(
    typeof parsed.timings?.totalMs === "number",
    "the JSON must carry timings.totalMs",
  );
});

await test("CLI: --term applies a dictionary entry with --no-rewrite, recording the fail-open decision", async () => {
  const wav = requireWhistleSpeech();
  const res = await runCLI(
    [
      "transcribe",
      wav,
      "--term",
      "Fawkes|fox|a person's name",
      "--no-rewrite",
      "--format",
      "json",
    ],
    {
      env: cliEnv({ NEUROLINK_WHISTLE_DIR: REAL_WHISTLE_DIR }),
      timeoutMs: 120_000,
    },
  );
  assertEqual(res.exitCode, 0, "the CLI must exit 0");
  const parsed = JSON.parse(
    res.stdout.slice(res.stdout.indexOf("{")),
  ) as Partial<TranscribeResult>;
  assert(
    typeof parsed.text === "string" && parsed.text.includes("Fawkes"),
    "the inline term must be applied",
  );
  assert(
    typeof parsed.raw === "string" && /\bfox\b/i.test(parsed.raw),
    "raw must keep the engine's word",
  );
  assertEqual(
    parsed.decisions?.[0]?.term,
    "Fawkes",
    "the decision must be recorded",
  );
});

await test("CLI: with nothing usable, transcribe exits 1 with a not-configured error and prints no result", async () => {
  const path = join(SCRATCH, "cli-silence.wav");
  writeFileSync(path, ONE_SECOND_WAV);
  const res = await runCLI(["transcribe", path, "--format", "json"], {
    env: cliEnv(),
    timeoutMs: 60_000,
  });
  assertEqual(res.exitCode, 1, "an unusable default engine must exit 1");
  const combined = `${res.stdout}\n${res.stderr}`;
  assert(/whistle/i.test(combined), "the error must name the engine it tried");
  assert(
    /not configured/i.test(combined),
    "the error must say the engine is not configured",
  );
  assert(
    !res.stdout.includes('"raw"'),
    "no TranscribeResult may be printed on failure",
  );
});

/** Runs the CLI on a throwaway WAV and returns exit code and combined output. */
async function cliError(
  args: string[],
): Promise<{ exitCode: number; out: string }> {
  const path = join(SCRATCH, "cli-input.wav");
  writeFileSync(path, ONE_SECOND_WAV);
  const res = await runCLI(["transcribe", path, ...args], {
    env: cliEnv(),
    timeoutMs: 60_000,
  });
  return { exitCode: res.exitCode, out: `${res.stdout}\n${res.stderr}` };
}

await test("CLI: a --term without a term is refused before any engine runs", async () => {
  const { exitCode, out } = await cliError(["--term", "|heard|meaning"]);
  assertEqual(exitCode, 1, "an empty --term must exit 1");
  assert(
    out.includes("has no term"),
    "the error must say the --term has no term",
  );
});

await test("CLI: --dictionary parsing errors are specific", async () => {
  const cases: Array<{ name: string; body: string; expect: string }> = [
    {
      name: "not-json.json",
      body: "{ nope",
      expect: "could not read --dictionary",
    },
    {
      name: "object.json",
      body: JSON.stringify({ term: "X" }),
      expect: "must hold a JSON array",
    },
    {
      name: "no-term.json",
      body: JSON.stringify([{ heardAs: ["x"] }]),
      expect: 'needs a non-empty "term"',
    },
    {
      name: "bad-heard.json",
      body: JSON.stringify([{ term: "X", heardAs: "x" }]),
      expect: '"heardAs" must be an array of strings',
    },
    {
      name: "bad-meaning.json",
      body: JSON.stringify([{ term: "X", meaning: 3 }]),
      expect: '"meaning" must be a string',
    },
  ];
  for (const c of cases) {
    const file = join(SCRATCH, c.name);
    writeFileSync(file, c.body);
    const { exitCode, out } = await cliError(["--dictionary", file]);
    assertEqual(exitCode, 1, `a malformed dictionary (${c.name}) must exit 1`);
    assert(
      out.includes(c.expect),
      `the error for ${c.name} must say what is wrong`,
    );
  }
  const { exitCode, out } = await cliError([
    "--dictionary",
    join(SCRATCH, "absent.json"),
  ]);
  assertEqual(exitCode, 1, "a missing dictionary file must exit 1");
  assert(
    out.includes("could not read --dictionary"),
    "a missing file must be reported as unreadable",
  );
});

await test("CLI: contradictory or invalid flags and an unreadable file are refused", async () => {
  const contradictory = await cliError([
    "--no-rewrite",
    "--rewrite-provider",
    "openai",
  ]);
  assertEqual(
    contradictory.exitCode,
    1,
    "--no-rewrite with --rewrite-provider must exit 1",
  );
  assert(
    contradictory.out.includes("--no-rewrite cannot be combined"),
    "the contradiction must be named",
  );

  const timeout = await cliError(["--timeout", "-5"]);
  assertEqual(timeout.exitCode, 1, "a negative --timeout must exit 1");
  assert(
    timeout.out.includes("--timeout must be a positive number"),
    "the bad timeout must be named",
  );

  const res = await runCLI(["transcribe", join(SCRATCH, "nope.wav")], {
    env: cliEnv(),
    timeoutMs: 60_000,
  });
  assertEqual(res.exitCode, 1, "an unreadable audio file must exit 1");
  assert(
    `${res.stdout}${res.stderr}`.includes("could not read audio"),
    "the unreadable file must be reported",
  );
});

// ===========================================================================
// 8. HTTP routes (in-process Hono)
// ===========================================================================

const ALLOWED_ROOT = tempDir("neurolink-transcribe-allowed-");
const OUTSIDE_ROOT = tempDir("neurolink-transcribe-outside-");
writeFileSync(join(ALLOWED_ROOT, "inside.wav"), ONE_SECOND_WAV);
writeFileSync(join(OUTSIDE_ROOT, "outside.wav"), ONE_SECOND_WAV);
const ROUTE_LIMIT = 64_000;

type HonoLike = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
};
const app: HonoLike = await (async () => {
  const adapter = await createServer(new NeuroLink(), {
    framework: "hono",
    config: { port: 0, host: "127.0.0.1" },
  });
  await adapter.initialize();
  registerAllRoutes(adapter, "/api", {
    transcribe: {
      allowedAudioRoots: [ALLOWED_ROOT],
      maxAudioBytes: ROUTE_LIMIT,
    },
  });
  return adapter.getFrameworkInstance() as HonoLike;
})();

const routeEngine = stub(`${NS}-route`, (call) => ({
  text: "route words here",
  language: "en",
  duration: 1,
  segments: [{ text: "route words here", start: 0, end: 1, isFinal: true }],
  words: [
    { word: "route", start: 0, end: 0.3 },
    { word: "words", start: 0.3, end: 0.6 },
    { word: "here", start: 0.6, end: 1 },
  ],
  metadata: { model: "route-model", format: call.options.format },
}));

function postJson(body: unknown): Promise<Response> {
  return app.request("/api/agent/transcribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postForm(
  fields: Record<string, string | Blob>,
  filename = "clip.wav",
): Promise<Response> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof Blob) {
      form.append(key, value, filename);
    } else {
      form.append(key, value);
    }
  }
  return app.request("/v1/audio/transcriptions", {
    method: "POST",
    body: form,
  });
}

await test("POST /api/agent/transcribe: base64 and data: URL audio return a TranscribeResult in the envelope", async () => {
  const before = routeEngine.calls.length;
  const plain = await postJson({
    audio: ONE_SECOND_WAV.toString("base64"),
    provider: `${NS}-route`,
  });
  assertEqual(plain.status, 200, "a valid base64 request must answer 200");
  const body = (await plain.json()) as { data?: TranscribeResult };
  assertEqual(
    body.data?.text,
    "route words here",
    "the envelope must carry the transcript",
  );
  assertEqual(
    body.data?.engine.provider,
    `${NS}-route`,
    "the envelope must carry the engine",
  );
  assert(Array.isArray(body.data?.steps), "the envelope must carry steps");

  const dataUrl = await postJson({
    audio: `data:audio/ogg;base64,${ONE_SECOND_WAV.toString("base64")}`,
    provider: `${NS}-route`,
  });
  assertEqual(dataUrl.status, 200, "a data: URL must be accepted");
  assertEqual(
    routeEngine.calls.length,
    before + 2,
    "both requests must reach the engine",
  );
  assertEqual(
    routeEngine.calls[before + 1]?.options.format,
    "ogg",
    "a data: URL's MIME type must become the format",
  );
});

await test("POST /api/agent/transcribe: audioPath is refused outside the allowed roots (and through a .. traversal), accepted inside them", async () => {
  const inside = await postJson({
    audioPath: join(ALLOWED_ROOT, "inside.wav"),
    provider: `${NS}-route`,
  });
  assertEqual(
    inside.status,
    200,
    "a path inside an allowed root must be served",
  );
  const outside = await postJson({
    audioPath: join(OUTSIDE_ROOT, "outside.wav"),
    provider: `${NS}-route`,
  });
  assertEqual(
    outside.status,
    403,
    "a path outside the allowed roots must be 403",
  );
  const traversal = await postJson({
    // A literal "..", not one path.join() would normalise away.
    audioPath: `${ALLOWED_ROOT}/../${OUTSIDE_ROOT.split("/").pop() ?? ""}/outside.wav`,
    provider: `${NS}-route`,
  });
  assertEqual(
    traversal.status,
    403,
    "a .. traversal out of the root must be 403",
  );
});

await test("POST /api/agent/transcribe: 413 over the limit, 400 for bad base64, no audio or an unknown provider", async () => {
  const tooBig = await postJson({
    audio: Buffer.alloc(ROUTE_LIMIT + 1024).toString("base64"),
    provider: `${NS}-route`,
  });
  assertEqual(tooBig.status, 413, "audio over maxAudioBytes must be 413");
  const badBase64 = await postJson({
    audio: "!!!not base64!!!",
    provider: `${NS}-route`,
  });
  assertEqual(badBase64.status, 400, "invalid base64 must be 400");
  const none = await postJson({ provider: `${NS}-route` });
  assertEqual(none.status, 400, "a request with no audio must be 400");
  const unknown = await postJson({
    audio: ONE_SECOND_WAV.toString("base64"),
    provider: `${NS}-nope`,
  });
  assertEqual(
    unknown.status,
    400,
    "an unknown provider is a client error, 400",
  );
});

await test("POST /v1/audio/transcriptions: verbose_json is OpenAI's shape plus NeuroLink's extras", async () => {
  const res = await postForm({
    file: new Blob([new Uint8Array(ONE_SECOND_WAV)], { type: "audio/wav" }),
    model: `${NS}-route`,
    response_format: "verbose_json",
    "timestamp_granularities[]": "word",
  });
  assertEqual(res.status, 200, "a valid multipart request must answer 200");
  const body = (await res.json()) as Record<string, unknown>;
  assertEqual(body.task, "transcribe", "task must be transcribe");
  assertEqual(body.text, "route words here", "text must be the transcript");
  assertEqual(body.language, "en", "language must be carried");
  assertEqual(body.duration, 1, "duration must be carried");
  const segments = body.segments as Array<Record<string, unknown>> | undefined;
  assert(
    Array.isArray(segments) &&
      segments[0]?.id === 0 &&
      segments[0]?.start === 0 &&
      segments[0]?.end === 1,
    "segments must be OpenAI-shaped with id, start and end",
  );
  const words = body.words as Array<Record<string, unknown>> | undefined;
  assert(
    Array.isArray(words) &&
      words.length === 3 &&
      typeof words[0]?.start === "number",
    "words must be carried with times",
  );
  assertEqual(body.raw, "route words here", "raw must be carried");
  assert(
    typeof body.engine === "object" &&
      (body.engine as { provider?: unknown }).provider === `${NS}-route`,
    "engine must be carried",
  );
  assert(
    Array.isArray(body.steps) && typeof body.timings === "object",
    "steps and timings must be carried",
  );
  assert(
    !("data" in body),
    "the OpenAI-compatible route must not wrap its answer in the envelope",
  );
});

await test("POST /v1/audio/transcriptions: json and text formats, and OpenAI model names mean the server default", async () => {
  const json = await postForm({
    file: new Blob([new Uint8Array(ONE_SECOND_WAV)], { type: "audio/wav" }),
    model: `${NS}-route`,
  });
  assertEqual(json.status, 200, "json must answer 200");
  const parsed = (await json.json()) as Record<string, unknown>;
  assertEqual(
    Object.keys(parsed).join(","),
    "text",
    "json must carry only text, as OpenAI's does",
  );

  const text = await postForm({
    file: new Blob([new Uint8Array(ONE_SECOND_WAV)], { type: "audio/wav" }),
    model: `${NS}-route`,
    response_format: "text",
  });
  assertEqual(text.status, 200, "text must answer 200");
  assertEqual(
    await text.text(),
    "route words here",
    "text must be the bare transcript",
  );

  // With nothing configured the server default is whistle; a stub stands in
  // for it (the registry is restored at the end of the file).
  const defaultEngine = stub("whistle", fixed("served by the default engine"));
  for (const model of ["whisper-1", "gpt-4o-transcribe", "auto"]) {
    const res = await postForm({
      file: new Blob([new Uint8Array(ONE_SECOND_WAV)], { type: "audio/wav" }),
      model,
      response_format: "verbose_json",
    });
    assertEqual(
      res.status,
      200,
      `the OpenAI model name ${model} must be served`,
    );
    const body = (await res.json()) as { engine?: { provider?: string } };
    assertEqual(
      body.engine?.provider,
      "whistle",
      `the OpenAI model name ${model} must mean the server's default engine`,
    );
  }
  assertEqual(
    defaultEngine.calls.length,
    3,
    "every OpenAI model name must reach the default engine",
  );
  const slashed = await postForm({
    file: new Blob([new Uint8Array(ONE_SECOND_WAV)], { type: "audio/wav" }),
    model: `${NS}-route/route-model-2`,
  });
  assertEqual(slashed.status, 200, "a provider/model value must be served");
  assertEqual(
    routeEngine.calls[routeEngine.calls.length - 1]?.options.model,
    "route-model-2",
    "the part after the slash must reach the engine as its model",
  );
});

await test("POST /v1/audio/transcriptions: 400 for non-multipart, missing file, bad response_format or dictionary; 413 over the limit", async () => {
  const notMultipart = await app.request("/v1/audio/transcriptions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file: "x" }),
  });
  assertEqual(notMultipart.status, 400, "a non-multipart body must be 400");
  const noFile = await postForm({ model: `${NS}-route` });
  assertEqual(noFile.status, 400, "a form without file must be 400");
  const badFormat = await postForm({
    file: new Blob([new Uint8Array(ONE_SECOND_WAV)], { type: "audio/wav" }),
    model: `${NS}-route`,
    response_format: "srt",
  });
  assertEqual(
    badFormat.status,
    400,
    "an unsupported response_format must be 400",
  );
  const badDictionary = await postForm({
    file: new Blob([new Uint8Array(ONE_SECOND_WAV)], { type: "audio/wav" }),
    model: `${NS}-route`,
    dictionary: "{ nope",
  });
  assertEqual(badDictionary.status, 400, "a malformed dictionary must be 400");
  const tooBig = await postForm({
    file: new Blob([new Uint8Array(ROUTE_LIMIT + 1)], { type: "audio/wav" }),
    model: `${NS}-route`,
  });
  assertEqual(tooBig.status, 413, "a file over maxAudioBytes must be 413");
  const err = (await tooBig.json()) as {
    error?: { type?: string; param?: string };
  };
  assertEqual(
    err.error?.type,
    "invalid_request_error",
    "errors must use OpenAI's error shape",
  );
  assertEqual(
    err.error?.param,
    "file",
    "a too-large error must name the file param",
  );
});

await test("POST /api/agent/transcribe: dictionary and correction ride through to the correction layer", async () => {
  const engine = stub(`${NS}-route-dict`, fixed("call jasper"));
  const res = await postJson({
    audio: ONE_SECOND_WAV.toString("base64"),
    provider: `${NS}-route-dict`,
    language: "auto",
    dictionary: [{ term: "Jaspr", heardAs: ["jasper"] }],
    correction: { rewrite: false },
  });
  assertEqual(res.status, 200, "a dictionary request must answer 200");
  const body = (await res.json()) as { data?: TranscribeResult };
  assertEqual(body.data?.raw, "call jasper", "raw must keep the engine text");
  assertEqual(body.data?.text, "call Jaspr", "the dictionary must be applied");
  assertEqual(body.data?.decisions?.length, 1, "decisions must be carried");
  assert(
    engine.calls[0]?.options.language === undefined,
    "auto must not reach the engine through the route",
  );
  assert(
    ((engine.calls[0]?.options.vocabulary ?? []) as string[]).includes("Jaspr"),
    "dictionary terms must reach the engine through the route",
  );
});

// ---------------------------------------------------------------------------
// Credential routing: which key an OpenAI-compatible endpoint receives. A local
// HTTP server stands in for the endpoint and records each request's
// Authorization header and path.
// ---------------------------------------------------------------------------

type SeenRequest = { path: string; authorization: string | undefined };

async function withRecordingServer<T>(
  fn: (baseUrl: string, seen: SeenRequest[]) => Promise<T>,
): Promise<T> {
  const seen: SeenRequest[] = [];
  const server: HttpServer = createHttpServer((req, res) => {
    seen.push({
      path: req.url ?? "",
      authorization: req.headers.authorization,
    });
    req.resume();
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ text: "local words", language: "en" }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`, seen);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function withEnv<T>(
  values: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, process.env[name]);
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  try {
    return await fn();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

await test("OPENAI_API_KEY goes only to api.openai.com: a custom whisper base URL takes OPENAI_STT_API_KEY or sends no key", async () => {
  await withRecordingServer(async (baseUrl, seen) => {
    await withEnv(
      { OPENAI_API_KEY: "sk-test-openai-credential-must-not-leak" },
      async () => {
        await nl.transcribe({
          audio: ONE_SECOND_WAV,
          provider: "whisper",
          credentials: { stt: { whisper: { baseURL: `${baseUrl}/v1` } } },
          correction: { rewrite: false },
        });
        assertEqual(seen.length, 1, "the custom base URL must be called once");
        assertEqual(
          seen[0]?.authorization,
          undefined,
          "OPENAI_API_KEY must not reach a custom base URL",
        );
      },
    );
    await withEnv(
      {
        OPENAI_API_KEY: "sk-test-openai-credential-must-not-leak",
        OPENAI_STT_API_KEY: "stt-dedicated-key",
      },
      async () => {
        await nl.transcribe({
          audio: ONE_SECOND_WAV,
          provider: "whisper",
          credentials: { stt: { whisper: { baseURL: `${baseUrl}/v1` } } },
          correction: { rewrite: false },
        });
        assertEqual(
          seen[1]?.authorization,
          "Bearer stt-dedicated-key",
          "the dedicated STT key must be the one sent to a custom base URL",
        );
      },
    );
  });
});

await test("a named endpoint sends its own key or none, and a per-call endpoint named like a shipped provider is ignored", async () => {
  await withRecordingServer(async (baseUrl, seen) => {
    await withEnv(
      {
        OPENAI_API_KEY: "sk-test-openai-credential-must-not-leak",
        OPENAI_STT_API_KEY: "stt-dedicated-key",
      },
      async () => {
        await nl.transcribe({
          audio: ONE_SECOND_WAV,
          provider: "local-asr",
          credentials: {
            stt: {
              endpoints: { "Local-ASR": { baseURL: `${baseUrl}/named/v1` } },
            },
          },
          correction: { rewrite: false },
        });
        assertEqual(seen.length, 1, "the named endpoint must be called once");
        assert(
          seen[0]?.path.startsWith("/named/v1/audio/transcriptions"),
          "a mixed-case endpoint name must resolve to its lower-cased key",
        );
        assertEqual(
          seen[0]?.authorization,
          undefined,
          "a named endpoint without a key must not borrow the whisper keys",
        );
        await nl.transcribe({
          audio: ONE_SECOND_WAV,
          provider: "local-asr",
          credentials: {
            stt: {
              endpoints: {
                "local-asr": {
                  baseURL: `${baseUrl}/named/v1`,
                  apiKey: "own-key",
                },
              },
            },
          },
          correction: { rewrite: false },
        });
        assertEqual(
          seen[1]?.authorization,
          "Bearer own-key",
          "a named endpoint's own key must be the one sent",
        );
        await nl.transcribe({
          audio: ONE_SECOND_WAV,
          provider: "whisper",
          credentials: {
            stt: {
              whisper: { baseURL: `${baseUrl}/slice/v1` },
              endpoints: { whisper: { baseURL: `${baseUrl}/collision/v1` } },
            },
          },
          correction: { rewrite: false },
        });
        assert(
          seen[2]?.path.startsWith("/slice/v1/audio/transcriptions"),
          "an endpoint named after a shipped provider must not replace it",
        );
      },
    );
  });
});

// ---------------------------------------------------------------------------
// The streaming WebSocket's gate, through the shipped `@juspay/neurolink/server`
// entry: an unlisted browser Origin is refused before the token is read, a
// listed one without the token is refused, and a non-browser client (no
// Origin) with the token is let in.
// ---------------------------------------------------------------------------

/** The upgrade's outcome: "open", or the HTTP status the server refused it with. */
function tryUpgrade(
  url: string,
  headers: Record<string, string>,
): Promise<"open" | number> {
  return new Promise((resolve, reject) => {
    const client = new WebSocket(url, { headers });
    const timer = setTimeout(() => {
      client.terminate();
      reject(new Error("the upgrade neither opened nor was refused in time"));
    }, 5_000);
    client.once("open", () => {
      clearTimeout(timer);
      client.close();
      resolve("open");
    });
    client.once("unexpected-response", (_req, res: IncomingMessage) => {
      clearTimeout(timer);
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    client.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

await test("WebSocket upgrade: an unlisted Origin is 403, a missing token 401, a listed Origin or no Origin with the token opens", async () => {
  const http: HttpServer = createHttpServer((_req, res) => {
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const { port } = http.address() as AddressInfo;
  const url = `ws://127.0.0.1:${port}/v1/audio/transcriptions/stream`;
  const attached = await attachTranscribeWebSocket(http, nl, {
    allowedOrigins: ["http://allowed.test"],
    authToken: "stream-secret",
  });
  try {
    assertEqual(
      await tryUpgrade(url, {
        Origin: "http://other.test",
        Authorization: "Bearer stream-secret",
      }),
      403,
      "an Origin off the allow-list must be refused even with the token",
    );
    assertEqual(
      await tryUpgrade(url, { Origin: "http://allowed.test" }),
      401,
      "a listed Origin without the token must be refused",
    );
    assertEqual(
      await tryUpgrade(url, {
        Origin: "http://Allowed.test",
        Authorization: "Bearer stream-secret",
      }),
      "open",
      "a listed Origin (compared case-insensitively) with the token must open",
    );
    assertEqual(
      await tryUpgrade(url, { Authorization: "Bearer stream-secret" }),
      "open",
      "a client that sends no Origin is not a browser and must open",
    );
  } finally {
    attached.close();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  }
});

await test("WebSocket upgrade: with no allow-list or a wildcard, any Origin opens", async () => {
  const http: HttpServer = createHttpServer((_req, res) => {
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  const { port } = http.address() as AddressInfo;
  const url = `ws://127.0.0.1:${port}/v1/audio/transcriptions/stream`;
  const wildcard = await attachTranscribeWebSocket(http, nl, {
    allowedOrigins: ["*"],
    path: "/wild",
  });
  const open = await attachTranscribeWebSocket(http, nl, { path: "/open" });
  try {
    assertEqual(
      await tryUpgrade(
        url.replace("/v1/audio/transcriptions/stream", "/wild"),
        {
          Origin: "http://anything.test",
        },
      ),
      "open",
      "a wildcard allow-list must admit any Origin",
    );
    assertEqual(
      await tryUpgrade(
        url.replace("/v1/audio/transcriptions/stream", "/open"),
        {
          Origin: "http://anything.test",
        },
      ),
      "open",
      "no allow-list must admit any Origin",
    );
  } finally {
    wildcard.close();
    open.close();
    await new Promise<void>((resolve) => http.close(() => resolve()));
  }
});

// ---------------------------------------------------------------------------
// Restore the process-wide STT registry to what it held before this suite.
// ---------------------------------------------------------------------------
STTProcessor.clearHandlers();
for (const [name, handler] of baselineHandlers) {
  if (handler) {
    STTProcessor.registerHandler(name, handler);
  }
}

await runSuite();

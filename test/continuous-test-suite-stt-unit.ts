#!/usr/bin/env tsx
/**
 * Continuous Test Suite: STTProcessor, driven through the public surface.
 *
 * Every test drives `new NeuroLink().generate()` (per CLAUDE.md rule 15). The
 * injection hook is real: `STTProcessor.registerHandler(<synthetic-name>,
 * stub)` used as *setup*, then passing that same synthetic name as
 * `stt.provider` in `generate()`'s options, routes the public call straight
 * into the stub — `runStandardGenerateRequest()` in neurolink.ts dispatches
 * into `STTProcessor.transcribe()` whenever `options.stt.enabled` and
 * `options.stt.audio` are set, *before* any LLM call is made. An earlier
 * revision of this file claimed "generate() has no options-surface hook to
 * inject a stub" — that claim was wrong; this rewrite removes it.
 *
 * `STTProcessor.registerHandler()` / `.clearHandlers()` appear only as setup
 * and teardown below. Every assertion inspects what `generate()` returned or
 * threw — never a direct `.supports()` / `.getHandler()` call.
 *
 * Two call shapes are exercised:
 *
 *   - Every validation/error path (AUDIO_EMPTY, AUDIO_TOO_LONG,
 *     INVALID_AUDIO_FORMAT, PROVIDER_NOT_SUPPORTED, PROVIDER_NOT_CONFIGURED,
 *     a wrapped handler failure) runs *before* the LLM call and, with no
 *     other prompt text supplied, generate() fails fast and rethrows the
 *     STTError with no network call at all — confirmed empirically: an
 *     unpatched `globalThis.fetch` throughout those tests.
 *   - Every *successful* dispatch is the opposite: neurolink.ts always
 *     injects the transcription into the prompt and falls through to a
 *     real generation call, so there is no way to observe a successful
 *     STT dispatch through generate() without a real or mocked LLM call
 *     completing. `withMockedOpenAI()` below (the fetch-interceptable
 *     idiom from continuous-test-suite-providers-mocked.ts, via
 *     `installMockFetch` from `./utils/mockFetch.js`) backs every
 *     success-path test; the dedicated happy-path test additionally
 *     asserts the transcribed text reached the captured request body.
 *
 * Coverage note (see PR description / task report for the full account):
 * `registerHandler("", handler)` throwing "Provider name is required", a
 * missing-handler throwing "Handler is required", and `supports("")`
 * returning false are validation contracts on the registration call itself
 * — `stt.provider: ""` does not route through `registerHandler`'s own
 * guard, it flows straight to `STTProcessor.transcribe()` as a literal (and
 * merely unregistered) provider name. There is no options-surface path that
 * exercises `registerHandler`'s empty-name/missing-handler guards, so those
 * three assertions are dropped rather than faked; see the task report.
 *
 * The ElevenLabs Scribe case at the end drives the exported `ElevenLabsSTT`
 * handler through `generate()` against one local `http.createServer` that
 * stands in for BOTH api.elevenlabs.io (`/v1/speech-to-text`, recording the
 * multipart fields) and api.openai.com (`/v1/chat/completions`, answering
 * "pong"). No fetch is mocked — `installMockFetch` cannot see a `FormData`
 * body, and the point of the case is the multipart contract on the wire — so
 * both hops are real HTTP to 127.0.0.1 and the whole call stays on the public
 * surface.
 *
 * Imports from ../dist per Rule 15 (tests drive the shipped surface).
 *
 * Run: npx tsx test/continuous-test-suite-stt-unit.ts
 *      (or: pnpm run test:stt:unit)
 */
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import {
  ElevenLabsSTT,
  isSTTResult,
  NeuroLink,
  STTProcessor,
  STTError,
  STT_ERROR_CODES,
} from "../dist/index.js";
import type {
  ElevenLabsSTTOptions,
  STTHandler,
  STTResult,
} from "../dist/index.js";
import * as http from "node:http";
import type { AddressInfo } from "node:net";

const { test, runSuite } = defineSuite("STTProcessor (via generate())", {
  offline: true,
});

// Every synthetic provider name used by this suite is prefixed so it can
// never collide with a real vendor handler (whisper, deepgram, ...) that
// ProviderRegistry.registerAllProviders() auto-registers when generate()
// runs.
const NS = "e2e-stt-suite";
const AUDIO = Buffer.from("fake-audio-bytes");

function makeStubHandler(overrides: Partial<STTHandler> = {}): {
  handler: STTHandler;
  calls: Array<{ audio: unknown; options: unknown }>;
} {
  const calls: Array<{ audio: unknown; options: unknown }> = [];
  const handler: STTHandler = {
    isConfigured: () => true,
    getSupportedFormats: () => ["mp3", "wav"],
    transcribe: async (audio, options): Promise<STTResult> => {
      calls.push({ audio, options });
      return {
        text: "stub transcription",
        confidence: 0.99,
      };
    },
    ...overrides,
  };
  return { handler, calls };
}

/** Runs generate() with a no-op prompt so STT preprocessing fails fast
 * (no fallback text means an STT error propagates straight out of
 * generate() instead of being swallowed and falling through to an LLM
 * call) and returns whatever it throws. Only valid for scenarios that are
 * expected to throw out of STT preprocessing — a successful transcription
 * always falls through to a real LLM call, which needs `withMockedOpenAI`
 * below instead. */
async function generateWithSTT(
  nl: NeuroLink,
  sttOptions: Record<string, unknown>,
): Promise<unknown> {
  try {
    const result = await nl.generate({
      input: { text: "" },
      stt: { enabled: true, audio: AUDIO, ...sttOptions },
    });
    return { ok: true, result };
  } catch (err) {
    return { ok: false, err };
  }
}

function openAIPongResponse(): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "pong" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

/**
 * A successful STT transcription always falls through to a real generation
 * call (neurolink.ts injects the transcription into the prompt and then
 * unconditionally calls generateTextInternal) — there is no way to observe
 * a successful dispatch through generate() without a real or mocked LLM
 * call completing. This wraps a block in a fake OpenAI key + a mocked
 * `api.openai.com/v1/chat/completions` route (the fetch-interceptable
 * idiom from continuous-test-suite-providers-mocked.ts) so dispatch-only
 * assertions don't depend on real credentials, burn API quota, or hang.
 */
async function withMockedOpenAI<T>(
  fn: (
    nl: NeuroLink,
    calls: ReturnType<typeof installMockFetch>["calls"],
  ) => Promise<T>,
): Promise<T> {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalBaseUrl = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "test-fake-openai-credential-for-stt-suite";
  delete process.env.OPENAI_BASE_URL;

  const { unset, calls } = installMockFetch([
    {
      method: "POST",
      url: "api.openai.com/v1/chat/completions",
      respond: { status: 200, json: openAIPongResponse() },
    },
  ]);

  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    return await fn(nl, calls);
  } finally {
    unset();
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
    if (originalBaseUrl === undefined) {
      delete process.env.OPENAI_BASE_URL;
    } else {
      process.env.OPENAI_BASE_URL = originalBaseUrl;
    }
  }
}

/** Dispatches STT through generate() against the mocked OpenAI provider —
 * for scenarios expected to succeed. */
async function dispatchViaGenerate(
  nl: NeuroLink,
  sttOptions: Record<string, unknown>,
): Promise<unknown> {
  try {
    const result = await nl.generate({
      provider: "openai",
      model: "gpt-4o-mini",
      input: { text: "" },
      stt: { enabled: true, audio: AUDIO, ...sttOptions },
      disableTools: true,
    });
    return { ok: true, result };
  } catch (err) {
    return { ok: false, err };
  }
}

// ---------------------------------------------------------------------------
// Dispatch — a registered handler is reachable through generate()
// ---------------------------------------------------------------------------

await test("a registered handler is dispatched by generate()'s STT preprocessing, and its text reaches the result", async () => {
  const provider = `${NS}-dispatch`;
  const { handler, calls } = makeStubHandler();
  STTProcessor.registerHandler(provider, handler);

  await withMockedOpenAI(async (nl) => {
    const outcome = (await dispatchViaGenerate(nl, { provider })) as {
      ok: boolean;
      result?: { transcription?: STTResult };
    };

    assert(outcome.ok, "generate() resolved rather than throwing");
    assertEqual(calls.length, 1, "the stub handler was invoked exactly once");
    assertEqual(
      outcome.result?.transcription?.text,
      "stub transcription",
      "generate()'s result carries the handler's transcription text",
    );
  });
});

await test("provider names are normalized to lowercase for dispatch", async () => {
  const provider = `${NS}-Mixed-Case`;
  const { handler, calls } = makeStubHandler();
  STTProcessor.registerHandler(provider, handler);

  await withMockedOpenAI(async (nl) => {
    const lower = (await dispatchViaGenerate(nl, {
      provider: provider.toLowerCase(),
    })) as { ok: boolean };
    const upper = (await dispatchViaGenerate(nl, {
      provider: provider.toUpperCase(),
    })) as { ok: boolean };

    assert(lower.ok, "lowercase provider name dispatches");
    assert(
      upper.ok,
      "uppercase provider name also dispatches (case-insensitive lookup)",
    );
    assertEqual(calls.length, 2, "both calls reached the same handler");
  });
});

await test("re-registering a provider replaces the previous handler for future dispatch", async () => {
  const provider = `${NS}-overwrite`;
  const firstCalls: unknown[] = [];
  const secondCalls: unknown[] = [];
  const first: STTHandler = {
    isConfigured: () => true,
    getSupportedFormats: () => ["mp3", "wav"],
    transcribe: async () => {
      firstCalls.push(1);
      return { text: "first-handler-text", confidence: 0.5 };
    },
  };
  const second: STTHandler = {
    isConfigured: () => true,
    getSupportedFormats: () => ["mp3", "wav"],
    transcribe: async () => {
      secondCalls.push(1);
      return { text: "second-handler-text", confidence: 0.5 };
    },
  };

  STTProcessor.registerHandler(provider, first);
  STTProcessor.registerHandler(provider, second);

  await withMockedOpenAI(async (nl) => {
    const outcome = (await dispatchViaGenerate(nl, { provider })) as {
      ok: boolean;
      result?: { transcription?: STTResult };
    };

    assert(outcome.ok, "generate() resolved");
    assertEqual(
      outcome.result?.transcription?.text,
      "second-handler-text",
      "the later registration's handler produced the transcription",
    );
    assertEqual(firstCalls.length, 0, "the replaced handler was never invoked");
    assertEqual(
      secondCalls.length,
      1,
      "the current handler was invoked exactly once",
    );
  });
});

// ---------------------------------------------------------------------------
// Validation / error paths — all fail-fast, before any LLM/network call
// ---------------------------------------------------------------------------

await test("an unsupported provider raises a typed error naming the provider and listing what IS registered — no network call", async () => {
  // Register one real provider first so availableProviders has something to
  // list, then ask for one that was never registered.
  const known = `${NS}-known-for-listing`;
  const unknown = `${NS}-never-registered`;
  STTProcessor.registerHandler(known, makeStubHandler().handler);

  const { unset, calls } = installMockFetch([]);
  let outcome: { ok: boolean; err?: unknown };
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    outcome = (await generateWithSTT(nl, { provider: unknown })) as {
      ok: boolean;
      err?: unknown;
    };
  } finally {
    unset();
  }

  assert(!outcome.ok, "generate() rejected rather than resolving");
  const err = outcome.err;
  assert(err instanceof STTError, "the rejection is a typed STTError");
  assertEqual(
    (err as STTError).code,
    STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "code is STT_PROVIDER_NOT_SUPPORTED",
  );
  assertIncludes(
    (err as Error).message,
    unknown,
    "the error names the provider that was asked for",
  );
  const available = (err as STTError).context?.availableProviders;
  assert(
    Array.isArray(available) && available.includes(known),
    "availableProviders context lists an already-registered provider",
  );
  assertEqual(calls.length, 0, "no network call was made");
});

await test("an empty audio buffer is rejected before any handler runs — no network call", async () => {
  const provider = `${NS}-empty-audio`;
  const { handler, calls: handlerCalls } = makeStubHandler();
  STTProcessor.registerHandler(provider, handler);

  const { unset, calls: fetchCalls } = installMockFetch([]);
  let outcome: { ok: boolean; err?: unknown };
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    try {
      const result = await nl.generate({
        input: { text: "" },
        stt: { enabled: true, audio: Buffer.alloc(0), provider },
      });
      outcome = { ok: true, err: undefined };
      void result;
    } catch (err) {
      outcome = { ok: false, err };
    }
  } finally {
    unset();
  }

  assert(!outcome.ok, "generate() rejected rather than resolving");
  assert(outcome.err instanceof STTError, "rejection is a typed STTError");
  assertEqual(
    (outcome.err as STTError).code,
    STT_ERROR_CODES.AUDIO_EMPTY,
    "code is STT_AUDIO_EMPTY",
  );
  assertEqual(handlerCalls.length, 0, "the handler was never invoked");
  assertEqual(fetchCalls.length, 0, "no network call was made");
});

await test("an oversized audio buffer is rejected before any handler runs — no network call", async () => {
  const provider = `${NS}-oversized`;
  const { handler, calls: handlerCalls } = makeStubHandler();
  STTProcessor.registerHandler(provider, handler);

  const { unset, calls: fetchCalls } = installMockFetch([]);
  let outcome: { ok: boolean; err?: unknown };
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    outcome = (await generateWithSTT(nl, {
      provider,
      maxAudioBytes: 1,
    })) as { ok: boolean; err?: unknown };
  } finally {
    unset();
  }

  assert(!outcome.ok, "generate() rejected rather than resolving");
  assert(outcome.err instanceof STTError, "rejection is a typed STTError");
  assertEqual(
    (outcome.err as STTError).code,
    STT_ERROR_CODES.AUDIO_TOO_LONG,
    "code is STT_AUDIO_TOO_LONG",
  );
  assertEqual(handlerCalls.length, 0, "the handler was never invoked");
  assertEqual(fetchCalls.length, 0, "no network call was made");
});

await test("a requested audio format the handler does not support is rejected — no network call", async () => {
  const provider = `${NS}-format-mismatch`;
  const { handler, calls: handlerCalls } = makeStubHandler({
    getSupportedFormats: () => ["wav"],
  });
  STTProcessor.registerHandler(provider, handler);

  const { unset, calls: fetchCalls } = installMockFetch([]);
  let outcome: { ok: boolean; err?: unknown };
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    outcome = (await generateWithSTT(nl, {
      provider,
      format: "mp3",
    })) as { ok: boolean; err?: unknown };
  } finally {
    unset();
  }

  assert(!outcome.ok, "generate() rejected rather than resolving");
  assert(outcome.err instanceof STTError, "rejection is a typed STTError");
  assertEqual(
    (outcome.err as STTError).code,
    STT_ERROR_CODES.INVALID_AUDIO_FORMAT,
    "code is STT_INVALID_AUDIO_FORMAT",
  );
  assertEqual(handlerCalls.length, 0, "the handler was never invoked");
  assertEqual(fetchCalls.length, 0, "no network call was made");
});

await test("an unconfigured provider is rejected before transcription — no network call", async () => {
  const provider = `${NS}-not-configured`;
  const { handler, calls: handlerCalls } = makeStubHandler({
    isConfigured: () => false,
  });
  STTProcessor.registerHandler(provider, handler);

  const { unset, calls: fetchCalls } = installMockFetch([]);
  let outcome: { ok: boolean; err?: unknown };
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    outcome = (await generateWithSTT(nl, { provider })) as {
      ok: boolean;
      err?: unknown;
    };
  } finally {
    unset();
  }

  assert(!outcome.ok, "generate() rejected rather than resolving");
  assert(outcome.err instanceof STTError, "rejection is a typed STTError");
  assertEqual(
    (outcome.err as STTError).code,
    STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    "code is STT_PROVIDER_NOT_CONFIGURED",
  );
  assertEqual(handlerCalls.length, 0, "the handler was never invoked");
  assertEqual(fetchCalls.length, 0, "no network call was made");
});

await test("a handler failure surfaces as a typed STTError with the underlying reason preserved — no network call", async () => {
  const provider = `${NS}-failing-handler`;
  const { handler } = makeStubHandler({
    transcribe: async () => {
      throw new Error("deliberate-test-handler-failure");
    },
  });
  STTProcessor.registerHandler(provider, handler);

  const { unset, calls: fetchCalls } = installMockFetch([]);
  let outcome: { ok: boolean; err?: unknown };
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    outcome = (await generateWithSTT(nl, { provider })) as {
      ok: boolean;
      err?: unknown;
    };
  } finally {
    unset();
  }

  assert(!outcome.ok, "generate() rejected rather than resolving");
  assert(
    outcome.err instanceof STTError,
    "a raw handler error is wrapped in a typed STTError rather than leaked",
  );
  assertIncludes(
    (outcome.err as Error).message,
    "deliberate-test-handler-failure",
    "the underlying reason is preserved in the wrapped error",
  );
  assertEqual(fetchCalls.length, 0, "no network call was made");
});

// ---------------------------------------------------------------------------
// Happy path — transcription is injected into the prompt and generation
// proceeds, so this one genuinely needs a mocked LLM call.
// ---------------------------------------------------------------------------

await test("on success, the transcription is prepended to the prompt that reaches the LLM request", async () => {
  const provider = `${NS}-happy-path`;
  const transcriptionText = "the transcribed audio says hello";
  STTProcessor.registerHandler(
    provider,
    makeStubHandler({
      transcribe: async () => ({
        text: transcriptionText,
        confidence: 0.97,
      }),
    }).handler,
  );

  await withMockedOpenAI(async (nl, calls) => {
    const outcome = (await dispatchViaGenerate(nl, { provider })) as {
      ok: boolean;
      result?: { transcription?: STTResult; content?: string };
    };

    assert(outcome.ok, "generate() resolved");
    assertEqual(
      outcome.result?.transcription?.text,
      transcriptionText,
      "generate()'s result carries the transcription",
    );
    assertEqual(calls.length, 1, "exactly one LLM request was sent");
    const body = calls[0].bodyJson as { messages: unknown[] };
    const bodyText = JSON.stringify(body.messages);
    assertIncludes(
      bodyText,
      transcriptionText,
      "the transcribed text reached the captured request body",
    );
    assertIncludes(
      (outcome.result?.content ?? "").toLowerCase(),
      "pong",
      "generation proceeded using the transcription-augmented prompt",
    );
  });
});

// ---------------------------------------------------------------------------
// clearHandlers() — wipes the process-wide registry; dispatch through
// generate() fails until every pre-existing registration is restored.
// ---------------------------------------------------------------------------

await test("clearHandlers() wipes every registered STT handler, and restoring a snapshot brings back only what it captured", async () => {
  // clearHandlers() wipes the whole process-wide static registry, not just
  // whatever this test registers itself — including `${NS}-dispatch`,
  // registered by the very first test in this file and never cleared
  // since. Snapshot the full pre-clear state (setup, not an assertion) so
  // it can be restored afterward, and use that pre-existing provider (not
  // one freshly registered inside this test) to prove the wipe reaches
  // registrations from *before* this test ran.
  const preExistingProvider = `${NS}-dispatch`;
  const preClearProviders = STTProcessor.listProviders();
  const snapshot = preClearProviders.map(
    (name) => [name, STTProcessor.getHandler(name)!] as const,
  );

  // Registered AFTER the snapshot — deliberately excluded from `snapshot`,
  // so it proves the restore step below replays exactly what it captured
  // rather than everything that has ever been registered.
  const scratchProvider = `${NS}-clear-roundtrip`;
  STTProcessor.registerHandler(scratchProvider, makeStubHandler().handler);

  STTProcessor.clearHandlers();

  const duringClear = (await generateWithSTT(
    new NeuroLink({
      conversationMemory: { enabled: false },
    }),
    { provider: preExistingProvider },
  )) as {
    ok: boolean;
    err?: unknown;
  };
  assert(
    !duringClear.ok,
    "dispatch for a pre-existing (not just this test's own) provider fails once the registry has been wiped",
  );
  assert(
    duringClear.err instanceof STTError &&
      duringClear.err.code === STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "the failure is PROVIDER_NOT_SUPPORTED, proving the registration was removed",
  );

  for (const [name, handler] of snapshot) {
    STTProcessor.registerHandler(name, handler);
  }

  await withMockedOpenAI(async (nl) => {
    const afterRestore = (await dispatchViaGenerate(nl, {
      provider: preExistingProvider,
    })) as { ok: boolean };
    assert(
      afterRestore.ok,
      "dispatch succeeds again once the pre-clear registrations are restored",
    );
  });

  const scratchStillGone = (await generateWithSTT(
    new NeuroLink({
      conversationMemory: { enabled: false },
    }),
    { provider: scratchProvider },
  )) as { ok: boolean; err?: unknown };
  assert(
    !scratchStillGone.ok &&
      scratchStillGone.err instanceof STTError &&
      scratchStillGone.err.code === STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "a provider registered after the snapshot stays unregistered — restore replays exactly what it captured, not everything ever registered",
  );
});

// ---------------------------------------------------------------------------
// ElevenLabs Scribe — multipart contract and response mapping, no key
// ---------------------------------------------------------------------------

type RecordedScribeRequest = {
  url: string;
  headers: http.IncomingHttpHeaders;
  fields: Record<string, string>;
  file?: { filename: string; bytes: number; contentType: string };
};

/** Minimal multipart/form-data parser for the stub — enough to read the fields Scribe receives. */
function parseMultipart(
  raw: Buffer,
  contentType: string,
): Pick<RecordedScribeRequest, "fields" | "file"> {
  const boundary = contentType.split("boundary=")[1];
  const fields: Record<string, string> = {};
  let file: RecordedScribeRequest["file"];
  if (!boundary) {
    return { fields, file };
  }
  const parts = raw.toString("latin1").split(`--${boundary}`).slice(1, -1);
  for (const part of parts) {
    const headerEnd = part.indexOf("\r\n\r\n");
    const header = part.slice(0, headerEnd);
    const value = part.slice(headerEnd + 4, part.lastIndexOf("\r\n"));
    const name = /name="([^"]+)"/.exec(header)?.[1];
    if (!name) {
      continue;
    }
    const filename = /filename="([^"]+)"/.exec(header)?.[1];
    if (filename) {
      file = {
        filename,
        bytes: value.length,
        contentType: /Content-Type:\s*([^\r\n]+)/i.exec(header)?.[1] ?? "",
      };
    } else {
      fields[name] = value;
    }
  }
  return { fields, file };
}

const SCRIBE_STUB_RESPONSE = {
  language_code: "eng",
  language_probability: 0.98,
  text: "hello there friend",
  words: [
    {
      text: "hello",
      start: 0.0,
      end: 0.4,
      type: "word",
      speaker_id: "speaker_0",
      logprob: 0,
    },
    // Spacing and audio events carry logprobs too; neither may count.
    { text: " ", start: 0.4, end: 0.5, type: "spacing", logprob: -9 },
    {
      text: "there",
      start: 0.5,
      end: 0.9,
      type: "word",
      speaker_id: "speaker_0",
      logprob: Math.log(0.5),
    },
    {
      text: "(laughter)",
      start: 0.9,
      end: 1.2,
      type: "audio_event",
      logprob: -9,
    },
    {
      text: "friend",
      start: 1.2,
      end: 1.6,
      type: "word",
      speaker_id: "speaker_1",
      logprob: Math.log(0.25),
    },
  ],
};
/** Mean exp(logprob) over the three spoken words: (1 + 0.5 + 0.25) / 3. */
const SCRIBE_STUB_CONFIDENCE = (1 + 0.5 + 0.25) / 3;

type ScribeGenerateOptions = ElevenLabsSTTOptions & {
  audio: Buffer;
  provider: string;
};

/** Identity helper so Scribe-specific fields pass the excess-property check on `stt`. */
function scribe(options: ScribeGenerateOptions): ScribeGenerateOptions {
  return options;
}

async function withScribeAndChatStub<T>(
  fn: (ctx: {
    baseUrl: string;
    scribeRequests: RecordedScribeRequest[];
    chatPrompts: string[];
  }) => Promise<T>,
): Promise<T> {
  const scribeRequests: RecordedScribeRequest[] = [];
  const chatPrompts: string[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      if ((req.url ?? "").endsWith("/speech-to-text")) {
        scribeRequests.push({
          url: req.url ?? "",
          headers: req.headers,
          ...parseMultipart(raw, req.headers["content-type"] ?? ""),
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(SCRIBE_STUB_RESPONSE));
        return;
      }
      const body = JSON.parse(raw.toString("utf8")) as {
        messages?: Array<{ content?: unknown }>;
      };
      const last = body.messages?.at(-1)?.content;
      chatPrompts.push(typeof last === "string" ? last : JSON.stringify(last));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(openAIPongResponse()));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn({
      baseUrl: `http://127.0.0.1:${port}/v1`,
      scribeRequests,
      chatPrompts,
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

await test("ElevenLabs Scribe: the multipart request carries model_id, tag_audio_events=false and no language_code unless set; the response maps to text, words and speakers", async () => {
  const provider = `${NS}-elevenlabs-scribe`;
  const handler = new ElevenLabsSTT("stub-credential");
  assert(
    handler.isConfigured(),
    "a constructor-supplied credential configures the handler",
  );
  assertEqual(handler.supportsStreaming, false, "Scribe is batch-only");
  STTProcessor.registerHandler(provider, handler);

  await withScribeAndChatStub(
    async ({ baseUrl, scribeRequests, chatPrompts }) => {
      const nl = new NeuroLink({ conversationMemory: { enabled: false } });
      const common = {
        provider: "openai",
        model: "gpt-4o-mini",
        credentials: {
          openai: { apiKey: "offline-test-key", baseURL: baseUrl },
        },
        input: { text: "" },
        disableTools: true,
      } as const;

      const result = await nl.generate({
        ...common,
        stt: scribe({
          enabled: true,
          audio: Buffer.from("RIFF-fake-wav-bytes"),
          provider,
          baseUrl,
          format: "wav",
          speakerDiarization: true,
          speakerCount: 2,
        }),
      });

      assertEqual(
        scribeRequests.length,
        1,
        "one transcription request reached the stub",
      );
      const request = scribeRequests[0];
      assert(request !== undefined, "the request was recorded");
      assertEqual(
        request?.url,
        "/v1/speech-to-text",
        "the Scribe endpoint is /v1/speech-to-text",
      );
      assertEqual(
        request?.headers["xi-api-key"],
        "stub-credential",
        "the constructor credential is the value of the ElevenLabs auth header",
      );
      assertEqual(
        request?.fields.model_id,
        "scribe_v2",
        "model_id defaults to scribe_v2, the current Scribe model",
      );
      assertEqual(
        request?.fields.tag_audio_events,
        "false",
        "tag_audio_events defaults to false",
      );
      assertEqual(
        request?.fields.language_code,
        undefined,
        "no language_code is sent when the caller set none",
      );
      assertEqual(
        request?.fields.diarize,
        "true",
        "speakerDiarization maps to diarize",
      );
      assertEqual(
        request?.fields.num_speakers,
        "2",
        "speakerCount maps to num_speakers",
      );
      assertEqual(
        request?.file?.filename,
        "audio.wav",
        "the audio part is named after its format",
      );
      assertEqual(
        request?.file?.bytes,
        "RIFF-fake-wav-bytes".length,
        "the whole buffer is uploaded",
      );

      assertEqual(
        result.transcription?.text,
        "hello there friend",
        "the transcript text is mapped",
      );
      assertEqual(
        result.transcription?.language,
        "eng",
        "the detected language is mapped",
      );
      assert(
        Math.abs(
          (result.transcription?.confidence ?? Number.NaN) -
            SCRIBE_STUB_CONFIDENCE,
        ) < 1e-9,
        "confidence is the mean per-word exp(logprob) over spoken words only",
      );
      assertEqual(
        result.transcription?.metadata?.confidenceSource,
        "word_logprobs",
        "metadata says the confidence came from per-word logprobs",
      );
      assertEqual(
        result.transcription?.metadata?.languageProbability,
        0.98,
        "language_probability is exposed as metadata under its own name",
      );
      assertEqual(
        result.transcription?.duration,
        1.6,
        "duration is the last word's end",
      );
      assertEqual(
        result.transcription?.words?.map((w) => w.word).join(" "),
        "hello there friend",
        "spacing and audio_event entries are excluded from word timings",
      );
      assertEqual(
        result.transcription?.words?.[1]?.startTime,
        0.5,
        "word start times are mapped",
      );
      assertEqual(
        result.transcription?.words?.[1]?.endTime,
        0.9,
        "word end times are mapped",
      );
      assertEqual(
        result.transcription?.words?.[2]?.speaker,
        "speaker_1",
        "speaker_id is carried per word",
      );
      assertEqual(
        result.transcription?.speakers?.join(","),
        "speaker_0,speaker_1",
        "distinct speakers are listed",
      );
      assertEqual(
        result.transcription?.metadata?.provider,
        provider,
        "metadata names the registered provider (STTProcessor stamps the lookup name)",
      );
      assertEqual(
        result.transcription?.metadata?.model,
        "scribe_v2",
        "metadata names the Scribe model",
      );
      assertEqual(
        chatPrompts.length,
        1,
        "the transcript then reached the model",
      );
      assert(
        (chatPrompts[0] ?? "").includes("hello there friend"),
        "the transcript is what the model was asked about",
      );

      await nl.generate({
        ...common,
        stt: scribe({
          enabled: true,
          audio: Buffer.from("RIFF-fake-wav-bytes"),
          provider,
          baseUrl,
          language: "en-US",
          tagAudioEvents: true,
          model: "scribe_v1_experimental",
        }),
      });
      const second = scribeRequests[1];
      assertEqual(
        second?.fields.language_code,
        "en",
        "a BCP-47 language is reduced to the ISO code Scribe takes",
      );
      assertEqual(
        second?.fields.tag_audio_events,
        "true",
        "tagAudioEvents: true is forwarded",
      );
      assertEqual(
        second?.fields.model_id,
        "scribe_v1_experimental",
        "the model option is forwarded",
      );
      assertEqual(
        second?.fields.diarize,
        "false",
        "diarize is false when not requested",
      );
      assertEqual(
        second?.fields.num_speakers,
        undefined,
        "num_speakers is omitted without diarization",
      );
    },
  );
});

/**
 * A Scribe stand-in that answers each request per `plan`: `"stall"` sends the
 * status line and half a JSON body, then holds the socket open; `"noprob"`
 * returns a transcript whose words carry no `logprob`; `"bare"` returns text
 * alone — no words, no language probability.
 */
async function withScribeBodyStub<T>(
  plan: Array<"stall" | "noprob" | "bare">,
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const open = new Set<http.ServerResponse>();
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      const step = plan.shift() ?? "noprob";
      res.writeHead(200, { "Content-Type": "application/json" });
      if (step === "stall") {
        open.add(res);
        res.write(
          '{"language_code":"eng","language_probability":0.99,"text":"hel',
        );
        return;
      }
      if (step === "bare") {
        res.end(JSON.stringify({ text: "nothing but text" }));
        return;
      }
      res.end(
        JSON.stringify({
          language_code: "eng",
          language_probability: 0.99,
          text: "no probabilities here",
          words: [
            { text: "no", type: "word", start: 0, end: 0.2 },
            { text: " ", type: "spacing", start: 0.2, end: 0.3 },
            { text: "probabilities", type: "word", start: 0.3, end: 0.9 },
            { text: " ", type: "spacing", start: 0.9, end: 1.0 },
            { text: "here", type: "word", start: 1.0, end: 1.3 },
          ],
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}/v1`);
  } finally {
    for (const res of open) {
      res.destroy();
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

await test("ElevenLabs Scribe: timeoutMs bounds the body read, not just the headers; confidence falls back to language_probability, then 0, and says which", async () => {
  const handler = new ElevenLabsSTT("stub-credential");
  await withScribeBodyStub(["stall", "noprob", "bare"], async (baseUrl) => {
    const started = Date.now();
    let failure: unknown;
    try {
      await handler.transcribe(AUDIO, {
        baseUrl,
        format: "wav",
        timeoutMs: 300,
      } as ElevenLabsSTTOptions);
    } catch (err) {
      failure = err;
    }
    const elapsed = Date.now() - started;
    assert(
      failure instanceof STTError,
      "a body that stalls surfaces as an STTError",
    );
    assert(
      elapsed < 5_000,
      `the stalled body was abandoned at the per-request timeout (took ${elapsed}ms)`,
    );
    assertIncludes(
      failure instanceof Error ? failure.message : "",
      "timed out after 300ms",
      "the failure names the per-request timeout",
    );

    const result = await handler.transcribe(AUDIO, {
      baseUrl,
      format: "wav",
    } as ElevenLabsSTTOptions);
    assertEqual(
      result.text,
      "no probabilities here",
      "the second, complete response is transcribed",
    );
    // `confidence` is required on STTResult (a strict-TS consumer reads it
    // without a guard), so with no per-word logprob it is the language
    // probability — and metadata says so, rather than passing one number
    // off as the other silently.
    assertEqual(
      result.confidence,
      0.99,
      "with no per-word logprob, confidence falls back to language_probability",
    );
    assertEqual(
      result.metadata?.confidenceSource,
      "language_probability",
      "metadata names language_probability as the source",
    );
    assertEqual(
      result.metadata?.languageProbability,
      0.99,
      "the language-detection probability still reaches metadata under its own name",
    );
    assertEqual(
      result.words?.length,
      3,
      "word timings are still mapped without logprobs",
    );

    const bare = await handler.transcribe(AUDIO, {
      baseUrl,
      format: "wav",
    } as ElevenLabsSTTOptions);
    assertEqual(
      bare.text,
      "nothing but text",
      "the bare response is transcribed",
    );
    assertEqual(
      bare.confidence,
      0,
      "with neither logprobs nor a language probability, confidence is 0",
    );
    assertEqual(
      bare.metadata?.confidenceSource,
      "none",
      "metadata says no transcript-level signal was reported",
    );
    assertEqual(
      isSTTResult(bare),
      true,
      "a zero confidence still satisfies the STTResult guard",
    );
  });
});

await test("ElevenLabs Scribe: the catalog registers elevenlabs-stt with scribe and elevenlabs as STT aliases", async () => {
  // Registration is gated on the credential; supply one for the duration so
  // the catalog wiring (names + aliases) can be observed without a real key.
  const original = process.env.ELEVENLABS_API_KEY;
  process.env.ELEVENLABS_API_KEY = "stub-credential-for-registration";
  const snapshot = STTProcessor.listProviders().map(
    (name) => [name, STTProcessor.getHandler(name)] as const,
  );
  try {
    const { registerDefaultSTTHandlers } = await import("../dist/index.js");
    registerDefaultSTTHandlers();
    for (const name of ["elevenlabs-stt", "scribe", "elevenlabs"]) {
      assert(STTProcessor.supports(name), `STTProcessor resolves "${name}"`);
    }
    assertEqual(
      STTProcessor.getHandler("scribe"),
      STTProcessor.getHandler("elevenlabs-stt"),
      "aliases share the primary's handler instance",
    );
    assert(
      STTProcessor.getHandler("elevenlabs") instanceof ElevenLabsSTT,
      'the STT registry\'s "elevenlabs" is the Scribe handler, not the TTS one',
    );
  } finally {
    if (original === undefined) {
      delete process.env.ELEVENLABS_API_KEY;
    } else {
      process.env.ELEVENLABS_API_KEY = original;
    }
    // Leave the registry as this test found it.
    STTProcessor.clearHandlers();
    for (const [name, handler] of snapshot) {
      if (handler) {
        STTProcessor.registerHandler(name, handler);
      }
    }
  }
});

await runSuite();

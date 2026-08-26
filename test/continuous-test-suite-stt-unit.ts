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
  NeuroLink,
  STTProcessor,
  STTError,
  STT_ERROR_CODES,
} from "../dist/index.js";
import type { STTHandler, STTResult } from "../dist/index.js";

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
    "the failure is PROVIDER_NOT_SUPPORTED, proving the registration is gone",
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
    "a provider registered after the snapshot stays gone — restore replays exactly what it captured, not everything ever registered",
  );
});

await runSuite();

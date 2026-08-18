#!/usr/bin/env tsx
/**
 * Continuous Test Suite: TTSProcessor (public surface).
 *
 * Rule-15 rewrite. The previous version of this file called
 * `TTSProcessor.registerHandler()` / `.synthesize()` / `.supports()` /
 * `.getHandler()` / `.clearHandlers()` directly and asserted on their return
 * values — that is a unit test of an internal static class, not a test of
 * anything NeuroLink ships to a caller. Its own header claimed "stream() has
 * no options-surface hook to inject a stub" — that claim is wrong: `stream()`
 * accepts `tts.provider`, and a synthetic provider registered via
 * `TTSProcessor.registerHandler()` as *setup* is resolved through that same
 * option, so a stub handler can be driven end-to-end through the public
 * `NeuroLink#stream()` call. This file now does that.
 *
 * Public dispatch path exercised (src/lib/neurolink.ts,
 * `synthesizeStreamModeTwo`, called from `runStandardStreamRequest`):
 *   stream({ tts: { enabled: true, useAiResponse: true, provider } })
 *   -> gate: tts.enabled && tts.useAiResponse && accumulatedContent non-empty
 *   -> candidate = tts.provider ?? fallbackProvider ?? providerName
 *   -> TTSProcessor.supports(candidate) must be true, else no synthesis is
 *      attempted at all
 *   -> TTSProcessor.synthesize(accumulatedContent, candidate, tts) is called
 *   -> on success: one `{ type: "tts_audio", audio: TTSChunk }` chunk is
 *      yielded on the stream, and `streamResult.audio` resolves to the
 *      TTSResult
 *   -> on ANY failure (validation or handler throw): the error is caught
 *      inside `synthesizeStreamModeTwo` itself, logged via `logger.warn`,
 *      and swallowed — no `tts_audio` chunk is yielded, `streamResult.audio`
 *      resolves to `undefined`, and the text stream completes normally.
 *
 * Because an LLM response is required to reach TTS Mode 2 (`useAiResponse`
 * needs accumulated text), this suite points `provider: "openai-compatible"`
 * at a local HTTP server that streams a fixed SSE response — the same idiom
 * `test/continuous-test-suite-openai-compat-streaming-retry.ts` uses. No
 * external API keys or network calls are needed.
 *
 * registerHandler()/clearHandlers() appear ONLY as setup/teardown here (per
 * rule 15's guidance) — every assertion is about what `stream()` returned or
 * yielded, via a per-test synthetic provider name so nothing real is
 * disturbed, and the whole registry is snapshotted/restored around the run.
 *
 * ---------------------------------------------------------------------
 * Coverage dropped relative to the old unit suite (reported, not hidden):
 *
 * 1. registerHandler()'s own argument validation ("Provider name is
 *    required" / "Handler is required") — these guard the setup API
 *    itself; there is no public generate()/stream() call that can reach
 *    them, since only test *setup* calls registerHandler().
 * 2. supports()/getHandler() as directly-observed query methods — now only
 *    exercised indirectly, via the pass/fail shape of a stream() call.
 * 3. The specific TTSError CODE and message/context (EMPTY_TEXT,
 *    PROVIDER_NOT_SUPPORTED + availableProviders, TEXT_TOO_LONG,
 *    PROVIDER_NOT_CONFIGURED, SYNTHESIS_FAILED) are indistinguishable from
 *    the public surface: `synthesizeStreamModeTwo` catches every one of
 *    them identically and turns them all into the same observable outcome
 *    ("no tts_audio chunk; streamResult.audio resolves to undefined").
 *    This suite still reproduces each *trigger condition* (short
 *    maxTextLength, isConfigured:false, a throwing handler, an unresolved
 *    provider) and asserts the resulting graceful-degradation behavior,
 *    but cannot assert which TTSError code or message fired.
 * 4. EMPTY_TEXT specifically is structurally unreachable through stream():
 *    `synthesizeStreamModeTwo` already gates on non-empty accumulated
 *    content before ever calling `TTSProcessor.synthesize`.
 * 5. PROVIDER_NOT_SUPPORTED's `availableProviders` context is also
 *    unreachable at the synthesize() level from this call site:
 *    `synthesizeStreamModeTwo` only calls `TTSProcessor.synthesize` after
 *    `TTSProcessor.supports(candidate)` has already returned true.
 * 6. `TTSHandler.getVoices()` — no code path in NeuroLink's generate()/
 *    stream() ever calls a handler's `getVoices()`; it is reachable only by
 *    a consumer holding a handler reference directly (e.g. a client-side
 *    React hook, outside the SDK's own dispatch). Not exercised here.
 * 7. `clearHandlers()` wiping every registration is no longer asserted as a
 *    behavior in its own right — per rule 15 it may only be setup/teardown
 *    now, so it is used solely to restore the registry, not as a test
 *    subject.
 *
 * Run: npx tsx test/continuous-test-suite-tts-unit.ts
 *      pnpm run test:tts:unit
 */
import { createServer, type Server } from "node:http";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { TTSProcessor } from "../dist/index.js";
import type { NeuroLink, TTSHandler, TTSResult } from "../dist/index.js";

const { test, runSuite } = defineSuite("TTSProcessor (public surface)");

// ---------------------------------------------------------------------------
// Registry hygiene (rule 4): snapshot every handler registered before this
// suite runs (real vendor auto-registrations included) and restore exactly
// that set afterward, rather than `clearHandlers()`ing the process-wide
// static registry and leaving only this suite's own stub behind.
// ---------------------------------------------------------------------------

function snapshotTTSRegistry(): Array<readonly [string, TTSHandler]> {
  return TTSProcessor.listProviders().map(
    (name) => [name, TTSProcessor.getHandler(name)!] as const,
  );
}

function restoreTTSRegistry(snapshot: Array<readonly [string, TTSHandler]>) {
  TTSProcessor.clearHandlers();
  for (const [name, handler] of snapshot) {
    TTSProcessor.registerHandler(name, handler);
  }
}

// ---------------------------------------------------------------------------
// Local SSE fixture server (openai-compatible streaming), same idiom as
// continuous-test-suite-openai-compat-streaming-retry.ts.
// ---------------------------------------------------------------------------

function sseChunk(text: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

async function startFixedResponseServer(
  text: string,
): Promise<{ port: number; server: Server }> {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(sseChunk(text));
    res.write("data: [DONE]\n\n");
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { port, server };
}

const TOUCHED_ENV_VARS = [
  "OPENAI_COMPATIBLE_BASE_URL",
  "OPENAI_COMPATIBLE_API_KEY",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of TOUCHED_ENV_VARS) {
    const prior = snapshot[key];
    if (prior === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prior;
    }
  }
}

const ACCUMULATED_TEXT = "hello world";

/**
 * Runs `nl.stream()` against the local fixed-response SSE server with the
 * given `tts` options, fully drains the stream, and returns everything a
 * caller of the public API can observe.
 */
async function runTtsStream(
  nl: NeuroLink,
  tts: Parameters<NeuroLink["stream"]>[0]["tts"],
): Promise<{
  ttsAudioChunks: Array<{
    type: "tts_audio";
    audio: {
      data: Buffer;
      format: string;
      index: number;
      isFinal: boolean;
      cumulativeSize?: number;
      voice?: string;
      sampleRate?: number;
    };
  }>;
  textContent: string;
  resolvedAudio: TTSResult | undefined;
}> {
  const envSnapshot = snapshotEnv();
  const { port, server } = await startFixedResponseServer(ACCUMULATED_TEXT);
  try {
    process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
    process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

    const result = await nl.stream({
      provider: "openai-compatible",
      model: "gpt-4o-mini",
      input: { text: "hi" },
      maxSteps: 1,
      tts,
    } as Parameters<NeuroLink["stream"]>[0]);

    let textContent = "";
    const ttsAudioChunks: Array<{
      type: "tts_audio";
      audio: {
        data: Buffer;
        format: string;
        index: number;
        isFinal: boolean;
        cumulativeSize?: number;
        voice?: string;
        sampleRate?: number;
      };
    }> = [];
    for await (const chunk of result.stream) {
      if (chunk && "content" in chunk && typeof chunk.content === "string") {
        textContent += chunk.content;
      }
      if (
        chunk &&
        typeof chunk === "object" &&
        "type" in chunk &&
        (chunk as { type?: unknown }).type === "tts_audio"
      ) {
        ttsAudioChunks.push(chunk as (typeof ttsAudioChunks)[number]);
      }
    }

    const resolvedAudio = await result.audio;
    return { ttsAudioChunks, textContent, resolvedAudio };
  } finally {
    server.close();
    restoreEnv(envSnapshot);
  }
}

function makeStubHandler(overrides: Partial<TTSHandler> = {}): TTSHandler {
  return {
    isConfigured: () => true,
    synthesize: async (): Promise<TTSResult> => ({
      buffer: Buffer.from("stub-audio"),
      format: "mp3",
      size: 10,
    }),
    ...overrides,
  };
}

let uniqueCounter = 0;
function uniqueProvider(label: string): string {
  uniqueCounter += 1;
  return `unit-test-tts-${label}-${uniqueCounter}`;
}

void runSuite(async () => {
  const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  const registrySnapshot = snapshotTTSRegistry();

  function nl() {
    return new NeuroLink({ conversationMemory: { enabled: false } });
  }

  try {
    // -----------------------------------------------------------------
    // Happy path: successful synthesis observed via the tts_audio chunk
    // and streamResult.audio.
    // -----------------------------------------------------------------

    await test("stream() yields a tts_audio chunk and resolves streamResult.audio on successful synthesis", async () => {
      const provider = uniqueProvider("success");
      const expectedBuffer = Buffer.from("synth-output-bytes");
      TTSProcessor.registerHandler(
        provider,
        makeStubHandler({
          synthesize: async () => ({
            buffer: expectedBuffer,
            format: "wav",
            size: expectedBuffer.length,
            sampleRate: 24000,
          }),
        }),
      );

      const { ttsAudioChunks, textContent, resolvedAudio } = await runTtsStream(
        nl(),
        {
          enabled: true,
          useAiResponse: true,
          provider,
          voice: "test-voice",
        },
      );

      assert(
        textContent.includes(ACCUMULATED_TEXT),
        "the underlying text stream still delivered the AI response",
      );
      assertEqual(
        ttsAudioChunks.length,
        1,
        "exactly one tts_audio chunk was yielded",
      );
      const chunk = ttsAudioChunks[0];
      assertEqual(chunk.type, "tts_audio", "chunk carries the tts_audio type");
      assert(
        chunk.audio.data.equals(expectedBuffer),
        "chunk audio.data is the handler's buffer",
      );
      assertEqual(chunk.audio.format, "wav", "chunk audio.format");
      assertEqual(chunk.audio.isFinal, true, "chunk audio.isFinal");
      assertEqual(chunk.audio.sampleRate, 24000, "chunk audio.sampleRate");
      assertEqual(
        chunk.audio.voice,
        "test-voice",
        "chunk audio.voice falls back to the request's tts.voice when the handler omits it",
      );

      assert(!!resolvedAudio, "streamResult.audio resolved to a value");
      assertEqual(
        resolvedAudio?.format,
        "wav",
        "resolved audio.format matches the handler's result",
      );
      assertEqual(
        resolvedAudio?.size,
        expectedBuffer.length,
        "resolved audio.size matches the handler's result",
      );
      assertEqual(
        resolvedAudio?.voice,
        "test-voice",
        "resolved audio.voice also falls back to the request's tts.voice",
      );
    });

    // -----------------------------------------------------------------
    // Duplicate registration: the later registerHandler() call wins.
    // -----------------------------------------------------------------

    await test("re-registering a provider makes stream() dispatch to the later handler", async () => {
      const provider = uniqueProvider("overwrite");
      TTSProcessor.registerHandler(
        provider,
        makeStubHandler({
          synthesize: async () => ({
            buffer: Buffer.from("first-handler"),
            format: "mp3",
            size: 5,
          }),
        }),
      );
      TTSProcessor.registerHandler(
        provider,
        makeStubHandler({
          synthesize: async () => ({
            buffer: Buffer.from("second-handler"),
            format: "mp3",
            size: 6,
          }),
        }),
      );

      const { ttsAudioChunks } = await runTtsStream(nl(), {
        enabled: true,
        useAiResponse: true,
        provider,
      });

      assertEqual(ttsAudioChunks.length, 1, "one tts_audio chunk was yielded");
      assert(
        ttsAudioChunks[0].audio.data.equals(Buffer.from("second-handler")),
        "the later registration's handler produced the audio, not the first",
      );
    });

    // -----------------------------------------------------------------
    // Case-insensitive provider resolution.
    // -----------------------------------------------------------------

    await test("stream() resolves tts.provider case-insensitively against the registered name", async () => {
      const mixedCaseProvider = `Unit-Test-TTS-Mixed-Case-${(uniqueCounter += 1)}`;
      TTSProcessor.registerHandler(mixedCaseProvider, makeStubHandler());

      const { ttsAudioChunks } = await runTtsStream(nl(), {
        enabled: true,
        useAiResponse: true,
        provider: mixedCaseProvider.toUpperCase(),
      });

      assertEqual(
        ttsAudioChunks.length,
        1,
        "synthesis still ran even though the requested provider casing differs from the registered casing",
      );
    });

    // -----------------------------------------------------------------
    // Graceful-degradation paths: each of these trigger conditions must
    // still let the text stream complete normally, with no tts_audio
    // chunk and streamResult.audio resolving to undefined. The specific
    // TTSError code behind each is not observable here (see file header,
    // item 3) — only the shared "synthesis did not happen" outcome is.
    // -----------------------------------------------------------------

    const degradationCases: Array<{
      name: string;
      register: (provider: string) => void;
      tts: (provider: string) => Parameters<typeof runTtsStream>[1];
    }> = [
      {
        name: "text longer than the handler's maxTextLength",
        register: (provider) =>
          TTSProcessor.registerHandler(
            provider,
            makeStubHandler({ maxTextLength: 3 }),
          ),
        tts: (provider) => ({ enabled: true, useAiResponse: true, provider }),
      },
      {
        name: "an unconfigured provider",
        register: (provider) =>
          TTSProcessor.registerHandler(
            provider,
            makeStubHandler({ isConfigured: () => false }),
          ),
        tts: (provider) => ({ enabled: true, useAiResponse: true, provider }),
      },
      {
        name: "a handler that throws during synthesis",
        register: (provider) =>
          TTSProcessor.registerHandler(
            provider,
            makeStubHandler({
              synthesize: async () => {
                throw new Error("synthesis boom");
              },
            }),
          ),
        tts: (provider) => ({ enabled: true, useAiResponse: true, provider }),
      },
      {
        name: "a tts.provider that was never registered",
        register: () => {
          /* deliberately no registration */
        },
        tts: (provider) => ({ enabled: true, useAiResponse: true, provider }),
      },
    ];

    for (const degradationCase of degradationCases) {
      await test(`stream() degrades gracefully (no tts_audio, audio undefined) for: ${degradationCase.name}`, async () => {
        const provider = uniqueProvider("degrade");
        degradationCase.register(provider);

        const { ttsAudioChunks, textContent, resolvedAudio } =
          await runTtsStream(nl(), degradationCase.tts(provider));

        assert(
          textContent.includes(ACCUMULATED_TEXT),
          "text stream still completed despite the TTS failure",
        );
        assertEqual(ttsAudioChunks.length, 0, "no tts_audio chunk was yielded");
        assertEqual(
          resolvedAudio,
          undefined,
          "streamResult.audio resolved to undefined",
        );
      });
    }

    // -----------------------------------------------------------------
    // Mode 2 is gated off entirely when useAiResponse is not set: no
    // synthesis attempt at all, confirmed by a handler that would blow up
    // if it were ever invoked.
    // -----------------------------------------------------------------

    await test("stream() does not attempt synthesis when tts.useAiResponse is not set", async () => {
      const provider = uniqueProvider("mode1-gate");
      TTSProcessor.registerHandler(
        provider,
        makeStubHandler({
          synthesize: async () => {
            throw new Error(
              "synthesize should not have been called — Mode 2 was not requested",
            );
          },
        }),
      );

      const { ttsAudioChunks, textContent, resolvedAudio } = await runTtsStream(
        nl(),
        { enabled: true, provider },
      );

      assert(
        textContent.includes(ACCUMULATED_TEXT),
        "text stream still completed",
      );
      assertEqual(
        ttsAudioChunks.length,
        0,
        "no tts_audio chunk was yielded when useAiResponse is unset",
      );
      assertEqual(
        resolvedAudio,
        undefined,
        "streamResult.audio resolved to undefined when useAiResponse is unset",
      );
    });
  } finally {
    restoreTTSRegistry(registrySnapshot);
  }
});

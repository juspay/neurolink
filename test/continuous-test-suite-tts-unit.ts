#!/usr/bin/env tsx
/**
 * Continuous Test Suite: public TTS behavior plus deterministic chunking.
 *
 * Covers TTS-027 (#527), and the no-key half of TTS-028 (#528).
 *
 * The direct `synthesizeStream` cases use the rule-15 determinism exception
 * only for the handler-synthesis seam: exact provider text caps,
 * surrogate-pair-safe splitting, and per-segment failure isolation. Sentence
 * carry-over and configurable flushing drive the shipped `NeuroLink.stream()`
 * surface through `makeTextStream` instead. The OpenAITTS format-mapping case
 * deliberately reaches the private pure `mapFormat`/`effectiveFormat` methods
 * so it can pin wire-format behavior without credentials or constructor side
 * effects. The auto-provider case must stub the internal health selector before
 * any public provider surface exists; that single exception keeps this suite
 * credential-free and deterministic.
 *
 * Run: npx tsx test/continuous-test-suite-tts-unit.ts
 */

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
  assertNotNull,
} from "./helpers/harness.js";
import {
  AIProviderFactory,
  NeuroLink,
  OpenAITTS,
  TTSProcessor,
  TTSError,
  TTS_ERROR_CODES,
} from "../dist/index.js";
import { ProviderHealthChecker } from "../dist/utils/providerHealth.js";
import type {
  AIProvider,
  EnhancedGenerateResult,
  StreamOptions,
  StreamResult,
  TTSChunk,
  TTSHandler,
} from "../dist/index.js";
import { stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("TTSProcessor (unit)");

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

/** Records what it was asked to do so dispatch can be asserted, not inferred. */
function makeStubHandler(overrides: Partial<TTSHandler> = {}) {
  const calls: Array<{ text: string; options: unknown }> = [];
  const audio = Buffer.from("fake-audio");
  const handler = {
    isConfigured: () => true,
    synthesize: async (text: string, options: unknown) => {
      calls.push({ text, options });
      return {
        buffer: audio,
        format: "mp3",
        size: audio.length,
        voice: "stub-voice",
      };
    },
    getVoices: async () => [{ name: "stub-voice", languageCode: "en-US" }],
    ...overrides,
  } as unknown as TTSHandler;
  return { handler, calls };
}

const PROVIDER = "stub-tts-provider";

function isTTSAudioChunk(
  chunk: unknown,
): chunk is { type: "tts_audio"; audio: TTSChunk } {
  return (
    chunk !== null &&
    typeof chunk === "object" &&
    "type" in chunk &&
    chunk.type === "tts_audio" &&
    "audio" in chunk
  );
}

type ExecutableProvider = AIProvider & {
  executeStream: (options: StreamOptions) => Promise<StreamResult>;
};

async function createOfflineProvider(
  neurolink: NeuroLink,
): Promise<ExecutableProvider> {
  return (await AIProviderFactory.createProvider(
    "openai",
    "gpt-4o-mini",
    false,
    neurolink,
    undefined,
    { openai: { apiKey: "offline-test-key" } },
  )) as ExecutableProvider;
}

function makeTextStream(...parts: string[]): StreamResult["stream"] {
  return (async function* () {
    for (const content of parts) {
      yield { content };
    }
  })();
}

function makeGenerateResult(content: string): EnhancedGenerateResult {
  return {
    content,
    provider: "openai",
    model: "gpt-4o-mini",
    usage: { input: 1, output: 1, total: 2 },
  };
}

let uniqueProviderCounter = 0;

function uniqueProvider(label: string): string {
  uniqueProviderCounter += 1;
  return `unit-test-tts-${label}-${uniqueProviderCounter}`;
}

async function runPublicTtsStream(
  tts: NonNullable<StreamOptions["tts"]>,
  responseText: string | string[] = "hello world",
): Promise<{
  ttsAudioChunks: Array<{ type: "tts_audio"; audio: TTSChunk }>;
  textContent: string;
  resolvedAudio: Awaited<StreamResult["audio"]>;
  ttsMetadata: StreamResult["ttsMetadata"];
}> {
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const responseParts = Array.isArray(responseText)
    ? responseText
    : [responseText];
  const execute = stub(provider, "executeStream", async () => ({
    stream: makeTextStream(...responseParts),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  const output: Array<unknown> = [];
  let result: StreamResult | undefined;

  await withStubs([create, execute], async () => {
    result = await neurolink.stream({
      input: { text: "exercise public streaming TTS" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts,
    });
    for await (const chunk of result.stream) {
      output.push(chunk);
    }
  });

  assertNotNull(result, "public stream returned a StreamResult");
  const ttsAudioChunks = output.filter(isTTSAudioChunk);
  const textContent = output
    .map((chunk) =>
      chunk !== null &&
      typeof chunk === "object" &&
      "content" in chunk &&
      typeof chunk.content === "string"
        ? chunk.content
        : "",
    )
    .join("");
  return {
    ttsAudioChunks,
    textContent,
    resolvedAudio: await result.audio,
    ttsMetadata: result.ttsMetadata,
  };
}

const registrySnapshot = snapshotTTSRegistry();

await test("stream() yields a tts_audio chunk and resolves streamResult.audio on successful synthesis", async () => {
  const provider = uniqueProvider("success");
  const expectedBuffer = Buffer.from("synth-output-bytes");
  const { handler } = makeStubHandler({
    synthesize: async () => ({
      buffer: expectedBuffer,
      format: "wav",
      size: expectedBuffer.length,
      sampleRate: 24000,
    }),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks, textContent, resolvedAudio } =
    await runPublicTtsStream({
      enabled: true,
      useAiResponse: true,
      provider,
      voice: "test-voice",
    });

  assert(
    textContent.includes("hello world"),
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
  assertEqual(chunk.audio.format, "wav", "chunk audio.format is preserved");
  assertEqual(chunk.audio.isFinal, true, "the only audio chunk is final");
  assertEqual(
    chunk.audio.sampleRate,
    24000,
    "chunk audio.sampleRate is preserved",
  );
  assertEqual(
    chunk.audio.voice,
    "test-voice",
    "chunk audio.voice falls back to the request voice",
  );
  assertNotNull(resolvedAudio, "streamResult.audio resolved to a value");
  assertEqual(
    resolvedAudio.format,
    "wav",
    "resolved audio format matches the synthesized result",
  );
  assertEqual(
    resolvedAudio.size,
    expectedBuffer.length,
    "resolved audio size matches the synthesized buffer",
  );
  assertEqual(
    resolvedAudio.voice,
    "test-voice",
    "resolved audio voice matches the emitted chunk",
  );
});

await test("re-registering a provider makes stream() dispatch to the later handler", async () => {
  const provider = uniqueProvider("overwrite");
  const first = makeStubHandler({
    synthesize: async () => ({
      buffer: Buffer.from("first-handler"),
      format: "mp3",
      size: 13,
    }),
  } as Partial<TTSHandler>);
  const second = makeStubHandler({
    synthesize: async () => ({
      buffer: Buffer.from("second-handler"),
      format: "mp3",
      size: 14,
    }),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(provider, first.handler);
  TTSProcessor.registerHandler(provider, second.handler);

  const { ttsAudioChunks } = await runPublicTtsStream({
    enabled: true,
    useAiResponse: true,
    provider,
  });

  assertEqual(ttsAudioChunks.length, 1, "one tts_audio chunk was yielded");
  assert(
    ttsAudioChunks[0].audio.data.equals(Buffer.from("second-handler")),
    "the later registration produced the audio",
  );
});

await test("stream() resolves tts.provider case-insensitively against the registered name", async () => {
  const provider = uniqueProvider("Mixed-Case");
  const { handler } = makeStubHandler();
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks } = await runPublicTtsStream({
    enabled: true,
    useAiResponse: true,
    provider: provider.toUpperCase(),
  });

  assertEqual(
    ttsAudioChunks.length,
    1,
    "synthesis ran despite different requested provider casing",
  );
});

const degradationCases: Array<{
  name: string;
  register: (provider: string) => void;
}> = [
  {
    name: "an unconfigured provider",
    register: (provider) => {
      const { handler } = makeStubHandler({ isConfigured: () => false });
      TTSProcessor.registerHandler(provider, handler);
    },
  },
  {
    name: "a handler that throws during synthesis",
    register: (provider) => {
      const { handler } = makeStubHandler({
        synthesize: async () => {
          throw new Error("synthesis boom");
        },
      } as Partial<TTSHandler>);
      TTSProcessor.registerHandler(provider, handler);
    },
  },
  {
    name: "a tts.provider that was never registered",
    register: () => {
      // Deliberately no registration.
    },
  },
];

for (const degradationCase of degradationCases) {
  await test(`stream() degrades gracefully (no tts_audio, audio undefined) for: ${degradationCase.name}`, async () => {
    const provider = uniqueProvider("degrade");
    degradationCase.register(provider);

    const { ttsAudioChunks, textContent, resolvedAudio } =
      await runPublicTtsStream({
        enabled: true,
        useAiResponse: true,
        provider,
      });

    assert(
      textContent.includes("hello world"),
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

// This replaces release's `text longer than the handler's maxTextLength`
// degradation case. #516 hard-splits incremental stream() synthesis at
// min(streamingBufferSize, maxTextLength) instead of raising TTS_TEXT_TOO_LONG;
// non-streaming generate() still raises for over-cap text.
await test("stream() splits over-cap text into multiple tts_audio chunks", async () => {
  const provider = uniqueProvider("over-cap");
  const { handler, calls } = makeStubHandler({ maxTextLength: 3 });
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks, textContent, resolvedAudio } =
    await runPublicTtsStream(
      { enabled: true, useAiResponse: true, provider },
      "hello world",
    );

  assert(
    textContent.includes("hello world"),
    "the underlying text stream still completed",
  );
  assert(calls.length > 1, "over-cap text required multiple synthesize calls");
  assert(
    calls.every(({ text }) => text.length <= 3),
    "every synthesize call stayed within the handler text cap",
  );
  assertEqual(
    ttsAudioChunks.length,
    calls.length,
    "each capped segment yielded one tts_audio chunk",
  );
  assertNotNull(resolvedAudio, "split synthesis resolved aggregate audio");
});

// #516 accepts `options.tts?.enabled === true` for stream(). This replaces
// release's pre-#516 useAiResponse gate test; generate() keeps its existing
// input-vs-response Mode-1/Mode-2 switch.
await test("stream() synthesizes when tts.enabled is set, without useAiResponse", async () => {
  const provider = uniqueProvider("enabled-contract");
  const { handler, calls } = makeStubHandler();
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks, resolvedAudio } = await runPublicTtsStream({
    enabled: true,
    provider,
  });

  assertEqual(calls.length, 1, "the TTS handler was called once");
  assertEqual(
    ttsAudioChunks.length,
    1,
    "tts.enabled yielded one audio chunk without useAiResponse",
  );
  assertNotNull(
    resolvedAudio,
    "streamResult.audio resolved without useAiResponse",
  );
});

await test("registerHandler makes a provider resolvable", () => {
  const { handler } = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, handler);
  assertEqual(TTSProcessor.supports(PROVIDER), true, "supports() sees it");
  assert(
    TTSProcessor.getHandler(PROVIDER) !== undefined,
    "getHandler() returns it",
  );
});

await test("an unregistered provider is not claimed", () => {
  assertEqual(
    TTSProcessor.supports("provider-that-was-never-registered"),
    false,
    "supports() is false for unknown providers",
  );
  assertEqual(
    TTSProcessor.getHandler("provider-that-was-never-registered"),
    undefined,
    "getHandler() returns undefined rather than throwing",
  );
});

await test("synthesize dispatches to the registered handler", async () => {
  const { handler, calls } = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, handler);
  const result = await TTSProcessor.synthesize("hello world", PROVIDER, {});
  assertEqual(calls.length, 1, "handler invoked exactly once");
  assertEqual(calls[0].text, "hello world", "text forwarded verbatim");
  assert(Buffer.isBuffer(result.buffer), "audio buffer returned");
  assertEqual(result.size, result.buffer.length, "size matches the buffer");
});

await test("stream() buffers sentences across text chunk boundaries", async () => {
  const calls: string[] = [];
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      calls.push(text);
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  const provider = uniqueProvider("sentence-carry");
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks: chunks } = await runPublicTtsStream(
    { enabled: true, provider, streamingBufferSize: 10 },
    ["First sentence", ". Second", " sentence! Tail"],
  );
  const audio = chunks.map((chunk) => chunk.audio);

  assertEqual(calls.length, 3, "three buffered segments reach the handler");
  assert(
    calls.join("|") === "First sentence.|Second sentence!|Tail",
    "buffered segments do not match the expected boundary split",
  );
  assertEqual(chunks.length, 3, "three buffered segments synthesized");
  assertEqual(
    audio.map((chunk) => chunk.index).join(","),
    "0,1,2",
    "chunk indexes are sequential",
  );
  assertEqual(
    audio.map((chunk) => chunk.cumulativeSize).join(","),
    "15,31,35",
    "cumulative sizes are monotonic sums",
  );
  assertEqual(
    audio.filter((chunk) => chunk.isFinal).length,
    1,
    "exactly one final chunk",
  );
  assertEqual(audio[2].isFinal, true, "only the last chunk is final");
});

await test("stream() honors the configurable flush boundary", async () => {
  const calls: string[] = [];
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      calls.push(text);
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  const provider = uniqueProvider("flush-boundary");
  TTSProcessor.registerHandler(provider, handler);

  await runPublicTtsStream(
    { enabled: true, provider, streamingBufferSize: 20 },
    ["One. ", "Two. ", "Three."],
  );

  assertEqual(
    calls.join("|"),
    "One. Two. Three.",
    "short sentences stay buffered until the configured boundary or stream end",
  );
});

await test("synthesizeStream never exceeds the handler text cap", async () => {
  const calls: string[] = [];
  const { handler } = makeStubHandler({
    maxTextLength: 12,
    synthesize: async (text: string) => {
      calls.push(text);
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);

  const chunks = [];
  for await (const chunk of TTSProcessor.synthesizeStream(
    (async function* () {
      yield "x".repeat(25);
    })(),
    PROVIDER,
    { streamingBufferSize: 50 },
  )) {
    chunks.push(chunk);
  }

  assertEqual(
    calls.map((text) => text.length).join(","),
    "12,12,1",
    "handler calls respect the configured text cap",
  );
  assert(
    calls.every((text) => text.length <= 12),
    "every repeated synthesize call stays within the handler cap",
  );
  assertEqual(
    chunks.filter((chunk) => chunk.isFinal).length,
    1,
    "exactly one capped chunk is final",
  );
  assertEqual(chunks.at(-1)?.isFinal, true, "the last capped chunk is final");
});

await test("synthesizeStream hard-splits at the default 3000-character cap", async () => {
  const calls: string[] = [];
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      calls.push(text);
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);

  for await (const _chunk of TTSProcessor.synthesizeStream(
    (async function* () {
      yield "x".repeat(3001);
    })(),
    PROVIDER,
    { streamingBufferSize: 5000 },
  )) {
    // Drain the stream; handler call lengths are the assertion surface.
  }

  assertEqual(
    calls.map((text) => text.length).join(","),
    "3000,1",
    "the default cap splits instead of throwing TTS_TEXT_TOO_LONG",
  );
});

await test("synthesizeStream never hard-splits a surrogate pair at the cap", async () => {
  const calls: string[] = [];
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      calls.push(text);
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);

  // The emoji straddles the 3000-code-unit cap, and the text carries no
  // sentence boundary, so the cap is the only available split point. A naive
  // slice(0, 3000) ends one call with a lone high surrogate and starts the next
  // with its low half — both halves reach the provider as U+FFFD.
  const input = `${"x".repeat(2999)}\u{1F600}${"y".repeat(10)}`;
  for await (const _chunk of TTSProcessor.synthesizeStream(
    (async function* () {
      yield input;
    })(),
    PROVIDER,
    { streamingBufferSize: 5000 },
  )) {
    // Drain the stream; the synthesized text is the assertion surface.
  }

  const isHighSurrogate = (unit: number) => unit >= 0xd800 && unit <= 0xdbff;
  const isLowSurrogate = (unit: number) => unit >= 0xdc00 && unit <= 0xdfff;

  assertEqual(
    calls.filter((text) => isHighSurrogate(text.charCodeAt(text.length - 1)))
      .length,
    0,
    "no synthesize call ends on an unpaired high surrogate",
  );
  assertEqual(
    calls.filter((text) => isLowSurrogate(text.charCodeAt(0))).length,
    0,
    "no synthesize call starts on an unpaired low surrogate",
  );
  assert(
    calls.join("").replace(/\s+/g, "") === input.replace(/\s+/g, ""),
    "keeping the pair intact still forwards every input character exactly once",
  );
});

await test("synthesizeStream keeps one final chunk after a later segment fails", async () => {
  const calls: string[] = [];
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      calls.push(text);
      if (text === "Tail") {
        throw new Error("offline tail failure");
      }
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);

  const chunks = [];
  let failure: unknown;
  try {
    for await (const chunk of TTSProcessor.synthesizeStream(
      (async function* () {
        yield "First sentence. ";
        yield "Second sentence! ";
        yield "Tail";
      })(),
      PROVIDER,
      { streamingBufferSize: 10 },
    )) {
      chunks.push(chunk);
    }
  } catch (error) {
    failure = error;
  }

  assertEqual(calls.length, 3, "three attempted segments reach the handler");
  assert(
    calls.join("|") === "First sentence.|Second sentence!|Tail",
    "attempted segments do not match the expected boundary split",
  );
  assertEqual(chunks.length, 2, "successful audio chunks are preserved");
  assertEqual(
    chunks.map((chunk) => chunk.index).join(","),
    "0,1",
    "successful chunk indexes remain sequential",
  );
  assertEqual(
    chunks.filter((chunk) => chunk.isFinal).length,
    1,
    "exactly one surviving chunk is final",
  );
  assertEqual(
    chunks.at(-1)?.isFinal,
    true,
    "the last surviving chunk is final",
  );
  assert(
    failure instanceof Error && failure.name === "IncrementalTTSSynthesisError",
    "the handler-synthesis seam reports the deferred segment failure",
  );
});

await test("stream() reports a failed middle segment while retaining partial audio", async () => {
  const provider = uniqueProvider("middle-failure");
  const calls: string[] = [];
  const leakedToken = "sk-live-segment-secret";
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      calls.push(text);
      if (text === "Second sentence.") {
        throw new Error(
          `TTS request to https://host/v1/tts?api_key=${leakedToken}`,
        );
      }
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks, resolvedAudio, ttsMetadata } =
    await runPublicTtsStream(
      { enabled: true, provider, streamingBufferSize: 5 },
      ["First sentence. ", "Second sentence. ", "Third sentence."],
    );

  assertEqual(calls.length, 3, "all three segments are still attempted");
  assertEqual(
    calls.join("|"),
    "First sentence.|Second sentence.|Third sentence.",
    "the middle segment is the only failed attempt",
  );
  assertEqual(ttsAudioChunks.length, 2, "both surviving chunks are delivered");
  assertEqual(
    ttsAudioChunks.map((chunk) => chunk.audio.index).join(","),
    "0,1",
    "failed segments do not manufacture an index gap",
  );
  assertNotNull(resolvedAudio, "the partial aggregate is still delivered");
  assertEqual(ttsMetadata?.attempted, true, "metadata records the attempt");
  assertEqual(
    ttsMetadata?.success,
    false,
    "partial synthesis is not reported as fully successful",
  );
  assertEqual(
    ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "partial failure uses the structured synthesis error code",
  );
  assertIncludes(
    ttsMetadata?.error?.message ?? "",
    "1 segment",
    "metadata reports the number of failed segments",
  );
  assertIncludes(
    ttsMetadata?.error?.message ?? "",
    "segment 2",
    "metadata identifies the failed segment",
  );
  assert(
    !ttsMetadata?.error?.message.includes(leakedToken),
    "the public error does not expose provider URL credentials",
  );
});

await test("NeuroLink.stream interleaves ordered TTS audio", async () => {
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => ({
    stream: (async function* () {
      yield { content: "First sentence. " };
      await new Promise((resolve) => setTimeout(resolve, 2));
      yield { content: "Second sentence. " };
      await new Promise((resolve) => setTimeout(resolve, 2));
      yield { content: "Final tail." };
    })(),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  const output: Array<unknown> = [];
  let result: StreamResult | undefined;

  await withStubs([create, execute], async () => {
    result = await neurolink.stream({
      input: { text: "speak three sentences" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: { enabled: true, provider: PROVIDER, streamingBufferSize: 5 },
    });
    assertNotNull(
      result.ttsMetadata,
      "primary stream exposes mutable TTS metadata before drain",
    );
    assertEqual(
      result.ttsMetadata.attempted,
      true,
      "primary-stream metadata records the TTS attempt before drain",
    );
    assertEqual(
      result.ttsMetadata.success,
      false,
      "primary-stream metadata remains pending before drain",
    );
    for await (const chunk of result.stream) {
      output.push(chunk);
    }
  });

  const audio = output.filter(isTTSAudioChunk).map((chunk) => chunk.audio);
  const firstAudio = output.findIndex(isTTSAudioChunk);
  let lastText = -1;
  output.forEach((chunk, index) => {
    if (chunk !== null && typeof chunk === "object" && "content" in chunk) {
      lastText = index;
    }
  });
  assertEqual(audio.length, 3, "one audio chunk per buffered sentence");
  assert(
    firstAudio < lastText,
    "audio is interleaved before source completion",
  );
  assertEqual(
    audio.map((chunk) => chunk.index).join(","),
    "0,1,2",
    "audio indexes preserve synthesis order",
  );
  assertEqual(
    audio.filter((chunk) => chunk.isFinal).length,
    1,
    "the public stream exposes one final audio chunk",
  );
  const aggregate = await result?.audio;
  assertEqual(
    aggregate?.size,
    audio.at(-1)?.cumulativeSize,
    "the public aggregate matches the emitted audio",
  );
  assertEqual(
    result?.ttsMetadata?.attempted,
    true,
    "primary-stream metadata records the TTS attempt after drain",
  );
  assertEqual(
    result?.ttsMetadata?.success,
    true,
    "primary-stream metadata records successful synthesis after drain",
  );
  assert(
    typeof result?.ttsMetadata?.latency === "number",
    "primary-stream metadata records synthesis latency after drain",
  );
});

await test("NeuroLink.stream metadata records primary TTS failure", async () => {
  const { handler } = makeStubHandler({
    synthesize: async () => {
      throw new Error("offline synthesis failure");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => ({
    stream: makeTextStream("Failure sentence."),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  let result: StreamResult | undefined;

  await withStubs([create, execute], async () => {
    result = await neurolink.stream({
      input: { text: "synthesis should fail" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: { enabled: true, provider: PROVIDER },
    });
    for await (const _chunk of result.stream) {
      // Drain the public stream to finalize the mutable metadata reference.
    }
  });

  assertEqual(
    result?.ttsMetadata?.attempted,
    true,
    "failed primary synthesis still records the attempt",
  );
  assertEqual(
    result?.ttsMetadata?.success,
    false,
    "failed primary synthesis records an unsuccessful outcome",
  );
  assert(
    typeof result?.ttsMetadata?.latency === "number",
    "failed primary synthesis records latency",
  );
  assertEqual(
    result?.ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "failed primary synthesis records a structured error",
  );
  assertIncludes(
    result?.ttsMetadata?.error?.message ?? "",
    "segment 1",
    "total failure identifies the failed segment",
  );
});

await test("NeuroLink.stream metadata records unsupported TTS", async () => {
  const noHandler = "primary-tts-provider-without-a-handler";
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => ({
    stream: makeTextStream("Text survives unsupported speech."),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  let result: StreamResult | undefined;

  await withStubs([create, execute], async () => {
    result = await neurolink.stream({
      input: { text: "unsupported speech" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: { enabled: true, provider: noHandler },
    });
    for await (const _chunk of result.stream) {
      // Drain the unchanged text stream.
    }
  });

  assertEqual(
    result?.ttsMetadata?.attempted,
    false,
    "unsupported primary TTS records that synthesis was not attempted",
  );
  assertEqual(
    result?.ttsMetadata?.success,
    false,
    "unsupported primary TTS records no successful synthesis",
  );
});

await test("NeuroLink.stream metadata follows no-output fallback", async () => {
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const primary = await createOfflineProvider(neurolink);
  const fallback = await createOfflineProvider(neurolink);
  const execute = stub(primary, "executeStream", async () => ({
    stream: makeTextStream(),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const fallbackStream = stub(fallback, "stream", async () => ({
    stream: makeTextStream("Fallback sentence."),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  let factoryCalls = 0;
  const create = stub(AIProviderFactory, "createProvider", async () =>
    ++factoryCalls === 1 ? primary : fallback,
  );
  const output: Array<unknown> = [];
  let result: StreamResult | undefined;

  await withStubs([create, execute, fallbackStream], async () => {
    result = await neurolink.stream({
      input: { text: "force no-output fallback" },
      provider: "openai",
      model: "gpt-4o-mini",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4o-mini",
      disableTools: true,
      tts: { enabled: true, provider: PROVIDER },
    });
    for await (const chunk of result.stream) {
      output.push(chunk);
    }
  });

  assert(
    output.some(isTTSAudioChunk),
    "no-output fallback emits TTS audio through the public stream",
  );
  assertEqual(
    result?.ttsMetadata?.attempted,
    true,
    "no-output fallback metadata records the TTS attempt",
  );
  assertEqual(
    result?.ttsMetadata?.success,
    true,
    "no-output fallback metadata records successful synthesis",
  );
  assert(
    typeof result?.ttsMetadata?.latency === "number",
    "no-output fallback metadata records synthesis latency",
  );
});

await test("NeuroLink.stream resolves auto to a concrete TTS provider", async () => {
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const health = stub(
    ProviderHealthChecker,
    "getBestHealthyProvider",
    async () => PROVIDER,
  );
  const execute = stub(provider, "executeStream", async () => ({
    stream: makeTextStream("Auto-selected sentence."),
    provider: PROVIDER,
    model: "offline-model",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  const output: Array<unknown> = [];

  await withStubs([health, create, execute], async () => {
    const result = await neurolink.stream({
      input: { text: "auto provider" },
      provider: "auto",
      model: "offline-model",
      disableTools: true,
      tts: { enabled: true, streamingBufferSize: 5 },
    });
    for await (const chunk of result.stream) {
      output.push(chunk);
    }
  });

  assertEqual(
    output.filter(isTTSAudioChunk).length,
    1,
    "auto chat selection falls through to the concrete TTS provider",
  );
});

await test("NeuroLink.stream preserves TTS through real-stream fallback", async () => {
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({
    conversationMemory: { enabled: false },
  });
  const provider = await createOfflineProvider(neurolink);
  let generatedOptions: StreamOptions | string | undefined;
  const execute = stub(provider, "executeStream", async () => {
    throw new Error("real streaming unavailable in offline stub");
  });
  const generate = stub(provider, "generate", async (optionsOrPrompt) => {
    generatedOptions = optionsOrPrompt as StreamOptions | string;
    return makeGenerateResult("First sentence. Second sentence. Final tail.");
  });
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  const output: Array<unknown> = [];
  let result: StreamResult | undefined;

  await withStubs([create, generate, execute], async () => {
    result = await neurolink.stream({
      input: { text: "offline" },
      provider: "openai",
      model: "gpt-4o-mini",
      tts: { enabled: true, provider: PROVIDER, streamingBufferSize: 5 },
    });
    for await (const chunk of result.stream) {
      output.push(chunk);
    }
  });

  const audio = output.filter(isTTSAudioChunk).map((chunk) => chunk.audio);
  assert(audio.length > 1, "fallback emits multiple audio chunks");
  assertEqual(
    audio.filter((chunk) => chunk.isFinal).length,
    1,
    "fallback exposes one final audio chunk",
  );
  assert(
    audio.every(
      (chunk, index) =>
        index === 0 ||
        (chunk.cumulativeSize ?? 0) > (audio[index - 1].cumulativeSize ?? 0),
    ),
    "fallback cumulative sizes increase monotonically",
  );
  assertEqual(
    typeof generatedOptions === "string"
      ? generatedOptions
      : generatedOptions?.tts,
    undefined,
    "fake generate skips duplicate whole-response Mode 2 synthesis",
  );
  assertEqual(
    (await result?.audio)?.size,
    audio.at(-1)?.cumulativeSize,
    "fallback aggregate matches its emitted chunks",
  );
});

await test("provider fake stream retains Mode 2 audio and metadata", async () => {
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => {
    throw new Error("real streaming unavailable in offline stub");
  });
  let generatedOptions: StreamOptions | string | undefined;
  const generate = stub(provider, "generate", async (optionsOrPrompt) => {
    generatedOptions = optionsOrPrompt as StreamOptions | string;
    return makeGenerateResult("First sentence. Second sentence. Final tail.");
  });
  let result: StreamResult | undefined;
  const output: Array<unknown> = [];

  await withStubs([generate, execute], async () => {
    result = await provider.stream({
      input: { text: "offline" },
      tts: {
        enabled: true,
        useAiResponse: true,
        provider: PROVIDER,
        streamingBufferSize: 5,
      },
    });
    for await (const chunk of result.stream) {
      output.push(chunk);
    }
  });

  const audioChunks = output
    .filter(isTTSAudioChunk)
    .map((chunk) => chunk.audio);
  const aggregate = await result?.audio;
  const metadata = result?.ttsMetadata;
  assert(audioChunks.length > 1, "fake stream emits incremental audio");
  assertEqual(
    aggregate?.size,
    audioChunks.at(-1)?.cumulativeSize,
    "fake-stream aggregate is retained on StreamResult",
  );
  assertEqual(
    metadata?.attempted,
    true,
    "fake-stream metadata records attempt",
  );
  assertEqual(metadata?.success, true, "fake-stream metadata records success");
  assertEqual(
    typeof generatedOptions === "string"
      ? generatedOptions
      : generatedOptions?.tts,
    undefined,
    "fake generation still avoids duplicate synthesis",
  );
});

await test("provider fake stream records structured TTS failure metadata", async () => {
  const { handler } = makeStubHandler({
    synthesize: async () => {
      throw new Error("offline fake-stream synthesis failure");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => {
    throw new Error("real streaming unavailable in offline stub");
  });
  const generate = stub(provider, "generate", async () =>
    makeGenerateResult("Failure sentence."),
  );
  let result: StreamResult | undefined;

  await withStubs([generate, execute], async () => {
    result = await provider.stream({
      input: { text: "offline" },
      tts: { enabled: true, provider: PROVIDER },
    });
    for await (const _chunk of result.stream) {
      // Drain the fake stream to finalize audio and metadata.
    }
  });

  assertEqual(await result?.audio, undefined, "total failure has no aggregate");
  assertEqual(
    result?.ttsMetadata?.attempted,
    true,
    "fake-stream metadata records the synthesis attempt",
  );
  assertEqual(
    result?.ttsMetadata?.success,
    false,
    "fake-stream total failure records an unsuccessful outcome",
  );
  assertEqual(
    result?.ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "fake-stream total failure records a structured error",
  );
  assertIncludes(
    result?.ttsMetadata?.error?.message ?? "",
    "segment 1",
    "fake-stream total failure identifies the failed segment",
  );
});

await test("provider fake-stream audio follows the drain-first contract", async () => {
  const { handler } = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => {
    throw new Error("real streaming unavailable in offline stub");
  });
  const generate = stub(provider, "generate", async () =>
    makeGenerateResult("Deferred sentence."),
  );
  let result: StreamResult | undefined;

  await withStubs([generate, execute], async () => {
    result = await provider.stream({
      input: { text: "offline" },
      tts: { enabled: true, provider: PROVIDER },
    });
    const audioPromise = result.audio;
    assertNotNull(audioPromise, "Mode 2 exposes an audio promise");
    assert(
      typeof audioPromise.then === "function",
      "Mode 2 audio is promise-like",
    );
    const timeout = Symbol("audio-timeout");
    const beforeDrain = await Promise.race([
      audioPromise,
      new Promise<typeof timeout>((resolve) =>
        setTimeout(() => resolve(timeout), 50),
      ),
    ]);
    assertEqual(
      beforeDrain,
      timeout,
      "lazy Mode 2 audio remains pending until the stream is drained",
    );
    for await (const _chunk of result.stream) {
      // Drain the lazy stream to trigger synthesis and finalize the aggregate.
    }
    assert(
      (await audioPromise)?.size !== undefined,
      "Mode 2 audio settles with the aggregate after the stream is drained",
    );
  });
});

await test("Mode 2 audio resolves when setup falls back before iteration", async () => {
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const setupFailure = await createOfflineProvider(neurolink);
  const setup = stub(setupFailure, "setupToolExecutor", () => {
    throw new Error("offline setup failure");
  });
  const fallbackProvider = {
    stream: async () => ({
      stream: makeTextStream("fallback text"),
      provider: "openai",
      model: "gpt-4o-mini",
    }),
  } as unknown as AIProvider;
  let factoryCalls = 0;
  const create = stub(AIProviderFactory, "createProvider", async () =>
    ++factoryCalls === 1 ? setupFailure : fallbackProvider,
  );
  let result: StreamResult | undefined;

  await withStubs([create, setup], async () => {
    result = await neurolink.stream({
      input: { text: "offline" },
      provider: "openai",
      model: "gpt-4o-mini",
      tts: { enabled: true, useAiResponse: true, provider: PROVIDER },
    });
    for await (const _chunk of result.stream) {
      // Drain the fallback stream before observing the deferred audio result.
    }
  });

  const timeout = Symbol("audio-timeout");
  const audioPromise = result?.audio;
  assertNotNull(
    audioPromise,
    "Mode 2 exposes a pending audio promise after setup failure",
  );
  assert(
    typeof audioPromise.then === "function",
    "Mode 2 setup-failure audio is promise-like",
  );
  const settled = await Promise.race([
    audioPromise,
    new Promise<typeof timeout>((resolve) =>
      setTimeout(() => resolve(timeout), 50),
    ),
  ]);
  assert(
    settled !== timeout,
    "Mode 2 audio promise settles after setup failure",
  );
  assertEqual(settled, undefined, "failed pre-iteration setup has no audio");
});

await test("consumer early-break stops queued TTS ingestion after one dispatched segment", async () => {
  const providerName = uniqueProvider("queued-cancel");
  const synthesizeCalls: string[] = [];
  let releaseFirstSynthesis = () => {};
  const firstSynthesisMayFinish = new Promise<void>((resolve) => {
    releaseFirstSynthesis = resolve;
  });
  let releaseDispatchedSynthesis = () => {};
  const dispatchedSynthesisMayFinish = new Promise<void>((resolve) => {
    releaseDispatchedSynthesis = resolve;
  });
  let markDispatchedSynthesisStarted = () => {};
  const dispatchedSynthesisStarted = new Promise<void>((resolve) => {
    markDispatchedSynthesisStarted = resolve;
  });
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      synthesizeCalls.push(text);
      if (synthesizeCalls.length === 1) {
        await firstSynthesisMayFinish;
      }
      if (synthesizeCalls.length === 3) {
        markDispatchedSynthesisStarted();
        await dispatchedSynthesisMayFinish;
        throw new Error("already-dispatched synthesis failed after break");
      }
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(providerName, handler);

  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const sourceChunkCount = 8;
  let sourceNexts = 0;
  let sourceReturns = 0;
  const source = {
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      sourceNexts++;
      if (sourceNexts <= sourceChunkCount) {
        return Promise.resolve({
          done: false as const,
          value: { content: `Queued sentence ${sourceNexts}. ` },
        });
      }
      return new Promise<IteratorResult<{ content: string }>>(() => {});
    },
    async return() {
      sourceReturns++;
      releaseDispatchedSynthesis();
      return { done: true as const, value: undefined };
    },
  };
  const execute = stub(provider, "executeStream", async () => ({
    stream: source,
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  let sourceChunksSeen = 0;

  await withStubs([create, execute], async () => {
    const result = await neurolink.stream({
      input: { text: "offline" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: {
        enabled: true,
        useAiResponse: true,
        provider: providerName,
        streamingBufferSize: 1,
      },
    });
    for await (const chunk of result.stream) {
      if (isTTSAudioChunk(chunk)) {
        await dispatchedSynthesisStarted;
        break;
      }
      sourceChunksSeen++;
      if (sourceChunksSeen === sourceChunkCount) {
        releaseFirstSynthesis();
      }
    }
  });

  assertEqual(
    sourceChunksSeen,
    sourceChunkCount,
    "all later sentence chunks were queued before the consumer break",
  );
  assertEqual(sourceReturns, 1, "early-break closes the queued source once");
  assertEqual(
    synthesizeCalls.length,
    3,
    "two calls expose the first audio and one already-dispatched call is the post-cancel billing ceiling",
  );
  assertEqual(
    synthesizeCalls.join("|"),
    "Queued sentence 1.|Queued sentence 2.|Queued sentence 3.",
    "queued sentences after the already-dispatched segment are never synthesized",
  );
});

await test("consumer early-break releases source and audio iterators", async () => {
  const synthesizeCalls: string[] = [];
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      synthesizeCalls.push(text);
      const buffer = Buffer.from(text);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  let sourceReturns = 0;
  let releaseSource = () => {};
  const sourceMayAdvance = new Promise<void>((resolve) => {
    releaseSource = resolve;
  });
  const source = (async function* () {
    try {
      yield { content: "First sentence. " };
      yield { content: "Second sentence. tail remainder" };
      await sourceMayAdvance;
      yield { content: "not consumed" };
    } finally {
      sourceReturns++;
    }
  })();
  const execute = stub(provider, "executeStream", async () => ({
    stream: source,
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  let audioReturns = 0;
  const realSynthesizeStream = TTSProcessor.synthesizeStream.bind(TTSProcessor);
  const synthesizeStream = stub(
    TTSProcessor,
    "synthesizeStream",
    (...args: Parameters<typeof TTSProcessor.synthesizeStream>) => {
      // yield* forwards next/return/throw to the real generator; an early
      // consumer return() reaches finally with exhausted still false.
      async function* countingWrapper() {
        let exhausted = false;
        try {
          yield* realSynthesizeStream(...args);
          exhausted = true;
        } finally {
          if (!exhausted) {
            audioReturns++;
          }
        }
      }
      return countingWrapper();
    },
  );
  let audioAfterBreak: Awaited<StreamResult["audio"]> = undefined;

  await withStubs([create, execute, synthesizeStream], async () => {
    const result = await neurolink.stream({
      input: { text: "offline" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: {
        enabled: true,
        useAiResponse: true,
        provider: PROVIDER,
        streamingBufferSize: 10,
      },
    });
    for await (const chunk of result.stream) {
      if (isTTSAudioChunk(chunk)) {
        releaseSource();
        break;
      }
    }
    audioAfterBreak = await result.audio;
  });

  assertEqual(sourceReturns, 1, "early-break closes the source iterator once");
  assertEqual(audioReturns, 1, "early-break closes the audio iterator once");
  assertEqual(
    synthesizeCalls.length,
    2,
    "early-break does not bill an additional tail synthesis",
  );
  assertEqual(
    audioAfterBreak,
    undefined,
    "early-break still settles streamResult.audio",
  );
});

await test("unsupported fake-stream TTS does not attempt synthesis", async () => {
  const noHandler = "tts-provider-without-a-handler";
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => {
    throw new Error("real streaming unavailable in offline stub");
  });
  const generate = stub(provider, "generate", async () =>
    makeGenerateResult("text survives unsupported speech"),
  );
  const synthesizeStream = stub(TTSProcessor, "synthesizeStream", () =>
    (async function* () {
      yield {
        data: Buffer.alloc(0),
        format: "mp3" as const,
        index: 0,
        isFinal: true,
        cumulativeSize: 0,
      };
    })(),
  );
  const output: Array<unknown> = [];

  await withStubs([synthesizeStream, generate, execute], async () => {
    const result = await provider.stream({
      input: { text: "offline" },
      tts: {
        enabled: true,
        useAiResponse: true,
        provider: noHandler,
        streamingBufferSize: 5,
      },
    });
    for await (const chunk of result.stream) {
      output.push(chunk);
    }
  });

  assertEqual(
    synthesizeStream.callCount,
    0,
    "unsupported TTS bypasses the synthesis iterator",
  );
  assert(
    output.some(
      (chunk) =>
        chunk !== null &&
        typeof chunk === "object" &&
        "content" in chunk &&
        typeof chunk.content === "string" &&
        chunk.content.length > 0,
    ),
    "unsupported TTS preserves text output",
  );
});

await test("audio failure retains the already-emitted aggregate", async () => {
  const { handler } = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, handler);
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const partial = Buffer.from("partial-audio");
  const synthesizeStream = stub(TTSProcessor, "synthesizeStream", () =>
    (async function* () {
      yield {
        data: partial,
        format: "mp3" as const,
        index: 0,
        isFinal: false,
        cumulativeSize: partial.length,
      };
      throw new Error("later audio failure");
    })(),
  );
  const execute = stub(provider, "executeStream", async () => ({
    stream: makeTextStream("First sentence. "),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  let result: StreamResult | undefined;

  await withStubs([create, execute, synthesizeStream], async () => {
    result = await neurolink.stream({
      input: { text: "offline" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: { enabled: true, useAiResponse: true, provider: PROVIDER },
    });
    for await (const _chunk of result.stream) {
      // Drain through the graceful audio-error path.
    }
  });

  assertEqual(
    (await result?.audio)?.size,
    partial.length,
    "partial emitted audio remains available as the aggregate",
  );
  assertEqual(
    result?.ttsMetadata?.success,
    false,
    "a later audio failure marks the aggregate as partial",
  );
  assertEqual(
    result?.ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "the later audio failure records a structured error",
  );
  assertIncludes(
    result?.ttsMetadata?.error?.message ?? "",
    "1 segment",
    "the later audio failure records a failed-segment count",
  );
});

await test("empty text is rejected before any handler runs", async () => {
  const { handler, calls } = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, handler);
  let code: string | undefined;
  try {
    await TTSProcessor.synthesize("", PROVIDER, {});
  } catch (err) {
    code = err instanceof TTSError ? err.code : undefined;
  }
  assertEqual(
    code,
    TTS_ERROR_CODES.EMPTY_TEXT,
    "empty text raises TTS_EMPTY_TEXT",
  );
  // The point of validating first is not to spend a paid API call proving the
  // input was empty.
  assertEqual(calls.length, 0, "handler was never invoked");
});

await test("whitespace-only text counts as empty", async () => {
  const { handler } = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, handler);
  let code: string | undefined;
  try {
    await TTSProcessor.synthesize("   \n\t  ", PROVIDER, {});
  } catch (err) {
    code = err instanceof TTSError ? err.code : undefined;
  }
  assertEqual(
    code,
    TTS_ERROR_CODES.EMPTY_TEXT,
    "whitespace-only input is treated as empty",
  );
});

await test("an unsupported provider raises a typed error", async () => {
  let code: string | undefined;
  let message = "";
  try {
    await TTSProcessor.synthesize("hello", "no-such-provider", {});
  } catch (err) {
    code = err instanceof TTSError ? err.code : undefined;
    message = err instanceof Error ? err.message : "";
  }
  assertEqual(
    code,
    TTS_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "unknown provider raises TTS_PROVIDER_NOT_SUPPORTED",
  );
  assertIncludes(
    message,
    "no-such-provider",
    "the error names the provider that was asked for",
  );
});

await test("text beyond the handler's limit is rejected", async () => {
  const { handler, calls } = makeStubHandler({
    maxTextLength: 10,
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  let code: string | undefined;
  try {
    await TTSProcessor.synthesize("x".repeat(50), PROVIDER, {});
  } catch (err) {
    code = err instanceof TTSError ? err.code : undefined;
  }
  assertEqual(
    code,
    TTS_ERROR_CODES.TEXT_TOO_LONG,
    "over-long text raises TTS_TEXT_TOO_LONG",
  );
  assertEqual(calls.length, 0, "handler was never invoked");
});

await test("an unconfigured provider is rejected before synthesis", async () => {
  // Registration and configuration are separate states: a handler can be
  // registered at startup and only later discover it has no credentials.
  // Failing here rather than inside the provider is what turns a vendor auth
  // error into an actionable "set the API keys".
  const { handler, calls } = makeStubHandler({
    isConfigured: () => false,
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  let code: string | undefined;
  try {
    await TTSProcessor.synthesize("hello", PROVIDER, {});
  } catch (err) {
    code = err instanceof TTSError ? err.code : undefined;
  }
  assertEqual(
    code,
    TTS_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    "unconfigured provider raises TTS_PROVIDER_NOT_CONFIGURED",
  );
  assertEqual(calls.length, 0, "handler was never invoked");
});

await test("length is validated before configuration", async () => {
  // Ordering is observable, so pin it: an over-long text sent to an
  // unconfigured provider must report the text problem the caller can fix
  // from the input, not a credentials problem that is beside the point.
  const { handler } = makeStubHandler({
    isConfigured: () => false,
    maxTextLength: 10,
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  let code: string | undefined;
  try {
    await TTSProcessor.synthesize("x".repeat(50), PROVIDER, {});
  } catch (err) {
    code = err instanceof TTSError ? err.code : undefined;
  }
  assertEqual(
    code,
    TTS_ERROR_CODES.TEXT_TOO_LONG,
    "the text-length failure wins over the configuration failure",
  );
});

await test("a handler failure surfaces as a typed TTSError", async () => {
  // A raw vendor error escaping synthesize() would force every caller to
  // string-match on provider-specific messages.
  const { handler } = makeStubHandler({
    synthesize: async () => {
      throw new Error("upstream vendor exploded");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  let code: string | undefined;
  let isTyped = false;
  let message = "";
  try {
    await TTSProcessor.synthesize("hello", PROVIDER, {});
  } catch (err) {
    isTyped = err instanceof TTSError;
    code = err instanceof TTSError ? err.code : undefined;
    message = err instanceof Error ? err.message : "";
  }
  assert(isTyped, "a raw handler error is wrapped rather than leaked");
  assertEqual(
    code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "handler failure raises TTS_SYNTHESIS_FAILED",
  );
  // The original cause has to survive the wrapping, or the wrap has destroyed
  // the only information that explains the failure.
  assertIncludes(
    message,
    "upstream vendor exploded",
    "the underlying reason is preserved in the wrapped error",
  );
});

await test("a voice-resolution failure propagates rather than being swallowed", async () => {
  // An empty voice list and a failed voice lookup are different outcomes; a
  // handler that swallowed the error would render the second as the first,
  // and a caller would show the user "no voices available" for what is really
  // an outage.
  const { handler } = makeStubHandler({
    getVoices: async () => {
      throw new Error("voice catalogue unavailable");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(PROVIDER, handler);
  const resolved = TTSProcessor.getHandler(PROVIDER);
  let message = "";
  try {
    await resolved?.getVoices?.("en-US");
  } catch (err) {
    message = err instanceof Error ? err.message : "";
  }
  assertIncludes(
    message,
    "voice catalogue unavailable",
    "the failure reaches the caller instead of becoming an empty list",
  );
});

await test("re-registering a provider replaces the previous handler", () => {
  // Registration is a Map insert, so a second registration must win rather
  // than silently keeping the first — otherwise a host that swaps credentials
  // at runtime keeps using the stale handler.
  const first = makeStubHandler();
  const second = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, first.handler);
  TTSProcessor.registerHandler(PROVIDER, second.handler);
  assertEqual(
    TTSProcessor.getHandler(PROVIDER),
    second.handler,
    "the later registration wins",
  );
});

await test("getVoices reaches the handler", async () => {
  const { handler } = makeStubHandler();
  TTSProcessor.registerHandler(PROVIDER, handler);
  const resolved = TTSProcessor.getHandler(PROVIDER);
  assert(resolved !== undefined, "handler resolves");
  const voices = await resolved?.getVoices?.("en-US");
  assert(Array.isArray(voices) && voices.length > 0, "voices are returned");
});

// --- TTS-008 (#479): OpenAI format mapping -----------------------------------

await test("#479: flac is a real OpenAI response_format and must not downgrade to mp3", async () => {
  // Exercised off the prototype so no API key / constructor side effects are
  // needed — mapFormat and effectiveFormat are pure.
  const proto = OpenAITTS.prototype as unknown as {
    mapFormat: (f: string) => string;
    effectiveFormat: (f: string) => string;
  };
  const roundTrip = (f: string) => {
    const wire = proto.mapFormat.call({}, f);
    return { wire, back: proto.effectiveFormat.call({}, wire) };
  };

  // flac is BOTH a valid TTSAudioFormat and a documented OpenAI
  // response_format, yet it used to fall through to the mp3 coercion branch —
  // a caller asking for lossless silently received lossy.
  assertEqual(roundTrip("flac").wire, "flac", "flac reaches the API as flac");
  assertEqual(
    roundTrip("flac").back,
    "flac",
    "TTSResult.format reports flac, not mp3",
  );

  // Unchanged mappings.
  assertEqual(roundTrip("mp3").wire, "mp3", "mp3 unchanged");
  assertEqual(roundTrip("wav").wire, "wav", "wav unchanged");
  assertEqual(roundTrip("ogg").wire, "opus", "ogg still maps to opus");
  assertEqual(roundTrip("pcm16").wire, "pcm", "pcm16 still maps to pcm");
  assertEqual(
    roundTrip("pcm16").back,
    "pcm16",
    "pcm round-trips back to pcm16 so callers do not mislabel raw bytes",
  );

  // m4a is in TTSAudioFormat (it is an STT input format) but OpenAI TTS cannot
  // produce it — coercing to mp3 with a warning stays correct.
  assertEqual(
    roundTrip("m4a").wire,
    "mp3",
    "a format OpenAI genuinely cannot produce still coerces to mp3",
  );
});

try {
  await runSuite();
} finally {
  restoreTTSRegistry(registrySnapshot);
}

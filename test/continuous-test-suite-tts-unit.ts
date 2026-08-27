#!/usr/bin/env tsx
/**
 * Continuous Test Suite: public TTS behavior plus deterministic chunking.
 *
 * Covers TTS-027 (#527), and the no-key half of TTS-028 (#528).
 *
 * The direct `synthesizeStream` cases use the rule-15 determinism exception
 * only for the handler-synthesis seam: exact provider text caps,
 * surrogate-pair-safe splitting, per-segment failure isolation, and OpenAI
 * response-body bytes/format metadata that cannot be observed separately at
 * the public aggregate. Native dispatch, global chunk normalization, failure
 * metadata, and transport abort all drive the shipped `NeuroLink.stream()`
 * surface through `makeTextStream`. The OpenAITTS format-mapping case reaches
 * the private pure `mapFormat`/`effectiveFormat` methods so it can pin wire
 * behavior without credentials or constructor side effects. The auto-provider
 * case must stub the internal health selector before any public provider
 * surface exists; these narrow exceptions keep one module graph and make the
 * suite credential-free and deterministic.
 *
 * One more seam case sits under the same exception: `shouldStop` is
 * `TTSProcessor.synthesizeStream`'s fourth parameter and has no public
 * counterpart — `interleaveTTSStream` flips its own flag only in a `finally`,
 * after the consumer is gone — so the "a segment failure is still reported
 * once shouldStop() flips" cases can only be driven directly.
 *
 * The OpenAI request-timeout case drives the exported `OpenAITTS` handler's
 * own `synthesize()` with `setTimeout`/`clearTimeout` observed, because the
 * property under test is *when* the request timeout is disarmed relative to
 * the body download. The alternative is a test that really waits 30 seconds
 * to find out; determinism buys a millisecond-scale proof of the same scope.
 *
 * The compile-only proofs below assert nothing at runtime; they exist so
 * `pnpm run check:tools-tests`, which typechecks this file against the built
 * `dist` types, fails if the public TTS type surface regresses.
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
  getMetricsAggregator,
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
  TTSProvider,
  TTSStreamChunk,
} from "../dist/index.js";
import { stub, withStubs } from "./helpers/stubs.js";

// `offline: true` — this suite registers stub handlers and drives
// createOfflineProvider; nothing in it touches a network. A test that never
// finishes here is therefore a hang in the code under test, so the harness
// reports a per-test timeout as a failure rather than the default skip.
const { test, runSuite } = defineSuite("TTSProcessor (unit)", {
  offline: true,
});

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

// Compile-only compatibility proof: adding an optional native capability must
// not require existing custom handlers to implement or stub it.
const nonNativeHandlerCompileProof: TTSHandler = {
  isConfigured: () => true,
  synthesize: async () => ({
    buffer: Buffer.alloc(0),
    format: "mp3",
    size: 0,
  }),
};
void nonNativeHandlerCompileProof;

// ---------------------------------------------------------------------------
// #481 / Critical Rule 5 — compile-only proof that adding the OPTIONAL
// `synthesizeStream` member cannot break a consumer whose handler already
// carries a member of that name with an unrelated shape. Narrowing the member
// to `AsyncIterable<TTSChunk>` makes all three of these stop compiling, on the
// source types and on the emitted `dist/index.d.ts` alike.
//
// Each is assigned THROUGH A VARIABLE on purpose: excess-property checking
// only applies to a fresh object literal, so a check that passed on a literal
// would say nothing about a real consumer's existing handler object.
// ---------------------------------------------------------------------------
const legacyChunkHandlerSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  // The package's OWN exported legacy chunk type: `format` is `string`, and
  // `timestampMs` has no counterpart on `TTSChunk`.
  synthesizeStream: (text: string): AsyncIterable<TTSStreamChunk> =>
    (async function* () {
      yield {
        data: Buffer.from(text),
        index: 0,
        isFinal: true,
        format: "mp3",
        timestampMs: 0,
      };
    })(),
};
const legacyChunkHandlerCompileProof: TTSHandler = legacyChunkHandlerSource;
void legacyChunkHandlerCompileProof;

const wideFormatHandlerSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  // Hand-written, no package type imported: `format` widens to `string`.
  async *synthesizeStream(text: string) {
    yield { data: Buffer.from(text), index: 0, isFinal: true, format: "mp3" };
  },
};
const wideFormatHandlerCompileProof: TTSHandler = wideFormatHandlerSource;
void wideFormatHandlerCompileProof;

class UnrelatedMemberHandler {
  isConfigured(): boolean {
    return true;
  }
  async synthesize(text: string) {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  }
  // Same name, entirely unrelated element type.
  async *synthesizeStream(): AsyncGenerator<Buffer> {
    yield Buffer.alloc(1);
  }
}
const unrelatedMemberHandlerCompileProof: TTSHandler =
  new UnrelatedMemberHandler();
void unrelatedMemberHandlerCompileProof;

// The canonical shape must keep compiling too — widening the member is not a
// licence to stop accepting what the processor actually consumes.
const canonicalNativeHandlerSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  synthesizeStream: (text: string): AsyncIterable<TTSChunk> | undefined =>
    (async function* () {
      yield {
        data: Buffer.from(text),
        format: "mp3" as const,
        index: 0,
        isFinal: false,
      };
    })(),
};
const canonicalNativeHandlerCompileProof: TTSHandler =
  canonicalNativeHandlerSource;
void canonicalNativeHandlerCompileProof;

// ---------------------------------------------------------------------------
// #481 / Critical Rule 5 — the shapes a DECLARED SIGNATURE cannot accept.
//
// The three proofs above all return an async iterable of something, so they
// pass under any member type wide enough in its element position. They are
// therefore blind to the larger class: a legacy member of this name that is
// not an async iterable at all. Every shape below compiles against
// `origin/release`, and every one of them is rejected by a declared method
// signature — including a deliberately wide one such as
// `(...args: never[]) => unknown`, which still cannot accept the boolean.
// That is why `TTSHandler.synthesizeStream` is declared `unknown`.
//
// Assigned THROUGH A VARIABLE, as above, except the final pair: those are
// fresh object literals, so excess-property checking applies to them and they
// additionally prove the member must stay DECLARED rather than be removed
// from the type.
// ---------------------------------------------------------------------------
const syncGeneratorMemberSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  // Iterable, not AsyncIterable.
  *synthesizeStream(text: string): Generator<Buffer> {
    yield Buffer.from(text);
  },
};
const syncGeneratorMemberCompileProof: TTSHandler = syncGeneratorMemberSource;
void syncGeneratorMemberCompileProof;

const promiseOfIterableMemberSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  // An `async` method returning a promise OF an async iterable — the exact
  // runtime shape this processor already tolerates by falling back.
  async synthesizeStream(text: string): Promise<AsyncIterable<Buffer>> {
    return (async function* () {
      yield Buffer.from(text);
    })();
  },
};
const promiseOfIterableMemberCompileProof: TTSHandler =
  promiseOfIterableMemberSource;
void promiseOfIterableMemberCompileProof;

const voidSinkMemberSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  // The callback-style streaming API that predates async iterators.
  synthesizeStream(_text: string, _sink?: (chunk: Buffer) => void): void {},
};
const voidSinkMemberCompileProof: TTSHandler = voidSinkMemberSource;
void voidSinkMemberCompileProof;

const promiseVoidSinkMemberSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  async synthesizeStream(
    _text: string,
    _sink?: (chunk: Buffer) => void,
  ): Promise<void> {},
};
const promiseVoidSinkMemberCompileProof: TTSHandler =
  promiseVoidSinkMemberSource;
void promiseVoidSinkMemberCompileProof;

const booleanFlagMemberSource = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  // A capability FLAG: a name collision with no function at all.
  synthesizeStream: false,
};
const booleanFlagMemberCompileProof: TTSHandler = booleanFlagMemberSource;
void booleanFlagMemberCompileProof;

// Fresh object literals: excess-property checking applies. Removing the member
// from `TTSHandler` instead of declaring it `unknown` would break these, which
// is why the member stays declared.
const freshLiteralFlagCompileProof: TTSHandler = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  synthesizeStream: false,
};
void freshLiteralFlagCompileProof;

const freshLiteralSinkCompileProof: TTSHandler = {
  isConfigured: () => true,
  synthesize: async (text: string) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3" as const, size: buffer.length };
  },
  synthesizeStream(_text: string): void {},
};
void freshLiteralSinkCompileProof;

// ---------------------------------------------------------------------------
// #481 / Critical Rule 5 — compile-only proof that the two deprecated voice
// types keep their ORIGINAL shapes. Re-declaring them as `= TTSHandler` /
// `= TTSChunk` aliases is source-breaking for existing external callers:
// `TTSHandler` requires `isConfigured`, and `TTSChunk` narrows `format` to
// `TTSAudioFormat` and has no `timestampMs`. Everything below compiles on
// `origin/release` and must keep compiling; `pnpm run check:tools-tests`
// typechecks this file against the built `dist` types, so an alias
// reintroduced here fails that gate rather than passing silently.
// ---------------------------------------------------------------------------
const legacyTTSProviderCompileProof: TTSProvider = {
  // The old member set: no `isConfigured`, required `getVoices`, required
  // `maxTextLength`, and a `synthesizeStream` that always returns an iterable.
  synthesize: async (text) => {
    const buffer = Buffer.from(text);
    return { buffer, format: "mp3", size: buffer.length };
  },
  synthesizeStream: (text) =>
    (async function* () {
      yield {
        data: Buffer.from(text),
        index: 0,
        isFinal: true,
        format: "mp3",
        timestampMs: 0,
      };
    })(),
  getVoices: async () => [],
  maxTextLength: 4096,
};
void legacyTTSProviderCompileProof;

// Four separate literals: TypeScript reports at most one error per object
// literal, so folding these together would let a regression hide behind the
// first one it happens to trip.
const legacyChunkWithTimestamp: TTSStreamChunk = {
  data: Buffer.alloc(2),
  index: 0,
  isFinal: false,
  format: "mp3",
  timestampMs: 120,
};
void legacyChunkWithTimestamp;

const legacyChunkWithWideFormat: TTSStreamChunk = {
  data: Buffer.alloc(1),
  index: 1,
  isFinal: true,
  // `string`, not `TTSAudioFormat` — the old type was deliberately wide.
  format: String("mp3"),
  sampleRate: 24000,
};
void legacyChunkWithWideFormat;

function readLegacyChunkOffset(chunk: TTSStreamChunk): number | undefined {
  return chunk.timestampMs;
}
void readLegacyChunkOffset;

/**
 * A native stream that completes without producing a fragment. Written as a
 * hand-rolled iterable rather than an empty `async function*` so it does not
 * trip `require-yield`.
 */
function emptyNativeStream(): AsyncIterable<TTSChunk> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: async () => ({ done: true, value: undefined }),
    }),
  };
}

/** A native stream whose first read rejects with a raw, unshaped transport error. */
function failingNativeStream(message: string): AsyncIterable<TTSChunk> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => Promise.reject(new Error(message)),
    }),
  };
}

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

/**
 * Drive the public stream and abandon it after `audioChunkLimit` audio chunks,
 * recording the full chunk-type sequence.
 *
 * `streamResult.audio` is deliberately never awaited: this models a consumer
 * that walked away mid-response, which is the whole point of the cases that
 * use it. Pass `Number.POSITIVE_INFINITY` to drain instead.
 */
async function runPublicTtsStreamUntilAudio(
  tts: NonNullable<StreamOptions["tts"]>,
  responseText: string | string[],
  audioChunkLimit: number,
): Promise<{
  ttsAudioChunks: Array<{ type: "tts_audio"; audio: TTSChunk }>;
  chunkTypes: string[];
  textContent: string;
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

  const ttsAudioChunks: Array<{ type: "tts_audio"; audio: TTSChunk }> = [];
  const chunkTypes: string[] = [];
  let textContent = "";

  await withStubs([create, execute], async () => {
    const result = await neurolink.stream({
      input: { text: "exercise public streaming TTS" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts,
    });
    for await (const chunk of result.stream) {
      if (isTTSAudioChunk(chunk)) {
        chunkTypes.push("tts_audio");
        ttsAudioChunks.push(chunk);
        if (ttsAudioChunks.length >= audioChunkLimit) {
          break;
        }
        continue;
      }
      if (
        chunk !== null &&
        typeof chunk === "object" &&
        "content" in chunk &&
        typeof chunk.content === "string"
      ) {
        chunkTypes.push("text");
        textContent += chunk.content;
        continue;
      }
      chunkTypes.push("other");
    }
  });

  return { ttsAudioChunks, chunkTypes, textContent };
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

await test("#481: stream() prefers native chunks and normalizes their global metadata", async () => {
  const provider = uniqueProvider("native-order");
  const fallbackCalls: string[] = [];
  const nativeCalls: string[] = [];
  const nativeBytes = [
    Buffer.from("alpha"),
    Buffer.from("beta"),
    Buffer.from("gamma"),
  ];
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      fallbackCalls.push(text);
      const buffer = Buffer.from("buffered-fallback");
      return { buffer, format: "mp3", size: buffer.length };
    },
    synthesizeStream: (text: string) => {
      nativeCalls.push(text);
      return (async function* () {
        for (const [index, data] of nativeBytes.entries()) {
          yield {
            data,
            format: "mp3",
            index: 40 + index,
            isFinal: true,
            cumulativeSize: 999,
            voice: "native-voice",
            sampleRate: 24000,
          };
        }
      })();
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks, resolvedAudio } = await runPublicTtsStream({
    enabled: true,
    provider,
    voice: "requested-voice",
  });
  const audio = ttsAudioChunks.map((chunk) => chunk.audio);

  assertEqual(
    fallbackCalls.length,
    0,
    "native dispatch avoids buffered synthesis",
  );
  assertEqual(
    nativeCalls.length,
    1,
    "one buffered text segment enters the native stream",
  );
  assertEqual(
    audio.length,
    3,
    "one text segment exposes all three provider reads",
  );
  assertEqual(
    Buffer.concat(audio.map((chunk) => chunk.data)).toString(),
    "alphabetagamma",
    "provider byte order survives public streaming",
  );
  assertEqual(
    audio.map((chunk) => chunk.index).join(","),
    "0,1,2",
    "provider-local indexes are normalized globally",
  );
  assertEqual(
    audio.map((chunk) => chunk.cumulativeSize).join(","),
    "5,9,14",
    "cumulative size is recomputed from emitted bytes",
  );
  assertEqual(
    audio.filter((chunk) => chunk.isFinal).length,
    1,
    "exactly one normalized chunk is final",
  );
  assertEqual(
    audio.at(-1)?.isFinal,
    true,
    "the last normalized chunk is final",
  );
  assertEqual(
    resolvedAudio?.buffer.toString(),
    "alphabetagamma",
    "the public aggregate preserves native bytes",
  );
  assertEqual(
    resolvedAudio?.sampleRate,
    24000,
    "the public aggregate preserves native sample rate",
  );
});

await test("#481: a later native segment failure retains partial audio and structured metadata", async () => {
  const provider = uniqueProvider("native-failure");
  const { handler } = makeStubHandler({
    maxTextLength: 7,
    synthesizeStream: (text: string) =>
      (async function* () {
        yield {
          data: Buffer.from(`${text}:a`),
          format: "mp3",
          index: 90,
          isFinal: false,
        };
        if (text === "Second.") {
          throw new Error("native segment failure");
        }
        yield {
          data: Buffer.from(`${text}:b`),
          format: "mp3",
          index: 91,
          isFinal: true,
        };
      })(),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(provider, handler);

  const { ttsAudioChunks, resolvedAudio, ttsMetadata } =
    await runPublicTtsStream(
      { enabled: true, provider, streamingBufferSize: 1 },
      "First. Second.",
    );
  const audio = ttsAudioChunks.map((chunk) => chunk.audio);

  assertEqual(
    audio.length,
    3,
    "successful reads before the later failure remain visible",
  );
  assertEqual(
    Buffer.concat(audio.map((chunk) => chunk.data)).toString(),
    "First.:aFirst.:bSecond.:a",
    "partial native bytes retain segment and read order",
  );
  assertEqual(
    audio.filter((chunk) => chunk.isFinal).length,
    1,
    "partial output still has one final chunk",
  );
  assertEqual(
    audio.at(-1)?.isFinal,
    true,
    "the last retained partial chunk is final",
  );
  assertEqual(
    resolvedAudio?.buffer.toString(),
    "First.:aFirst.:bSecond.:a",
    "the aggregate retains partial native bytes",
  );
  assertEqual(
    ttsMetadata?.success,
    false,
    "the aggregate records the later native failure",
  );
  assertEqual(
    ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "native failure uses the structured synthesis code",
  );
  assertIncludes(
    ttsMetadata?.error?.message ?? "",
    "segment 2",
    "native failure identifies the failed segment",
  );
});

await test("#481: OpenAI mocked response reads preserve bytes and proven format metadata", async () => {
  const handler = new OpenAITTS("offline-test-key");
  const streamMethod = handler.synthesizeStream.bind(handler);
  const responseBytes = [
    [Buffer.from([1, 2]), Buffer.from([3]), Buffer.from([4, 5])],
    [Buffer.from([6]), Buffer.from([7, 8]), Buffer.from([9])],
  ];
  let responseIndex = 0;
  const fetchStub = stub(
    globalThis,
    "fetch",
    async (..._args: Parameters<typeof fetch>) => {
      const chunks = responseBytes[responseIndex++];
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(chunk);
            }
            controller.close();
          },
        }),
        { status: 200 },
      );
    },
  );
  await withStubs([fetchStub], async () => {
    for (const [caseIndex, format] of (["mp3", "pcm16"] as const).entries()) {
      const iterable = streamMethod.call(handler, "mocked speech", { format });
      assertNotNull(iterable, `${format} returns a native iterable`);
      const chunks: TTSChunk[] = [];
      for await (const chunk of iterable) {
        chunks.push(chunk);
      }
      const expected = Buffer.concat(responseBytes[caseIndex]);
      assert(
        Buffer.concat(chunks.map((chunk) => chunk.data)).equals(expected),
        `${format} preserves response-body byte order`,
      );
      assertEqual(
        chunks.every((chunk) => chunk.format === format),
        true,
        `${format} metadata is preserved on every read`,
      );
      assertEqual(
        chunks.every((chunk) => chunk.sampleRate === 24000),
        true,
        `${format} sample rate is preserved on every read`,
      );
      assertEqual(
        chunks.length,
        responseBytes[caseIndex].length,
        `${format} yields one chunk per non-empty body read`,
      );
      // No provider-side finality hold: marking the last read would mean
      // holding one read back until the next arrives, delaying every fragment
      // by a full body read. TTSProcessor recomputes finality globally.
      assertEqual(
        chunks.some((chunk) => chunk.isFinal),
        false,
        `${format} native reads leave finality to the processor`,
      );
      assertEqual(
        chunks.map((chunk) => chunk.index).join(","),
        responseBytes[caseIndex].map((_, i) => i).join(","),
        `${format} provider-local indexes are sequential`,
      );
    }

    const unsupported = streamMethod.call(handler, "mocked speech", {
      format: "wav",
    });
    assertEqual(
      unsupported,
      undefined,
      "an unproven format selects the buffered fallback",
    );
  });
  assertEqual(
    fetchStub.callCount,
    2,
    "only the two proven native formats reached mocked fetch",
  );
});

await test("#481: consumer early-break aborts the active OpenAI response read", async () => {
  const ttsProvider = uniqueProvider("native-abort");
  TTSProcessor.registerHandler(ttsProvider, new OpenAITTS("offline-test-key"));
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => ({
    stream: makeTextStream("Abort this sentence."),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );
  let transportAborted = false;
  let observedSignal: AbortSignal | undefined;
  const fetchStub = stub(
    globalThis,
    "fetch",
    async (...args: Parameters<typeof fetch>) => {
      const init = args[1];
      observedSignal = init?.signal ?? undefined;
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(Buffer.from("first"));
          controller.enqueue(Buffer.from("second"));
          controller.enqueue(Buffer.from("third"));
          observedSignal?.addEventListener(
            "abort",
            () => {
              transportAborted = true;
              if (!settled) {
                settled = true;
                controller.error(new DOMException("aborted", "AbortError"));
              }
            },
            { once: true },
          );
          timer = setTimeout(() => {
            if (!settled) {
              settled = true;
              controller.close();
            }
          }, 200);
          timer.unref?.();
        },
        cancel() {
          if (timer) {
            clearTimeout(timer);
          }
        },
      });
      return new Response(body, { status: 200 });
    },
  );
  let audioChunksSeen = 0;

  await withStubs([fetchStub, create, execute], async () => {
    const result = await neurolink.stream({
      input: { text: "offline" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: { enabled: true, provider: ttsProvider },
    });
    for await (const chunk of result.stream) {
      if (isTTSAudioChunk(chunk)) {
        audioChunksSeen += 1;
        break;
      }
    }
  });

  assertEqual(
    audioChunksSeen,
    1,
    "public streaming exposes audio before the mocked body completes",
  );
  assertEqual(
    fetchStub.callCount,
    1,
    "the native segment made one mocked HTTP request",
  );
  assertEqual(
    observedSignal?.aborted,
    true,
    "the request controller is synchronously aborted",
  );
  assertEqual(
    transportAborted,
    true,
    "the active mocked response read observes abort",
  );
});

await test("#481: a native segment records the same tts.synthesize span a buffered segment does", async () => {
  const countSynthesisSpans = () =>
    getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;

  const bufferedProvider = uniqueProvider("span-buffered");
  const { handler: bufferedHandler } = makeStubHandler();
  TTSProcessor.registerHandler(bufferedProvider, bufferedHandler);
  getMetricsAggregator().reset();
  await runPublicTtsStream({ enabled: true, provider: bufferedProvider });
  const bufferedSpans = countSynthesisSpans();

  const nativeProvider = uniqueProvider("span-native");
  const { handler: nativeHandler } = makeStubHandler({
    synthesizeStream: (text: string) =>
      (async function* () {
        yield {
          data: Buffer.from(text),
          format: "mp3",
          index: 0,
          isFinal: false,
        };
      })(),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(nativeProvider, nativeHandler);
  getMetricsAggregator().reset();
  await runPublicTtsStream({ enabled: true, provider: nativeProvider });
  const nativeSpans = countSynthesisSpans();

  assertEqual(bufferedSpans, 1, "the buffered path records one synthesis span");
  assertEqual(
    nativeSpans,
    bufferedSpans,
    "the native path records the same span count",
  );
});

await test("#481: a native transport failure keeps the buffered path's error shape", async () => {
  const bufferedProvider = uniqueProvider("shape-buffered");
  const { handler: bufferedHandler } = makeStubHandler({
    synthesize: async () => {
      throw new Error("transport went away");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(bufferedProvider, bufferedHandler);
  const buffered = await runPublicTtsStream({
    enabled: true,
    provider: bufferedProvider,
  });

  const nativeProvider = uniqueProvider("shape-native");
  const { handler: nativeHandler } = makeStubHandler({
    synthesizeStream: () => failingNativeStream("transport went away"),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(nativeProvider, nativeHandler);
  const native = await runPublicTtsStream({
    enabled: true,
    provider: nativeProvider,
  });

  assertEqual(
    buffered.ttsMetadata?.error?.retriable,
    true,
    "the buffered path marks a raw transport failure retriable",
  );
  assertEqual(
    native.ttsMetadata?.error?.retriable,
    true,
    "the native path marks the same failure retriable",
  );
  assertEqual(
    native.ttsMetadata?.error?.code,
    buffered.ttsMetadata?.error?.code,
    "both paths report the same structured code",
  );
  assertIncludes(
    native.ttsMetadata?.error?.message ?? "",
    "TTS synthesis failed for provider",
    "the native path keeps the provider-qualified message prefix",
  );
});

await test("#481: native fragments reach the consumer while the response body is still open", async () => {
  const ttsProvider = uniqueProvider("incremental-delivery");
  TTSProcessor.registerHandler(ttsProvider, new OpenAITTS("offline-test-key"));
  const neurolink = new NeuroLink({ conversationMemory: { enabled: false } });
  const provider = await createOfflineProvider(neurolink);
  const execute = stub(provider, "executeStream", async () => ({
    stream: makeTextStream("Deliver this sentence."),
    provider: "openai",
    model: "gpt-4o-mini",
  }));
  const create = stub(
    AIProviderFactory,
    "createProvider",
    async () => provider,
  );

  // The mocked body delivers exactly two reads and then parks. It only closes
  // once the consumer has actually been handed audio — so a delivery path that
  // waits for body completion cannot satisfy it, and the watchdog fires
  // instead of the run hanging.
  let releaseBody: () => void = () => {};
  const bodyParked = new Promise<void>((resolve) => {
    releaseBody = resolve;
  });
  let bodyClosed = false;
  let watchdogFired = false;
  const fetchStub = stub(globalThis, "fetch", async () => {
    let reads = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (reads >= 2) {
          const watchdog = setTimeout(() => {
            watchdogFired = true;
            releaseBody();
          }, 5000);
          watchdog.unref?.();
          await bodyParked;
          clearTimeout(watchdog);
          bodyClosed = true;
          controller.close();
          return;
        }
        reads += 1;
        controller.enqueue(Buffer.from([reads]));
      },
    });
    return new Response(body, { status: 200 });
  });

  let chunksBeforeBodyClose = 0;
  let totalAudioChunks = 0;
  await withStubs([fetchStub, create, execute], async () => {
    const result = await neurolink.stream({
      input: { text: "offline" },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      tts: { enabled: true, provider: ttsProvider, format: "mp3" },
    });
    for await (const chunk of result.stream) {
      if (isTTSAudioChunk(chunk)) {
        totalAudioChunks += 1;
        if (!bodyClosed) {
          chunksBeforeBodyClose += 1;
        }
        releaseBody();
      }
    }
  });

  assertEqual(
    watchdogFired,
    false,
    "audio was delivered without waiting on the parked-body watchdog",
  );
  assertEqual(
    chunksBeforeBodyClose,
    1,
    "one fragment reached the consumer while the body was still open",
  );
  assertEqual(
    totalAudioChunks,
    2,
    "both body reads still reach the consumer overall",
  );
});

await test("#481: a native stream that yields no audio falls back to buffered synthesis", async () => {
  const ttsProvider = uniqueProvider("native-empty");
  const { handler, calls } = makeStubHandler({
    synthesizeStream: () => emptyNativeStream(),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { ttsAudioChunks, resolvedAudio, ttsMetadata } =
    await runPublicTtsStream({ enabled: true, provider: ttsProvider });
  const audio = ttsAudioChunks.map((chunk) => chunk.audio);

  assertEqual(calls.length, 1, "the segment is served by buffered synthesis");
  assertEqual(audio.length, 1, "the buffered fallback produces a chunk");
  assertEqual(
    audio.filter((chunk) => chunk.isFinal).length,
    1,
    "exactly one chunk is final",
  );
  assertEqual(
    ttsMetadata?.success,
    true,
    "the run is not reported as an unexplained failure",
  );
  assertNotNull(resolvedAudio, "the aggregate resolves with buffered audio");
  assertEqual(
    resolvedAudio?.size,
    audio[0]?.data.length,
    "the aggregate carries the buffered bytes",
  );
});

await test("#481: a malfunctioning native method degrades to the buffered path", async () => {
  const brokenNativeMethods: Array<
    [string, () => AsyncIterable<TTSChunk> | undefined]
  > = [
    [
      "throwing",
      () => {
        throw new Error("native setup went wrong");
      },
    ],
    [
      "non-iterable",
      () => ({ iterable: false }) as unknown as AsyncIterable<TTSChunk>,
    ],
  ];

  for (const [label, synthesizeStream] of brokenNativeMethods) {
    const ttsProvider = uniqueProvider(`broken-native-${label}`);
    const { handler, calls } = makeStubHandler({
      synthesizeStream,
    } as Partial<TTSHandler>);
    TTSProcessor.registerHandler(ttsProvider, handler);

    const { ttsAudioChunks, ttsMetadata } = await runPublicTtsStream({
      enabled: true,
      provider: ttsProvider,
    });
    const audio = ttsAudioChunks.map((chunk) => chunk.audio);

    assertEqual(
      calls.length,
      1,
      `a ${label} native method falls back to buffered synthesis`,
    );
    assertEqual(
      audio.length,
      1,
      `a ${label} native method still delivers the segment's audio`,
    );
    assertEqual(
      audio.filter((chunk) => chunk.isFinal).length,
      1,
      `a ${label} native method still yields exactly one final chunk`,
    );
    assertEqual(
      ttsMetadata?.success,
      true,
      `a ${label} native method does not fail the segment`,
    );
  }
});

await test("#481: a discovery failure that cannot be stringified still falls back to buffered synthesis", async () => {
  const hostile = {
    [Symbol.toPrimitive]() {
      throw Object.create(null);
    },
  };
  const ttsProvider = uniqueProvider("hostile-discovery");
  const { handler, calls } = makeStubHandler({});
  Object.defineProperty(handler, "synthesizeStream", {
    configurable: true,
    get() {
      throw hostile;
    },
  });
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { ttsAudioChunks, ttsMetadata } = await runPublicTtsStream({
    enabled: true,
    provider: ttsProvider,
  });
  const audio = ttsAudioChunks.map((chunk) => chunk.audio);

  assertEqual(
    calls.length,
    1,
    "an unprintable discovery failure falls back to buffered synthesis",
  );
  assertEqual(
    audio.length,
    1,
    "an unprintable discovery failure still delivers the segment's audio",
  );
  assertEqual(
    audio.filter((chunk) => chunk.isFinal).length,
    1,
    "an unprintable discovery failure still yields exactly one final chunk",
  );
  assertEqual(
    ttsMetadata?.success,
    true,
    "an unprintable discovery failure does not fail the segment",
  );
});

await test("#481: a native failure that cannot be stringified still fails the segment shaped", async () => {
  const hostile = {
    [Symbol.toPrimitive]() {
      throw Object.create(null);
    },
  };
  const ttsProvider = uniqueProvider("hostile-native-failure");
  const { handler } = makeStubHandler({
    synthesizeStream: async function* hostileStream() {
      yield* [];
      throw hostile;
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { ttsMetadata } = await runPublicTtsStream({
    enabled: true,
    provider: ttsProvider,
  });

  assertEqual(
    typeof ttsMetadata?.error?.code,
    "string",
    "an unprintable native failure still reports a structured code",
  );
  assertEqual(
    ttsMetadata?.error?.retriable,
    true,
    "an unprintable native failure keeps the retriable flag",
  );
});

await test("#481: a value masquerading as a shaped error is not passed through", async () => {
  const ttsProvider = uniqueProvider("masquerade-shaped");
  const { handler } = makeStubHandler({
    synthesize: async () => {
      throw makeMasqueradeTTSError();
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { ttsMetadata } = await runPublicTtsStream({
    enabled: true,
    provider: ttsProvider,
  });

  assertEqual(
    typeof ttsMetadata?.error?.code,
    "string",
    "a masquerading error is re-shaped with a structured code",
  );
  assertEqual(
    ttsMetadata?.error?.retriable,
    true,
    "a masquerading error keeps the retriable flag",
  );
});

// ---------------------------------------------------------------------------
// Hostile thrown VALUES, as distinct from values that merely refuse to
// stringify. The case above throws something whose `Symbol.toPrimitive` traps;
// the three factories below break the other reads a shaper performs — the
// `.message` accessor a structured-error constructor copies, and the prototype
// lookup every `instanceof` needs. Each one previously reached the public
// generator raw, or cost the failure its `retriable` flag.
//
// None of the assertions below quote the value they exercise: a hostile
// payload in an assertion message can match the harness's expected-provider
// patterns and downgrade a genuine failure to a skip.

/**
 * An `Error` whose `.message` is a throwing accessor. It passes `instanceof
 * Error`, so a shaper accepts it, and then detonates on the very next read.
 */
function makeUnreadableError(): Error {
  const error = new Error("never read");
  Object.defineProperty(error, "message", {
    configurable: true,
    get() {
      throw Object.create(null);
    },
  });
  return error;
}

/** A `Proxy` whose prototype trap throws, so `instanceof` itself detonates. */
function makeProtoTrapProxy(): object {
  return new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error("proto trap");
      },
    },
  );
}

/** A revoked `Proxy`: every internal method, `instanceof` included, throws. */
function makeMasqueradeTTSError(): object {
  return new Proxy(Object.create(null) as object, {
    getPrototypeOf() {
      return TTSError.prototype;
    },
    get() {
      throw Object.create(null);
    },
  });
}

function makeRevokedProxy(): object {
  const { proxy, revoke } = Proxy.revocable({}, {});
  revoke();
  return proxy;
}

/**
 * Drive the public stream for a handler that fails, and report whether
 * anything escaped without letting the escaping value near an assertion
 * message.
 */
async function runHostileFailureCase(
  ttsProvider: string,
): Promise<{ escaped: boolean; ttsMetadata: StreamResult["ttsMetadata"] }> {
  try {
    const { ttsMetadata } = await runPublicTtsStream({
      enabled: true,
      provider: ttsProvider,
    });
    return { escaped: false, ttsMetadata };
  } catch {
    return { escaped: true, ttsMetadata: undefined };
  }
}

await test("#481: a native failure whose message accessor throws still fails the segment shaped", async () => {
  const ttsProvider = uniqueProvider("unreadable-native-failure");
  const { handler } = makeStubHandler({
    synthesizeStream: async function* unreadableStream() {
      yield* [];
      throw makeUnreadableError();
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { escaped, ttsMetadata } = await runHostileFailureCase(ttsProvider);

  assertEqual(
    escaped,
    false,
    "an unreadable native failure does not reach the consumer raw",
  );
  assertEqual(
    ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "an unreadable native failure still reports the synthesis code",
  );
  assertEqual(
    ttsMetadata?.error?.retriable,
    true,
    "an unreadable native failure keeps the retriable flag",
  );
});

await test("#481: a buffered failure whose message accessor throws still fails the segment shaped", async () => {
  const ttsProvider = uniqueProvider("unreadable-buffered-failure");
  // No native member at all: this is the path that predates native streaming.
  const { handler } = makeStubHandler({
    synthesize: async () => {
      throw makeUnreadableError();
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { escaped, ttsMetadata } = await runHostileFailureCase(ttsProvider);

  assertEqual(
    escaped,
    false,
    "an unreadable buffered failure does not reach the consumer raw",
  );
  assertEqual(
    ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "an unreadable buffered failure still reports the synthesis code",
  );
  assertEqual(
    ttsMetadata?.error?.retriable,
    true,
    "an unreadable buffered failure keeps the retriable flag",
  );
});

await test("#481: a native failure thrown as a prototype-trap proxy keeps its shaped semantics", async () => {
  const ttsProvider = uniqueProvider("proto-trap-native-failure");
  const { handler } = makeStubHandler({
    synthesizeStream: async function* protoTrapStream() {
      yield* [];
      throw makeProtoTrapProxy();
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { escaped, ttsMetadata } = await runHostileFailureCase(ttsProvider);

  assertEqual(
    escaped,
    false,
    "a prototype-trap failure does not reach the consumer raw",
  );
  assertEqual(
    ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "a prototype-trap failure still reports the synthesis code",
  );
  assertEqual(
    ttsMetadata?.error?.retriable,
    true,
    "a prototype-trap failure keeps the retriable flag",
  );
});

await test("#481: a native failure thrown as a revoked proxy keeps its shaped semantics", async () => {
  const ttsProvider = uniqueProvider("revoked-proxy-native-failure");
  const { handler } = makeStubHandler({
    synthesizeStream: async function* revokedProxyStream() {
      yield* [];
      throw makeRevokedProxy();
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { escaped, ttsMetadata } = await runHostileFailureCase(ttsProvider);

  assertEqual(
    escaped,
    false,
    "a revoked-proxy failure does not reach the consumer raw",
  );
  assertEqual(
    ttsMetadata?.error?.code,
    TTS_ERROR_CODES.SYNTHESIS_FAILED,
    "a revoked-proxy failure still reports the synthesis code",
  );
  assertEqual(
    ttsMetadata?.error?.retriable,
    true,
    "a revoked-proxy failure keeps the retriable flag",
  );
});

await test("#481: hostile transport failures are shaped by the OpenAI handler, not passed through", async () => {
  const handler = new OpenAITTS("offline-test-key");
  const cases: Array<{ label: string; make: () => unknown }> = [
    { label: "unreadable-message", make: makeUnreadableError },
    { label: "prototype-trap", make: makeProtoTrapProxy },
    { label: "revoked-handle", make: makeRevokedProxy },
    { label: "masquerade-tts-error", make: makeMasqueradeTTSError },
  ];

  for (const { label, make } of cases) {
    for (const route of ["buffered", "native"] as const) {
      const fetchStub = stub(
        globalThis,
        "fetch",
        async (..._args: Parameters<typeof fetch>) => {
          throw make();
        },
      );
      let shapedCode: unknown;
      let shapedRetriable: unknown;
      let passedThrough = false;

      await withStubs([fetchStub], async () => {
        try {
          if (route === "buffered") {
            await handler.synthesize("hostile transport case");
          } else {
            const iterable = handler.synthesizeStream(
              "hostile transport case",
              { format: "mp3" },
            );
            assertNotNull(
              iterable,
              `the ${route} route offers a native stream`,
            );
            for await (const _chunk of iterable) {
              void _chunk;
            }
          }
        } catch (error) {
          // Even asking the question has to be guarded here: `instanceof` is
          // exactly what a revoked handle refuses to answer.
          let shaped: boolean;
          try {
            shaped = error instanceof TTSError;
          } catch {
            shaped = false;
          }
          if (shaped) {
            const ttsError = error as TTSError;
            shapedCode = ttsError.code;
            shapedRetriable = ttsError.retriable;
          } else {
            passedThrough = true;
          }
        }
      });

      assertEqual(
        passedThrough,
        false,
        `the ${label} value on the ${route} route is not passed through unshaped`,
      );
      assertEqual(
        shapedCode,
        TTS_ERROR_CODES.SYNTHESIS_FAILED,
        `the ${label} value on the ${route} route reports the synthesis code`,
      );
      assertEqual(
        shapedRetriable,
        true,
        `the ${label} value on the ${route} route keeps the retriable flag`,
      );
    }
  }
});

/**
 * An `Error` whose named accessor answers the first read and throws on every
 * one after it. Checking a value and using it are two separate reads, so a
 * guard that only proves the first read succeeds still hands a live grenade
 * to whatever reads it next.
 */
function makeOneShotUnreadableError(property: "message" | "stack"): Error {
  const error = new Error("first read only");
  const answer = property === "message" ? "first read only" : error.stack;
  let reads = 0;
  Object.defineProperty(error, property, {
    configurable: true,
    get() {
      if (reads++ === 0) {
        return answer;
      }
      throw Object.create(null);
    },
  });
  return error;
}

await test("#481: a failure whose accessor answers once and then throws still fails the segment shaped", async () => {
  for (const property of ["message", "stack"] as const) {
    const ttsProvider = uniqueProvider(`one-shot-${property}`);
    const { handler } = makeStubHandler({
      synthesizeStream: async function* oneShotStream() {
        yield* [];
        throw makeOneShotUnreadableError(property);
      },
    } as Partial<TTSHandler>);
    TTSProcessor.registerHandler(ttsProvider, handler);

    const { escaped, ttsMetadata } = await runHostileFailureCase(ttsProvider);

    assertEqual(
      escaped,
      false,
      `a one-shot ${property} accessor does not reach the consumer raw`,
    );
    assertEqual(
      ttsMetadata?.error?.code,
      TTS_ERROR_CODES.SYNTHESIS_FAILED,
      `a one-shot ${property} accessor still reports the synthesis code`,
    );
    assertEqual(
      ttsMetadata?.error?.retriable,
      true,
      `a one-shot ${property} accessor keeps the retriable flag`,
    );
  }
});

await test("#481: zero-length native fragments never reach the consumer", async () => {
  const ttsProvider = uniqueProvider("empty-fragment");
  const { handler } = makeStubHandler({
    synthesizeStream: () =>
      (async function* () {
        yield {
          data: Buffer.from("ab"),
          format: "mp3",
          index: 0,
          isFinal: false,
        };
        yield {
          data: Buffer.alloc(0),
          format: "mp3",
          index: 1,
          isFinal: false,
        };
        yield {
          data: Buffer.from("cd"),
          format: "mp3",
          index: 2,
          isFinal: true,
        };
      })(),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  const { ttsAudioChunks } = await runPublicTtsStream({
    enabled: true,
    provider: ttsProvider,
  });
  const audio = ttsAudioChunks.map((chunk) => chunk.audio);

  assertEqual(audio.length, 2, "only the non-empty fragments are delivered");
  assertEqual(
    audio.some((chunk) => chunk.data.length === 0),
    false,
    "no delivered chunk is empty",
  );
  assertEqual(
    audio.map((chunk) => chunk.index).join(","),
    "0,1",
    "global indexes stay sequential across the dropped fragment",
  );
  assertEqual(
    audio.map((chunk) => chunk.cumulativeSize).join(","),
    "2,4",
    "cumulative size is strictly increasing",
  );
});

await test("#481: a recorded segment failure is reported even after shouldStop() flips", async () => {
  const ttsProvider = uniqueProvider("stop-suppression");
  const { handler } = makeStubHandler({
    synthesize: async () => {
      throw new Error("segment went wrong");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  // The first segment fails and is recorded; only then does shouldStop() flip.
  // Gating the trailing throw on it silently dropped an already-recorded
  // failure for any caller driving `shouldStop` directly.
  let stop = false;
  async function* lateStopText(): AsyncGenerator<string> {
    yield "First. ";
    stop = true;
  }

  let delivered = 0;
  let failure: unknown;
  try {
    for await (const chunk of TTSProcessor.synthesizeStream(
      lateStopText(),
      ttsProvider,
      { streamingBufferSize: 1 },
      () => stop,
    )) {
      void chunk;
      delivered += 1;
    }
  } catch (error) {
    failure = error;
  }

  assertEqual(delivered, 0, "the failed segment produced no audio");
  assertNotNull(failure, "the recorded segment failure is surfaced");
  assertEqual(
    (failure as Error).name,
    "IncrementalTTSSynthesisError",
    "the failure keeps its structured incremental-synthesis shape",
  );
  assertEqual(
    ((failure as { failedSegments?: readonly number[] }).failedSegments ?? [])
      .length,
    1,
    "one segment is reported as failed",
  );
});

await test("#481: a native segment records its tts.synthesize span when the consumer breaks mid-segment", async () => {
  const countSynthesisSpans = () =>
    getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;

  // One text segment either way, so both paths attempt exactly one synthesis
  // and owe exactly one span. The native stream carries three fragments, so
  // the segment is still in flight when the consumer walks away: the generator
  // is resumed with a `return` completion at its yield, which is the path that
  // used to skip span recording entirely.
  const bufferedProvider = uniqueProvider("break-span-buffered");
  const { handler: bufferedHandler } = makeStubHandler();
  TTSProcessor.registerHandler(bufferedProvider, bufferedHandler);
  getMetricsAggregator().reset();
  const buffered = await runPublicTtsStreamUntilAudio(
    { enabled: true, provider: bufferedProvider },
    "Alpha.",
    1,
  );
  const bufferedSpans = countSynthesisSpans();

  const nativeProvider = uniqueProvider("break-span-native");
  const { handler: nativeHandler } = makeStubHandler({
    synthesizeStream: (text: string) =>
      (async function* () {
        for (let index = 0; index < 3; index += 1) {
          yield {
            data: Buffer.from(`${text}-${index}`),
            format: "mp3",
            index,
            isFinal: false,
          };
        }
      })(),
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(nativeProvider, nativeHandler);
  getMetricsAggregator().reset();
  const native = await runPublicTtsStreamUntilAudio(
    { enabled: true, provider: nativeProvider },
    "Alpha.",
    1,
  );
  const nativeSpans = countSynthesisSpans();

  assertEqual(
    buffered.ttsAudioChunks.length,
    1,
    "the buffered control stopped after one audio chunk",
  );
  assertEqual(
    native.ttsAudioChunks.length,
    1,
    "the native run stopped after one audio chunk",
  );
  assertEqual(
    bufferedSpans,
    1,
    "the buffered path records one synthesis span for the abandoned segment",
  );
  assertEqual(
    nativeSpans,
    bufferedSpans,
    "the native path records the same span count when the consumer breaks",
  );
});

await test("#481: buffered audio interleaves no later than it does without native streaming", async () => {
  const provider = uniqueProvider("interleave-position");
  const { handler } = makeStubHandler();
  TTSProcessor.registerHandler(provider, handler);

  const { chunkTypes } = await runPublicTtsStreamUntilAudio(
    { enabled: true, provider, streamingBufferSize: 5 },
    ["Alpha. ", "Beta. ", "Gamma. ", "Delta. ", "Epsilon. "],
    1,
  );

  const firstAudioAt = chunkTypes.indexOf("tts_audio");
  assert(firstAudioAt >= 0, "the run produced an audio chunk");
  // origin/release emits [text, text, text, tts_audio] for this input. Every
  // async-generator layer inserted between the text source and the consumer
  // costs the first audio chunk microtask turns and pushes it a further text
  // chunk down the stream, which is exactly what this pins. Arriving EARLIER
  // is fine — the bound is one-sided.
  assert(
    firstAudioAt <= 3,
    `the first audio chunk arrives no later than it does on release: position ${firstAudioAt}`,
  );
});

await test("#481: a segment failure that lands after shouldStop() flips is still reported", async () => {
  const ttsProvider = uniqueProvider("stop-during-failure");
  let stop = false;
  const { handler } = makeStubHandler({
    synthesize: async () => {
      // The flip happens INSIDE the failing synthesis, so `shouldStop()` is
      // already true when the rejection is caught — the ordering the sibling
      // "recorded ... even after shouldStop() flips" case does NOT cover.
      // Suppressing here left a direct caller with silence where release
      // raised IncrementalTTSSynthesisError.
      stop = true;
      throw new Error("segment went wrong");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  async function* stopDuringText(): AsyncGenerator<string> {
    yield "First. ";
  }

  let delivered = 0;
  let failure: unknown;
  try {
    for await (const chunk of TTSProcessor.synthesizeStream(
      stopDuringText(),
      ttsProvider,
      { streamingBufferSize: 1 },
      () => stop,
    )) {
      void chunk;
      delivered += 1;
    }
  } catch (error) {
    failure = error;
  }

  assertEqual(delivered, 0, "the failed segment produced no audio");
  assertNotNull(failure, "a failure landing after the flip is still surfaced");
  assertEqual(
    (failure as Error).name,
    "IncrementalTTSSynthesisError",
    "the failure keeps its structured incremental-synthesis shape",
  );
  assertEqual(
    (
      (failure as { failedSegments?: readonly number[] }).failedSegments ?? []
    ).join(","),
    "1",
    "the failing segment is named",
  );
});

await test("#481: every failed segment is reported, including one that fails after the flip", async () => {
  const ttsProvider = uniqueProvider("stop-partial-report");
  let stop = false;
  let call = 0;
  const { handler } = makeStubHandler({
    synthesize: async () => {
      call += 1;
      if (call === 2) {
        stop = true;
      }
      throw new Error("segment went wrong");
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(ttsProvider, handler);

  async function* twoSegments(): AsyncGenerator<string> {
    yield "First. ";
    yield "Second. ";
  }

  let failure: unknown;
  try {
    for await (const chunk of TTSProcessor.synthesizeStream(
      twoSegments(),
      ttsProvider,
      { streamingBufferSize: 1 },
      () => stop,
    )) {
      void chunk;
    }
  } catch (error) {
    failure = error;
  }

  assertNotNull(failure, "the segment failures are surfaced");
  assertEqual(
    (
      (failure as { failedSegments?: readonly number[] }).failedSegments ?? []
    ).join(","),
    "1,2",
    "the segment that failed after the flip is not dropped from the report",
  );
});

await test("#481: a zero-byte buffered result still reaches the consumer", async () => {
  const provider = uniqueProvider("empty-buffered-result");
  let call = 0;
  const { handler } = makeStubHandler({
    synthesize: async () => {
      call += 1;
      const buffer = call === 2 ? Buffer.alloc(0) : Buffer.from("ab");
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  TTSProcessor.registerHandler(provider, handler);

  // The empty-fragment drop is a NATIVE-path rule. The buffered path forwards
  // whatever `synthesize()` returns and always has, so a zero-byte result is
  // delivered and `cumulativeSize` repeats. Pinned here because the feature
  // docs state the scope of that drop, and an unscoped claim would be false.
  const { ttsAudioChunks } = await runPublicTtsStream(
    { enabled: true, provider, streamingBufferSize: 5 },
    ["Alpha. ", "Beta. ", "Gamma. "],
  );
  const audio = ttsAudioChunks.map((chunk) => chunk.audio);

  assertEqual(audio.length, 3, "every buffered segment yielded a chunk");
  assertEqual(
    audio.filter((chunk) => chunk.data.length === 0).length,
    1,
    "the zero-byte buffered segment reached the consumer",
  );
  assertEqual(
    audio.map((chunk) => chunk.cumulativeSize).join(","),
    "2,2,4",
    "cumulative size repeats across the empty buffered chunk",
  );
});

await test("#481: the OpenAI request timeout is disarmed before the buffered audio download", async () => {
  // The 30-second bound covers getting a response, not downloading one:
  // release cleared it as soon as the fetch settled, so a large but healthy
  // synthesis whose body takes longer than that still succeeds. Observing the
  // arm/disarm order proves the scope in milliseconds instead of waiting 30
  // seconds to watch a download get killed.
  const handler = new OpenAITTS("offline-test-key");
  const events: string[] = [];
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  let requestTimer: unknown;
  let observedSignal: AbortSignal | undefined;

  const setTimeoutStub = stub(globalThis, "setTimeout", ((
    callback: () => void,
    delay?: number,
    ...rest: unknown[]
  ) => {
    const timer = (
      realSetTimeout as unknown as (...args: unknown[]) => unknown
    )(callback, delay, ...rest);
    if (delay === 30000) {
      requestTimer = timer;
      events.push("arm");
    }
    return timer;
  }) as unknown as typeof setTimeout);
  const clearTimeoutStub = stub(globalThis, "clearTimeout", ((
    timer?: unknown,
  ) => {
    if (timer !== undefined && timer === requestTimer) {
      events.push("disarm");
    }
    return (realClearTimeout as unknown as (...args: unknown[]) => void)(timer);
  }) as unknown as typeof clearTimeout);
  const fetchStub = stub(
    globalThis,
    "fetch",
    async (...args: Parameters<typeof fetch>) => {
      observedSignal = args[1]?.signal ?? undefined;
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => {
          events.push("download");
          return new Uint8Array([1, 2, 3, 4]).buffer;
        },
      } as unknown as Response;
    },
  );

  let size: number | undefined;
  await withStubs([setTimeoutStub, clearTimeoutStub, fetchStub], async () => {
    const result = await handler.synthesize("Alpha.", { format: "mp3" });
    size = result.size;
  });

  assertEqual(
    events.join(","),
    "arm,disarm,download",
    "the request timeout is disarmed before the response body is read",
  );
  assertEqual(
    observedSignal?.aborted,
    false,
    "the request signal is not aborted by a completed synthesis",
  );
  assertEqual(size, 4, "the downloaded audio bytes survived");
});

await test("#481: a consumer-injected throw() at a yield propagates to the caller", async () => {
  // `AsyncGenerator.prototype.throw()` resumes a suspended generator by
  // raising the error AT the yield. That error comes from the consumer, not
  // from segment synthesis, and it must leave the stream exactly as it did
  // before this loop was flattened: rejected with the SAME error, then done.
  // When the per-segment try/catch encloses the yields instead, the segment
  // catch swallows it — the parked chunk is re-delivered under its own index,
  // a segment is silently dropped, and the consumer's own error comes back as
  // an `IncrementalTTSSynthesisError` attributed to the provider.
  const nativeFragments = (text: string) =>
    (async function* () {
      const tag = text.trim().slice(0, 1);
      for (let index = 0; index < 3; index += 1) {
        yield { data: Buffer.from(`${tag}${index}`), format: "mp3" as const };
      }
    })();

  for (const label of ["buffered", "native"] as const) {
    const ttsProvider = uniqueProvider(`consumer-throw-${label}`);
    const { handler } = makeStubHandler(
      label === "native"
        ? ({ synthesizeStream: nativeFragments } as Partial<TTSHandler>)
        : {},
    );
    TTSProcessor.registerHandler(ttsProvider, handler);

    const stream = TTSProcessor.synthesizeStream(
      (async function* () {
        yield "Alpha one. ";
        yield "Bravo two. ";
        yield "Charlie three. ";
      })(),
      ttsProvider,
      { streamingBufferSize: 1, format: "mp3" },
    );

    const first = await stream.next();
    assertEqual(first.done, false, `${label}: the first chunk is delivered`);

    const sentinel = new Error("consumer-injected-sentinel");
    let rejectedWith: unknown;
    let settledValue: IteratorResult<TTSChunk> | undefined;
    try {
      settledValue = await stream.throw(sentinel);
    } catch (error) {
      rejectedWith = error;
    }

    assert(
      settledValue === undefined,
      `${label}: throw() does not resume the stream with another chunk`,
    );
    assert(
      rejectedWith === sentinel,
      `${label}: throw() rejects with the consumer's own error identity`,
    );

    const afterThrow = await stream.next();
    assertEqual(
      afterThrow.done,
      true,
      `${label}: the stream is done after a consumer-injected throw`,
    );
  }
});

await test("#481: a handler whose Symbol.asyncIterator read throws serves the buffered path", async () => {
  // `isNativeStream` reads a well-known symbol off the returned value, and
  // that read can execute user code: a throwing getter, or a Proxy trap. When
  // the read sits outside the guarded region every segment is lost with no
  // telemetry and an unshaped error, where the buffered path delivers audio.
  // `cancelStream` and `releaseIterator` guard the identical read.
  const readTraps: Array<[string, () => unknown]> = [
    [
      "throwing-getter",
      () => ({
        get [Symbol.asyncIterator]() {
          throw new Error("symbol read trap");
        },
      }),
    ],
    [
      "revoked-proxy",
      () => {
        const target = (async function* () {
          yield { data: Buffer.from("native"), format: "mp3" as const };
        })();
        const { proxy, revoke } = Proxy.revocable(target, {});
        revoke();
        return proxy;
      },
    ],
  ];

  for (const [label, makeCandidate] of readTraps) {
    const ttsProvider = uniqueProvider(`symbol-read-${label}`);
    const { handler, calls } = makeStubHandler({
      synthesizeStream: makeCandidate,
    } as unknown as Partial<TTSHandler>);
    TTSProcessor.registerHandler(ttsProvider, handler);

    const spansBefore = getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;

    const { ttsAudioChunks, ttsMetadata } = await runPublicTtsStream({
      enabled: true,
      provider: ttsProvider,
    });

    assertEqual(
      calls.length,
      1,
      `${label}: the segment falls back to buffered synthesis`,
    );
    assertEqual(
      ttsAudioChunks.length,
      1,
      `${label}: the segment's audio still reaches the consumer`,
    );
    assertEqual(
      ttsMetadata?.success,
      true,
      `${label}: a bad symbol read does not fail the segment`,
    );

    const spansAfter = getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;
    assertEqual(
      spansAfter - spansBefore,
      1,
      `${label}: the attempted segment still records its tts.synthesize span`,
    );
  }
});

await test("#481: a handler whose synthesizeStream member read throws serves the buffered path", async () => {
  // Discovering the capability starts by READING `synthesizeStream` off the
  // handler, and a property read runs consumer code whenever the member is an
  // accessor or the handler is a Proxy. A read that throws answers the same
  // question a non-callable member answers — the capability is not usable —
  // so the segment belongs on the buffered path. Outside the guard it cost
  // every segment: no audio, no `tts.synthesize` span, and a raw error
  // reaching the caller with neither `code` nor `retriable`.
  const memberTraps: Array<[string, () => ReturnType<typeof makeStubHandler>]> =
    [
      [
        "throwing-getter",
        () => {
          const built = makeStubHandler();
          Object.defineProperty(built.handler, "synthesizeStream", {
            configurable: true,
            enumerable: true,
            get() {
              throw new Error("member getter trap");
            },
          });
          return built;
        },
      ],
      [
        "class-getter-over-absent-client",
        () => {
          // What a provider class looks like when the member is built lazily and
          // the client it needs was never created.
          const built = makeStubHandler();
          Object.defineProperty(built.handler, "synthesizeStream", {
            configurable: true,
            enumerable: true,
            get(this: { streamingClient?: unknown }) {
              if (!this.streamingClient) {
                throw new Error("streaming client not initialised");
              }
              return () => undefined;
            },
          });
          return built;
        },
      ],
      [
        "handler-proxy-get-trap",
        () => {
          const built = makeStubHandler();
          return {
            calls: built.calls,
            handler: new Proxy(built.handler, {
              get(target, property, receiver) {
                if (property === "synthesizeStream") {
                  throw new Error("handler proxy get trap");
                }
                return Reflect.get(target, property, receiver);
              },
            }),
          };
        },
      ],
    ];

  for (const [label, build] of memberTraps) {
    const ttsProvider = uniqueProvider(`member-read-${label}`);
    const { handler, calls } = build();
    TTSProcessor.registerHandler(ttsProvider, handler);

    const spansBefore = getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;

    const { ttsAudioChunks, ttsMetadata } = await runPublicTtsStream({
      enabled: true,
      provider: ttsProvider,
    });

    assertEqual(
      calls.length,
      1,
      `${label}: the segment falls back to buffered synthesis`,
    );
    assertEqual(
      ttsAudioChunks.length,
      1,
      `${label}: the segment's audio still reaches the consumer`,
    );
    assertEqual(
      ttsMetadata?.success,
      true,
      `${label}: a bad member read does not fail the segment`,
    );
    assertEqual(
      ttsMetadata?.error,
      undefined,
      `${label}: a bad member read is not reported to the caller as an error`,
    );

    const spansAfter = getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;
    assertEqual(
      spansAfter - spansBefore,
      1,
      `${label}: the attempted segment still records its tts.synthesize span`,
    );
  }
});

await test("#481: the synthesizeStream member is read exactly once per segment", async () => {
  // The member used to be read twice per segment — a truthiness gate at the
  // call site, then again inside the resolver — so an accessor ran consumer
  // code twice and the value that was TESTED need not be the value that was
  // CALLED. A getter that answers differently on the second read then lost
  // every segment, even though its first answer for each segment was a working
  // native stream. One guarded read per segment is what collapses those two
  // answers into one.
  const ttsProvider = uniqueProvider("member-read-once");
  let memberReads = 0;
  const { handler } = makeStubHandler({
    synthesize: async (text: string) => {
      const buffer = Buffer.from(`buffered:${text}`);
      return { buffer, format: "mp3", size: buffer.length };
    },
  } as Partial<TTSHandler>);
  Object.defineProperty(handler, "synthesizeStream", {
    configurable: true,
    enumerable: true,
    get() {
      memberReads += 1;
      if (memberReads % 2 === 0) {
        throw new Error("member getter trap on an even-numbered read");
      }
      return (text: string) =>
        (async function* () {
          yield { data: Buffer.from(`native:${text}`), format: "mp3" as const };
        })();
    },
  });
  TTSProcessor.registerHandler(ttsProvider, handler);

  const spansBefore = getMetricsAggregator()
    .getSpans()
    .filter((span) => span.name === "tts.synthesize").length;

  const { ttsAudioChunks, ttsMetadata } = await runPublicTtsStream(
    { enabled: true, provider: ttsProvider, streamingBufferSize: 5 },
    ["First sentence. ", "Second sentence. "],
  );

  const spansAfter = getMetricsAggregator()
    .getSpans()
    .filter((span) => span.name === "tts.synthesize").length;

  assertEqual(memberReads, 2, "the member is read once for each of 2 segments");
  assertEqual(
    ttsAudioChunks.length,
    2,
    "a getter that throws on a later read costs no segment",
  );
  assertEqual(ttsMetadata?.success, true, "no segment is reported as failed");
  assertEqual(
    spansAfter - spansBefore,
    2,
    "each segment records exactly one tts.synthesize span",
  );
  // The read that answered is the read that was used: the first segment got
  // the callable, the second got the throw and the buffered path.
  assertEqual(
    ttsAudioChunks.map((chunk) => String(chunk.audio.data)).join("|"),
    "native:First sentence.|buffered:Second sentence.",
    "each segment is served by the value its own single read returned",
  );
});

await test("#481: a throwing isConfigured() is reported the same with and without a native member", async () => {
  // `isConfigured()` is preflight, and preflight is asked on both paths.
  // Declaring the optional native member must not change how a throwing one is
  // reported — before the preflight came under the guard it did: the
  // `tts.synthesize` span disappeared and the error reached the caller
  // unnormalized, carrying neither `code` nor `retriable`.
  const shapes: Array<[string, boolean]> = [
    ["without a native member", false],
    ["with a native member declared", true],
  ];
  const observed: string[] = [];

  for (const [label, declareMember] of shapes) {
    const ttsProvider = uniqueProvider("isconfigured-throws");
    const overrides: Record<string, unknown> = {
      isConfigured: () => {
        throw new Error("credentials store unavailable");
      },
    };
    if (declareMember) {
      overrides.synthesizeStream = (text: string) =>
        (async function* () {
          yield { data: Buffer.from(`native:${text}`), format: "mp3" as const };
        })();
    }
    const { handler } = makeStubHandler(overrides as Partial<TTSHandler>);
    TTSProcessor.registerHandler(ttsProvider, handler);

    const spansBefore = getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;

    const { ttsAudioChunks, ttsMetadata } = await runPublicTtsStream({
      enabled: true,
      provider: ttsProvider,
    });

    const spansAfter = getMetricsAggregator()
      .getSpans()
      .filter((span) => span.name === "tts.synthesize").length;

    assertEqual(
      ttsAudioChunks.length,
      0,
      `${label}: a failed preflight yields no audio`,
    );
    assertEqual(
      spansAfter - spansBefore,
      1,
      `${label}: the attempted segment still records its tts.synthesize span`,
    );
    observed.push(
      [
        ttsMetadata?.success,
        ttsMetadata?.error?.code,
        ttsMetadata?.error?.retriable,
      ].join("/"),
    );
  }

  assertEqual(
    observed[1],
    observed[0],
    "declaring the native member changed how a throwing isConfigured() is reported",
  );
  assertEqual(
    observed[1],
    `false/${TTS_ERROR_CODES.SYNTHESIS_FAILED}/true`,
    "a throwing isConfigured() reaches the caller as a normalized, retriable failure",
  );
});

await test("#481: OpenAI TTS reports latency to first response, not to last body byte", async () => {
  // `metadata.latency` measured time-to-response before this handler was
  // refactored, and it is public: `TTSResult.metadata` reaches callers through
  // `TTSProcessor.synthesize()` and through `generate({ tts })`. Moving the
  // measurement past `arrayBuffer()` silently redefined it as
  // time-to-last-byte. A stubbed clock that only advances during the body read
  // pins the scope in milliseconds instead of downloading anything.
  const handler = new OpenAITTS("offline-test-key");
  let clock = 1_000;
  const BODY_READ_MS = 5_000;

  const dateNowStub = stub(Date, "now", () => clock);
  const fetchStub = stub(globalThis, "fetch", async () => {
    return {
      ok: true,
      status: 200,
      arrayBuffer: async () => {
        clock += BODY_READ_MS;
        return new Uint8Array([1, 2, 3, 4]).buffer;
      },
    } as unknown as Response;
  });

  let latency: number | undefined;
  let size: number | undefined;
  await withStubs([dateNowStub, fetchStub], async () => {
    const result = await handler.synthesize("Alpha.", { format: "mp3" });
    latency = result.metadata?.latency as number | undefined;
    size = result.size;
  });

  assertEqual(
    latency,
    0,
    "reported latency excludes the audio body download entirely",
  );
  assertEqual(size, 4, "the audio body was really downloaded");
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

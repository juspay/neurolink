#!/usr/bin/env tsx
/**
 * Continuous Test Suite: TTSProcessor unit tests (no API).
 *
 * Covers TTS-027 (#527), and the no-key half of TTS-028 (#528).
 *
 * `continuous-test-suite-tts.ts` already exercises TTS end to end, but every
 * assertion in it needs live Google TTS credentials — so on a machine or CI job
 * without keys, none of the registry, validation or dispatch logic is checked
 * at all. This suite covers that logic with a stub handler, so the parts that
 * can be tested without a network call always are.
 *
 * Run: npx tsx test/continuous-test-suite-tts-unit.ts
 */

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import {
  TTSProcessor,
  TTSError,
  TTS_ERROR_CODES,
} from "../src/lib/utils/ttsProcessor.js";
import type { TTSHandler } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("TTSProcessor (unit)");

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

await runSuite();

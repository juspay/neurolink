#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Music dispatch (MusicProcessor, driven end-to-end).
 *
 * Drives the package's public surface: `new NeuroLink().generate({ output:
 * { mode: "music", music: { provider, prompt } } })`. `generateWithMusic()`
 * in `src/lib/neurolink.ts` dispatches straight into `MusicProcessor.generate()`
 * for that call shape — no LLM round-trip, no provider API key, no network
 * call — so every case here runs the real public dispatch path instead of
 * calling `MusicProcessor.generate()` as a static.
 *
 * `MusicProcessor.registerHandler()` is used ONLY as test setup, to inject a
 * synthetic stub handler under a unique provider name; that same name is
 * then passed as `options.output.music.provider` so the public call routes
 * into the stub. Every assertion below reads the value `generate()` actually
 * returned (or threw) — none of them call `MusicProcessor.supports()` /
 * `.getHandler()` / `.generate()` directly. The stub's own `calls` array is
 * the one exception: it plays the same role as `mockFetch`'s captured
 * requests in `continuous-test-suite-providers-mocked.ts` — an observation
 * of what crossed the boundary into the (stubbed) external handler, not an
 * assertion against an internal module.
 *
 * A prior version of this file claimed "generate() has no options-surface
 * hook to inject a stub" and used that as justification for calling
 * MusicProcessor's statics directly. That claim was wrong — the hook is
 * exactly the registerHandler()-then-pass-the-same-name pattern used below.
 *
 * Registry hygiene: `MusicProcessor`'s handler map is a process-wide static.
 * The suite snapshots it before running and restores it verbatim afterward
 * (register-only; the registry exposes no delete, so a full clear + replay
 * is the only way to guarantee no synthetic provider leaks into later
 * suites sharing the process).
 *
 * Coverage note vs. the prior unit suite: two cases are dropped because
 * they are not reachable through any public call — `registerHandler("",
 * handler)` throwing "Provider name is required" and `registerHandler(name,
 * undefined)` throwing "Handler is required". Nothing in `generate()` ever
 * calls `registerHandler()` with caller-supplied arguments; that validation
 * only ever fires from a caller invoking the static directly, which is not
 * a surface this package ships to consumers. Likewise `supports("")`
 * returning false is not independently observable: `generateWithMusic()`
 * guards `!options.output.music.provider` itself (a different error,
 * "output.music.provider is required...") before `MusicProcessor.generate()`
 * — and therefore before `MusicProcessor.supports()` — is ever reached, so
 * that path is covered under its own name below instead of being force-fit
 * onto the old assertion.
 *
 * Imports from ../dist per Rule 15 (tests drive the shipped surface).
 *
 * Run: npx tsx test/continuous-test-suite-music-unit.ts
 */
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import {
  NeuroLink,
  MusicProcessor,
  MusicError,
  MUSIC_ERROR_CODES,
} from "../dist/index.js";
import type { MusicHandler, MusicOptions, MusicResult } from "../dist/index.js";

const { test, section, runSuite } = defineSuite("Music dispatch (generate)", {
  offline: true,
});

function makeStubHandler(overrides: Partial<MusicHandler> = {}): {
  handler: MusicHandler;
  calls: Array<{ options: { prompt: string } & Record<string, unknown> }>;
} {
  const calls: Array<{
    options: { prompt: string } & Record<string, unknown>;
  }> = [];
  const handler: MusicHandler = {
    isConfigured: () => true,
    generate: async (options): Promise<MusicResult> => {
      calls.push({ options });
      return {
        buffer: Buffer.from("fake-audio"),
        format: "mp3",
        size: 10,
        duration: 30,
        // Echoing the received prompt back through metadata.model lets
        // tests observe what the stub was actually called with purely by
        // reading generate()'s returned result.model — no direct read of
        // the stub's internal state required.
        metadata: { latency: 1, model: options.prompt },
      };
    },
    ...overrides,
  };
  return { handler, calls };
}

await runSuite(async () => {
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });

  // Snapshot the pre-suite registry so teardown can restore it exactly,
  // regardless of what any individual test below registers.
  const preSuiteProviders = MusicProcessor.listProviders();
  const preSuiteSnapshot = preSuiteProviders.map(
    (name) => [name, MusicProcessor.getHandler(name)!] as const,
  );

  try {
    section("generate() dispatch — happy path");

    await test("generate() with output.mode=music dispatches to the registered handler", async () => {
      const provider = "unit-test-music-provider";
      const { handler, calls } = makeStubHandler();
      MusicProcessor.registerHandler(provider, handler);

      const result = await nl.generate({
        output: {
          mode: "music",
          music: { provider, prompt: "lofi beat" },
        },
      });

      assertEqual(calls.length, 1, "the stub handler was reached exactly once");
      assertEqual(
        result.provider,
        provider,
        "result.provider echoes the requested music provider",
      );
      assert(
        Buffer.isBuffer(result.music?.buffer),
        "result.music.buffer is the buffer the handler returned",
      );
      assertEqual(
        result.music?.size,
        10,
        "result.music.size is forwarded from the handler's result",
      );
      assertIncludes(
        result.content,
        "mp3",
        "result.content names the format the handler returned",
      );
      assertIncludes(
        result.content,
        "10 bytes",
        "result.content names the byte size the handler returned",
      );
    });

    await test("music.prompt falls back to options.input.text when absent", async () => {
      const provider = "unit-test-music-prompt-fallback";
      const { handler, calls } = makeStubHandler();
      MusicProcessor.registerHandler(provider, handler);

      const result = await nl.generate({
        input: { text: "fallback lofi text" },
        output: {
          mode: "music",
          // No music.prompt — generateWithMusic() must fall back to
          // options.input.text before calling the handler.
          music: { provider } as MusicOptions,
        },
      });

      assertEqual(calls.length, 1, "the handler was still reached");
      // The stub echoes whatever prompt it received into metadata.model,
      // and generateWithMusic() surfaces metadata.model as result.model —
      // so this is a read of generate()'s own return value, not of the
      // stub's internal call log.
      assertEqual(
        result.model,
        "fallback lofi text",
        "the handler received input.text as its prompt",
      );
    });

    await test("a provider name is matched case-insensitively through generate()", async () => {
      const registeredAs = "Unit-Test-Music-Mixed-Case";
      const { handler, calls } = makeStubHandler();
      MusicProcessor.registerHandler(registeredAs, handler);

      const result = await nl.generate({
        output: {
          mode: "music",
          // Deliberately different casing from the registration above.
          music: { provider: registeredAs.toUpperCase(), prompt: "x" },
        },
      });

      assertEqual(
        calls.length,
        1,
        "the handler registered under a different case was still reached",
      );
      assert(
        Buffer.isBuffer(result.music?.buffer),
        "generate() succeeded despite the case mismatch",
      );
    });

    await test("re-registering a provider routes generate() to the later handler", async () => {
      const provider = "unit-test-music-overwrite";
      const { handler: first, calls: firstCalls } = makeStubHandler({
        generate: async (options) => {
          firstCalls.push({ options });
          return {
            buffer: Buffer.from("first"),
            format: "wav",
            size: 5,
          };
        },
      });
      const { handler: second, calls: secondCalls } = makeStubHandler({
        generate: async (options) => {
          secondCalls.push({ options });
          return {
            buffer: Buffer.from("second"),
            format: "flac",
            size: 7,
          };
        },
      });
      MusicProcessor.registerHandler(provider, first);
      MusicProcessor.registerHandler(provider, second);

      const result = await nl.generate({
        output: {
          mode: "music",
          music: { provider, prompt: "x" },
        },
      });

      assertEqual(
        result.music?.format,
        "flac",
        "the later registration's handler answered the request",
      );
      assertEqual(
        firstCalls.length,
        0,
        "the overwritten handler was never reached",
      );
      assertEqual(
        secondCalls.length,
        1,
        "the replacing handler was reached once",
      );
    });

    section("generate() dispatch — validation and error paths");

    await test("a whitespace-only prompt is rejected before any handler runs", async () => {
      const provider = "unit-test-music-empty-prompt";
      const { handler, calls } = makeStubHandler();
      MusicProcessor.registerHandler(provider, handler);

      let code: string | undefined;
      try {
        await nl.generate({
          output: {
            mode: "music",
            music: { provider, prompt: "   " },
          },
        });
      } catch (err) {
        code = err instanceof MusicError ? err.code : undefined;
      }
      assertEqual(
        code,
        MUSIC_ERROR_CODES.PROMPT_REQUIRED,
        "a whitespace-only prompt raises MUSIC_PROMPT_REQUIRED",
      );
      assertEqual(calls.length, 0, "the handler was never invoked");
    });

    await test("an unrecognized provider is rejected without reaching any handler", async () => {
      const unknownProvider = "unit-test-music-unregistered-for-generate";
      let code: string | undefined;
      let message = "";
      try {
        await nl.generate({
          output: {
            mode: "music",
            music: { provider: unknownProvider, prompt: "x" },
          },
        });
      } catch (err) {
        code = err instanceof MusicError ? err.code : undefined;
        message = err instanceof Error ? err.message : "";
      }
      assertEqual(
        code,
        MUSIC_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
        "an unknown provider raises MUSIC_PROVIDER_NOT_SUPPORTED",
      );
      assertIncludes(
        message,
        unknownProvider,
        "the error names the provider that was requested",
      );
    });

    await test("an unconfigured provider is rejected before generation", async () => {
      const provider = "unit-test-music-not-configured";
      const { handler, calls } = makeStubHandler({ isConfigured: () => false });
      MusicProcessor.registerHandler(provider, handler);

      let code: string | undefined;
      try {
        await nl.generate({
          output: {
            mode: "music",
            music: { provider, prompt: "x" },
          },
        });
      } catch (err) {
        code = err instanceof MusicError ? err.code : undefined;
      }
      assertEqual(
        code,
        MUSIC_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        "an unconfigured provider raises MUSIC_PROVIDER_NOT_CONFIGURED",
      );
      assertEqual(calls.length, 0, "the handler was never invoked");
    });

    await test("a duration beyond the handler's maximum is rejected", async () => {
      const provider = "unit-test-music-duration-cap";
      const { handler, calls } = makeStubHandler({ maxDurationSeconds: 60 });
      MusicProcessor.registerHandler(provider, handler);

      let code: string | undefined;
      try {
        await nl.generate({
          output: {
            mode: "music",
            music: { provider, prompt: "x", duration: 90 },
          },
        });
      } catch (err) {
        code = err instanceof MusicError ? err.code : undefined;
      }
      assertEqual(
        code,
        MUSIC_ERROR_CODES.DURATION_INVALID,
        "an over-cap duration raises MUSIC_DURATION_INVALID",
      );
      assertEqual(calls.length, 0, "the handler was never invoked");
    });

    await test("a handler failure surfaces through generate() as a typed MusicError", async () => {
      const provider = "unit-test-music-failing-handler";
      const { handler } = makeStubHandler({
        generate: async () => {
          throw new Error("upstream vendor exploded");
        },
      });
      MusicProcessor.registerHandler(provider, handler);

      let isTyped = false;
      let message = "";
      try {
        await nl.generate({
          output: {
            mode: "music",
            music: { provider, prompt: "x" },
          },
        });
      } catch (err) {
        isTyped = err instanceof MusicError;
        message = err instanceof Error ? err.message : "";
      }
      assert(
        isTyped,
        "a raw handler error is wrapped rather than leaked as-is",
      );
      assertIncludes(
        message,
        "upstream vendor exploded",
        "the underlying reason is preserved in the wrapped error",
      );
    });

    await test("an empty music.provider is rejected before MusicProcessor is consulted", async () => {
      // generateWithMusic() itself guards `!options.output.music.provider`
      // before ever calling MusicProcessor.generate() — so an empty
      // provider surfaces a plain Error from neurolink.ts, not a MusicError
      // from the registry. This is the public-surface analogue of the old
      // "supports('') === false" unit assertion: proof that an empty
      // provider name is rejected, observed at the boundary generate()
      // actually exposes.
      let threw = false;
      let message = "";
      try {
        await nl.generate({
          output: {
            mode: "music",
            music: { provider: "", prompt: "x" },
          },
        });
      } catch (err) {
        threw = true;
        message = err instanceof Error ? err.message : "";
      }
      assert(threw, "an empty music.provider is rejected");
      assertIncludes(
        message,
        "output.music.provider is required",
        "the rejection names the missing field",
      );
    });
  } finally {
    // Restore the process-wide static registry exactly as found. There is
    // no per-key delete on MusicProcessor, so a full clear + replay of the
    // pre-suite snapshot is the only way to guarantee none of this file's
    // synthetic providers leak into a later suite sharing the process.
    MusicProcessor.clearHandlers();
    for (const [name, handler] of preSuiteSnapshot) {
      MusicProcessor.registerHandler(name, handler);
    }
  }
});

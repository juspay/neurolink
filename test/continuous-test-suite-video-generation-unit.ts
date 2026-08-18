#!/usr/bin/env tsx
/**
 * Continuous Test Suite: VideoProcessor, driven through NeuroLink.generate().
 *
 * Public dispatch surface (traced in this branch, not assumed):
 *
 *   NeuroLink.generate({
 *     provider, model,                       // any constructible AI provider
 *     input: { text, images: [buffer] },
 *     output: { mode: "video", video: { provider: <name>, ... } },
 *     region,
 *   })
 *
 * `BaseProvider.generate()` (src/lib/core/baseProvider.ts, `runGenerateInActiveContext`)
 * checks `options.output?.mode === "video"` FIRST and — for a single image/prompt
 * request (no `input.segments`, which would route to the Director multi-clip
 * pipeline instead) — dispatches straight into `handleVideoGeneration()`, which
 * resolves `options.output.video.provider` (default "vertex") via
 * `VideoProcessor.supports()/generate()` and returns. This happens BEFORE any
 * LLM call is made, exactly like the music/avatar dispatch NeuroLink handles
 * itself — the only difference is this particular short-circuit lives one
 * layer down, inside the per-provider `BaseProvider.generate()` rather than in
 * `NeuroLink.generateWithMusic/Avatar()`. A previous version of this file's
 * header claimed "generate() has no options-surface hook to inject a stub" —
 * that claim was wrong (this dispatch path was simply not traced far enough)
 * and has been removed.
 *
 * Because the dispatch happens before any network call, an AI provider only
 * needs to *construct* successfully — a fake API key is enough, no
 * request/response mocking is required (contrast with
 * continuous-test-suite-providers-mocked.ts, which mocks fetch because its
 * subjects DO reach the network). `VideoProcessor.registerHandler(name, stub)`
 * is the public injection hook: register a stub under a synthetic provider
 * name, then request `output.video.provider: <name>` to route the public
 * `generate()` call into it.
 *
 * Coverage that could NOT be preserved through the public surface (reported
 * per CLAUDE.md rule 15 rather than silently dropped):
 *
 *   1. `VideoProcessor.generateTransition()` has NO reachable caller anywhere
 *      in `src/lib/core/baseProvider.ts` or `src/cli/` on this branch. The
 *      only production caller of a video "transition" is the Director
 *      multi-clip pipeline (`src/lib/adapters/video/directorPipeline.ts`,
 *      `generateTransitions()`), and it calls the free function
 *      `generateTransitionWithVertex()` directly — it never goes through
 *      `VideoProcessor`'s provider registry at all. So the five
 *      `generateTransition()` tests from the old suite (dispatch, missing
 *      support, unregistered provider, unconfigured provider) test a method
 *      with zero public callers; they have been dropped rather than kept as
 *      direct static-method assertions, which rule 15 forbids.
 *   2. `VideoProcessor.registerHandler("", handler)` / `registerHandler(name,
 *      undefined)` throwing on bad input is validation of the registration
 *      call itself — `registerHandler` is only ever invoked by a *consumer*
 *      as setup (there is no way to reach it through a `generate()` request
 *      body), so there is no way to observe this via "what came back from
 *      generate()/stream()". Dropped for the same reason as (1).
 *   3. Fidelity reduction (not a full drop): the old suite asserted on the
 *      typed `err.code === VIDEO_ERROR_CODES.X` and `err instanceof
 *      VideoError`. Through the public `generate()` surface, NeuroLink wraps
 *      every provider error into a plain `Error` with a composed message
 *      ("Failed to generate text with all providers. Last error: ...") —
 *      `VideoError`/`VIDEO_ERROR_CODES` are not exposed on the thrown value.
 *      This suite instead matches the distinctive, stable phrase each
 *      VideoError code is known to produce (e.g. "is not registered", "is
 *      not configured") inside that message. This is weaker than asserting
 *      an enum value, but it is everything the public surface exposes.
 *
 * `VideoProcessor.registerHandler`/`clearHandlers` appear below ONLY as
 * setup/teardown; every assertion is on NeuroLink.generate()'s return value
 * or thrown error message.
 *
 * Imports from ../dist per Rule 15 (tests drive the shipped surface).
 *
 * Run: npx tsx test/continuous-test-suite-video-generation-unit.ts
 */
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import { NeuroLink, VideoProcessor } from "../dist/index.js";
import type { VideoGenerationResult, VideoHandler } from "../dist/index.js";

const { test, runSuite } = defineSuite("VideoProcessor (via generate())");

// Video-mode dispatch never reaches the network (BaseProvider short-circuits
// on output.mode === "video" before any LLM call), so the provider only
// needs to *construct*. Force a fake key unconditionally — if that
// short-circuit were ever broken, a real key in the environment would send
// a live, billed request instead of failing loudly.
process.env.OPENAI_API_KEY = "sk-fake-test-key-for-video-dispatch-tests";

const nl = new NeuroLink({ conversationMemory: { enabled: false } });

// Minimal valid PNG signature (8 bytes) — validateImageForVideo() requires
// real magic bytes and a minimum of 8 bytes, so an arbitrary buffer is
// rejected before dispatch ever reaches VideoProcessor.
const VALID_IMAGE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const PROVIDER = "e2e-test-video-provider";

function makeStubHandler(overrides: Partial<VideoHandler> = {}): {
  handler: VideoHandler;
  calls: Array<{
    image: Buffer;
    prompt: string;
    options: unknown;
    region: string | undefined;
  }>;
} {
  const calls: Array<{
    image: Buffer;
    prompt: string;
    options: unknown;
    region: string | undefined;
  }> = [];
  const handler: VideoHandler = {
    isConfigured: () => true,
    generate: async (
      image,
      prompt,
      options,
      region,
    ): Promise<VideoGenerationResult> => {
      calls.push({ image, prompt, options, region });
      return {
        data: Buffer.from("fake-video-bytes"),
        mediaType: "video/mp4",
      };
    },
    ...overrides,
  };
  return { handler, calls };
}

/** Drive the public dispatch path with sensible defaults for the parts of
 * the request that aren't the point of any given test. */
async function generateVideo(
  videoProvider: string,
  overrides: {
    text?: string;
    image?: Buffer | null;
    video?: Record<string, unknown>;
    region?: string;
  } = {},
) {
  const images =
    overrides.image === null ? undefined : [overrides.image ?? VALID_IMAGE];
  return nl.generate({
    provider: "openai",
    model: "gpt-4o-mini",
    input: { text: overrides.text ?? "a scenic prompt", images },
    output: {
      mode: "video",
      video: { provider: videoProvider, ...overrides.video },
    },
    region: overrides.region,
  });
}

async function expectGenerateVideoError(
  videoProvider: string,
  overrides: Parameters<typeof generateVideo>[1] | undefined,
): Promise<string> {
  try {
    await generateVideo(videoProvider, overrides);
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
  throw new Error("expected generate() to reject, but it resolved");
}

// ---------------------------------------------------------------------------
// registerHandler + generate() dispatch
// ---------------------------------------------------------------------------

await test("a registered provider is reachable through generate()", async () => {
  const { handler, calls } = makeStubHandler();
  VideoProcessor.registerHandler(PROVIDER, handler);

  const result = await generateVideo(PROVIDER, { text: "a scenic prompt" });

  assertEqual(calls.length, 1, "handler invoked exactly once");
  assertEqual(
    calls[0]?.prompt,
    "a scenic prompt",
    "prompt forwarded from input.text",
  );
  assert(Buffer.isBuffer(result.video?.data), "video data returned");
  assertEqual(
    result.video?.mediaType,
    "video/mp4",
    "media type forwarded from the handler",
  );
});

await test("provider names are normalized to lowercase for dispatch", async () => {
  const { handler, calls } = makeStubHandler();
  const mixedCase = "E2E-Test-Video-Mixed-Case";
  VideoProcessor.registerHandler(mixedCase, handler);

  await generateVideo(mixedCase.toUpperCase());

  assertEqual(
    calls.length,
    1,
    "dispatch resolves the provider name case-insensitively",
  );
});

await test("re-registering a provider replaces the previous handler for dispatch", async () => {
  const overwriteProvider = "e2e-test-video-overwrite";
  const { handler: first, calls: firstCalls } = makeStubHandler();
  const { handler: second, calls: secondCalls } = makeStubHandler();
  VideoProcessor.registerHandler(overwriteProvider, first);
  VideoProcessor.registerHandler(overwriteProvider, second);

  await generateVideo(overwriteProvider);

  assertEqual(firstCalls.length, 0, "the replaced handler is never invoked");
  assertEqual(secondCalls.length, 1, "the later registration wins");
});

await test("generate() forwards prompt, region and output.video options to the handler", async () => {
  const argsProvider = "e2e-test-video-args";
  const { handler, calls } = makeStubHandler();
  VideoProcessor.registerHandler(argsProvider, handler);

  const result = await generateVideo(argsProvider, {
    text: "a smooth pan across the skyline",
    video: { resolution: "720p" },
    region: "us-central1",
  });

  assertEqual(calls.length, 1, "handler invoked exactly once");
  assertEqual(
    calls[0]?.prompt,
    "a smooth pan across the skyline",
    "prompt forwarded",
  );
  assertEqual(
    calls[0]?.region,
    "us-central1",
    "top-level region option forwarded to the handler",
  );
  assert(Buffer.isBuffer(result.video?.data), "video data returned");
});

// ---------------------------------------------------------------------------
// generate() — error paths, observed via the thrown Error's message
// ---------------------------------------------------------------------------

await test("an unsupported provider raises an error naming it, listing what IS registered", async () => {
  // PROVIDER was registered by the first test above and is still live —
  // its presence in the "Available: ..." list is the public-surface
  // equivalent of the old direct listProviders()/supports() assertions.
  const unknownProvider = "e2e-test-video-unregistered";

  const message = await expectGenerateVideoError(unknownProvider, {});

  assertIncludes(
    message,
    "is not registered",
    "unknown provider is rejected as not registered",
  );
  assertIncludes(
    message,
    unknownProvider,
    "the error names the provider that was asked for",
  );
  assertIncludes(
    message,
    PROVIDER,
    "the availability list still includes an earlier registration",
  );
});

await test("an empty provider name is rejected the same way as an unknown one", async () => {
  const message = await expectGenerateVideoError("", {});

  assertIncludes(
    message,
    "is not registered",
    "empty provider name is never resolvable",
  );
});

await test("an unconfigured provider is rejected before the handler runs", async () => {
  const unconfiguredProvider = "e2e-test-video-not-configured";
  const { handler, calls } = makeStubHandler({ isConfigured: () => false });
  VideoProcessor.registerHandler(unconfiguredProvider, handler);

  const message = await expectGenerateVideoError(unconfiguredProvider, {});

  assertIncludes(
    message,
    "is not configured",
    "unconfigured provider is rejected before generation",
  );
  assertEqual(calls.length, 0, "handler was never invoked");
});

await test("a handler failure surfaces through generate() with the reason preserved", async () => {
  const failingProvider = "e2e-test-video-failing-handler";
  const { handler } = makeStubHandler({
    generate: async () => {
      throw new Error("upstream render farm exploded");
    },
  });
  VideoProcessor.registerHandler(failingProvider, handler);

  const message = await expectGenerateVideoError(failingProvider, {});

  assertIncludes(
    message,
    "Video generation failed for provider",
    "a raw handler error is wrapped with a stable, recognizable phrase",
  );
  assertIncludes(
    message,
    "upstream render farm exploded",
    "the underlying handler failure reason is preserved in the message",
  );
});

// ---------------------------------------------------------------------------
// clearHandlers() — observed by dispatch failing, then succeeding again
// ---------------------------------------------------------------------------

await test("clearHandlers removes every registered provider from dispatch; re-registering restores it", async () => {
  // clearHandlers() wipes the whole process-wide static registry, not just
  // this test's own provider — every provider every earlier test in this
  // file (and the real vertex/kling/runway/replicate handlers that
  // ProviderRegistry auto-registers on first use) goes with it. Snapshot
  // the pre-clear names here purely as restore bookkeeping (never asserted
  // on directly — VideoProcessor.listProviders() is a processor static, and
  // per rule 15 only generate()'s own return/throw is asserted on below).
  const preClearProviders = VideoProcessor.listProviders();

  const clearProvider = "e2e-test-video-clear-target";
  VideoProcessor.registerHandler(clearProvider, makeStubHandler().handler);

  // Sanity: dispatch works before clearing.
  await generateVideo(clearProvider);

  VideoProcessor.clearHandlers();

  const afterClearMessage = await expectGenerateVideoError(clearProvider, {});
  assertIncludes(
    afterClearMessage,
    "is not registered",
    "clearHandlers() makes a previously-dispatchable provider unreachable",
  );

  // getHandler is private on VideoProcessor (unlike the other five media
  // processors), so the original handler instances can't be read back —
  // restore each pre-clear name with a fresh always-succeeding stub instead.
  // Nothing here depends on handler identity, only on the name being
  // dispatchable again — and this process exits at the end of this suite,
  // so it never leaves the real vertex/kling/runway/replicate handlers
  // permanently swapped for stubs in a shared process.
  for (const name of preClearProviders) {
    VideoProcessor.registerHandler(name, makeStubHandler().handler);
  }

  for (const name of preClearProviders) {
    const result = await generateVideo(name);
    assert(
      Buffer.isBuffer(result.video?.data),
      "every pre-clear provider dispatches successfully again after restore",
    );
  }
});

await runSuite();

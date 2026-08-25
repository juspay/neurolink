#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Video generation cancellation (abortSignal).
 *
 * ALL-DIST module graph (rule 15): `VideoProcessor` comes from
 * `../dist/index.js` — the same shipped surface providers and SDK callers
 * use. Determinism note (the rule-15 exception, stated per the repo
 * guideline): cancellation timing cannot be exercised through a live
 * provider call — a real render neither aborts on cue nor does so
 * deterministically — so these cases register stub handlers through the
 * PUBLIC `VideoProcessor.registerHandler()` surface (the exact path
 * `ProviderRegistry._doRegister()` uses) and drive `generate()` /
 * `generateTransition()` end-to-end through the processor. What determinism
 * buys: the suite can prove the processor always hands its handlers a live
 * AbortSignal, that a caller's signal chains through to the handler, and
 * that an abort settles the call in milliseconds instead of the 600s bound.
 *
 * Run: npx tsx test/continuous-test-suite-video-abort.ts
 *      pnpm run test:video-abort
 */
import { defineSuite, logSection, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Video Abort Signal");

// A rejection caused by an abort must land well inside this window — the
// whole point is that cancellation does not wait out the 600s timeout.
const ABORT_SETTLE_BUDGET_MS = 5_000;

type StubOptions = {
  abortSignal?: AbortSignal;
};

const minimalResult = {
  data: Buffer.from("stub-bytes"),
  mediaType: "video/mp4" as const,
};

/** Never settles until the received signal aborts, then rejects. */
function settleOnAbort(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    const fail = (): void => reject(new Error("stub handler observed abort"));
    if (!signal) {
      return; // hangs forever — the suite would time out, failing loudly
    }
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener("abort", fail, { once: true });
  });
}

async function main(): Promise<void> {
  logSection("Video Abort Signal");

  const { VideoProcessor } = await import("../dist/index.js");

  await test("processor always hands the handler a live AbortSignal (the timeout ghost-cancellation channel), even when the caller passes none", async () => {
    let received: StubOptions | undefined;
    VideoProcessor.registerHandler("abort-stub-capture", {
      isConfigured: () => true,
      generate: (
        _image: Buffer,
        _prompt: string,
        options: StubOptions,
      ): Promise<typeof minimalResult> => {
        received = options;
        return Promise.resolve(minimalResult);
      },
    });

    const result = await VideoProcessor.generate("abort-stub-capture", {
      image: Buffer.from("img"),
      prompt: "p",
    });
    assert(result.data.length > 0, "stub result did not round-trip");
    assert(
      received?.abortSignal instanceof AbortSignal,
      "handler did not receive an AbortSignal in its options",
    );
    assert(
      received?.abortSignal?.aborted === false,
      "handler's signal was already aborted before any timeout fired",
    );
  });

  await test("a caller's abort chains through the processor to the handler and settles the call fast", async () => {
    VideoProcessor.registerHandler("abort-stub-caller", {
      isConfigured: () => true,
      generate: (
        _image: Buffer,
        _prompt: string,
        options: StubOptions,
      ): Promise<typeof minimalResult> => settleOnAbort(options.abortSignal),
    });

    const caller = new AbortController();
    const started = Date.now();
    setTimeout(() => caller.abort(), 50);

    let rejected = false;
    try {
      await VideoProcessor.generate("abort-stub-caller", {
        image: Buffer.from("img"),
        prompt: "p",
        abortSignal: caller.signal,
      });
    } catch {
      rejected = true;
    }
    const elapsed = Date.now() - started;
    assert(rejected, "generate resolved despite the caller aborting");
    assert(
      elapsed < ABORT_SETTLE_BUDGET_MS,
      "abort took longer than the settle budget — signal not chained",
    );
  });

  await test("a pre-aborted caller signal rejects generate immediately", async () => {
    VideoProcessor.registerHandler("abort-stub-preaborted", {
      isConfigured: () => true,
      generate: (
        _image: Buffer,
        _prompt: string,
        options: StubOptions,
      ): Promise<typeof minimalResult> => settleOnAbort(options.abortSignal),
    });

    const caller = new AbortController();
    caller.abort();
    const started = Date.now();

    let rejected = false;
    try {
      await VideoProcessor.generate("abort-stub-preaborted", {
        image: Buffer.from("img"),
        prompt: "p",
        abortSignal: caller.signal,
      });
    } catch {
      rejected = true;
    }
    const elapsed = Date.now() - started;
    assert(rejected, "generate resolved despite a pre-aborted signal");
    assert(
      elapsed < ABORT_SETTLE_BUDGET_MS,
      "pre-aborted signal was not observed promptly",
    );
  });

  await test("generateTransition chains the caller's abort the same way", async () => {
    VideoProcessor.registerHandler("abort-stub-transition", {
      isConfigured: () => true,
      generate: (): Promise<typeof minimalResult> =>
        Promise.resolve(minimalResult),
      generateTransition: (
        _first: Buffer,
        _last: Buffer,
        _prompt: string,
        options?: StubOptions,
      ): Promise<Buffer> => settleOnAbort(options?.abortSignal),
    });

    const caller = new AbortController();
    const started = Date.now();
    setTimeout(() => caller.abort(), 50);

    let rejected = false;
    try {
      await VideoProcessor.generateTransition(
        "abort-stub-transition",
        Buffer.from("first"),
        Buffer.from("last"),
        "p",
        { abortSignal: caller.signal },
      );
    } catch {
      rejected = true;
    }
    const elapsed = Date.now() - started;
    assert(rejected, "generateTransition resolved despite the caller aborting");
    assert(
      elapsed < ABORT_SETTLE_BUDGET_MS,
      "transition abort took longer than the settle budget",
    );
  });

  runSuite();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

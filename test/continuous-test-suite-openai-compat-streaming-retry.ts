#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — OpenAI-compat streamOneStep 429/5xx retry parity
 * (Plan 07, Task 8).
 *
 * ALL-DIST module graph (rule 15): every provider call below is driven
 * through `new NeuroLink().stream()`, imported dynamically from
 * `../dist/index.js`, instead of constructing `OpenAICompatibleProvider`
 * directly from `src/` (rework batch I). The local mock server and env-var
 * hermeticity are otherwise unchanged from the original src-importing
 * version — the additions are the `provider` and `model` fields NeuroLink's
 * public API needs to route the call, which a directly-constructed provider
 * instance didn't require.
 *
 * Before this change, only the non-streaming path retried 429/5xx with
 * backoff; streamOneStep's only self-healing behavior was a one-shot
 * 400-context-overflow retry. This suite drives streamOneStep against a
 * local HTTP server that fails N times with 429 then succeeds, asserting
 * the stream eventually completes instead of surfacing the 429 to the
 * caller on the first attempt.
 *
 * DEVIATION (disclosed, second test only): the original 400-fixture message
 * ("This model's maximum context length is 4096 tokens") never actually
 * satisfied `parseProviderOverflowDetails`'s regexes — the original
 * src-importing test passed `attempt === 2` coincidentally, because
 * `new OpenAICompatibleProvider()` was constructed with no model, so
 * `resolveModelName()`'s auto-discovery GET `/models` call (which the mock
 * server counts identically to the real POST) silently consumed attempt #1
 * before the real request ever reached the corrector. `new NeuroLink()`
 * always resolves a default model before constructing the provider (see
 * `ProviderDescriptor`/`ProviderRegistry`), so that auto-discovery branch is
 * structurally unreachable through the shipped public surface — confirmed
 * empirically: driving the original message through NeuroLink() gets the
 * 400 on the very first (and only) request, no discovery probe. Rather than
 * assert on that now-unreachable path, the fixture message and the request
 * now carry a genuinely parseable OpenAI-style overflow ("resulted in X
 * tokens" + "maximum context length is Y tokens" + an explicit `maxTokens`
 * so the wire body carries a numeric `max_tokens` for the refit math), so
 * `correctBodyAfterContextOverflow` performs a real re-fit retry. This
 * exercises the behavior the suite's name and docstring always claimed to
 * test, instead of a discovery-probe coincidence — the `attempt === 2` and
 * final-success assertions are unchanged.
 *
 * It also covers cancellation during the retry wait: a 429 with a long
 * Retry-After is answered, the caller's abort signal fires shortly after, and
 * both `stream()` and `generate()` must settle then rather than when the wait
 * would have expired.
 *
 * No external API keys — points the provider at a local test server via
 * OPENAI_COMPATIBLE_BASE_URL.
 *
 * Run: npx tsx test/continuous-test-suite-openai-compat-streaming-retry.ts
 *      pnpm run test:openai-compat-streaming-retry
 */

import { createServer } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite(
  "OpenAI-compat streaming retry parity",
  {
    offline: true,
  },
);

function sseChunk(text: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

/** A terminal SSE chunk carrying the vendor's own `finish_reason` — used by
 * the metadata coverage below to drive a specific wire value through the
 * stream loop. */
function sseFinalChunk(finishReason: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: {}, finish_reason: finishReason }],
  })}\n\n`;
}

/** Env vars this suite mutates — saved/restored around every test so ambient
 * dev-machine values (or a prior test in the same process) can't leak in or
 * out. */
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

void runSuite(async () => {
  const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  function nl() {
    return new NeuroLink({ conversationMemory: { enabled: false } });
  }

  section("streamOneStep retries 429 with backoff before succeeding");

  await test("a 429 followed by a successful SSE stream still yields content", async () => {
    const envSnapshot = snapshotEnv();
    let attempt = 0;
    const server = createServer((req, res) => {
      attempt++;
      if (attempt < 3) {
        res.writeHead(429, {
          "content-type": "application/json",
          "retry-after": "0",
        });
        // NOTE: deliberately not "rate limited" / "too many requests" — that
        // phrasing matches envGuard's isExpectedProviderError rate_limit
        // pattern and would downgrade the pre-fix FAIL to a SKIP (see
        // test/helpers/envGuard.ts). The 429 status code alone is what
        // drives the retry decision; the body text is just a fixture.
        res.end(
          JSON.stringify({ error: { message: "synthetic throttle fixture" } }),
        );
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("hello"));
      res.write("data: [DONE]\n\n");
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const result = await nl().stream({
        provider: "openai-compatible",
        model: "gpt-4o-mini",
        input: { text: "hi" },
        maxSteps: 1,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      let text = "";
      for await (const chunk of result.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          text += chunk.content;
        }
      }
      assert(attempt >= 3, "streamOneStep did not retry through the 429s");
      assert(
        text.includes("hello"),
        "final successful chunk was not surfaced after retry",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section(
    "a cancel during the retry wait ends the call instead of waiting it out",
  );

  await test("aborting while streamOneStep waits out a long Retry-After ends the stream promptly", async () => {
    const envSnapshot = snapshotEnv();
    const controller = new AbortController();
    let attempt = 0;
    let abortedAt = 0;
    let requestSeen = false;
    let endedWith = "clean end";
    const server = createServer((req, res) => {
      attempt++;
      if (attempt === 1) {
        requestSeen = true;
        // A 20s hint, under the 60s cap, so the retry layer chooses to wait.
        res.writeHead(429, {
          "content-type": "application/json",
          "retry-after": "20",
        });
        res.end(
          JSON.stringify({ error: { message: "synthetic throttle fixture" } }),
        );
        // The cancel is timed from the first response rather than from the
        // call, so request setup time cannot land it before the wait begins.
        setTimeout(() => {
          abortedAt = Date.now();
          controller.abort();
        }, 300);
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("late"));
      res.write("data: [DONE]\n\n");
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    // Ends a call whose first request never arrives; abortedAt stays 0 then,
    // which the assertion below reports.
    const safety = setTimeout(() => controller.abort(), 45_000);

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      try {
        // Distinct model id: see the metadata tests below for why ids are
        // not shared across this file's tests.
        const result = await nl().stream({
          provider: "openai-compatible",
          model: "gpt-4o-mini-abort-during-backoff",
          input: { text: "hi" },
          maxSteps: 1,
          disableInternalFallback: true,
          abortSignal: controller.signal,
        } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
        for await (const _chunk of result.stream) {
          // draining is all this test needs from the stream itself
        }
      } catch (error) {
        // A cancelled call may surface as a thrown error or as a clean end;
        // either is fine, what matters is when it happens. What ended it is
        // kept for the diagnostic below, not for an assertion message.
        endedWith = error instanceof Error ? error.name : "non-error value";
      }
      const settledAt = Date.now();

      console.log(
        `    [diagnostic] cancel case: requestSeen=${requestSeen} abortScheduled=${abortedAt > 0} attempts=${attempt} endedWith=${endedWith}`,
      );
      assert(requestSeen, "the first request never reached the server");
      assert(
        abortedAt > 0,
        "the call ended before the scheduled cancel fired, so the wait was never entered",
      );
      assert(
        settledAt - abortedAt < 5_000,
        "the call must end when the cancel lands, not when the wait expires",
      );
      assert(
        attempt === 1,
        "a cancelled call must not send the request again after the wait",
      );
    } finally {
      clearTimeout(safety);
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test("aborting while generate() waits out a long Retry-After ends the call promptly", async () => {
    const envSnapshot = snapshotEnv();
    const controller = new AbortController();
    let attempt = 0;
    let abortedAt = 0;
    let requestSeen = false;
    let endedWith = "clean end";
    const server = createServer((req, res) => {
      attempt++;
      if (attempt === 1) {
        requestSeen = true;
        res.writeHead(429, {
          "content-type": "application/json",
          "retry-after": "20",
        });
        res.end(
          JSON.stringify({ error: { message: "synthetic throttle fixture" } }),
        );
        setTimeout(() => {
          abortedAt = Date.now();
          controller.abort();
        }, 300);
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "late" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const safety = setTimeout(() => controller.abort(), 45_000);

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      try {
        await nl().generate({
          provider: "openai-compatible",
          model: "gpt-4o-mini-abort-during-generate-backoff",
          input: { text: "hi" },
          maxSteps: 1,
          disableTools: true,
          disableInternalFallback: true,
          abortSignal: controller.signal,
        });
      } catch (error) {
        // A cancelled call may throw or resolve with what it had; what
        // matters is when it settles. What ended it is kept for the
        // diagnostic below, not for an assertion message.
        endedWith = error instanceof Error ? error.name : "non-error value";
      }
      const settledAt = Date.now();

      console.log(
        `    [diagnostic] cancel case: requestSeen=${requestSeen} abortScheduled=${abortedAt > 0} attempts=${attempt} endedWith=${endedWith}`,
      );
      assert(requestSeen, "the first request never reached the server");
      assert(
        abortedAt > 0,
        "the call ended before the scheduled cancel fired, so the wait was never entered",
      );
      assert(
        settledAt - abortedAt < 5_000,
        "generate() must settle when the cancel lands, not when the wait expires",
      );
      assert(attempt === 1, "a cancelled call must not send the request again");
    } finally {
      clearTimeout(safety);
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section(
    "streamOneStep still applies the one-shot 400 context-overflow fallback",
  );

  await test("a 400 context-overflow response is NOT retried via withProviderRetry (single fallback attempt only)", async () => {
    const envSnapshot = snapshotEnv();
    let attempt = 0;
    const server = createServer((req, res) => {
      attempt++;
      if (attempt === 1) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              // Parseable by parseProviderOverflowDetails's OpenAI pattern
              // (needs both "resulted in X tokens" and "maximum context
              // length is Y tokens") so the real one-shot corrector fires —
              // see the file-header DEVIATION note for why the original
              // unparseable fixture is no longer reachable through
              // NeuroLink()'s public surface.
              message:
                "This model's maximum context length is 4096 tokens. However, your messages resulted in 3500 tokens.",
            },
          }),
        );
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("ok"));
      res.write("data: [DONE]\n\n");
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const result = await nl().stream({
        provider: "openai-compatible",
        model: "gpt-4o-mini",
        input: { text: "hi" },
        maxSteps: 1,
        // Needed so the wire request carries a numeric max_tokens for
        // correctBodyAfterContextOverflow's refit math — see DEVIATION note.
        maxTokens: 3000,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      let text = "";
      for await (const chunk of result.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          text += chunk.content;
        }
      }
      assert(
        attempt === 2,
        "expected exactly one 400-correction retry, got a different attempt count",
      );
      assert(
        text.includes("ok"),
        "post-400-correction success was not surfaced",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section("stream metadata records the terminal finish reason");

  await test("metadata.finishReason mirrors result.finishReason and metadata.rawFinishReason carries the vendor value for a normal stop", async () => {
    const envSnapshot = snapshotEnv();
    const server = createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("hello"));
      res.write(sseFinalChunk("stop"));
      res.end("data: [DONE]\n\n");
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const result = await nl().stream({
        provider: "openai-compatible",
        // A model id not reused by any other test in this file. Context
        // windows discovered from a 400 overflow correction are cached
        // module-globally by `${provider}:${model}` (see
        // `registerRuntimeContextWindow` in
        // `src/lib/constants/contextWindows.ts`) and outlive the test that
        // triggered them — the "400 context-overflow fallback" test above
        // shares this file's process and would otherwise poison "gpt-4o-mini"
        // with an artificially small budget for every test after it.
        model: "gpt-4o-mini-metadata-normal-stop",
        input: { text: "hi" },
        maxSteps: 1,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      for await (const _chunk of result.stream) {
        // draining is all this test needs from the stream itself
      }

      assert(
        result.metadata?.finishReason !== undefined,
        "metadata.finishReason was not recorded",
      );
      assert(
        result.metadata?.finishReason === result.finishReason,
        "metadata.finishReason does not mirror the top-level finishReason",
      );
      assert(
        result.metadata?.rawFinishReason === "stop",
        "metadata.rawFinishReason did not carry the vendor's raw finish_reason",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test('a max-tokens stop reports "length" in result.finishReason and metadata.finishReason, while metadata.rawFinishReason keeps the vendor\'s value', async () => {
    const envSnapshot = snapshotEnv();
    const server = createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("hello"));
      res.write(sseFinalChunk("length"));
      res.end("data: [DONE]\n\n");
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const result = await nl().stream({
        provider: "openai-compatible",
        // See the sibling "normal stop" test above for why this needs its
        // own model id distinct from "gpt-4o-mini" and from that test's id.
        model: "gpt-4o-mini-metadata-max-tokens",
        input: { text: "hi" },
        maxSteps: 1,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      for await (const _chunk of result.stream) {
        // draining is all this test needs from the stream itself
      }

      assert(
        result.metadata?.finishReason === "length",
        "metadata.finishReason did not report the token-limit stop as length",
      );
      assert(
        result.finishReason === "length",
        "result.finishReason did not report the token-limit stop as length",
      );
      assert(
        result.metadata?.rawFinishReason === "length",
        "metadata.rawFinishReason did not carry the vendor's raw finish_reason",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test('a content-filter stop reports "content-filter" in result.finishReason and metadata.finishReason, and rawFinishReason keeps the vendor\'s spelling', async () => {
    const envSnapshot = snapshotEnv();
    const server = createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("hello"));
      res.write(sseFinalChunk("content_filter"));
      res.end("data: [DONE]\n\n");
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const result = await nl().stream({
        provider: "openai-compatible",
        // Its own model id for the same reason as the sibling tests above.
        model: "gpt-4o-mini-metadata-content-filter",
        input: { text: "hi" },
        maxSteps: 1,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      for await (const _chunk of result.stream) {
        // draining is all this test needs from the stream itself
      }

      assert(
        result.metadata?.finishReason === "content-filter",
        "metadata.finishReason did not report the filtered stop as content-filter",
      );
      assert(
        result.finishReason === "content-filter",
        "result.finishReason did not report the filtered stop as content-filter",
      );
      // The one case where the vendor's spelling and the graded one differ, so
      // it is where "raw stays raw" is actually discriminated.
      assert(
        result.metadata?.rawFinishReason === "content_filter",
        "metadata.rawFinishReason did not keep the vendor's own spelling",
      );
      assert(
        result.metadata?.rawFinishReason !== result.metadata?.finishReason,
        "rawFinishReason and the graded finishReason should differ for a filtered stop",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test('a turn cut off at the step cap while the model still wants tools reports "tool-calls" in result.finishReason and metadata.finishReason', async () => {
    const envSnapshot = snapshotEnv();
    // One tool-call delta, then the vendor's own tool_calls finish. With
    // maxSteps: 1 the loop runs the tool and stops, so the model never gets to
    // answer — the turn ends while it still wants tools.
    const server = createServer((req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        `data: ${JSON.stringify({
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_step_cap",
                    type: "function",
                    function: { name: "step_cap_probe", arguments: "{}" },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
      res.write(sseFinalChunk("tool_calls"));
      res.end("data: [DONE]\n\n");
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      let toolRuns = 0;
      const instance = nl();
      instance.registerTools({
        step_cap_probe: {
          name: "step_cap_probe",
          description: "Counts how many times the model called it",
          execute: async () => {
            toolRuns += 1;
            return { ok: true };
          },
        },
      });
      const result = await instance.stream({
        provider: "openai-compatible",
        // Its own model id for the same reason as the sibling tests above.
        model: "gpt-4o-mini-metadata-step-cap",
        input: { text: "hi" },
        maxSteps: 1,
        disableInternalFallback: true,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      for await (const _chunk of result.stream) {
        // draining is all this test needs from the stream itself
      }

      // A control that the turn really reached the tool phase: without it a
      // text-only wire reply would also read as a pass for the wrong reason.
      assert(
        toolRuns === 1,
        "the capped turn did not run the model's tool call exactly once",
      );
      assert(
        result.metadata?.finishReason === "tool-calls",
        "metadata.finishReason did not report the capped turn as tool-calls",
      );
      assert(
        result.finishReason === "tool-calls",
        "result.finishReason did not report the capped turn as tool-calls",
      );
      assert(
        result.metadata?.rawFinishReason === "tool_calls",
        "metadata.rawFinishReason did not keep the vendor's own spelling",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });
});

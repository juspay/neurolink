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
);

function sseChunk(text: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
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
        text += chunk.content ?? "";
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
        text += chunk.content ?? "";
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
});

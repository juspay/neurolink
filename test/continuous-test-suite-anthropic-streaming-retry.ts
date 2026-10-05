#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Anthropic native-loop 429/5xx retry parity
 * (Plan 07, Task 9).
 *
 * ALL-DIST module graph (rule 15): the provider call below is driven
 * through `new NeuroLink().stream()`, imported dynamically from
 * `../dist/index.js`, instead of constructing `AnthropicProvider` directly
 * from `src/` (rework batch I). The local mock server, hermeticity pins,
 * and every assertion are otherwise unchanged from the original
 * src-importing version — the only addition is the `provider`/`model`
 * pair NeuroLink's public API needs to route the call, which a
 * directly-constructed provider instance didn't require.
 *
 * Before this change, the un-retried `client.messages.create()` call
 * inside the native agentic loop had no 429/5xx backoff at all — a
 * transient rate limit or server error failed the whole turn immediately.
 * This suite points the Anthropic SDK client at a local HTTP server via
 * ANTHROPIC_BASE_URL, returns 429 for the first N attempts, then a real
 * SSE-shaped Messages API stream, and asserts the call eventually
 * succeeds instead of throwing on the first 429.
 *
 * It also covers cancellation during the retry wait: a 429 with a long
 * Retry-After is answered, the caller's abort signal fires shortly after, and
 * both `stream()` and `generate()` must settle then rather than when the wait
 * would have expired.
 *
 * No external API keys.
 *
 * Hermeticity: the auth-method / OAuth env vars are pinned and neutralized
 * for the duration of the test — an ambient dev-machine OAuth token (or
 * ANTHROPIC_AUTH_METHOD=oauth) would otherwise route AnthropicProvider's
 * constructor through the OAuth branch instead of the api_key branch this
 * suite targets, silently invalidating the test.
 *
 * Run: npx tsx test/continuous-test-suite-anthropic-streaming-retry.ts
 *      pnpm run test:anthropic-streaming-retry
 */

import { createServer } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite(
  "Anthropic streaming retry parity",
  {
    offline: true,
  },
);

/** Env vars this suite mutates — saved/restored around every test so
 * ambient dev-machine values can't leak in or out. */
const TOUCHED_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
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

  section("client.messages.create retries 429 with backoff before succeeding");

  await test("a 429 followed by a successful Messages stream still yields content", async () => {
    const envSnapshot = snapshotEnv();
    let attempt = 0;
    const server = createServer((req, res) => {
      attempt++;
      if (attempt < 3) {
        res.writeHead(429, {
          "content-type": "application/json",
          "retry-after": "0",
        });
        // NOTE: deliberately not "rate limited" — the official
        // @anthropic-ai/sdk formats APIError.message as `${status}
        // ${body.error.message}` (e.g. "429 rate limited"), and that
        // phrasing matches envGuard's isExpectedProviderError rate_limit
        // pattern. A pre-fix genuine FAIL would be masked as a SKIP.
        res.end(
          JSON.stringify({
            error: {
              type: "rate_limit_error",
              message: "synthetic throttle fixture",
            },
          }),
        );
        return;
      }
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        `event: message_start\ndata: ${JSON.stringify({
          type: "message_start",
          message: {
            id: "msg_1",
            usage: { input_tokens: 5, output_tokens: 0 },
          },
        })}\n\n`,
      );
      res.write(
        `event: content_block_delta\ndata: ${JSON.stringify({
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "hello" },
        })}\n\n`,
      );
      res.write(
        `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
      );
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.ANTHROPIC_API_KEY = "test-key";
      process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
      // Pin api_key auth and neutralize OAuth so an ambient dev-machine
      // OAuth token/env can't hijack the auth path this test targets.
      process.env.ANTHROPIC_AUTH_METHOD = "api_key";
      delete process.env.ANTHROPIC_OAUTH_TOKEN;
      delete process.env.CLAUDE_OAUTH_TOKEN;

      let text = "";
      let threw = false;
      try {
        const result = await nl().stream({
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          input: { text: "hi" },
          maxSteps: 1,
        } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
        for await (const chunk of result.stream) {
          text += ("content" in chunk ? chunk.content : undefined) ?? "";
        }
      } catch {
        // AnthropicProvider#formatProviderError (src/lib/providers/anthropic/
        // client.ts) rewrites ANY statusCode === 429 into the fixed string
        // "Anthropic rate limit exceeded. Please try again later." regardless
        // of the mock body's message text — so unlike the OpenAI-compat path
        // (Task 8), rewording the fixture body cannot dodge envGuard's
        // rate_limit pattern here; the provider's own formatted message must
        // simply never reach the harness. Capture only a boolean and assert
        // with a message this suite fully controls instead of the caught
        // error's text.
        threw = true;
      }
      assert(!threw, "the native loop did not retry through the 429s");
      assert(attempt >= 3, "the native loop did not retry through the 429s");
      assert(
        text.includes("hello"),
        "final successful chunk was not surfaced after retry",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test("cancelling a native-loop retry backoff promptly ends the stream without another request", async () => {
    const envSnapshot = snapshotEnv();
    const controller = new AbortController();
    let attempts = 0;
    let abortedAt = 0;
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;
    const server = createServer((_req, res) => {
      attempts++;
      res.writeHead(429, {
        "content-type": "application/json",
        "retry-after": "20",
      });
      res.end(
        JSON.stringify({
          error: {
            type: "rate_limit_error",
            message: "synthetic throttle fixture",
          },
        }),
      );
      if (attempts === 1) {
        cancelTimer = setTimeout(() => {
          abortedAt = Date.now();
          controller.abort();
        }, 300);
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const safety = setTimeout(() => controller.abort(), 45_000);
    try {
      process.env.ANTHROPIC_API_KEY = "test-key";
      process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.ANTHROPIC_AUTH_METHOD = "api_key";
      delete process.env.ANTHROPIC_OAUTH_TOKEN;
      delete process.env.CLAUDE_OAUTH_TOKEN;
      try {
        const result = await nl().stream({
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          input: { text: "hi" },
          maxSteps: 1,
          disableTools: true,
          disableInternalFallback: true,
          abortSignal: controller.signal,
        });
        for await (const _chunk of result.stream) {
          // Drain the public stream to observe cancellation.
        }
      } catch {
        // Caller cancellation may throw or close the public stream. Both
        // must settle promptly without sending another provider request.
      }
      assert(abortedAt > 0, "the first request must reach the local server");
      assert(
        Date.now() - abortedAt < 5_000,
        "the stream must settle promptly after cancellation",
      );
      assert(
        attempts === 1,
        "a cancelled backoff must not send another request",
      );
    } finally {
      clearTimeout(safety);
      clearTimeout(cancelTimer);
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test("cancelling a generate() retry backoff promptly ends the call without another request", async () => {
    const envSnapshot = snapshotEnv();
    const controller = new AbortController();
    let attempts = 0;
    let abortedAt = 0;
    let cancelTimer: ReturnType<typeof setTimeout> | undefined;
    const server = createServer((_req, res) => {
      attempts++;
      res.writeHead(429, {
        "content-type": "application/json",
        "retry-after": "20",
      });
      res.end(
        JSON.stringify({
          error: {
            type: "rate_limit_error",
            message: "synthetic throttle fixture",
          },
        }),
      );
      if (attempts === 1) {
        cancelTimer = setTimeout(() => {
          abortedAt = Date.now();
          controller.abort();
        }, 300);
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const safety = setTimeout(() => controller.abort(), 45_000);
    try {
      process.env.ANTHROPIC_API_KEY = "test-key";
      process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.ANTHROPIC_AUTH_METHOD = "api_key";
      delete process.env.ANTHROPIC_OAUTH_TOKEN;
      delete process.env.CLAUDE_OAUTH_TOKEN;
      try {
        await nl().generate({
          provider: "anthropic",
          model: "claude-sonnet-4-5",
          input: { text: "hi" },
          maxSteps: 1,
          disableTools: true,
          disableInternalFallback: true,
          abortSignal: controller.signal,
        });
      } catch {
        // Caller cancellation may throw or resolve with what the call had.
        // Either way it must settle promptly without another provider request.
      }
      assert(abortedAt > 0, "the first request must reach the local server");
      assert(
        Date.now() - abortedAt < 5_000,
        "generate() must settle promptly after cancellation",
      );
      assert(
        attempts === 1,
        "a cancelled backoff must not send another request",
      );
    } finally {
      clearTimeout(safety);
      clearTimeout(cancelTimer);
      server.close();
      restoreEnv(envSnapshot);
    }
  });
});

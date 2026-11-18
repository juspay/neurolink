#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Anthropic native-loop retry and timeout behavior
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
import "./helpers/requireFreshDist.js";

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

  section("native stream idle deadline");

  for (const scenario of ["active", "turn-timeout", "idle-timeout"] as const) {
    await test(`Anthropic streaming deadlines: ${scenario}`, async () => {
      const envSnapshot = snapshotEnv();
      let ticks = 0;
      const server = createServer((_req, res) => {
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
        if (scenario === "idle-timeout") {
          return;
        }
        const interval = setInterval(() => {
          if (++ticks < 9) {
            res.write(
              `event: ping\ndata: ${JSON.stringify({ type: "ping" })}\n\n`,
            );
          } else {
            clearInterval(interval);
            res.write(
              `event: content_block_delta\ndata: ${JSON.stringify({
                type: "content_block_delta",
                index: 0,
                delta: { type: "text_delta", text: "finished" },
              })}\n\n`,
            );
            res.end(
              `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
            );
          }
        }, 300);
        res.on("close", () => clearInterval(interval));
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      try {
        process.env.ANTHROPIC_API_KEY = "test-key";
        process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
        process.env.ANTHROPIC_AUTH_METHOD = "api_key";
        delete process.env.ANTHROPIC_OAUTH_TOKEN;
        delete process.env.CLAUDE_OAUTH_TOKEN;

        const started = Date.now();
        const result = await nl().stream({
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          input: { text: "hi" },
          maxSteps: 1,
          timeout: 2_000,
          turnTimeoutMs: scenario === "turn-timeout" ? 2_200 : undefined,
          disableInternalFallback: true,
        });
        let text = "";
        try {
          for await (const chunk of result.stream) {
            text += ("content" in chunk ? chunk.content : undefined) ?? "";
          }
        } catch (error) {
          if (scenario === "active") {
            throw error;
          }
        }
        if (scenario === "active") {
          assert(
            text.includes("finished"),
            `the live native stream was cut off (ticks=${ticks}, stop=${String(result.metadata?.stopReason)}, finish=${String(result.finishReason)})`,
          );
          assert(
            Date.now() - started > 2_000,
            "the fixture did not cross the old deadline",
          );
        } else {
          const elapsed = Date.now() - started;
          assert(
            !text.includes("finished"),
            "the stream must stop before completion",
          );
          assert(
            elapsed >= 1_700 && elapsed < 6_000,
            `the ${scenario} deadline did not stop the stream in time: ${elapsed}ms`,
          );
          if (scenario === "turn-timeout") {
            assert(
              ticks >= 5,
              "heartbeats must still be arriving at the turn deadline",
            );
          }
        }
      } finally {
        server.closeAllConnections();
        server.close();
        restoreEnv(envSnapshot);
      }
    });
  }

  for (const { idleMs, toolMs } of [
    { idleMs: 1_000, toolMs: 2_500 },
    { idleMs: 100, toolMs: 300 },
  ]) {
    await test(`a ${toolMs}ms tool does not trip a ${idleMs}ms stream idle timeout under turnTimeoutMs`, async () => {
      const envSnapshot = snapshotEnv();
      const sse = (event: string, payload: Record<string, unknown>): string =>
        `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
      let requests = 0;
      const server = createServer((_req, res) => {
        requests++;
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(
          sse("message_start", {
            message: { id: `msg_${requests}`, usage: { input_tokens: 5 } },
          }),
        );
        if (requests === 1) {
          res.write(
            sse("content_block_start", {
              index: 0,
              content_block: {
                type: "tool_use",
                id: "tu_1",
                name: "slow",
                input: {},
              },
            }),
          );
          res.write(
            sse("content_block_delta", {
              index: 0,
              delta: { type: "input_json_delta", partial_json: "{}" },
            }),
          );
          res.write(sse("content_block_stop", { index: 0 }));
          res.write(
            sse("message_delta", {
              delta: { stop_reason: "tool_use" },
              usage: { output_tokens: 6 },
            }),
          );
        } else {
          res.write(
            sse("content_block_start", {
              index: 0,
              content_block: { type: "text", text: "" },
            }),
          );
          res.write(
            sse("content_block_delta", {
              index: 0,
              delta: { type: "text_delta", text: "after the tool" },
            }),
          );
          res.write(sse("content_block_stop", { index: 0 }));
          res.write(
            sse("message_delta", {
              delta: { stop_reason: "end_turn" },
              usage: { output_tokens: 4 },
            }),
          );
        }
        res.end(sse("message_stop", {}));
      });
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      try {
        process.env.ANTHROPIC_API_KEY = "test-key";
        process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
        process.env.ANTHROPIC_AUTH_METHOD = "api_key";
        delete process.env.ANTHROPIC_OAUTH_TOKEN;
        delete process.env.CLAUDE_OAUTH_TOKEN;

        const { jsonSchema } = await import("../dist/index.js");
        let toolRuns = 0;
        const result = await nl().stream({
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          input: { text: "use the slow tool" },
          maxSteps: 3,
          maxTokens: 32,
          timeout: idleMs,
          turnTimeoutMs: 15_000,
          disableInternalFallback: true,
          tools: {
            slow: {
              description: "a tool slower than the stream idle timeout",
              inputSchema: jsonSchema({
                type: "object",
                properties: {},
                additionalProperties: true,
              }),
              execute: async () => {
                toolRuns++;
                await new Promise((resolve) => setTimeout(resolve, toolMs));
                return { ok: true };
              },
            },
          },
        });
        let text = "";
        for await (const chunk of result.stream) {
          text += ("content" in chunk ? chunk.content : undefined) ?? "";
        }
        assert(toolRuns === 1, `the slow tool ran ${toolRuns} times`);
        assert(
          text.includes("after the tool"),
          `the turn was aborted while the tool ran`,
        );
      } finally {
        server.closeAllConnections();
        server.close();
        restoreEnv(envSnapshot);
      }
    });
  }

  await test("a tool that throws still completes the turn and leaves no stream timer behind", async () => {
    const sse = (event: string, payload: Record<string, unknown>): string =>
      `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
    let requests = 0;
    const server = createServer((req, res) => {
      requests++;
      req.resume();
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        sse("message_start", {
          message: { id: `msg_${requests}`, usage: { input_tokens: 5 } },
        }),
      );
      if (requests === 1) {
        res.write(
          sse("content_block_start", {
            index: 0,
            content_block: {
              type: "tool_use",
              id: "tu_1",
              name: "boom",
              input: {},
            },
          }),
        );
        res.write(
          sse("content_block_delta", {
            index: 0,
            delta: { type: "input_json_delta", partial_json: "{}" },
          }),
        );
        res.write(sse("content_block_stop", { index: 0 }));
        res.write(
          sse("message_delta", {
            delta: { stop_reason: "tool_use" },
            usage: { output_tokens: 6 },
          }),
        );
      } else {
        res.write(
          sse("content_block_start", {
            index: 0,
            content_block: { type: "text", text: "" },
          }),
        );
        res.write(
          sse("content_block_delta", {
            index: 0,
            delta: { type: "text_delta", text: "after the failing tool" },
          }),
        );
        res.write(sse("content_block_stop", { index: 0 }));
        res.write(
          sse("message_delta", {
            delta: { stop_reason: "end_turn" },
            usage: { output_tokens: 4 },
          }),
        );
      }
      res.end(sse("message_stop", {}));
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    // Runs in its own process so a leaked timer shows up as a live interval in
    // the report, and a leaked ref'd one as a process that will not exit.
    // Timers are tracked from before the package loads.
    const childSource = `
const liveIntervals = new Map();
const origSetInterval = globalThis.setInterval;
const origClearInterval = globalThis.clearInterval;
globalThis.setInterval = (...args) => {
  const handle = origSetInterval(...args);
  liveIntervals.set(handle, args[1]);
  return handle;
};
globalThis.clearInterval = (handle) => {
  liveIntervals.delete(handle);
  return origClearInterval(handle);
};
const { NeuroLink, jsonSchema } = await import(process.env.NL_DIST);
const nl = new NeuroLink({ conversationMemory: { enabled: false } });
const result = await nl.stream({
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  input: { text: "use the failing tool" },
  maxSteps: 3,
  maxTokens: 32,
  timeout: 500,
  disableInternalFallback: true,
  tools: {
    boom: {
      description: "always throws",
      inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: true }),
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        throw new Error("tool exploded");
      },
    },
  },
});
let text = "";
for await (const chunk of result.stream) {
  text += ("content" in chunk ? chunk.content : undefined) ?? "";
}
await new Promise((resolve) => setTimeout(resolve, 500));
process.stdout.write("REPORT:" + JSON.stringify({ text, liveIntervals: [...liveIntervals.values()] }) + "\\n");
`;
    try {
      const { spawn } = await import("node:child_process");
      const { pathToFileURL } = await import("node:url");
      const { fileURLToPath } = await import("node:url");
      const distEntry = pathToFileURL(
        fileURLToPath(new URL("../dist/index.js", import.meta.url)),
      ).href;
      const outcome = await new Promise<{
        code: number | null;
        stdout: string;
        stderr: string;
        timedOut: boolean;
      }>((resolve) => {
        const child = spawn(
          process.execPath,
          ["--input-type=module", "-e", childSource],
          {
            env: {
              ...process.env,
              NL_DIST: distEntry,
              ANTHROPIC_API_KEY: "test-key",
              ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
              ANTHROPIC_AUTH_METHOD: "api_key",
              ANTHROPIC_OAUTH_TOKEN: "",
              CLAUDE_OAUTH_TOKEN: "",
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });
        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
        // The stream is finished within about 2s; a longer wait means the
        // process was held open after the report.
        const killer = setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, 15_000);
        child.on("close", (code) => {
          clearTimeout(killer);
          resolve({ code, stdout, stderr, timedOut });
        });
      });
      const line = outcome.stdout
        .split("\n")
        .find((entry) => entry.startsWith("REPORT:"));
      assert(
        line !== undefined,
        `the child never finished the stream: ${outcome.stderr.slice(-300)}`,
      );
      const report = JSON.parse((line ?? "REPORT:{}").slice(7)) as {
        text?: string;
        liveIntervals?: number[];
      };
      assert(
        report.text?.includes("after the failing tool") === true,
        "the turn did not complete after the tool threw",
      );
      assert(requests === 2, `expected two model requests, saw ${requests}`);
      // The tool keep-alive ticks every min(250, idle/2) = 250ms here; the
      // package's other intervals (60s, 1s) are not the tool's to clear.
      assert(
        (report.liveIntervals ?? []).filter((ms) => ms === 250).length === 0,
        `the tool keep-alive interval outlived the tool; live interval delays: ${String(report.liveIntervals)}`,
      );
      assert(
        !outcome.timedOut && outcome.code === 0,
        "the process did not exit on its own after the stream",
      );
    } finally {
      server.closeAllConnections();
      server.close();
    }
  });
});

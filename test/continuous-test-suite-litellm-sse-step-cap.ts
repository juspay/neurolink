#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — LiteLLM generate() on the SSE wire: per-step
 * idle window plus absolute wall-clock ceiling.
 *
 * generate() rides the SSE wire for LiteLLM, and every raw chunk re-arms the
 * per-step timeout (idle semantics, so a slow-but-alive completion survives
 * proxy idle limits). Before the ceiling existed a stream that kept sending
 * keep-alive frames was bounded by nothing but the whole-turn deadline: one
 * model call ran the full turn even though the caller asked for a much
 * shorter per-call `timeout`.
 *
 * ALL-DIST module graph (rule 15): everything is driven through
 * `new NeuroLink().generate()` imported from `../dist/index.js` against a
 * local HTTP server. No API keys.
 *
 * Run: npx tsx test/continuous-test-suite-litellm-sse-step-cap.ts
 *      pnpm run test:litellm-sse-step-cap
 */

import { createServer, type ServerResponse } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";
import "./helpers/requireFreshDist.js";

const { test, runSuite, section } = defineSuite("LiteLLM SSE step ceiling", {
  offline: true,
});

const TOUCHED_ENV_VARS = ["LITELLM_BASE_URL", "LITELLM_API_KEY"] as const;

const contentChunk = (text: string): string =>
  `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
  })}\n\n`;

const finishChunk = `data: ${JSON.stringify({
  choices: [{ delta: {}, finish_reason: "stop" }],
})}\n\n`;

async function withServer(
  handler: (res: ServerResponse) => void,
  run: () => Promise<void>,
): Promise<void> {
  const prior: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    prior[key] = process.env[key];
  }
  const open = new Set<ServerResponse>();
  const server = createServer((_req, res) => {
    open.add(res);
    res.on("close", () => open.delete(res));
    res.writeHead(200, { "content-type": "text/event-stream" });
    handler(res);
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    process.env.LITELLM_BASE_URL = `http://127.0.0.1:${port}`;
    process.env.LITELLM_API_KEY = "test-key";
    await run();
  } finally {
    for (const res of open) {
      res.destroy();
    }
    server.close();
    for (const key of TOUCHED_ENV_VARS) {
      if (prior[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior[key];
      }
    }
  }
}

void runSuite(async () => {
  const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  const generate = (timeout: number, turnTimeoutMs: number) =>
    new NeuroLink({ conversationMemory: { enabled: false } }).generate({
      provider: "litellm",
      model: "gpt-4o-mini",
      input: { text: "hi" },
      maxSteps: 1,
      timeout,
      turnTimeoutMs,
      disableTools: true,
      disableInternalFallback: true,
    });

  section("absolute per-step ceiling");

  await test("a keep-alive-only stream is cut off by the per-call timeout, not the turn timeout", async () => {
    const TURN_TIMEOUT_MS = 120_000;
    await withServer(
      (res) => {
        // Comment frames forever, never a data frame and never [DONE].
        const timer = setInterval(() => res.write(": ping\n\n"), 50);
        res.on("close", () => clearInterval(timer));
      },
      async () => {
        const started = Date.now();
        let error: unknown;
        try {
          await generate(300, TURN_TIMEOUT_MS);
        } catch (e) {
          error = e;
        }
        const elapsed = Date.now() - started;
        assert(
          error !== undefined,
          "generate() resolved instead of timing out",
        );
        assert(
          /timed out/i.test(String((error as Error)?.message ?? error)),
          `expected a timeout error, got: ${String(error)}`,
        );
        assert(
          elapsed < 30_000,
          `the step ran ${elapsed}ms; the ceiling did not bound it`,
        );
      },
    );
  });

  section("idle semantics are kept");

  await test("a slow-but-alive stream longer than the idle window but under the ceiling completes", async () => {
    await withServer(
      (res) => {
        // 6 content frames 100ms apart: ~600ms total, beyond the 300ms idle
        // window, and no 300ms gap anywhere.
        let n = 0;
        const timer = setInterval(() => {
          n++;
          if (n <= 6) {
            res.write(contentChunk(`part${n} `));
          } else {
            clearInterval(timer);
            res.write(finishChunk);
            res.end("data: [DONE]\n\n");
          }
        }, 100);
        res.on("close", () => clearInterval(timer));
      },
      async () => {
        const result = await generate(300, 60_000);
        assert(
          result.content.includes("part1") && result.content.includes("part6"),
          `unexpected content: ${result.content}`,
        );
      },
    );
  });

  await test("a stream that goes silent is still cut off by the idle window", async () => {
    await withServer(
      (res) => {
        res.write(contentChunk("hello"));
      },
      async () => {
        const started = Date.now();
        let error: unknown;
        try {
          await generate(300, 60_000);
        } catch (e) {
          error = e;
        }
        assert(error !== undefined, "a silent stream did not time out");
        assert(Date.now() - started < 30_000, "the idle window did not fire");
      },
    );
  });
});

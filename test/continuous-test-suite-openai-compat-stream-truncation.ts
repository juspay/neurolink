#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — OpenAI-compat truncated / errored streams (#2042)
 * Run: npx tsx test/continuous-test-suite-openai-compat-stream-truncation.ts
 */

import { createServer } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite(
  "OpenAI-compat stream truncation",
  { offline: true },
);

const textChunk = (text: string): string =>
  `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
  })}\n\n`;

const finishChunk = (reason: string): string =>
  `data: ${JSON.stringify({
    choices: [{ delta: {}, finish_reason: reason }],
  })}\n\n`;

const TOUCHED_ENV_VARS = [
  "OPENAI_COMPATIBLE_BASE_URL",
  "OPENAI_COMPATIBLE_API_KEY",
] as const;

async function withServer(
  frames: string[],
  run: () => Promise<void>,
): Promise<void> {
  const prior: Record<string, string | undefined> = Object.create(null);
  for (const key of TOUCHED_ENV_VARS) {
    prior[key] = process.env[key];
  }
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    for (const frame of frames) {
      res.write(frame);
    }
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  try {
    process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
    process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";
    await run();
  } finally {
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

  async function drain(): Promise<{ text: string; error?: unknown }> {
    let text = "";
    try {
      const neurolink = new NeuroLink({
        conversationMemory: { enabled: false },
      });
      const result = await neurolink.stream({
        provider: "openai-compatible",
        model: "gpt-4o-mini",
        input: { text: "hi" },
        maxSteps: 1,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      for await (const chunk of result.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          text += chunk.content;
        }
      }
      return { text };
    } catch (error) {
      return { text, error };
    }
  }

  section("a complete stream still succeeds");

  await test("text + finish_reason + [DONE] is a clean result", async () => {
    await withServer(
      [textChunk("hello"), finishChunk("stop"), "data: [DONE]\n\n"],
      async () => {
        const { text, error } = await drain();
        assert(!error, `clean stream threw: ${String(error)}`);
        assert(text.includes("hello"), "text was not delivered");
      },
    );
  });

  await test("finish_reason without [DONE] is still complete", async () => {
    await withServer([textChunk("hello"), finishChunk("stop")], async () => {
      const { error } = await drain();
      assert(!error, `finish_reason-only stream threw: ${String(error)}`);
    });
  });

  section("truncated / errored streams surface as errors");

  await test("clean EOF mid-text (no [DONE], no finish_reason) throws", async () => {
    await withServer([textChunk("half an ans")], async () => {
      const { error } = await drain();
      assert(error !== undefined, "truncated stream was returned as success");
      assert(
        /truncated|before \[DONE\]|incomplete/i.test(String(error)),
        `unexpected error: ${String(error)}`,
      );
    });
  });

  await test("error frame after content throws", async () => {
    await withServer(
      [
        textChunk("some text"),
        `data: ${JSON.stringify({ error: { message: "upstream exploded" } })}\n\n`,
        "data: [DONE]\n\n",
      ],
      async () => {
        const { error } = await drain();
        assert(error !== undefined, "error frame was dropped");
        assert(
          String(error).includes("upstream exploded"),
          `error message lost: ${String(error)}`,
        );
      },
    );
  });

  await test('finish_reason "error" throws instead of reading as stop', async () => {
    await withServer(
      [textChunk("some text"), finishChunk("error"), "data: [DONE]\n\n"],
      async () => {
        const { error } = await drain();
        assert(error !== undefined, 'finish_reason "error" read as success');
      },
    );
  });
});

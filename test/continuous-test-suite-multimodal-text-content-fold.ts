#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — TextContent `content[]` items on the text-only
 * multimodal path.
 *
 * `buildMultimodalMessagesArray` (src/lib/utils/messageBuilder.ts) routes a
 * request with no image, no PDF and no native-audio content through a
 * "text-only" branch that hands off to `buildMessagesArray`, which reads
 * only `options.prompt` / `options.input.text`. Before this fix, a
 * `{type: "text", ...}` item inside `input.content[]` was folded into the
 * prompt on neither path: the multimodal converter
 * (`convertContentToProviderFormat`) only runs when an image/PDF/native-audio
 * part is also present, and the text-only branch already folded CSV
 * `content[]` items into `inp.text` (#289) but never TextContent ones. The
 * extra text was silently dropped end-to-end — never reaching the model.
 *
 * ALL-DIST module graph (rule 15): every call below goes through
 * `new NeuroLink().generate()` / `.stream()`, imported from `../dist/index.js`,
 * against a local HTTP stand-in for an OpenAI-compatible endpoint that
 * records the outbound request body — proving the marker reaches the wire,
 * not just an internal builder return value.
 *
 * No external API keys — points the provider at a local test server via
 * OPENAI_COMPATIBLE_BASE_URL (same technique as
 * continuous-test-suite-openai-compat-streaming-retry.ts).
 *
 * Run: npx tsx test/continuous-test-suite-multimodal-text-content-fold.ts
 *      pnpm run test:multimodal-text-content-fold
 */

import { createServer, type IncomingMessage } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite(
  "multimodal text-content-fold (input.content TextContent items on the text-only path)",
  {
    offline: true,
  },
);

// Distinct from ordinary prose so a substring match can't be a coincidence.
const BASE_TEXT_MARKER = "BASE-PROMPT-MARKER-4b2b9a";
const EXTRA_TEXT_MARKER = "EXTRA-CONTENT-TEXT-MARKER-9f21ac";

function sseChunk(text: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

/** Env vars this suite mutates — saved/restored around every test. */
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

  section(
    "input.content carries a bare TextContent item with no image/PDF/native-audio",
  );

  await test("generate(): the TextContent item's text reaches the outbound request body", async () => {
    const envSnapshot = snapshotEnv();
    let attempt = 0;
    const capturedBodies: Record<string, unknown>[] = [];
    const server = createServer((req, res) => {
      void readRequestBody(req).then((raw) => {
        attempt++;
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
        capturedBodies.push(parsed);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "chatcmpl-text-content-fold-generate",
            object: "chat.completion",
            created: 0,
            model: "text-content-fold-model-generate",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "ack" },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const result = await nl().generate({
        provider: "openai-compatible",
        model: "text-content-fold-model-generate",
        input: {
          text: BASE_TEXT_MARKER,
          content: [{ type: "text", text: EXTRA_TEXT_MARKER }],
        },
        maxSteps: 1,
        disableTools: true,
      } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);

      assert(
        attempt === 1,
        `expected exactly one upstream request — got ${attempt}`,
      );
      const sent = JSON.stringify(capturedBodies[0] ?? {});
      assert(
        sent.includes(BASE_TEXT_MARKER),
        "outbound request body is missing the base input.text",
      );
      assert(
        sent.includes(EXTRA_TEXT_MARKER),
        "outbound request body is missing the input.content TextContent item's text — it was dropped on the text-only path",
      );
      assert(
        (result.content ?? "").includes("ack"),
        "the request should ultimately succeed",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test("stream(): the TextContent item's text reaches the outbound request body", async () => {
    const envSnapshot = snapshotEnv();
    let attempt = 0;
    const capturedBodies: Record<string, unknown>[] = [];
    const server = createServer((req, res) => {
      void readRequestBody(req).then((raw) => {
        attempt++;
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          parsed = {};
        }
        capturedBodies.push(parsed);
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(sseChunk("ack"));
        res.write("data: [DONE]\n\n");
        res.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const result = await nl().stream({
        provider: "openai-compatible",
        model: "text-content-fold-model-stream",
        input: {
          text: BASE_TEXT_MARKER,
          content: [{ type: "text", text: EXTRA_TEXT_MARKER }],
        },
        maxSteps: 1,
        disableTools: true,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      let text = "";
      for await (const chunk of result.stream) {
        text += ("content" in chunk ? chunk.content : undefined) ?? "";
      }

      assert(
        attempt === 1,
        `expected exactly one upstream request — got ${attempt}`,
      );
      const sent = JSON.stringify(capturedBodies[0] ?? {});
      assert(
        sent.includes(BASE_TEXT_MARKER),
        "outbound streaming request body is missing the base input.text",
      );
      assert(
        sent.includes(EXTRA_TEXT_MARKER),
        "outbound streaming request body is missing the input.content TextContent item's text — it was dropped on the text-only path",
      );
      assert(text.includes("ack"), "the stream should ultimately succeed");
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });
});

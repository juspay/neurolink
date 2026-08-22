#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — `adjustBodyAfter400` single-slot composition fix.
 *
 * Both the non-streaming and streaming one-shot 400-retry sites in
 * `openaiChatCompletionsBase.ts` used to select a retry body with
 * `correctBodyAfterContextOverflow(body, err) ?? adjustBodyAfter400(body, err)`.
 * `??` only evaluates the right side when the left side is nullish, so a 400
 * that was BOTH a context-overflow error AND something a subclass's
 * `adjustBodyAfter400` would also want to fix meant the overflow corrector's
 * truthy result silently swallowed the subclass fix — the retried request
 * still carried whatever field the server had just rejected.
 *
 * NVIDIA NIM is the only current subclass with a real `adjustBodyAfter400`
 * (strips `chat_template` / `chat_template_kwargs.reasoning_budget` when a
 * model server rejects them), so this suite drives the REAL
 * `NvidiaNimProvider` — via `new NeuroLink()`, ALL-DIST module graph (rule
 * 15) — against a local HTTP server that returns a single crafted 400 which
 * is simultaneously overflow-shaped (triggers the refit correction) and
 * chat_template-rejection-shaped (triggers NIM's field-strip correction),
 * then asserts the ONE retried request carries BOTH fixes. Testing the real
 * subclass instead of a synthetic stand-in exercises the exact regression
 * this bug fix addresses.
 *
 * `chat_template` is put on the wire via `NVIDIA_NIM_CHAT_TEMPLATE` (see
 * `buildNvidiaNimExtraBody` in `src/lib/providers/nvidiaNim/client.ts`).
 * Distinct fake model names are used per test so `registerRuntimeContextWindow`
 * (invoked as a side effect of the first test's overflow correction) can't
 * leak a discovered window into the second test's `resolveWireMaxTokens` math.
 *
 * No external API keys — points NVIDIA_NIM_BASE_URL at a local test server.
 *
 * Run: npx tsx test/continuous-test-suite-adjust-body-after-400.ts
 *      pnpm run test:adjust-body-after-400
 */

import { createServer, type IncomingMessage } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite(
  "adjustBodyAfter400 composition fix",
);

// A single crafted 400 body that is BOTH:
//  - OpenAI-shaped context overflow ("resulted in X tokens" / "maximum
//    context length is Y tokens") so correctBodyAfterContextOverflow fires, and
//  - a chat_template rejection (the word "unsupported" within NIM's
//    80-character window of "chat_template") so NIM's adjustBodyAfter400 fires.
const OVERFLOW_AND_FIELD_REJECTION_MESSAGE =
  "This model's maximum context length is 4096 tokens. However, your " +
  "messages resulted in 3500 tokens. Additionally, unsupported argument: " +
  "chat_template is not supported for this model.";

// budgetTokens(4096) - actualTokens(3500) - WINDOW_FIT_MARGIN_TOKENS(512) = 84
const EXPECTED_REFIT_MAX_TOKENS = 84;

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
  "NVIDIA_NIM_BASE_URL",
  "NVIDIA_NIM_API_KEY",
  "NVIDIA_NIM_CHAT_TEMPLATE",
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
    "one-shot 400 retry composes the overflow refit AND the subclass field-strip",
  );

  await test("non-streaming: the composed retry carries both fixes", async () => {
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
        if (attempt === 1) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              error: {
                message: OVERFLOW_AND_FIELD_REJECTION_MESSAGE,
                type: "invalid_request_error",
              },
            }),
          );
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "chatcmpl-test-compose",
            object: "chat.completion",
            created: 0,
            model: "compose-test-model-generate",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "pong" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 1,
              completion_tokens: 1,
              total_tokens: 2,
            },
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.NVIDIA_NIM_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.NVIDIA_NIM_API_KEY = "test-key";
      process.env.NVIDIA_NIM_CHAT_TEMPLATE = "test-template";

      const result = await nl().generate({
        provider: "nvidia-nim",
        model: "compose-test-model-generate",
        input: { text: "ping" },
        maxTokens: 3000,
        maxSteps: 1,
        disableTools: true,
      } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);

      assert(
        attempt === 2,
        `expected exactly 2 upstream requests (initial 400 + one composed retry) — got ${attempt}`,
      );
      const retried = capturedBodies[1] as {
        max_tokens?: number;
        chat_template?: string;
      };
      assert(
        retried.max_tokens === EXPECTED_REFIT_MAX_TOKENS,
        `retried body's max_tokens should be re-fit from the overflow error's own numbers — got ${retried.max_tokens}`,
      );
      assert(
        !("chat_template" in retried),
        "retried body should no longer carry the field the subclass's adjustBodyAfter400 strips",
      );
      assert(
        (result.content ?? "").includes("pong"),
        "the composed retry should ultimately succeed",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  await test("streaming: the composed retry carries both fixes", async () => {
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
        if (attempt === 1) {
          res.writeHead(400, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              error: {
                message: OVERFLOW_AND_FIELD_REJECTION_MESSAGE,
                type: "invalid_request_error",
              },
            }),
          );
          return;
        }
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.write(sseChunk("pong"));
        res.write("data: [DONE]\n\n");
        res.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;

    try {
      process.env.NVIDIA_NIM_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.NVIDIA_NIM_API_KEY = "test-key";
      process.env.NVIDIA_NIM_CHAT_TEMPLATE = "test-template";

      const result = await nl().stream({
        provider: "nvidia-nim",
        model: "compose-test-model-stream",
        input: { text: "ping" },
        maxTokens: 3000,
        maxSteps: 1,
        disableTools: true,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      let text = "";
      for await (const chunk of result.stream) {
        text += ("content" in chunk ? chunk.content : undefined) ?? "";
      }

      assert(
        attempt === 2,
        `expected exactly 2 upstream requests on the streaming path (initial 400 + one composed retry) — got ${attempt}`,
      );
      const retried = capturedBodies[1] as {
        max_tokens?: number;
        chat_template?: string;
      };
      assert(
        retried.max_tokens === EXPECTED_REFIT_MAX_TOKENS,
        `streaming retried body's max_tokens should be re-fit from the overflow numbers — got ${retried.max_tokens}`,
      );
      assert(
        !("chat_template" in retried),
        "streaming retried body should no longer carry the rejected field",
      );
      assert(
        text.includes("pong"),
        "the streamed composed retry should ultimately succeed",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });
});

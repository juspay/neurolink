#!/usr/bin/env tsx
/** Public SDK and built CLI fallback policy, against an owned HTTP endpoint. */
import "./helpers/credentialFreeEnv.js";
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NeuroLink } from "../dist/index.js";
import {
  assert,
  assertEqual,
  defineSuite,
  runCLI,
  tempDir,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh({ entrypoints: ["dist/cli/index.js"] });
const { test, runSuite } = defineSuite("CLI fallback policy", {
  offline: true,
});
const DEAD_MODEL = "llama-3.3-70b-versatile";
const ANSWER = "FALLBACK_POLICY_CONFIRMED";
let requested: string[] = [];
const server = createServer(async (req, res) => {
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    res.writeHead(404).end();
    return;
  }
  const parts: Buffer[] = [];
  for await (const part of req) {
    parts.push(Buffer.from(part));
  }
  const body = JSON.parse(Buffer.concat(parts).toString()) as {
    model?: string;
    stream?: boolean;
  };
  const model = String(body.model ?? "");
  requested.push(model);
  if (model === DEAD_MODEL) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: {
          message: "The model does not exist or you do not have access to it.",
          type: "invalid_request_error",
          code: "model_not_found",
        },
      }),
    );
    return;
  }
  if (body.stream) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    for (const [delta, finish] of [
      [{ role: "assistant", content: ANSWER }, null],
      [{}, "stop"],
    ] as const) {
      res.write(
        `data: ${JSON.stringify({ id: "fallback-proof", object: "chat.completion.chunk", created: 0, model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "fallback-proof",
        object: "chat.completion",
        created: 0,
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: ANSWER },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }),
    );
  }
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (address === null || typeof address !== "object") {
  throw new Error("owned endpoint did not listen");
}
const url = `http://127.0.0.1:${address.port}/v1`;
process.env.GROQ_API_KEY = "fallback-proof-fake-credential";
process.env.GROQ_BASE_URL = url;
process.env.NEUROLINK_SKIP_MCP = "true";

function assertDisabledRequests(): void {
  assert(
    requested.length > 0,
    "the disabled request never reached its endpoint",
  );
  assert(
    requested.every((m) => m === DEAD_MODEL),
    "the disabled request switched models",
  );
}
function assertDefaultRequests(): void {
  assertEqual(requested[0], DEAD_MODEL, "the original model was not attempted");
  assert(
    requested.some((m) => m !== DEAD_MODEL),
    "default fallback did not attempt another model",
  );
}

try {
  for (const kind of ["generate", "stream"] as const) {
    await test(`SDK ${kind} honors disabled model fallback`, async () => {
      requested = [];
      const sdk = new NeuroLink({ conversationMemory: { enabled: false } });
      let threw = false;
      try {
        const options = {
          provider: "groq",
          model: DEAD_MODEL,
          input: { text: "Reply." },
          disableTools: true,
          disableInternalFallback: true,
          maxTokens: 32,
        };
        if (kind === "generate") {
          await sdk.generate(options);
        } else {
          const result = await sdk.stream(options);
          for await (const _chunk of result.stream) {
            /* drain */
          }
        }
      } catch {
        threw = true;
      } finally {
        await sdk.shutdown();
      }
      assert(threw, "the SDK did not surface the rejected model");
      assertDisabledRequests();
    });
    for (const disabled of [false, true]) {
      await test(`CLI ${kind} ${disabled ? "disables" : "retains default"} model fallback`, async () => {
        requested = [];
        const args = [
          kind,
          "Reply.",
          "--provider",
          "groq",
          "--model",
          DEAD_MODEL,
          "--disableTools",
          "--quiet",
          "--format",
          "json",
          "--maxTokens",
          "32",
          "--timeout",
          "15",
        ];
        if (disabled) {
          args.push("--disable-internal-fallback");
        }
        const result = await runCLI(args, { timeoutMs: 60_000 });
        if (disabled) {
          assert(
            result.exitCode !== 0,
            "the CLI reported success for a rejected pinned model",
          );
          assertDisabledRequests();
        } else {
          assertEqual(
            result.exitCode,
            0,
            "the CLI default fallback did not finish",
          );
          assert(
            result.stdout.includes(ANSWER),
            "the CLI did not return the fallback answer",
          );
          assertDefaultRequests();
        }
      });
    }
  }
  const promptsFile = join(tempDir("cli-fallback-prompts-"), "prompts.txt");
  writeFileSync(promptsFile, "Reply.\n");
  for (const disabled of [false, true]) {
    await test(`CLI batch ${disabled ? "disables" : "retains default"} model fallback`, async () => {
      requested = [];
      const args = [
        "batch",
        promptsFile,
        "--provider",
        "groq",
        "--model",
        DEAD_MODEL,
        "--disableTools",
        "--quiet",
        "--format",
        "json",
        "--maxTokens",
        "32",
      ];
      if (disabled) {
        args.push("--disable-internal-fallback");
      }
      const result = await runCLI(args, { timeoutMs: 60_000 });
      assertEqual(
        result.exitCode,
        0,
        "the batch did not return its per-prompt result",
      );
      if (disabled) {
        assertDisabledRequests();
        assert(
          !result.stdout.includes(ANSWER),
          "the batch returned an automatic fallback answer",
        );
        assert(
          result.stdout.includes('"error"'),
          "the batch omitted its rejected-model result",
        );
      } else {
        assertDefaultRequests();
        assert(
          result.stdout.includes(ANSWER),
          "the batch did not return its fallback answer",
        );
      }
    });
  }
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
await runSuite();

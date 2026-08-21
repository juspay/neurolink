#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Google AI Studio native-loop characterization
 * (Plan 08, Task 9).
 *
 * AI Studio has TWO hand-rolled turn loops sharing one shape: the streaming
 * one (`client.ts:1032`) and a near-duplicate inside `generate()`
 * (`client.ts:1500`). Both are `while (step < maxSteps)` over
 * `models.generateContentStream`. This pins what they do before either moves
 * onto `runAgenticLoop`.
 *
 * Everything drives the shipped surface: `NeuroLink` from `../dist/index.js`,
 * no imports out of `src/`, nothing stubbed. The real @google/genai SDK is
 * redirected at a local server through the public
 * `credentials.googleAiStudio.baseURL` option, which the provider threads into
 * the SDK's own `httpOptions.baseUrl` (client.ts:124). No rule-15 exception.
 *
 * Three things are deliberate and load-bearing:
 *
 *  - `disableInternalFallback` on every case. Without it a turn that ends
 *    unsuccessfully makes NeuroLink retry on a DIFFERENT provider, and whether
 *    that succeeds depends on which unrelated credentials sit in the
 *    environment. That is exactly how the Anthropic suite came to pass locally
 *    and fail in CI.
 *  - Env is snapshotted and restored per case, with GOOGLE_AI_BASE_URL cleared
 *    so an ambient value cannot redirect the SDK somewhere else.
 *  - No provider wording in assertion messages. The harness downgrades a
 *    failure matching `isExpectedProviderError()` to a SKIP, so a real
 *    regression would read as green.
 *
 * Run: npx tsx test/continuous-test-suite-aistudio-loop-characterization.ts
 *      pnpm run test:aistudio-loop-characterization
 */

import { createServer, type Server } from "node:http";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "AI Studio loop characterization",
);

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "gemini-2.0-flash";

const TOUCHED_ENV_VARS = [
  "GOOGLE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_BASE_URL",
] as const;

function withAiStudioEnv(): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
  }
  process.env.GOOGLE_AI_API_KEY = "test-key";
  delete process.env.GOOGLE_AI_BASE_URL;
  return () => {
    for (const key of TOUCHED_ENV_VARS) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

type GeminiPart = Record<string, unknown>;

/** One streamed candidate chunk in the SSE framing the SDK expects. */
function sse(parts: GeminiPart[], finishReason?: string): string {
  const payload = {
    candidates: [
      {
        content: { parts, role: "model" },
        ...(finishReason ? { finishReason } : {}),
        index: 0,
      },
    ],
    usageMetadata: {
      promptTokenCount: 5,
      candidatesTokenCount: 4,
      totalTokenCount: 9,
    },
  };
  return `data: ${JSON.stringify(payload)}\r\n\r\n`;
}

function textTurn(text: string): string {
  return sse([{ text }], "STOP");
}

function toolTurn(name: string, args: Record<string, unknown>): string {
  return sse([{ functionCall: { name, args } }], "STOP");
}

type StandInCall = { body: Record<string, unknown> };

type StandIn = {
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

/** Names of the function declarations sent to the model on a given request. */
function declaredToolNames(call: StandInCall | undefined): string[] {
  const tools = (call?.body?.tools ?? []) as Array<{
    functionDeclarations?: Array<{ name?: string }>;
  }>;
  return tools
    .flatMap((t) => t.functionDeclarations ?? [])
    .map((d) => d.name)
    .filter((n): n is string => typeof n === "string");
}

/** functionResponse parts carried back to the model on a given request. */
function functionResponses(call: StandInCall | undefined): string[] {
  const contents = (call?.body?.contents ?? []) as Array<{
    parts?: Array<{ functionResponse?: { name?: string } }>;
  }>;
  return contents
    .flatMap((c) => c.parts ?? [])
    .map((p) => p.functionResponse?.name)
    .filter((n): n is string => typeof n === "string");
}

async function startStandIn(
  reply: (callIndex: number) => string,
): Promise<StandIn> {
  const calls: StandInCall[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const parseBody = (): Record<string, unknown> => {
        try {
          return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
        } catch {
          return {};
        }
      };
      calls.push({ body: parseBody() });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(reply(calls.length - 1));
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

function credentialsFor(port: number) {
  return {
    googleAiStudio: {
      apiKey: "test-key",
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

function customTool(counter: { calls: number }) {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: true,
      },
      execute: async () => {
        counter.calls++;
        return { found: true };
      },
    },
  };
}

section("streaming loop");

await test("a text-only turn streams its text and stops after one call", async () => {
  const server = await startStandIn(() => textTurn("hello from ai studio"));
  const restore = withAiStudioEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
    });
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk?.content ?? "";
    }
    assert(
      text.includes("hello from ai studio"),
      "the streamed text was not surfaced to the consumer",
    );
    assert(
      server.calls.length === 1,
      `a text-only turn should take exactly one call, took ${server.calls.length}`,
    );
  } finally {
    restore();
    await server.close();
  }
});

section("caller-supplied tools");

await test("a caller's own tool is declared, executed, and its result returns to the model", async () => {
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", { q: "x" }) : textTurn("done"),
  );
  const restore = withAiStudioEnv();
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      disableInternalFallback: true,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk?.content ?? "";
    }
    assert(
      declaredToolNames(server.calls[0]).includes("lookup"),
      "the caller's tool was not declared to the model",
    );
    assert(
      server.calls.length === 2,
      `a tool round trip should take exactly two calls, took ${server.calls.length}`,
    );
    assert(counter.calls === 1, "the caller's tool did not execute once");
    assert(
      functionResponses(server.calls[1]).includes("lookup"),
      "the tool result was not carried back to the model",
    );
    assert(text.includes("done"), "the final turn's text was not surfaced");
  } finally {
    restore();
    await server.close();
  }
});

section("generate loop");

await test("the generate path does not declare a caller's tools (known defect)", async () => {
  // AI Studio's generate() has a second, near-duplicate hand-rolled loop.
  // Pinning it separately matters because Task 9 migrates BOTH onto one
  // adapter, and a regression in either would otherwise be invisible.
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", {}) : textTurn("generated done"),
  );
  const restore = withAiStudioEnv();
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "look something up" },
      provider: "google-ai",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      disableInternalFallback: true,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    // Pins behaviour that is WRONG, so the migration has a baseline.
    //
    // AI Studio's generate() never advertises the caller's tools: the loop
    // builds its declarations from `options.tools`, but nothing merges the
    // caller's tools into it on this path the way BaseProvider.stream() does
    // for the streaming twin. So `nl.generate({ provider: "google-ai",
    // tools })` cannot use those tools at all — the model is never told they
    // exist. This is the same defect class already found and fixed on
    // Bedrock's generate path.
    //
    // The two calls below therefore prove the loop ran, not that the tool
    // worked: the fixture returns a canned functionCall the provider never
    // declared, so the loop answers it with a not-found functionResponse and
    // takes a second turn. When Task 9's migration fixes the declaration,
    // these assertions invert — which is the intended outcome, not a
    // regression.
    assert(
      !declaredToolNames(server.calls[0]).includes("lookup"),
      "the generate path declared the caller's tool — the defect is fixed, invert this assertion",
    );
    assert(
      counter.calls === 0,
      "the caller's tool executed on the generate path — the defect is fixed, invert this assertion",
    );
    assert(
      server.calls.length === 2,
      `the loop should still take two turns, took ${server.calls.length}`,
    );
    assert(
      typeof result?.content === "string" &&
        result.content.includes("generated done"),
      "the final turn's text was not returned",
    );
  } finally {
    restore();
    await server.close();
  }
});

await runSuite();

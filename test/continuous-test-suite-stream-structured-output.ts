#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — stream({ schema }) structured output.
 *
 * Before this fix, the streaming path never sent `response_format` on the
 * wire under any condition — unlike `generate()`, where the gap is only
 * tools-dependent (see `suppressResponseFormatWithTools`) — so
 * `metadata.structuredData` did not exist on `StreamResult` at all and a
 * `stream({ schema })` caller had no way to get parsed structured output.
 *
 * This suite drives `nl.stream({ schema })` against a local, scripted
 * OpenAI-compatible SSE server (no credentials, no network egress — see
 * `startStructuredSSEServer` below) and, after fully draining the stream,
 * asserts:
 *   1. the wire request actually carried `response_format` (the request the
 *      mock server received is captured verbatim), and
 *   2. `result.metadata.structuredData` is present and validates against the
 *      Zod schema that was requested.
 *
 * `metadata.structuredData` is a mutable reference the provider fills in only
 * after the stream fully drains (see the doc comment on `StreamResult`'s
 * `metadata.structuredData` in `src/lib/types/stream.ts`), so this suite
 * reads it only after the `for await` loop over `result.stream` completes —
 * reading it earlier would legitimately race the resolution and is not what
 * this suite is testing.
 *
 * NEUROLINK_DISABLE_BUILTIN_TOOLS is set before the dist import so no
 * built-in tool gets auto-attached and suppresses `response_format` for a
 * reason unrelated to the defect under test (see
 * `suppressResponseFormatWithTools`).
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-stream-structured-output.ts
 *      pnpm run test:stream-structured-output
 */

process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";

import { createServer, type IncomingMessage, type Server } from "node:http";
import { z } from "zod";
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Stream structured output", {
  offline: true,
});

const { NeuroLink, tool } = await import("../dist/index.js");

const credentialsFor = (baseURL: string) => ({
  openai: { apiKey: "sk-mock-local-server", baseURL },
});

function sseChunk(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

type CapturedServer = {
  baseURL: string;
  requestBodies: string[];
  close: () => Promise<void>;
};

/**
 * A local server that answers every streaming chat-completions request with
 * an SSE stream whose content deltas, concatenated, equal `jsonText` — split
 * across two chunks so this exercises real incremental accumulation rather
 * than a single delta carrying the whole payload. Every raw request body is
 * recorded, oldest first, so a test can assert on what NeuroLink actually
 * sent (e.g. `response_format`) without mocking `fetch`.
 */
function startStructuredSSEServer(jsonText: string): Promise<CapturedServer> {
  const requestBodies: string[] = [];
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      requestBodies.push(Buffer.concat(chunks).toString("utf8"));

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const base = {
        id: "mock-structured-stream",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "scripted-model",
      };
      const mid = Math.floor(jsonText.length / 2);
      for (const part of [jsonText.slice(0, mid), jsonText.slice(mid)]) {
        res.write(
          sseChunk({
            ...base,
            choices: [
              { index: 0, delta: { content: part }, finish_reason: null },
            ],
          }),
        );
      }
      res.write(
        sseChunk({
          ...base,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        }),
      );
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseURL: `http://127.0.0.1:${port}/v1`,
        requestBodies,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

const weatherSchema = z.object({
  city: z.string(),
  temp: z.number(),
});

await test("stream({ schema }) sends response_format on the wire and resolves metadata.structuredData after drain", async () => {
  const server = await startStructuredSSEServer(
    JSON.stringify({ city: "Paris", temp: 21 }),
  );
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.stream({
      input: { text: "What is the weather in Paris?" },
      provider: "openai",
      model: "scripted-model",
      credentials: credentialsFor(server.baseURL),
      schema: weatherSchema,
    });

    // Drain fully before reading metadata.structuredData — it is a
    // mutable reference the provider only fills in once the stream loop
    // has finished (see the file-header doc comment).
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert(text.length > 0, "no text content was yielded by the stream at all");

    assert(
      server.requestBodies.length >= 1,
      "no request reached the mock server",
    );
    const wireBody = JSON.parse(server.requestBodies[0]) as {
      response_format?: unknown;
    };
    assert(
      wireBody.response_format !== undefined,
      "response_format was not present on the wire request",
    );

    const structuredData = result.metadata?.structuredData;
    assert(
      structuredData !== undefined,
      "metadata.structuredData was not populated after the stream drained",
    );
    const parsed = weatherSchema.safeParse(structuredData);
    assert(
      parsed.success,
      "metadata.structuredData did not validate against the requested schema",
    );
  } finally {
    await server.close();
  }
});

/**
 * The tools-suppressed branch, which the case above cannot reach.
 *
 * `suppressResponseFormatWithTools()` is true for every provider except
 * OpenAI and Azure, so a turn that carries tools goes out WITHOUT
 * `response_format` and the model answers in prose. Sending the wire field is
 * therefore not enough on its own: the only way a `stream({ schema, tools })`
 * caller ever gets structured output is the one tool-free re-ask that
 * `resolveStreamStructuredData` performs after the stream drains.
 *
 * This server scripts all three requests that flow makes, branching on
 * whether the body asked for `stream: true`:
 *   1. streaming, no prior tool reply  -> answer with a `tool_calls` delta
 *   2. streaming, after the tool reply -> stream PROSE, deliberately not JSON
 *   3. non-streaming                   -> the re-ask; return the real object
 *
 * Every raw body is recorded so the test can assert on what actually went out
 * rather than on what the implementation says it sends.
 */
function startToolThenReaskServer(
  proseAnswer: string,
  reaskJson: string,
): Promise<CapturedServer> {
  const requestBodies: string[] = [];
  const server: Server = createServer((req: IncomingMessage, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      requestBodies.push(raw);
      const body = JSON.parse(raw) as {
        stream?: boolean;
        messages?: Array<{ role?: string }>;
      };

      if (body.stream !== true) {
        // The tool-free re-ask. Non-streaming, so it answers as a plain
        // chat completion rather than SSE.
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "mock-reask",
            object: "chat.completion",
            created: Math.floor(Date.now() / 1000),
            model: "scripted-model",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: reaskJson },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 8,
              total_tokens: 20,
            },
          }),
        );
        return;
      }

      const sawToolReply = (body.messages ?? []).some(
        (message) => message.role === "tool",
      );
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      const base = {
        id: "mock-tool-stream",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "scripted-model",
      };

      if (!sawToolReply) {
        res.write(
          sseChunk({
            ...base,
            choices: [
              {
                index: 0,
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: "call_reask_fixture",
                      type: "function",
                      function: {
                        name: "lookup_weather",
                        arguments: '{"city":"Paris"}',
                      },
                    },
                  ],
                },
                finish_reason: null,
              },
            ],
          }),
        );
        res.write(
          sseChunk({
            ...base,
            choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
          }),
        );
      } else {
        const mid = Math.floor(proseAnswer.length / 2);
        for (const part of [
          proseAnswer.slice(0, mid),
          proseAnswer.slice(mid),
        ]) {
          res.write(
            sseChunk({
              ...base,
              choices: [
                { index: 0, delta: { content: part }, finish_reason: null },
              ],
            }),
          );
        }
        res.write(
          sseChunk({
            ...base,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          }),
        );
      }
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        baseURL: `http://127.0.0.1:${port}/v1`,
        requestBodies,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/**
 * Deliberately NOT the `openai` provider. `suppressResponseFormatWithTools()`
 * returns the base default `true` everywhere except OpenAI and Azure, which
 * override it to `false` — so driving this case through `openai` would send
 * `response_format` alongside the tools, the streamed answer would already be
 * JSON, and the re-ask under test would never run. `openai-compatible` takes
 * the default, which is what the overwhelming majority of providers do.
 */
const COMPAT_ENV = [
  "OPENAI_COMPATIBLE_API_KEY",
  "OPENAI_COMPATIBLE_BASE_URL",
] as const;

await test("stream({ schema }) with tools re-asks once without tools and still resolves structuredData", async () => {
  const PROSE = "It is a mild 21 degrees in Paris right now.";
  let toolCalls = 0;
  const server = await startToolThenReaskServer(
    PROSE,
    JSON.stringify({ city: "Paris", temp: 21 }),
  );
  const savedEnv: Record<string, string | undefined> = {};
  for (const key of COMPAT_ENV) {
    savedEnv[key] = process.env[key];
  }
  try {
    process.env.OPENAI_COMPATIBLE_API_KEY = "sk-mock-local-server";
    process.env.OPENAI_COMPATIBLE_BASE_URL = server.baseURL;

    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.stream({
      input: { text: "What is the weather in Paris?" },
      provider: "openai-compatible",
      model: "scripted-model",
      schema: weatherSchema,
      tools: {
        lookup_weather: tool({
          inputSchema: z.object({ city: z.string() }),
          execute: async ({ city }: { city: string }) => {
            toolCalls++;
            return { city, temp: 21 };
          },
        }),
      },
    } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);

    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }

    assert(toolCalls === 1, "the scripted tool did not run exactly once");
    // The caller's own stream must be untouched by the recovery: they asked
    // for a stream and consumed prose, and the re-ask happens behind it.
    assert(
      text.trim() === PROSE,
      "the drained stream did not deliver the scripted prose answer",
    );

    const bodies = server.requestBodies.map(
      (raw) =>
        JSON.parse(raw) as {
          stream?: boolean;
          tools?: unknown[];
          response_format?: unknown;
          messages?: Array<Record<string, unknown>>;
        },
    );
    const streamed = bodies.filter((b) => b.stream === true);
    const reasks = bodies.filter((b) => b.stream !== true);

    assert(streamed.length >= 1, "no streaming request reached the fixture");
    assert(
      Array.isArray(streamed[0].tools) && streamed[0].tools.length > 0,
      "the first streaming request did not carry the caller's tool",
    );
    // The premise of the whole branch: with tools attached the wire field is
    // suppressed, so the streamed turn cannot itself produce structured data.
    assert(
      streamed[0].response_format === undefined,
      "the tools-bearing streaming request unexpectedly carried the format field",
    );

    assert(
      reasks.length === 1,
      "the tool-free re-ask did not happen exactly once",
    );
    const reask = reasks[0];
    assert(
      reask.response_format !== undefined,
      "the re-ask did not carry the format field",
    );
    assert(
      !Array.isArray(reask.tools) || reask.tools.length === 0,
      "the re-ask still carried tools, so it was not the tool-free retry",
    );

    // The conversation-rebuilding fix: a `tool` reply whose `tool_call_id` has
    // no matching `tool_calls` entry in a preceding assistant turn is what a
    // real vendor rejects outright. Assert the exchange is coherent rather
    // than trusting that it was filtered.
    const reaskMessages = reask.messages ?? [];
    const announced = new Set<string>();
    for (const message of reaskMessages) {
      const calls = (message as { tool_calls?: Array<{ id?: string }> })
        .tool_calls;
      if (Array.isArray(calls)) {
        for (const call of calls) {
          if (typeof call.id === "string") {
            announced.add(call.id);
          }
        }
      }
    }
    const orphanReplies = reaskMessages.filter((message) => {
      if (message.role !== "tool") {
        return false;
      }
      const id = (message as { tool_call_id?: unknown }).tool_call_id;
      return typeof id !== "string" || id.length === 0 || !announced.has(id);
    });
    assert(
      orphanReplies.length === 0,
      "the re-ask conversation carries a tool reply with no matching announced call",
    );

    const structuredData = result.metadata?.structuredData;
    assert(
      structuredData !== undefined,
      "metadata.structuredData was not populated after the tools-suppressed turn",
    );
    const parsed = weatherSchema.safeParse(structuredData);
    assert(
      parsed.success,
      "the re-asked structuredData did not validate against the requested schema",
    );

    // The re-ask is a second billed model call whose tokens cannot be folded
    // into the stream's usage — that resolved before the re-ask ran, and a
    // caller may already have read it. Reporting them separately is what
    // keeps the turn's real cost visible; raised in review on this PR.
    const reaskUsage = result.metadata?.structuredDataUsage;
    assert(
      reaskUsage !== undefined,
      "the separately-billed re-ask reported no usage at all",
    );
    assert(
      (reaskUsage?.outputTokens ?? 0) > 0,
      "the re-ask reported no output tokens despite having answered",
    );
    assert(
      (reaskUsage?.inputTokens ?? 0) > 0,
      "the re-ask reported no input tokens despite having sent a conversation",
    );
  } finally {
    await server.close();
    for (const key of COMPAT_ENV) {
      const prior = savedEnv[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  }
});

/**
 * Scalar-root schemas, raised in review on this PR.
 *
 * A ValidationSchema accepts more than objects — `z.string()` is a legitimate
 * schema. `coerceJsonToSchema` scans for a balanced object or array span, so
 * a scalar answer finds no span and yields null, and the field stayed unset
 * however correctly the model answered. `recoverScalarRoot` already existed
 * for exactly this and was wired only into the neurolink.ts generate path.
 */
const cityNameSchema = z.string();

await test("stream({ schema }) resolves a scalar-root schema, not just objects", async () => {
  // A bare JSON string: valid JSON, valid against the schema, and containing
  // no object or array span for a bracket scan to find.
  const server = await startStructuredSSEServer(JSON.stringify("Paris"));
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.stream({
      input: { text: "Which city?" },
      provider: "openai",
      model: "scripted-model",
      credentials: credentialsFor(server.baseURL),
      schema: cityNameSchema,
    });

    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert(text.length > 0, "no text content was yielded by the stream at all");

    const structuredData = result.metadata?.structuredData;
    assert(
      structuredData !== undefined,
      "a scalar-root schema left structuredData unset",
    );
    assert(
      cityNameSchema.safeParse(structuredData).success,
      "the scalar structuredData did not validate against the requested schema",
    );
  } finally {
    await server.close();
  }
});

await test("a turn that produces no object leaves structuredData absent, not present-and-undefined", async () => {
  // Prose that satisfies no schema, with tools off so no re-ask path runs.
  const server = await startStructuredSSEServer("not json at all");
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.stream({
      input: { text: "Which city?" },
      provider: "openai",
      model: "scripted-model",
      credentials: credentialsFor(server.baseURL),
      schema: weatherSchema,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }

    // The field's own contract tells readers absence means the model never
    // produced the object, and `in` is how a reader checks that. An
    // unconditional assignment creates the own property even when the value
    // is undefined, which reports true for a turn that produced nothing.
    const metadata = result.metadata ?? {};
    assert(
      !("structuredData" in metadata),
      "structuredData exists as an own property on a turn that produced no object",
    );
  } finally {
    await server.close();
  }
});

await runSuite();

#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Vertex + Claude native-loop characterization
 * (Plan 08, Task 11).
 *
 * Pins the observable behaviour of the two hand-rolled loops in
 * googleVertex/client.ts that drive Claude models —
 * executeNativeAnthropicStream and executeNativeAnthropicGenerate — before
 * they move onto `runAgenticLoop`.
 *
 * Reaching them at all needed a provider change, which is worth stating
 * plainly. `@anthropic-ai/vertex-sdk` resolves Application Default Credentials
 * in its constructor and awaits them on every request, so there was no
 * supported way to point a Claude-on-Vertex turn at a local endpoint. Its
 * `accessToken` option looks like the answer and is not — the client stores it
 * and never reads it for auth. The option the SDK actually consults is
 * `authClient`, so the provider now builds one from an express-style API key,
 * exactly as the Gemini side already does. That makes these loops reachable
 * here AND gives callers a gateway/API-key path that did not exist before.
 *
 * Everything drives the shipped surface: `new NeuroLink().stream()` and
 * `.generate()` from `../dist/index.js`, answered by a local server speaking
 * real Anthropic SSE framing so the SDK's own event parsing runs. No imports
 * out of `src/`, nothing stubbed. No rule-15 exception.
 *
 * Assertion messages carry counts, never payloads: the harness downgrades a
 * failure whose text matches `isExpectedProviderError()` to a SKIP, so quoting
 * provider-ish content would turn a real regression green.
 *
 * Run: npx tsx test/continuous-test-suite-vertex-claude-characterization.ts
 */

import { createServer, type Server } from "node:http";
import { z } from "zod";
import { jsonSchema } from "../dist/index.js";
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { Tool } from "../src/lib/types/index.js";

assertDistFresh();

// Registered BEFORE the dist import so NeuroLink adopts this provider instead
// of initializing its own — the documented external-TracerProvider path. The
// hydration-observability case reads its spans out of this exporter; the
// other cases are unaffected (they pin calls and counters, not spans).
const spanExporter = new InMemorySpanExporter();
new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(spanExporter)],
}).register();

const { test, section, runSuite } = defineSuite(
  "Vertex Claude loop characterization",
  {
    offline: true,
  },
);

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "claude-3-5-sonnet-v2@20241022";

const TOUCHED_ENV_VARS = [
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_PROJECT_ID",
  "VERTEX_PROJECT_ID",
  "GOOGLE_VERTEX_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "VERTEX_LOCATION",
  "GOOGLE_VERTEX_LOCATION",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_VERTEX_API_KEY",
  "GOOGLE_VERTEX_BASE_URL",
  "GOOGLE_API_KEY",
] as const;

function withVertexEnv(): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
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

function sse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

/** A turn that emits text and stops. */
function textTurn(text: string): string[] {
  return [
    // The FULL message shape, not the trimmed one. `MessageStream` builds its
    // snapshot from this event and then pushes each content block onto
    // `snapshot.content`; without `content: []` (and the sibling fields it
    // reads alongside) the accumulator dies on "Cannot read properties of
    // undefined (reading 'push')" before a single delta is delivered.
    sse("message_start", {
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: MODEL,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 5, output_tokens: 0 },
      },
    }),
    sse("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }),
    sse("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text },
    }),
    sse("content_block_stop", { index: 0 }),
    sse("message_delta", {
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 4 },
    }),
    sse("message_stop", {}),
  ];
}

/** A turn that asks for one tool call. */
function toolTurn(
  name: string,
  input: Record<string, unknown>,
  id = "toolu_1",
  leadingText?: string,
): string[] {
  const frames: string[] = [
    // The FULL message shape, not the trimmed one. `MessageStream` builds its
    // snapshot from this event and then pushes each content block onto
    // `snapshot.content`; without `content: []` (and the sibling fields it
    // reads alongside) the accumulator dies on "Cannot read properties of
    // undefined (reading 'push')" before a single delta is delivered.
    sse("message_start", {
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: MODEL,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 5, output_tokens: 0 },
      },
    }),
  ];
  let index = 0;
  if (leadingText !== undefined) {
    frames.push(
      sse("content_block_start", {
        index,
        content_block: { type: "text", text: "" },
      }),
      sse("content_block_delta", {
        index,
        delta: { type: "text_delta", text: leadingText },
      }),
      sse("content_block_stop", { index }),
    );
    index++;
  }
  frames.push(
    sse("content_block_start", {
      index,
      content_block: { type: "tool_use", id, name, input: {} },
    }),
    sse("content_block_delta", {
      index,
      delta: { type: "input_json_delta", partial_json: JSON.stringify(input) },
    }),
    sse("content_block_stop", { index }),
    sse("message_delta", {
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 6 },
    }),
    sse("message_stop", {}),
  );
  return frames;
}

type StandInCall = {
  body: Record<string, unknown>;
  /** Recorded so a case can prove which credentials actually went out. */
  authorization: string | undefined;
};

type StandIn = {
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

/** Tool names declared to the model on a given request. */
function declaredToolNames(call: StandInCall | undefined): string[] {
  const tools = (call?.body?.tools ?? []) as Array<{ name?: string }>;
  return tools
    .map((t) => t.name)
    .filter((n): n is string => typeof n === "string");
}

/** tool_result blocks carried back to the model on a given request. */
function toolResults(
  call: StandInCall | undefined,
): Array<{ is_error?: boolean; content?: unknown }> {
  const messages = (call?.body?.messages ?? []) as Array<{
    content?: unknown;
  }>;
  const blocks: Array<{ is_error?: boolean; content?: unknown }> = [];
  for (const message of messages) {
    if (!Array.isArray(message.content)) {
      continue;
    }
    for (const block of message.content as Array<Record<string, unknown>>) {
      if (block?.type === "tool_result") {
        blocks.push(block as { is_error?: boolean; content?: unknown });
      }
    }
  }
  return blocks;
}

/**
 * Fold the SSE frames a case declares into the single message body the
 * non-streaming endpoint returns, so every case states its intent once and
 * both wire modes are served from it.
 */
function messageFromFrames(frames: string[]): Record<string, unknown> {
  const events = frames.map(
    (frame) =>
      JSON.parse(frame.slice(frame.indexOf("data: ") + 6).trim()) as Record<
        string,
        unknown
      >,
  );
  const start = events.find((e) => e.type === "message_start") as
    | { message?: Record<string, unknown> }
    | undefined;
  const message: Record<string, unknown> = { ...(start?.message ?? {}) };
  const content: Array<Record<string, unknown>> = [];
  for (const event of events) {
    if (event.type === "content_block_start") {
      content.push({
        ...((event.content_block as Record<string, unknown>) ?? {}),
      });
    }
    if (event.type === "content_block_delta") {
      const delta = (event.delta ?? {}) as Record<string, unknown>;
      const block = content[content.length - 1];
      if (!block) {
        continue;
      }
      if (typeof delta.text === "string") {
        block.text = `${block.text ?? ""}${delta.text}`;
      }
      if (typeof delta.partial_json === "string") {
        block.input = JSON.parse(delta.partial_json) as Record<string, unknown>;
      }
    }
    if (event.type === "message_delta") {
      Object.assign(message, (event.delta ?? {}) as Record<string, unknown>);
    }
  }
  message.content = content;
  return message;
}

async function startStandIn(
  reply: (callIndex: number) => string[],
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
      const body = parseBody();
      calls.push({
        body,
        authorization: req.headers.authorization,
      });
      const frames = reply(calls.length - 1);
      // The two loops speak DIFFERENT wire modes, and answering both is the
      // only way to reach them from one stand-in: the streaming loop calls
      // `client.messages.stream` and gets SSE, while the generate loop calls
      // `client.messages.create` and expects a single JSON message. A stand-in
      // that only spoke SSE left the generate path unable to parse anything,
      // which reads like a broken loop rather than a mismatched fixture.
      if (body.stream === true) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const frame of frames) {
          res.write(frame);
        }
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(messageFromFrames(frames)));
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
    vertex: {
      apiKey: "express-key",
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

function customTool(counter: { calls: number }): Record<string, Tool> {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: jsonSchema({
        type: "object",
        properties: {},
        additionalProperties: true,
      }),
      execute: async () => {
        counter.calls++;
        return { found: true };
      },
    },
  };
}

section("reachability");

await test("a Claude-on-Vertex turn can be answered by a local endpoint", async () => {
  // The enabler itself. Before the authClient wiring this could not run at
  // all: the SDK resolved Application Default Credentials in its constructor
  // and awaited them on every request, so a turn either reached Google or
  // failed on credentials. Nothing else in this file is reachable if this is
  // not.
  //
  // The turn is wrapped rather than left to throw, and that is deliberate.
  // The harness downgrades a failure whose text matches
  // `isExpectedProviderError()` to a SKIP, and "could not be resolved from
  // credentials" matches — so an unreachable provider reported this case as
  // PASSED WITH A SKIP while nothing had run. Asserting on the stand-in's own
  // call count instead cannot be downgraded that way: a count is not provider
  // wording.
  const server = await startStandIn(() => textTurn("hello from the stand-in"));
  const restore = withVertexEnv();
  let text = "";
  let failure = "";
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "say hello" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      disableTools: true,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      const content = (chunk as { content?: string })?.content;
      if (content) {
        text += content;
      }
    }
  } catch (error) {
    // Logged, never asserted on: console output is not subject to the
    // harness skip matching, so quoting the provider here is safe.
    failure =
      error instanceof Error ? error.message.slice(0, 160) : String(error);
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex-claude reachability: calls=${server.calls.length} chars=${text.length} outcome=${failure || "ok"}`,
  );
  assert(
    server.calls.length === 1,
    `the provider made ${server.calls.length} requests to the stand-in, not the 1 a text-only turn takes`,
  );
  assert(text.length > 0, "the turn delivered no text to the consumer");
  // The header, not just the fact that a request arrived. Without this the
  // case passes on a runner that happens to have ambient Application Default
  // Credentials — the very path the authClient wiring exists to replace — so
  // a regression in that wiring would look like success.
  assert(
    server.calls[0]?.authorization === "Bearer express-key",
    "the request did not carry the express key as its bearer credential",
  );
});

await test("the generate path reaches the same endpoint with the same credential", async () => {
  // Both loops share this auth wiring, and they do NOT share a wire mode:
  // executeNativeAnthropicGenerate calls client.messages.create and gets a
  // single JSON message, where the streaming loop gets SSE. Covering only the
  // streamed path would leave a regression in the create() path invisible.
  const server = await startStandIn(() => textTurn("generated answer"));
  const restore = withVertexEnv();
  let content = "";
  let failure = "";
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "say hello" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      disableTools: true,
      credentials: credentialsFor(server.port),
    });
    content = (result as { content?: string })?.content ?? "";
  } catch (error) {
    failure =
      error instanceof Error ? error.message.slice(0, 160) : String(error);
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex-claude generate reachability: calls=${server.calls.length} chars=${content.length} outcome=${failure || "ok"}`,
  );
  assert(
    server.calls.length === 1,
    `the generate path made ${server.calls.length} requests to the stand-in, not the 1 a text-only turn takes`,
  );
  assert(content.length > 0, "the generate path returned no content");
  assert(
    server.calls[0]?.authorization === "Bearer express-key",
    "the generate request did not carry the express key as its bearer credential",
  );
});

section("caller-supplied tools");

await test("a caller's tool is declared, executed, and its result returns to the model", async () => {
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", { q: "x" }) : textTurn("done"),
  );
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  let text = "";
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      disableInternalFallback: true,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      text += (chunk as { content?: string })?.content ?? "";
    }
  } catch {
    // Counts are what is pinned, not the outcome.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex-claude caller tools: calls=${server.calls.length} executed=${counter.calls} chars=${text.length}`,
  );
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
    toolResults(server.calls[1]).length === 1,
    "the tool result was not carried back to the model",
  );
});

section("step cap");

await test("a model that never stops calling tools is bounded by maxSteps", async () => {
  const server = await startStandIn(() => toolTurn("lookup", { q: "x" }));
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "loop forever" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      disableInternalFallback: true,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // The dispatch count is what is pinned.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex-claude step cap: calls=${server.calls.length} executed=${counter.calls}`,
  );
  // Bounded, and bounded BY THE CAP: a model that always asks for a tool
  // cannot drive more requests than the budget allows.
  assert(
    server.calls.length <= 4,
    `the loop issued ${server.calls.length} requests against a 3-step budget`,
  );
  assert(
    counter.calls > 0,
    "the tool never ran, so the cap was not reached by looping",
  );
});

section("repeatedly failing tool");

await test("a tool that always throws is dispatched a bounded number of times", async () => {
  const server = await startStandIn(() => toolTurn("flaky", {}));
  const restore = withVertexEnv();
  let attempts = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep trying" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      disableInternalFallback: true,
      tools: {
        flaky: {
          description: "always fails",
          inputSchema: jsonSchema({
            type: "object",
            properties: {},
            additionalProperties: true,
          }),
          execute: async () => {
            attempts++;
            throw new Error("synthetic tool failure");
          },
        },
      },
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // The dispatch count is what is pinned.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex-claude failing tool: attempts=${attempts} calls=${server.calls.length}`,
  );
  assert(
    attempts === 2,
    `the failing tool was dispatched ${attempts} times, not the 2 this loop performs`,
  );
});

section("reserved finalization step");

await test("a structured turn that never calls final_result is forced to", async () => {
  // The behaviour that distinguishes this loop from the Gemini ones. When a
  // schema is in play the loop reserves a step: if the model reaches the cap
  // without calling final_result, ONE more request goes out with tool_choice
  // pinned to it, because Anthropic guarantees a tool_use for a pinned tool.
  // Without that reservation a structured turn can end with no structured
  // output at all.
  const server = await startStandIn(() => toolTurn("lookup", { q: "x" }));
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  let reservedFailure = "";
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "answer with structure" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 2,
      disableTools: false,
      disableInternalFallback: true,
      schema: z.object({ answer: z.string() }),
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch (error) {
    reservedFailure =
      error instanceof Error ? error.message.slice(0, 200) : String(error);
  } finally {
    restore();
    await server.close();
  }
  const pinned = server.calls.filter((call) => {
    const choice = call.body?.tool_choice as { name?: string } | undefined;
    return choice?.name === "final_result";
  });
  console.log(
    `    [diagnostic] vertex-claude reserved step: calls=${server.calls.length} pinned=${pinned.length} outcome=${reservedFailure || "ok"}`,
  );
  assert(
    pinned.length === 1,
    `the loop pinned final_result on ${pinned.length} requests, not the single reserved one`,
  );
  // And it is the LAST request, not one of the ordinary loop steps.
  assert(
    server.calls[server.calls.length - 1] === pinned[0],
    "the pinned finalization was not the turn's final request",
  );
});

section("generate path");

await test("the generate path declares and executes a caller's tools", async () => {
  // A second, near-duplicate hand-rolled loop lives inside generate(). Pinning
  // it separately matters because the migration touches both.
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn("lookup", { q: "x" }) : textTurn("generated answer"),
  );
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  let content = "";
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "look something up" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    content = (result as { content?: string })?.content ?? "";
  } catch {
    // Counts are what is pinned.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex-claude generate: calls=${server.calls.length} executed=${counter.calls} chars=${content.length} results=${server.calls.map((c) => toolResults(c).length).join(",")}`,
  );
  assert(
    server.calls.length === 2,
    `the generate path took ${server.calls.length} calls, not the 2 a tool round trip needs`,
  );
  assert(
    counter.calls === 1,
    "the generate path did not execute the tool once",
  );
  assert(
    content.includes("generated answer"),
    "the generate path did not return the final turn's text",
  );
});

section("mid-turn tool hydration observability");

/**
 * A minimal streamable-HTTP MCP server carrying one tool. Discovery only
 * defers EXTERNAL MCP tools, so reaching the deferred-hydration path needs a
 * real registered server — caller-supplied tools always stay hot.
 */
async function startMockMcpServer(): Promise<{
  url: string;
  toolCalls: number[];
  close: () => Promise<void>;
}> {
  const toolCalls: number[] = [];
  const handle = (msg: {
    method?: string;
    id?: number | string | null;
  }): Record<string, unknown> | null => {
    if (msg.method === "initialize") {
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "mock-late-server", version: "1.0.0" },
        },
      };
    }
    if (msg.method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          tools: [
            {
              name: "late_probe",
              description: "a tool that is deferred behind search_tools",
              inputSchema: { type: "object" as const, properties: {} },
            },
          ],
        },
      };
    }
    if (msg.method === "tools/call") {
      toolCalls.push(Date.now());
      return {
        jsonrpc: "2.0",
        id: msg.id,
        result: { content: [{ type: "text", text: "probe ok" }] },
      };
    }
    if (msg.method?.startsWith("notifications/")) {
      return null;
    }
    return {
      jsonrpc: "2.0",
      id: msg.id ?? null,
      error: { code: -32601, message: "method not found" },
    };
  };
  const server: Server = createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(req.method === "DELETE" ? 200 : 405);
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as
          | Record<string, unknown>
          | Array<Record<string, unknown>>;
        const messages = Array.isArray(body) ? body : [body];
        const responses = messages
          .map((m) => handle(m as { method?: string; id?: number }))
          .filter((r): r is Record<string, unknown> => r !== null);
        res.writeHead(200, {
          "content-type": "application/json",
          "mcp-session-id": "late-session",
        });
        res.end(
          responses.length === 1
            ? JSON.stringify(responses[0])
            : responses.length > 1
              ? JSON.stringify(responses)
              : undefined,
        );
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    toolCalls,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

await test("a deferred tool hydrated mid-turn is executed and observed with a tool span", async () => {
  // The engine's tool record is snapshotted before the turn starts, and a
  // deferred external tool is not an enumerable entry of the live record, so
  // calling it always dispatches through resolveToolOnMiss — auto-hydration
  // from the deferred catalog. This pins that the hydrated execution carries
  // the same ai.toolCall observation as an up-front one: the hand-rolled loop
  // opened the span after the executor lookup, so a hydrated call was never
  // the one unobserved execution in a turn.
  let deferredName = "";
  const server = await startStandIn((i) =>
    i === 0 ? toolTurn(deferredName, { q: "x" }, "toolu_h1") : textTurn("done"),
  );
  const mcp = await startMockMcpServer();
  const restore = withVertexEnv();
  let externalToolCount = 0;
  try {
    const nl = new NeuroLink({ tools: { discovery: true } });
    await nl.addExternalMCPServer("late-server", {
      id: "late-server",
      name: "late-server",
      description: "mock server whose tool is deferred",
      transport: "http",
      url: mcp.url,
      status: "initializing",
      tools: [],
      command: "",
      args: [],
    });
    // The advertised name is whatever the registry exposes — read it rather
    // than guessing the namespacing, and hand it to the stand-in script.
    const externalTools = nl.getExternalMCPTools();
    externalToolCount = externalTools.length;
    deferredName = externalTools[0]?.name ?? "late_probe";
    spanExporter.reset();
    const result = await nl.stream({
      input: { text: "call the late tool" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // Counts and spans are what is pinned, not the outcome.
  } finally {
    restore();
    await server.close();
    await mcp.close();
  }
  const toolSpanNames = spanExporter
    .getFinishedSpans()
    .filter((s) => s.name === "ai.toolCall")
    .map((s) => s.attributes["ai.toolCall.name"]);
  console.log(
    `    [diagnostic] vertex-claude hydration spans: externalTools=${externalToolCount} standInCalls=${server.calls.length} mcpToolCalls=${mcp.toolCalls.length} toolSpans=${toolSpanNames.length}`,
  );
  assert(
    externalToolCount === 1,
    "the mock MCP server's tool was not registered as an external tool",
  );
  assert(
    !declaredToolNames(server.calls[0]).includes(deferredName),
    "the deferred tool was declared up front, so no hydration was exercised",
  );
  assert(
    mcp.toolCalls.length === 1,
    "the hydrated tool did not execute exactly once",
  );
  assert(
    toolSpanNames.filter((n) => n === deferredName).length === 1,
    "the hydrated tool's execution was not observed with a tool span",
  );
});

await runSuite();

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
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "Vertex Claude loop characterization",
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
      disableInternalFallback: true,
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

await runSuite();

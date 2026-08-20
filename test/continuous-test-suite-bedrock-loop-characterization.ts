#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Amazon Bedrock native-loop characterization
 * (Plan 08, Task 4).
 *
 * Pins the observable behaviour of Bedrock's two hand-rolled turn loops —
 * `conversationLoop` (generate) and `streamingConversationLoop` (stream) —
 * so the migration onto `runAgenticLoop` can be shown not to change it.
 *
 * Everything here drives the shipped surface: `new NeuroLink()` from
 * `../dist/index.js`, no imports out of `src/`, no stubbing. The provider's
 * real AWS SDK client is pointed at a local server with the documented
 * `AWS_ENDPOINT_URL_BEDROCK_RUNTIME` variable, so requests are really signed
 * with SigV4 and really routed, and the assertions are about the calls that
 * actually go out on the wire.
 *
 * The stand-in speaks cleartext HTTP/2 because `@aws-sdk/client-bedrock-runtime`
 * defaults to `NodeHttp2Handler` for its event-stream operations and refuses
 * an HTTP/1.1 server with "Protocol error" before sending anything. Streaming
 * responses are encoded in the real `vnd.amazon.eventstream` binary framing
 * (see `encodeEventFrame`), so the SDK's own decoder is exercised too.
 *
 * Run: npx tsx test/continuous-test-suite-bedrock-loop-characterization.ts
 *      pnpm run test:bedrock-loop-characterization
 */

import { createServer, type Http2Server } from "node:http2";
import { crc32 } from "node:zlib";
import { z } from "zod";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "Bedrock loop characterization",
);

const { NeuroLink } = await import("../dist/index.js");

// Already carries a geography prefix, so it is a concrete routable id under
// any inference-profile resolution the provider may grow.
const MODEL = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

type EventFrame = { type: string; payload: Record<string, unknown> };

/**
 * Encode one `:message-type: event` frame of the AWS event-stream framing:
 * an 8-byte prelude and its CRC, the headers, the payload, and a CRC over
 * everything before it. Verified byte-for-byte against
 * `@smithy/eventstream-codec` for every frame type used below, which is why
 * this can stay a local helper instead of promoting two transitive `@smithy`
 * packages to explicit devDependencies.
 */
function encodeEventFrame(frame: EventFrame): Buffer {
  const body = Buffer.from(JSON.stringify(frame.payload), "utf8");
  const header = (name: string, value: string): Buffer => {
    const n = Buffer.from(name, "utf8");
    const v = Buffer.from(value, "utf8");
    const len = Buffer.alloc(2);
    len.writeUInt16BE(v.length);
    return Buffer.concat([
      Buffer.from([n.length]),
      n,
      Buffer.from([7]),
      len,
      v,
    ]);
  };
  const headers = Buffer.concat([
    header(":message-type", "event"),
    header(":event-type", frame.type),
    header(":content-type", "application/json"),
  ]);
  const totalLength = 12 + headers.length + body.length + 4;
  const prelude = Buffer.alloc(8);
  prelude.writeUInt32BE(totalLength, 0);
  prelude.writeUInt32BE(headers.length, 4);
  const preludeCrc = Buffer.alloc(4);
  preludeCrc.writeUInt32BE(crc32(prelude));
  const head = Buffer.concat([prelude, preludeCrc, headers, body]);
  const messageCrc = Buffer.alloc(4);
  messageCrc.writeUInt32BE(crc32(head));
  return Buffer.concat([head, messageCrc]);
}

function textFrames(text: string): EventFrame[] {
  return [
    { type: "messageStart", payload: { role: "assistant" } },
    {
      type: "contentBlockDelta",
      payload: { contentBlockIndex: 0, delta: { text } },
    },
    { type: "contentBlockStop", payload: { contentBlockIndex: 0 } },
    { type: "messageStop", payload: { stopReason: "end_turn" } },
    {
      type: "metadata",
      payload: { usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 } },
    },
  ];
}

function toolUseFrames(
  name: string,
  input: Record<string, unknown>,
  toolUseId: string,
): EventFrame[] {
  return [
    { type: "messageStart", payload: { role: "assistant" } },
    {
      type: "contentBlockStart",
      payload: {
        contentBlockIndex: 0,
        start: { toolUse: { name, toolUseId } },
      },
    },
    {
      type: "contentBlockDelta",
      payload: {
        contentBlockIndex: 0,
        delta: { toolUse: { input: JSON.stringify(input) } },
      },
    },
    { type: "contentBlockStop", payload: { contentBlockIndex: 0 } },
    { type: "messageStop", payload: { stopReason: "tool_use" } },
    {
      type: "metadata",
      payload: { usage: { inputTokens: 12, outputTokens: 6, totalTokens: 18 } },
    },
  ];
}

/** Non-streaming Converse reply carrying a plain text turn. */
function converseText(text: string): string {
  return JSON.stringify({
    output: { message: { role: "assistant", content: [{ text }] } },
    stopReason: "end_turn",
    usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
  });
}

/** Non-streaming Converse reply asking for one tool call. */
function converseToolUse(
  name: string,
  input: Record<string, unknown>,
  toolUseId: string,
  text?: string,
): string {
  return JSON.stringify({
    output: {
      message: {
        role: "assistant",
        content: [
          ...(text ? [{ text }] : []),
          { toolUse: { name, toolUseId, input } },
        ],
      },
    },
    stopReason: "tool_use",
    usage: { inputTokens: 12, outputTokens: 6, totalTokens: 18 },
  });
}

type StandInCall = {
  streaming: boolean;
  modelId: string;
  /** Parsed request body, so assertions can look at what was actually sent. */
  body: Record<string, unknown>;
};

type StandIn = {
  /** One entry per request that reached the server, in order. */
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

/** Names of the tools declared to the model on a given request. */
function declaredToolNames(call: StandInCall | undefined): string[] {
  const toolConfig = call?.body?.toolConfig as
    | { tools?: Array<{ toolSpec?: { name?: string } }> }
    | undefined;
  return (toolConfig?.tools ?? [])
    .map((t) => t.toolSpec?.name)
    .filter((n): n is string => typeof n === "string");
}

/** Tool-result blocks carried back to the model on a given request. */
function toolResults(
  call: StandInCall | undefined,
): Array<{ status?: string; content?: Array<{ text?: string }> }> {
  const messages = (call?.body?.messages ?? []) as Array<{
    content?: Array<{
      toolResult?: { status?: string; content?: Array<{ text?: string }> };
    }>;
  }>;
  return messages
    .flatMap((m) => m.content ?? [])
    .map((c) => c.toolResult)
    .filter((r): r is NonNullable<typeof r> => !!r);
}

/**
 * `reply` is called once per request with the zero-based request index and
 * decides that request's response: event frames for a streaming call, a JSON
 * string for a non-streaming one.
 */
async function startStandIn(
  reply: (callIndex: number) => EventFrame[] | string,
): Promise<StandIn> {
  const calls: StandIn["calls"] = [];
  const server: Http2Server = createServer();
  server.on("stream", (stream, headers) => {
    const path = String(headers[":path"] ?? "");
    const match = /\/model\/([^/]+)\/(converse-stream|converse)/.exec(path);
    const streaming = match?.[2] === "converse-stream";
    const parts: Buffer[] = [];
    stream.on("data", (c: Buffer) => parts.push(c));
    stream.on("end", () => {
      const parseBody = (): Record<string, unknown> => {
        try {
          return JSON.parse(Buffer.concat(parts).toString("utf8") || "{}");
        } catch {
          return {};
        }
      };
      const body = parseBody();
      const responseSpec = reply(calls.length);
      calls.push({
        streaming,
        modelId: match ? decodeURIComponent(match[1]) : "",
        body,
      });
      const response = responseSpec;
      // A sentinel the reply function can return to make the stand-in answer
      // with a retryable status instead of a body.
      if (response === "RETRYABLE_503") {
        stream.respond({ ":status": 503, "content-type": "application/json" });
        stream.end(JSON.stringify({ message: "service unavailable" }));
        return;
      }
      if (typeof response === "string") {
        stream.respond({ ":status": 200, "content-type": "application/json" });
        stream.end(response);
        return;
      }
      stream.respond({
        ":status": 200,
        "content-type": "application/vnd.amazon.eventstream",
      });
      for (const frame of response) {
        stream.write(encodeEventFrame(frame));
      }
      stream.end();
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

/** Point the AWS SDK at the stand-in with credentials that can sign. */
function withEnv(port: number): () => void {
  const saved: Record<string, string | undefined> = {};
  const set = (k: string, v: string) => {
    saved[k] = process.env[k];
    process.env[k] = v;
  };
  set("AWS_ENDPOINT_URL_BEDROCK_RUNTIME", `http://127.0.0.1:${port}`);
  set("AWS_ACCESS_KEY_ID", "test-fake-aws-key-id");
  set("AWS_SECRET_ACCESS_KEY", "test-fake-aws-secret");
  set("AWS_REGION", "us-east-1");
  saved.AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;
  delete process.env.AWS_SESSION_TOKEN;
  return () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  };
}

/**
 * A built-in tool, so it resolves through the provider's own registry.
 * The loop-mechanics cases below use this rather than a caller-supplied tool
 * because caller-supplied tools do not currently execute on Bedrock at all —
 * pinned separately in the "caller-supplied tools" section.
 */
const BUILT_IN_TOOL = "getCurrentTime";

/** A caller-supplied tool, the kind an SDK consumer passes to generate/stream. */
function customTool(counter: { calls: number }) {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: z.object({}).passthrough(),
      execute: async () => {
        counter.calls++;
        return { found: true };
      },
    },
  };
}

section("streaming loop");

await test("a text-only turn streams its text and stops after one call", async () => {
  const server = await startStandIn(() => textFrames("hello from bedrock"));
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
    });
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk?.content ?? "";
    }
    assert(
      text.includes("hello from bedrock"),
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

await test("a tool_use turn runs the tool and finishes on the following turn", async () => {
  const server = await startStandIn((i) =>
    i === 0 ? toolUseFrames(BUILT_IN_TOOL, {}, "tool_1") : textFrames("done"),
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "what time is it" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
    });
    let text = "";
    for await (const chunk of result.stream) {
      text += chunk?.content ?? "";
    }
    assert(
      server.calls.length === 2,
      `a tool round trip should take exactly two calls, took ${server.calls.length}`,
    );
    const results = toolResults(server.calls[1]);
    assert(
      results.length === 1,
      `the follow-up call should carry exactly one tool result, carried ${results.length}`,
    );
    assert(
      results[0]?.status === "success",
      "the tool result sent back to the model was not a success",
    );
    assert(text.includes("done"), "the final turn's text was not surfaced");
  } finally {
    restore();
    await server.close();
  }
});

await test("the streaming cap is exactly maxSteps, and reaching it returns", async () => {
  // Both halves of this were defects before the migration, and both were
  // pinned here as such.
  //
  // The count was off by one: the old loop made its first Converse call
  // inline, before `while (iteration < maxIterations)` was entered with
  // `iteration` still 0, so maxSteps=3 bought 4 billed calls. The engine
  // counts every step against one bound.
  //
  // Reaching the bound then threw, so the caller lost every tool result and
  // every token already streamed. It now ends the turn and reports
  // finishReason "tool-calls", which is what every other family does.
  const server = await startStandIn((i) =>
    toolUseFrames(BUILT_IN_TOOL, {}, `tool_${i}`),
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
    assert(
      server.calls.length === 3,
      `maxSteps=3 should buy exactly 3 calls, but the turn made ${server.calls.length}`,
    );
    assert(
      result.metadata?.finishReason === "tool-calls",
      "a turn cut off at the step cap should report finishReason tool-calls",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("generate loop");

await test("a text-only generate turn returns its text after one call", async () => {
  const server = await startStandIn(() => converseText("generated answer"));
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "hi" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
    });
    assert(
      typeof result?.content === "string" &&
        result.content.includes("generated answer"),
      "generate did not return the model's text",
    );
    assert(
      server.calls.length === 1,
      `a text-only generate should take exactly one call, took ${server.calls.length}`,
    );
    assert(
      server.calls.every((c) => !c.streaming),
      "the generate path should use the non-streaming Converse operation",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("a generate tool_use turn runs the tool and finishes on the following turn", async () => {
  const server = await startStandIn((i) =>
    i === 0
      ? converseToolUse(BUILT_IN_TOOL, {}, "tool_1")
      : converseText("generated done"),
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "what time is it" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
    });
    assert(
      server.calls.length === 2,
      `a generate tool round trip should take exactly two calls, took ${server.calls.length}`,
    );
    const results = toolResults(server.calls[1]);
    assert(
      results.length === 1,
      `the follow-up call should carry exactly one tool result, carried ${results.length}`,
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

await test("the generate cap honours maxSteps and keeps the model's text", async () => {
  // The generate loop used to ignore `maxSteps` entirely, counting to a
  // literal 10 and then throwing. The throw propagated into NeuroLink's own
  // provider-level retry, which ran the whole turn twice more, so a runaway
  // tool loop cost thirty billed model calls where the caller asked for
  // three.
  //
  // The text assertion is the second half, and it is why the count is 3 and
  // not 9. A turn that runs out of steps mid-tool-call has no "final" step,
  // so the engine returned an empty string and discarded everything the
  // model had said — and empty content reads as a failed generation to the
  // retry layer, which then ran the turn three times over.
  const server = await startStandIn(() =>
    converseToolUse(BUILT_IN_TOOL, {}, "tool_x", "still working"),
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "keep going" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
    });
    assert(
      server.calls.length === 3,
      `maxSteps=3 should buy exactly 3 calls, but the turn made ${server.calls.length}`,
    );
    assert(
      typeof result?.content === "string" &&
        result.content.includes("still working"),
      "a turn stopped at the step cap should still return what the model said",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("assistant text emitted before a tool call survives into the next step", async () => {
  // Bedrock does not necessarily announce a text block with
  // `contentBlockStart` — the first event for it can be a delta. Keying
  // blocks by arrival order therefore dropped any text that preceded a
  // toolUse block from the assistant turn replayed on the following step:
  // the consumer saw the text, but the model stopped seeing its own
  // reasoning. Blocks are keyed by `contentBlockIndex` instead.
  const server = await startStandIn((i) =>
    i === 0
      ? [
          { type: "messageStart", payload: { role: "assistant" } },
          {
            type: "contentBlockDelta",
            payload: { contentBlockIndex: 0, delta: { text: "let me check" } },
          },
          {
            type: "contentBlockStop",
            payload: { contentBlockIndex: 0 },
          },
          {
            type: "contentBlockStart",
            payload: {
              contentBlockIndex: 1,
              start: { toolUse: { name: BUILT_IN_TOOL, toolUseId: "tool_1" } },
            },
          },
          {
            type: "contentBlockDelta",
            payload: {
              contentBlockIndex: 1,
              delta: { toolUse: { input: "{}" } },
            },
          },
          {
            type: "contentBlockStop",
            payload: { contentBlockIndex: 1 },
          },
          { type: "messageStop", payload: { stopReason: "tool_use" } },
          {
            type: "metadata",
            payload: {
              usage: { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
            },
          },
        ]
      : textFrames("done"),
  );
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "what time is it" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
    });
    let streamed = "";
    for await (const chunk of result.stream) {
      streamed += chunk?.content ?? "";
    }
    assert(
      streamed.includes("let me check"),
      "the pre-tool-call text never reached the consumer",
    );
    const replayed = JSON.stringify(server.calls[1]?.body ?? {});
    assert(
      replayed.includes("let me check"),
      "the pre-tool-call text was dropped from the conversation sent back to the model",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("disableTools declares no tools on either path", async () => {
  // The generate path reaches its loop without BaseProvider's tool
  // preparation, so `options.tools` is undefined there and the getAllTools()
  // fallback would hand the model the whole registry even though the caller
  // asked for none.
  const generateServer = await startStandIn(() => converseText("no tools"));
  let restore = withEnv(generateServer.port);
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "hi" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      disableTools: true,
    });
    assert(
      declaredToolNames(generateServer.calls[0]).length === 0,
      "the generate path declared tools despite disableTools",
    );
  } finally {
    restore();
    await generateServer.close();
  }

  const streamServer = await startStandIn(() => textFrames("no tools"));
  restore = withEnv(streamServer.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      disableTools: true,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
    assert(
      declaredToolNames(streamServer.calls[0]).length === 0,
      "the streaming path declared tools despite disableTools",
    );
  } finally {
    restore();
    await streamServer.close();
  }
});

await test("analytics resolves for a caller that never drains the stream", async () => {
  // `result.analytics` used to be resolved only inside the stream iterator's
  // finally block, so a caller that awaited it without iterating waited
  // forever — the generator body never runs.
  const server = await startStandIn(() => textFrames("ignored"));
  const restore = withEnv(server.port);
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
    });
    // The timer is cleared rather than left pending: an uncleared timeout
    // keeps the event loop alive and holds the whole suite open for its full
    // duration after the assertion has already passed.
    let timer: NodeJS.Timeout | undefined;
    const analytics = await Promise.race([
      Promise.resolve(result.analytics),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve("TIMED_OUT"), 15_000);
      }),
    ]).finally(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    assert(
      analytics !== "TIMED_OUT",
      "analytics never settled for a caller that did not drain the stream",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("generate and stream agree on the finish reason for the same turn", async () => {
  // Both paths ran a turn to the step cap, and before this they disagreed:
  // generate surfaced Bedrock's raw "tool_use" while stream surfaced the
  // mapped "tool-calls". Callers that branch on finishReason would have had
  // to special-case which method they called.
  const generateServer = await startStandIn(() =>
    converseToolUse(BUILT_IN_TOOL, {}, "tool_x", "still working"),
  );
  let restore = withEnv(generateServer.port);
  let generateFinish: string | undefined;
  let generateRaw: string | undefined;
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "keep going" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 2,
      disableTools: false,
    });
    generateFinish = result?.finishReason;
    generateRaw = result?.rawFinishReason;
  } finally {
    restore();
    await generateServer.close();
  }

  const streamServer = await startStandIn((i) =>
    toolUseFrames(BUILT_IN_TOOL, {}, `tool_${i}`),
  );
  restore = withEnv(streamServer.port);
  let streamFinish: string | undefined;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 2,
      disableTools: false,
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
    streamFinish = result.metadata?.finishReason;
  } finally {
    restore();
    await streamServer.close();
  }

  assert(
    generateFinish === "tool-calls",
    "generate did not report the mapped finish reason for a capped turn",
  );
  assert(
    generateFinish === streamFinish,
    "generate and stream reported different finish reasons for the same turn shape",
  );
  assert(
    generateRaw === "tool_use",
    "the raw provider finish reason was dropped instead of kept alongside",
  );
});

section("caller-supplied tools");

// Before the migration, neither of these worked. Bedrock resolved tool
// execution through `getAllTools()` — the provider's own registry — rather
// than the tools the caller passed for this turn, so an SDK consumer's own
// tool could never run: the streaming path declared it to the model and then
// failed every call to it with "Tool not found", and the generate path never
// declared it at all.

await test("a caller's own tool is declared to the model on the streaming path", async () => {
  const server = await startStandIn(() => textFrames("hi"));
  const restore = withEnv(server.port);
  const counter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      disableTools: false,
      tools: customTool(counter),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
    assert(
      declaredToolNames(server.calls[0]).includes("lookup"),
      "the streaming path did not declare the caller's tool to the model",
    );
  } finally {
    restore();
    await server.close();
  }
});

await test("a caller's own tool executes, on both paths", async () => {
  const streamServer = await startStandIn((i) =>
    i === 0 ? toolUseFrames("lookup", {}, "tool_1") : textFrames("after"),
  );
  let restore = withEnv(streamServer.port);
  const streamCounter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(streamCounter),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
    assert(
      streamCounter.calls === 1,
      "the caller's tool did not execute on the streaming path",
    );
    const results = toolResults(streamServer.calls[1]);
    assert(
      results[0]?.status === "success",
      "the streaming path sent back a failed tool result",
    );
  } finally {
    restore();
    await streamServer.close();
  }

  const generateServer = await startStandIn((i) =>
    i === 0
      ? converseToolUse("lookup", {}, "tool_1")
      : converseText("generated after"),
  );
  restore = withEnv(generateServer.port);
  const generateCounter = { calls: 0 };
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "look something up" },
      provider: "bedrock",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: customTool(generateCounter),
    });
    assert(
      declaredToolNames(generateServer.calls[0]).includes("lookup"),
      "the generate path did not declare the caller's tool to the model",
    );
    assert(
      generateCounter.calls === 1,
      "the caller's tool did not execute on the generate path",
    );
  } finally {
    restore();
    await generateServer.close();
  }
});

await runSuite();

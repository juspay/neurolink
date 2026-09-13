#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — nl.stream() toolsUsed/toolExecutions telemetry.
 *
 * Regression coverage for a shared-layer defect: `nl.stream()`'s returned
 * `StreamResult` silently dropped `toolsUsed` and `toolExecutions` even when
 * a tool genuinely ran during the stream, for every provider — because two
 * distinct code paths lose the fields on the way from the provider to the
 * caller:
 *
 *   1. `BaseProvider.stream()` (src/lib/core/baseProvider.ts) wraps a
 *      provider's raw StreamResult twice (`withStreamModelFallback`,
 *      `wrapStreamWithLifecycleCallbacks`) via a naked object spread
 *      (`{ ...result, stream: wrapped }`). A background-loop native provider
 *      (Vertex, Google AI Studio, and the OpenAI-chat-completions family used
 *      here) reports `toolExecutions` — and sometimes `toolsUsed` — via a
 *      `get`-only accessor that resolves lazily as the tool loop runs. A
 *      spread reads (and thereby snapshots and freezes) any getter on the
 *      source object before the consumer has pulled a single chunk, so the
 *      copy is permanently empty/absent.
 *   2. `NeuroLink`'s own stream orchestration (src/lib/neurolink.ts) rebuilds
 *      the final `StreamResult` at several return sites with a fixed,
 *      hand-written field list that never mentioned `toolsUsed` /
 *      `toolExecutions` at all — so even a value that survived (1) was
 *      dropped a second time before reaching the caller, for EVERY provider,
 *      not just the ones with getter-based telemetry.
 *
 * ## Why an OpenAI-compatible local fixture, not a live Bedrock/Vertex call
 *
 * The defect was confirmed against Bedrock and Vertex, but the fix lives
 * entirely in the two shared call paths above — every provider's `stream()`
 * funnels through both. `test/helpers/bedrockLocalEndpoint.ts` and
 * `test/helpers/openaiCompatibleLocalEndpoint.ts` (built for exactly this
 * kind of local-fixture testing) live on other, unmerged branches and are
 * not present in this worktree, and hand-rolling AWS's binary
 * `vnd.amazon.eventstream` Converse-Stream framing here would test the
 * fixture's encoder at least as much as NeuroLink. The OpenAI chat-completions
 * SSE wire format is itself a real, widely-implemented vendor format (it's
 * what `OpenAIProvider extends OpenAIChatCompletionsProvider` speaks over
 * raw `fetch`, no SDK indirection — see `openaiChatCompletionsBase.ts`), and
 * that provider reports `toolExecutions` via the exact same
 * `Object.defineProperty(result, "toolExecutions", { get: ... })` pattern
 * Vertex and Google AI Studio use. Driving a real two-request tool round
 * trip (tool-call delta → real local tool execution → follow-up completion)
 * through `new NeuroLink().stream()` against a local HTTP server therefore
 * exercises the identical shared BaseProvider-spread and NeuroLink-rebuild
 * code every provider's stream() passes through — without stubbing any
 * NeuroLink code and without live credentials.
 *
 * Self-contained: the local HTTP server is defined in this file, not
 * imported from a helper on another branch. Deterministic and free — no
 * network egress, no API key.
 *
 * ## Two additional sibling sites, same defect shape
 *
 * Two more return sites rebuild the StreamResult the identical, naked way
 * and are covered below alongside the case above:
 *
 *   3. `BaseProvider.executeFakeStreaming()` builds its return value from a
 *      hand-written field list that never mentioned `toolsUsed` /
 *      `toolExecutions`, even though it wraps a `generate()` result that
 *      carries both. It's reached whenever `stream()` detects 3+ image parts
 *      in the user message (`hasVideoFrames()` — deliberately vendor/model
 *      agnostic, so plain image uploads trigger it too, with no video or
 *      network-error injection required) and falls back to running the
 *      standard tool-calling `generate()` loop under a synthetic stream.
 *   4. `NeuroLink.streamWithIterationFallback()` (backing the public,
 *      documented `providerFallback` / `modelChain` StreamOptions) rebuilds
 *      its return value the same naked-spread way.
 *
 * Run: pnpm run build && pnpm run test:stream-tool-telemetry
 */

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { z } from "zod";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink, tool } from "../dist/index.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Stream tool telemetry", {
  offline: true,
});

/**
 * A local, loopback-only stand-in for an OpenAI-chat-completions-shaped
 * endpoint. Answers the FIRST request with a streamed tool call, and every
 * request after with a streamed final answer — the genuine two-turn shape a
 * real vendor produces for a tool round trip, not a single canned reply.
 */
function startToolCallServer(toolName: string) {
  let requestCount = 0;
  const requestBodies: Array<Record<string, unknown>> = [];

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    requestCount++;
    const body: Record<string, unknown> = JSON.parse(
      Buffer.concat(chunks).toString("utf8") || "{}",
    );
    requestBodies.push(body);
    const isFirstTurn = requestCount === 1;

    res.writeHead(200, { "content-type": "text/event-stream" });
    if (isFirstTurn) {
      const call = {
        index: 0,
        id: "call_fixture_1",
        type: "function",
        function: { name: toolName, arguments: '{"city":"lisbon"}' },
      };
      res.write(
        `data: ${JSON.stringify({
          choices: [
            {
              index: 0,
              delta: { tool_calls: [call] },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({
          choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        })}\n\n`,
      );
    } else {
      res.write(
        `data: ${JSON.stringify({
          choices: [
            {
              index: 0,
              delta: { content: "It is sunny." },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 6, completion_tokens: 4, total_tokens: 10 },
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  });

  return new Promise<{
    port: number;
    requestCountNow(): number;
    close(): Promise<void>;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        requestCountNow: () => requestCount,
        close: () =>
          new Promise<void>((r) => {
            server.closeAllConnections?.();
            server.close(() => r());
          }),
      });
    });
  });
}

/**
 * A minimal, valid 1x1 RGBA PNG (70 bytes) — small enough to inline, and
 * accepted by NeuroLink's image processor (which rejects anything below 67
 * bytes as truncated). Three copies of this file are enough to trip
 * `hasVideoFrames()`, which only counts image parts, not real video frames.
 */
const PNG_1X1 = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0f01f00050001ff89993d1d0000000049454e44ae426082",
  "hex",
);

/**
 * A local, loopback-only stand-in for an OpenAI-chat-completions-shaped
 * endpoint that answers with plain (non-streaming) JSON — the shape
 * `generate()` speaks internally. Used to drive `executeFakeStreaming()`,
 * which runs the standard native tool loop under a synthetic stream.
 */
function startNonStreamingToolCallServer(toolName: string) {
  let requestCount = 0;

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    requestCount++;
    // Body is read fully so the connection completes cleanly; the fixture
    // doesn't need to inspect it beyond turn number.
    Buffer.concat(chunks).toString("utf8");
    const isFirstTurn = requestCount === 1;

    res.writeHead(200, { "content-type": "application/json" });
    if (isFirstTurn) {
      res.end(
        JSON.stringify({
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_fixture_1",
                    type: "function",
                    function: {
                      name: toolName,
                      arguments: '{"city":"lisbon"}',
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        }),
      );
    } else {
      res.end(
        JSON.stringify({
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "It is sunny." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 6, completion_tokens: 4, total_tokens: 10 },
        }),
      );
    }
  });

  return new Promise<{
    port: number;
    requestCountNow(): number;
    close(): Promise<void>;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        requestCountNow: () => requestCount,
        close: () =>
          new Promise<void>((r) => {
            server.closeAllConnections?.();
            server.close(() => r());
          }),
      });
    });
  });
}

/**
 * Shared assertions for "a tool ran and the returned StreamResult still
 * carries toolsUsed/toolExecutions as own, populated properties" — used by
 * both of the sibling-site regression cases below so the two tests differ
 * only in how they reach their respective code path.
 */
/**
 * Fails the FIRST attempt mid-stream, then serves a normal tool round trip to
 * every later attempt.
 *
 * This is the shape that separates "the returned object is wired to an
 * attempt" from "the returned object is wired to THE attempt that streamed".
 * The first attempt is abandoned after the result object has already been
 * built and handed to the caller, so a rebuild that captured its telemetry up
 * front reports a turn in which no tool ever ran — while the consumer is
 * meanwhile draining the second attempt's chunks, in which one did.
 */
function startMidStreamFailoverServer(toolName: string) {
  let requestCount = 0;

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    requestCount++;

    res.writeHead(200, { "content-type": "text/event-stream" });

    if (requestCount === 1) {
      // A well-formed opening delta, then the connection drops. The consumer
      // is already iterating by this point, so the failure lands mid-stream
      // rather than at request time — which is what routes it into the
      // iteration-fallback retry instead of the request-level one.
      res.write(
        `data: ${JSON.stringify({
          choices: [
            { index: 0, delta: { content: "par" }, finish_reason: null },
          ],
        })}\n\n`,
      );
      res.destroy();
      return;
    }

    // requestCount 2 is the retried attempt's first turn (the tool call),
    // 3 is its second turn (the answer).
    if (requestCount === 2) {
      res.write(
        `data: ${JSON.stringify({
          choices: [
            {
              index: 0,
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_failover_1",
                    type: "function",
                    function: {
                      name: toolName,
                      arguments: '{"city":"lisbon"}',
                    },
                  },
                ],
              },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({
          choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        })}\n\n`,
      );
    } else {
      res.write(
        `data: ${JSON.stringify({
          choices: [
            {
              index: 0,
              delta: { content: "It is sunny." },
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );
      res.write(
        `data: ${JSON.stringify({
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 6, completion_tokens: 4, total_tokens: 10 },
        })}\n\n`,
      );
    }
    res.end("data: [DONE]\n\n");
  });

  return new Promise<{
    port: number;
    requestCountNow(): number;
    close(): Promise<void>;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        requestCountNow: () => requestCount,
        close: () =>
          new Promise<void>((r) => {
            server.closeAllConnections?.();
            server.close(() => r());
          }),
      });
    });
  });
}

function assertToolTelemetryPresent(
  result: { toolsUsed?: unknown; toolExecutions?: unknown },
  toolName: string,
): void {
  assert.ok(
    Object.prototype.hasOwnProperty.call(result, "toolsUsed"),
    "toolsUsed is missing as an own property of the returned StreamResult",
  );
  const toolsUsed = result.toolsUsed as ReadonlyArray<string> | undefined;
  assert.ok(
    Array.isArray(toolsUsed) && toolsUsed.length === 1,
    "toolsUsed did not record the one tool that ran",
  );
  assert.equal(
    toolsUsed?.[0],
    toolName,
    "toolsUsed recorded the wrong tool name",
  );

  assert.ok(
    Object.prototype.hasOwnProperty.call(result, "toolExecutions"),
    "toolExecutions is missing as an own property of the returned StreamResult",
  );
  const executions = result.toolExecutions as
    | ReadonlyArray<Record<string, unknown>>
    | undefined;
  assert.ok(
    Array.isArray(executions) && executions.length === 1,
    "toolExecutions did not record the one tool that ran",
  );
  const executedName =
    (executions?.[0]?.name as string | undefined) ??
    (executions?.[0]?.tool as string | undefined);
  assert.equal(
    executedName,
    toolName,
    "toolExecutions entry names the wrong tool",
  );
}

void runSuite(async () => {
  await test("a real tool round trip leaves toolsUsed/toolExecutions present on the returned StreamResult", async () => {
    const toolName = "get_weather";
    let toolCalls = 0;
    const fixture = await startToolCallServer(toolName);
    const sdk = new NeuroLink();
    try {
      const result = await sdk.stream({
        input: { text: "what is the weather in lisbon" },
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 3,
        disableInternalFallback: true,
        enabledToolNames: [toolName],
        credentials: {
          openai: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${fixture.port}/v1`,
          },
        },
        tools: {
          [toolName]: tool({
            inputSchema: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => {
              toolCalls++;
              return { city, forecast: "sunny" };
            },
          }),
        },
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);

      // Drain the stream fully — toolExecutions/toolsUsed on the
      // background-loop providers this defect targets only resolve once
      // the consumer has pulled every chunk to completion.
      let text = "";
      for await (const chunk of result.stream) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof (chunk as { content: unknown }).content === "string"
        ) {
          text += (chunk as { content: string }).content;
        }
      }

      assert.equal(toolCalls, 1, "local tool was not invoked exactly once");
      assert.equal(
        fixture.requestCountNow(),
        2,
        "tool round trip did not send the expected two requests",
      );
      assert.ok(
        text.includes("sunny"),
        "final post-tool-call answer did not reach the drained stream",
      );

      // The actual defect: the own-property descriptor for these fields
      // was ABSENT on the returned object, not merely undefined. A caller
      // that does `"toolsUsed" in result` or JSON-serializes the result
      // sees the field disappear entirely.
      assert.ok(
        Object.prototype.hasOwnProperty.call(result, "toolsUsed"),
        "toolsUsed is missing as an own property of the returned StreamResult",
      );
      assert.ok(
        Array.isArray(result.toolsUsed) && result.toolsUsed.length === 1,
        "toolsUsed did not record the one tool that ran",
      );
      assert.equal(
        result.toolsUsed?.[0],
        toolName,
        "toolsUsed recorded the wrong tool name",
      );

      assert.ok(
        Object.prototype.hasOwnProperty.call(result, "toolExecutions"),
        "toolExecutions is missing as an own property of the returned StreamResult",
      );
      const executions = result.toolExecutions as
        | ReadonlyArray<Record<string, unknown>>
        | undefined;
      assert.ok(
        Array.isArray(executions) && executions.length === 1,
        "toolExecutions did not record the one tool that ran",
      );
      const executedName =
        (executions?.[0]?.name as string | undefined) ??
        (executions?.[0]?.tool as string | undefined);
      assert.equal(
        executedName,
        toolName,
        "toolExecutions entry names the wrong tool",
      );
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("the video-frame-detected fake-streaming path also leaves toolsUsed/toolExecutions present", async () => {
    const toolName = "get_weather";
    let toolCalls = 0;
    const fixture = await startNonStreamingToolCallServer(toolName);
    const sdk = new NeuroLink();
    try {
      const result = await sdk.stream({
        input: {
          text: "what is the weather in lisbon",
          // hasVideoFrames() only counts image parts (3+) in a user
          // message — it doesn't care whether they came from real video
          // extraction or plain image uploads. This is enough to route
          // stream() into executeFakeStreaming() deterministically, with
          // no error injection or network race required.
          files: [
            { buffer: PNG_1X1, filename: "frame1.png", mimetype: "image/png" },
            { buffer: PNG_1X1, filename: "frame2.png", mimetype: "image/png" },
            { buffer: PNG_1X1, filename: "frame3.png", mimetype: "image/png" },
          ],
        },
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 3,
        disableInternalFallback: true,
        enabledToolNames: [toolName],
        credentials: {
          openai: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${fixture.port}/v1`,
          },
        },
        tools: {
          [toolName]: tool({
            inputSchema: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => {
              toolCalls++;
              return { city, forecast: "sunny" };
            },
          }),
        },
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);

      let text = "";
      for await (const chunk of result.stream) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof (chunk as { content: unknown }).content === "string"
        ) {
          text += (chunk as { content: string }).content;
        }
      }

      assert.equal(toolCalls, 1, "local tool was not invoked exactly once");
      assert.equal(
        fixture.requestCountNow(),
        2,
        "tool round trip did not send the expected two requests",
      );
      assert.ok(
        text.includes("sunny"),
        "final post-tool-call answer did not reach the drained stream",
      );

      assertToolTelemetryPresent(result, toolName);
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("modelChain fallback orchestration also leaves toolsUsed/toolExecutions present", async () => {
    const toolName = "get_weather";
    let toolCalls = 0;
    const fixture = await startToolCallServer(toolName);
    const sdk = new NeuroLink();
    try {
      const result = await sdk.stream({
        input: { text: "what is the weather in lisbon" },
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 3,
        disableInternalFallback: true,
        enabledToolNames: [toolName],
        // The only difference from the first case above: exercise the
        // public, documented modelChain StreamOptions field. This routes
        // the final result through NeuroLink.streamWithIterationFallback's
        // wrapped-stream return, a separate naked-spread rebuild site from
        // the one BaseProvider.stream() uses.
        modelChain: ["gpt-4o-mini"],
        credentials: {
          openai: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${fixture.port}/v1`,
          },
        },
        tools: {
          [toolName]: tool({
            inputSchema: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => {
              toolCalls++;
              return { city, forecast: "sunny" };
            },
          }),
        },
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);

      let text = "";
      for await (const chunk of result.stream) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof (chunk as { content: unknown }).content === "string"
        ) {
          text += (chunk as { content: string }).content;
        }
      }

      assert.equal(toolCalls, 1, "local tool was not invoked exactly once");
      assert.equal(
        fixture.requestCountNow(),
        2,
        "tool round trip did not send the expected two requests",
      );
      assert.ok(
        text.includes("sunny"),
        "final post-tool-call answer did not reach the drained stream",
      );

      assertToolTelemetryPresent(result, toolName);
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("after a mid-stream fallback the telemetry describes the attempt that streamed", async () => {
    const toolName = "get_weather";
    let toolCalls = 0;
    const fixture = await startMidStreamFailoverServer(toolName);
    const sdk = new NeuroLink();
    try {
      const result = await sdk.stream({
        input: { text: "what is the weather in lisbon" },
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 3,
        disableInternalFallback: true,
        enabledToolNames: [toolName],
        modelChain: ["gpt-4o-mini"],
        credentials: {
          openai: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${fixture.port}/v1`,
          },
        },
        tools: {
          [toolName]: tool({
            inputSchema: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => {
              toolCalls++;
              return { city, forecast: "sunny" };
            },
          }),
        },
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);

      let text = "";
      for await (const chunk of result.stream) {
        if (
          chunk &&
          typeof chunk === "object" &&
          "content" in chunk &&
          typeof (chunk as { content: unknown }).content === "string"
        ) {
          text += (chunk as { content: string }).content;
        }
      }

      // The first attempt died before reaching a tool, so a tool running at
      // all proves the fallback attempt is the one that produced the content.
      assert.equal(
        toolCalls,
        1,
        "local tool was not invoked exactly once by the retried attempt",
      );
      assert.ok(
        text.includes("sunny"),
        "the retried attempt's answer did not reach the drained stream",
      );

      // The actual regression: these must describe the retried attempt, not
      // the abandoned one. Before the fix they were captured from the first
      // attempt at build time, which ran no tool at all.
      assertToolTelemetryPresent(result, toolName);
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });
});

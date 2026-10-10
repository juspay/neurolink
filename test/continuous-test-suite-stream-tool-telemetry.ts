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
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import { defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { NeuroLink, tool } from "../dist/index.js";
import type { HippocampusLike } from "../dist/index.js";

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
    requestBodies: Array<Record<string, unknown>>;
    close(): Promise<void>;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        requestCountNow: () => requestCount,
        requestBodies,
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

/**
 * Rejects the FIRST request outright with an HTTP 404 (a real
 * `model_not_found` vendor shape), then serves a normal streamed completion
 * to every request after — naming whatever model was actually requested in
 * its own response, so a caller can tell which attempt produced the
 * StreamResult it received.
 *
 * This is the OTHER lazy-failure shape `withStreamModelFallback`
 * (src/lib/core/baseProvider.ts) handles, distinct from
 * `startMidStreamFailoverServer` above: that one fails a well-formed stream
 * PARTWAY THROUGH (drives the same-model `streamWithIterationFallback`
 * reconnect in neurolink.ts), while this one fails the request before any
 * content streams at all (drives the CROSS-MODEL invalid-model retry this
 * suite targets). `DEFAULT_ERROR_RULES` (src/lib/utils/errorClassifier.ts)
 * classifies a `statusCode === 404` as `InvalidModelError` only when its text
 * names a model or deployment as missing, which is why the 404 below says so.
 */
function startInvalidModelFallbackServer() {
  let requestCount = 0;
  const requestedModels: string[] = [];

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    requestCount++;
    const body: Record<string, unknown> = JSON.parse(
      Buffer.concat(chunks).toString("utf8") || "{}",
    );
    const model = String(body.model ?? "");
    requestedModels.push(model);

    if (requestCount === 1) {
      res.writeHead(404, {
        "content-type": "application/json",
        "x-neurolink-attempt": "rejected-first-attempt",
      });
      res.end(
        JSON.stringify({
          error: {
            message: `The model \`${model}\` does not exist or you do not have access to it.`,
            type: "invalid_request_error",
            code: "model_not_found",
          },
        }),
      );
      return;
    }

    res.writeHead(200, { "content-type": "text/event-stream" });
    res.write(
      `data: ${JSON.stringify({
        id: "chatcmpl-fallback",
        object: "chat.completion.chunk",
        created: 0,
        model,
        choices: [
          {
            index: 0,
            delta: { content: '{"attempt":"retry"}' },
            finish_reason: null,
          },
        ],
      })}\n\n`,
    );
    res.write(
      `data: ${JSON.stringify({
        id: "chatcmpl-fallback",
        object: "chat.completion.chunk",
        created: 0,
        model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 22,
          total_tokens: 33,
        },
      })}\n\n`,
    );
    res.end("data: [DONE]\n\n");
  });

  return new Promise<{
    port: number;
    requestedModelsNow(): string[];
    close(): Promise<void>;
  }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        port,
        requestedModelsNow: () => requestedModels.slice(),
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
 * A local, loopback-only, NON-streaming OpenAI-chat-completions-shaped
 * fixture (the same plain-JSON wire shape `startNonStreamingToolCallServer`
 * above uses) that answers the FIRST request with a well-formed but EMPTY
 * completion (a real 200, `finish_reason: "stop"`, empty content, no tool
 * calls) — the "guardrails blocked" shape `NeuroLink.stream()`'s TOP-LEVEL
 * `handleStreamFallback` targets (gated on `realOutputChunks === 0` with no
 * tool calls/results either). This is distinct from
 * `startInvalidModelFallbackServer` above (a request-level 404, which drives
 * BaseProvider's SAME-provider `retryStreamWithFallbackModel`) and
 * `startMidStreamFailoverServer` (a mid-stream disconnect, which drives
 * `withStreamModelFallback`) — neither exercises the cross-provider
 * `handleStreamFallback` path this fixture is built for.
 *
 * Non-streaming, not SSE, and paired with the 3-image `PNG_1X1` trick
 * (`hasVideoFrames()`) at the call site: `executeFakeStreaming()` is the
 * ONLY path where the openai-compatible provider's `toolCalls`/`toolResults`
 * are populated on the returned StreamResult at all — eagerly, copied from
 * the already-awaited `generate()` call. The real-streaming SSE path this
 * provider otherwise speaks never sets those two fields (only `toolsUsed`/
 * `toolExecutions`, see `startToolCallServer` above), so it cannot exercise
 * this regression. Both the primary attempt and the fallback
 * `handleStreamFallback` creates carry the same `input.files`, so both hit
 * this same fake-streaming path against this fixture.
 *
 * Every request after the first belongs to the FALLBACK provider — a fresh
 * instance `handleStreamFallback` creates and points at this same fixture
 * (same credentials/baseURL) — and drives a normal two-turn tool round trip,
 * so requests 2 and 3 are the fallback's own tool-call turn and answer turn.
 */
function startEmptyThenToolCallFallbackServer(toolName: string) {
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

    res.writeHead(200, { "content-type": "application/json" });

    if (requestCount === 1) {
      res.end(
        JSON.stringify({
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 4, completion_tokens: 0, total_tokens: 4 },
        }),
      );
      return;
    }

    if (requestCount === 2) {
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
                    id: "call_fallback_1",
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
      return;
    }

    res.end(
      JSON.stringify({
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "It is sunny (fallback).",
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 6, completion_tokens: 4, total_tokens: 10 },
      }),
    );
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

// ---------------------------------------------------------------------------
// Anthropic Messages SSE stand-in (direct Anthropic stream path)
// ---------------------------------------------------------------------------

const ANTHROPIC_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

/**
 * Pin api_key auth at the stand-in for one case, restoring the env after.
 * Same rationale as the loop-characterization suite: an ambient OAuth
 * credentials file would otherwise route construction elsewhere.
 */
function withAnthropicEnv(port: number): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of ANTHROPIC_ENV_VARS) {
    saved[key] = process.env[key];
  }
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
  return () => {
    for (const key of ANTHROPIC_ENV_VARS) {
      const prior = saved[key];
      if (prior === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prior;
      }
    }
  };
}

function anthropicSse(event: string, payload: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify({ type: event, ...payload })}\n\n`;
}

/** One scripted Anthropic turn: a tool_use with these arguments, or text. */
type AnthropicScriptedTurn =
  | { toolUse: { name: string; input: Record<string, unknown>; id?: string } }
  | { text: string };

/**
 * A scripted Anthropic Messages SSE stand-in: request N answers with
 * `script[N]` (the last entry repeats). Genuine Anthropic SSE framing, so the
 * real SDK's event parsing runs, and every request body is recorded so a
 * test can assert on what the SDK sent per step.
 */
async function startScriptedAnthropicServer(
  script: ReadonlyArray<AnthropicScriptedTurn>,
) {
  const bodies: Array<Record<string, unknown>> = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      body = {};
    }
    bodies.push(body);
    const turn = script[Math.min(bodies.length - 1, script.length - 1)];
    res.writeHead(200, { "content-type": "text/event-stream" });
    const frames: string[] = [
      anthropicSse("message_start", {
        message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
      }),
    ];
    if ("toolUse" in turn) {
      frames.push(
        anthropicSse("content_block_start", {
          index: 0,
          content_block: {
            type: "tool_use",
            id: turn.toolUse.id ?? `toolu_${bodies.length}`,
            name: turn.toolUse.name,
            input: {},
          },
        }),
        anthropicSse("content_block_delta", {
          index: 0,
          delta: {
            type: "input_json_delta",
            partial_json: JSON.stringify(turn.toolUse.input),
          },
        }),
        anthropicSse("content_block_stop", { index: 0 }),
        anthropicSse("message_delta", {
          delta: { stop_reason: "tool_use" },
          usage: { output_tokens: 6 },
        }),
      );
    } else {
      frames.push(
        anthropicSse("content_block_start", {
          index: 0,
          content_block: { type: "text", text: "" },
        }),
        anthropicSse("content_block_delta", {
          index: 0,
          delta: { type: "text_delta", text: turn.text },
        }),
        anthropicSse("content_block_stop", { index: 0 }),
        anthropicSse("message_delta", {
          delta: { stop_reason: "end_turn" },
          usage: { output_tokens: 4 },
        }),
      );
    }
    frames.push(anthropicSse("message_stop", {}));
    for (const frame of frames) {
      res.write(frame);
    }
    res.end();
  });
  await once(server.listen(0, "127.0.0.1"), "listening");
  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    bodies,
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections?.();
        server.close(() => r());
      }),
  };
}

/**
 * Request 0 → one tool_use block; every later request → a text answer.
 */
async function startAnthropicToolCallServer(toolName: string) {
  return startScriptedAnthropicServer([
    { toolUse: { name: toolName, input: { orderId: "1" }, id: "toolu_1" } },
    { text: "it shipped" },
  ]);
}

/** One scripted OpenAI chat-completions turn (non-streaming JSON). */
type OpenAIScriptedTurn =
  | { toolCall: { name: string; args: Record<string, unknown>; id?: string } }
  | { text: string };

/**
 * A scripted, NON-streaming OpenAI chat-completions stand-in — the shape
 * generate() speaks — recording every request body.
 */
async function startScriptedOpenAIServer(
  script: ReadonlyArray<OpenAIScriptedTurn>,
) {
  const bodies: Array<Record<string, unknown>> = [];
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      body = {};
    }
    bodies.push(body);
    const turn = script[Math.min(bodies.length - 1, script.length - 1)];
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl-scripted",
        object: "chat.completion",
        created: 1,
        model: "gpt-4o-mini",
        choices: [
          {
            index: 0,
            message:
              "toolCall" in turn
                ? {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                      {
                        id: turn.toolCall.id ?? `call_${bodies.length}`,
                        type: "function",
                        function: {
                          name: turn.toolCall.name,
                          arguments: JSON.stringify(turn.toolCall.args),
                        },
                      },
                    ],
                  }
                : { role: "assistant", content: turn.text },
            finish_reason: "toolCall" in turn ? "tool_calls" : "stop",
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
      }),
    );
  });
  await once(server.listen(0, "127.0.0.1"), "listening");
  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    bodies,
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections?.();
        server.close(() => r());
      }),
  };
}

const MCP_FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "mcp-direct-name-repair-server.mjs",
);

/** Every `content` text of every message in a captured request body. */
function bodyText(body: Record<string, unknown> | undefined): string {
  const messages = (body?.messages ?? []) as Array<{ content?: unknown }>;
  const out: string[] = [];
  for (const message of messages) {
    if (typeof message.content === "string") {
      out.push(message.content);
    } else if (Array.isArray(message.content)) {
      for (const block of message.content as Array<Record<string, unknown>>) {
        if (typeof block.text === "string") {
          out.push(block.text);
        }
        if (typeof block.content === "string") {
          out.push(block.content);
        }
        if (Array.isArray(block.content)) {
          for (const inner of block.content as Array<Record<string, unknown>>) {
            if (typeof inner.text === "string") {
              out.push(inner.text);
            }
          }
        }
      }
    }
  }
  return out.join("\n");
}

/**
 * A loopback OpenAI SSE stand-in whose tool is chosen BY THE REQUEST: a
 * request that declares tools and carries no `tool` message yet is answered
 * with a call to the first tool it declares; any other request with text.
 * Two concurrent streams on one instance therefore each get their own turn
 * shape from one shared server.
 */
async function startToolByRequestServer(): Promise<{
  baseURL: string;
  close(): Promise<void>;
}> {
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk));
    }
    let body: {
      messages?: Array<{ role?: string }>;
      tools?: Array<{ function?: { name?: string } }>;
    };
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      body = {};
    }
    const answered = (body.messages ?? []).some((m) => m.role === "tool");
    const toolName = body.tools?.[0]?.function?.name;
    res.writeHead(200, { "content-type": "text/event-stream" });
    const frame = (delta: Record<string, unknown>, finish: string | null) =>
      res.write(
        `data: ${JSON.stringify({
          id: "chatcmpl-tool-by-request",
          object: "chat.completion.chunk",
          model: "gpt-4o-mini",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    if (!answered && toolName) {
      frame(
        {
          tool_calls: [
            {
              index: 0,
              id: `call_${toolName}`,
              type: "function",
              function: { name: toolName, arguments: "{}" },
            },
          ],
        },
        null,
      );
      frame({}, "tool_calls");
    } else {
      frame(
        { role: "assistant", content: `done via ${toolName ?? "none"}` },
        null,
      );
      frame({}, "stop");
    }
    res.write("data: [DONE]\n\n");
    res.end();
  });
  await once(server.listen(0, "127.0.0.1"), "listening");
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    baseURL: `http://127.0.0.1:${port}/v1`,
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections?.();
        server.close(() => r());
      }),
  };
}

/**
 * The smallest host-managed memory client the public
 * `conversationMemory.memory.client` seam accepts. It exists so the per-call
 * `memory.shouldWrite` hook runs; nothing here asserts on what it stores.
 */
class FakeMemoryClient implements HippocampusLike {
  private readonly store = new Map<string, string>();

  async add(ownerId: string, content: string): Promise<string> {
    this.store.set(ownerId, content);
    return content;
  }

  async get(ownerId: string): Promise<string | null> {
    return this.store.get(ownerId) ?? null;
  }

  async delete(ownerId: string): Promise<void> {
    this.store.delete(ownerId);
  }

  async close(): Promise<void> {
    // nothing to release
  }
}

/** Poll until `predicate` holds or `timeoutMs` elapses; memory writes are deferred. */
async function waitForCondition(
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  return predicate();
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

  await test("after a cross-model invalid-model fallback, model/metadata/usage describe the retry, not the rejected attempt", async () => {
    // `openai-compatible` is used (rather than `openai`) because
    // `OpenAIProvider` inherits an empty `getModelFallbacks()` — it has no
    // candidate to retry with. `OpenAICompatibleProvider.getFallbackModels()`
    // returns a fixed list (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo,
    // claude-3-5-sonnet, claude-3-haiku, gemini-pro), so requesting a model
    // outside that list guarantees the first candidate tried is "gpt-4o".
    const requestedModel = "definitely-not-a-real-model";
    const fixture = await startInvalidModelFallbackServer();
    const sdk = new NeuroLink();
    try {
      const result = await sdk.stream({
        input: { text: "ping" },
        provider: "openai-compatible",
        model: requestedModel,
        disableTools: true,
        schema: z.object({ attempt: z.literal("retry") }),
        credentials: {
          openaiCompatible: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${fixture.port}/v1`,
          },
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

      const requested = fixture.requestedModelsNow();
      assert.ok(
        requested.length >= 2,
        "expected a retry after the invalid-model rejection",
      );
      assert.equal(
        requested[0],
        requestedModel,
        "first attempt did not use the originally requested model",
      );
      assert.notEqual(
        requested[1],
        requestedModel,
        "retry did not switch to a fallback model",
      );
      assert.ok(
        text.includes('"retry"'),
        "the fallback attempt's content did not reach the drained stream",
      );

      // The actual regression: `.model` must describe the attempt that
      // produced the stream. Before the fix, `withStreamModelFallback`
      // returned `{...originalResult, stream: wrapped}` — a naked spread of
      // the REJECTED first attempt's StreamResult with only `.stream`
      // swapped — so `.model` stayed pinned to the invalid model forever,
      // even though the consumer above just drained a complete answer from
      // a different model entirely.
      assert.equal(
        result.model,
        requested[1],
        "result.model does not name the retry's own model",
      );
      assert.notEqual(
        result.model,
        requestedModel,
        "result.model leaked the rejected first attempt's model",
      );

      assert.equal(
        result.finishReason,
        "stop",
        "result.finishReason does not describe the retry",
      );
      // The OpenAI-compatible provider writes `metadata.finishReason` by
      // reference onto its own StreamResult when the stream ends; the
      // fallback wrapper's live getters must still surface the retry's
      // value here, not the rejected first attempt's (which never streamed
      // far enough to resolve a finish reason at all).
      assert.equal(
        result.metadata?.finishReason,
        "stop",
        "result.metadata.finishReason does not describe the retry",
      );
      assert.deepEqual(
        result.usage,
        { input: 11, output: 22, total: 33 },
        "result.usage does not describe the retry",
      );
      // structuredData only exists on the retry's metadata, so this proves the
      // public metadata object is the retry's, not the rejected attempt's.
      assert.deepEqual(
        result.metadata?.structuredData,
        { attempt: "retry" },
        "retry-only structured metadata is missing from the public result",
      );
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("after a top-level cross-provider fallback with its own tool call, toolCalls/toolResults describe the fallback (not the empty primary), and metadata mutations persist across reads", async () => {
    const toolName = "get_weather";
    let toolCalls = 0;
    const fixture = await startEmptyThenToolCallFallbackServer(toolName);
    const sdk = new NeuroLink();
    try {
      const result = await sdk.stream({
        input: {
          text: "what is the weather in lisbon",
          // Routes both the primary attempt AND the fallback through
          // executeFakeStreaming() (see startEmptyThenToolCallFallbackServer's
          // docstring) — the only path where this provider's
          // toolCalls/toolResults are populated on the StreamResult at all.
          files: [
            { buffer: PNG_1X1, filename: "frame1.png", mimetype: "image/png" },
            { buffer: PNG_1X1, filename: "frame2.png", mimetype: "image/png" },
            { buffer: PNG_1X1, filename: "frame3.png", mimetype: "image/png" },
          ],
        },
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 3,
        // Leave the top-level fallback ENABLED — unlike every other case in
        // this suite (which disables it to isolate a different code path),
        // it's the exact mechanism under test here. Pinning both provider
        // and model keeps the fallback pointed at this same fixture via the
        // same `credentials`, instead of depending on ModelRouter's default
        // routing decision.
        fallbackProvider: "openai",
        fallbackModel: "gpt-4o-mini",
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

      assert.equal(
        toolCalls,
        1,
        "the fallback attempt's tool was not invoked exactly once",
      );
      assert.equal(
        fixture.requestCountNow(),
        3,
        "expected 1 empty primary request plus the fallback's 2-request tool round trip",
      );
      assert.ok(
        text.includes("sunny"),
        "the fallback's post-tool-call answer did not reach the drained stream",
      );

      // Bugs 1a+1b (unresolved #1819 review comment): the PRIMARY attempt
      // made zero tool calls. Before the fix, `result.toolCalls`/
      // `toolResults` reported that empty primary snapshot no matter what
      // the fallback did:
      //   (1a) `streamResult.toolCalls = streamState.toolCalls` (a plain
      //        value copy in stream()) ran before `handleStreamFallback`
      //        (inside the lazily-executed stream generator) had a chance
      //        to reassign `streamState.toolCalls` to the fallback's own —
      //        JS property assignment isn't a live binding.
      //   (1b) even with (1a) fixed via live getters, `createStreamResponse`
      //        re-copied any of `source`'s (the PRIMARY's) own getters back
      //        over `response`, which would silently re-point
      //        `toolCalls`/`toolResults` at the primary again.
      // Both must be fixed together for this assertion to hold.
      assert.equal(
        result.toolCalls?.length,
        1,
        "result.toolCalls did not reflect the fallback attempt's tool call",
      );
      assert.equal(
        result.toolCalls?.[0]?.toolName,
        toolName,
        "result.toolCalls named the wrong tool",
      );
      // toolResults is exercised for liveness (same getter, same
      // Object.defineProperty pattern as toolCalls above) but not for
      // non-empty content: no current provider's generate() populates the
      // legacy `GenerateResult.toolResults` field (only toolCalls/
      // toolExecutions/toolsUsed are set — see openaiChatCompletionsBase.ts
      // and anthropic/client.ts's native loops), so
      // BaseProvider.executeFakeStreaming()'s `toolResults` mapping is
      // always fed `undefined` and resolves to `[]` on every attempt,
      // primary or fallback. That is a separate, pre-existing gap outside
      // Fix 1's scope (which is the getter/live-binding plumbing, not
      // populating this field). What IS observable here: `streamState.
      // toolResults` is reassigned to the fallback's own (fresh empty) array
      // by `handleStreamFallback`, so a defined array — not `undefined` —
      // must come back through the live getter.
      assert.ok(
        Array.isArray(result.toolResults),
        "result.toolResults must be a live (possibly empty) array, not undefined",
      );

      // Bug 1c: result.metadata must be a stable, mutable reference — a
      // caller mutation must be visible on a LATER read, not silently
      // dropped. `structuredData` is never touched by the internal
      // `responseMetadata` merge, so it isolates the reference-identity bug
      // from unrelated re-merged fields (streamId/startTime/error/etc).
      assert.ok(result.metadata, "result.metadata is missing");
      if (result.metadata) {
        result.metadata.structuredData = { probe: "sentinel" };
      }
      assert.deepEqual(
        result.metadata?.structuredData,
        { probe: "sentinel" },
        "a mutation on result.metadata did not persist across a later read",
      );
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("a forced toolChoice lapses after toolChoiceSteps on the streamed OpenAI-compatible loop", async () => {
    // The wire `tool_choice` was resolved once and sent unchanged on every
    // step, so a named tool was demanded again on the follow-up request and
    // the loop could only end at maxSteps. The stand-in answers request 0
    // with a tool call and request 1 with the final answer, so the two
    // bodies it records are exactly step 0 and step 1.
    const toolName = "get_weather";
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
        toolChoice: { type: "tool", toolName },
        credentials: {
          openai: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${fixture.port}/v1`,
          },
        },
        tools: {
          [toolName]: tool({
            inputSchema: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => ({
              city,
              forecast: "sunny",
            }),
          }),
        },
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      for await (const _chunk of result.stream) {
        // drain
      }
      assert.equal(
        fixture.requestBodies.length,
        2,
        "precondition failed: a forced call then an answer should take exactly two requests",
      );
      const step0 = fixture.requestBodies[0].tool_choice as
        | { type?: string; function?: { name?: string } }
        | string
        | undefined;
      assert.ok(
        typeof step0 === "object" &&
          step0?.type === "function" &&
          step0.function?.name === toolName,
        "step 0 did not carry the forced function tool_choice",
      );
      const step1 = fixture.requestBodies[1].tool_choice;
      assert.ok(
        step1 === undefined || step1 === "auto",
        "step 1 still carried the forced tool_choice",
      );
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("the direct Anthropic stream reports toolsUsed / toolCalls / toolExecutions for a registerTool tool", async () => {
    // The direct Anthropic stream result returned `toolCalls: []` and never
    // surfaced the tool names it collected, so `toolsUsed` came back empty
    // for every tool on that path and `enhancedWithTools` was always false.
    // Driven against a local Anthropic Messages SSE stand-in with the real
    // SDK, so no key is needed and the suite stays offline.
    const toolName = "lookup_order";
    const fixture = await startAnthropicToolCallServer(toolName);
    const restore = withAnthropicEnv(fixture.port);
    const sdk = new NeuroLink();
    let executions = 0;
    sdk.registerTool(toolName, {
      name: toolName,
      description: "look an order up",
      inputSchema: {
        type: "object",
        properties: { orderId: { type: "string" } },
      },
      execute: async () => {
        executions++;
        return { status: "shipped" };
      },
    });
    try {
      const result = await sdk.stream({
        input: { text: "where is order 1?" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxSteps: 3,
        maxTokens: 64,
        disableInternalFallback: true,
      });
      for await (const _chunk of result.stream) {
        // drain
      }
      assert.equal(executions, 1, "precondition failed: the tool did not run");
      assert.ok(
        Array.isArray(result.toolsUsed) && result.toolsUsed.includes(toolName),
        "toolsUsed does not name the registerTool tool that ran",
      );
      assert.ok(
        Array.isArray(result.toolCalls) &&
          result.toolCalls.some((c) => c.toolName === toolName),
        "toolCalls does not name the registerTool tool that ran",
      );
      assert.ok(
        Array.isArray(result.toolExecutions) &&
          result.toolExecutions.length === 1,
        "toolExecutions does not record the one execution",
      );
    } finally {
      restore();
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("one execution emits exactly one tool:start and one tool:end — registerTool and per-call tools alike, on the public stream() path", async () => {
    // Regression for a double-wrap: per-call tools are instrumented at the
    // merge point, then the execution recorder replaces `execute`, and a
    // provider's own fallback instrumentation must recognise the tool as
    // already instrumented. Two pairs per execution still looks "paired".
    const toolName = "lookup_order";
    for (const variant of ["registerTool", "per-call"] as const) {
      // The fixture answers its first request with the tool_use and later
      // ones with text, so each variant gets its own.
      const fixture = await startAnthropicToolCallServer(toolName);
      const restore = withAnthropicEnv(fixture.port);
      try {
        const sdk = new NeuroLink();
        let executions = 0;
        const execute = async () => {
          executions++;
          // A measurable duration, so responseTime > 0 is deterministic.
          await new Promise((r) => setTimeout(r, 5));
          return { status: "shipped" };
        };
        if (variant === "registerTool") {
          sdk.registerTool(toolName, {
            name: toolName,
            description: "look an order up",
            inputSchema: {
              type: "object",
              properties: { orderId: { type: "string" } },
            },
            execute,
          });
        }
        const perCallTools =
          variant === "per-call"
            ? {
                [toolName]: tool({
                  description: "look an order up",
                  inputSchema: z.object({ orderId: z.string().optional() }),
                  execute,
                }),
              }
            : undefined;
        let starts = 0;
        let ends = 0;
        const endPayloads: Array<Record<string, unknown>> = [];
        const emitter = sdk.getEventEmitter();
        const onStart = () => {
          starts++;
        };
        const onEnd = (...args: unknown[]) => {
          ends++;
          endPayloads.push((args[0] ?? {}) as Record<string, unknown>);
        };
        emitter.on("tool:start", onStart);
        emitter.on("tool:end", onEnd);
        try {
          const result = await sdk.stream({
            input: { text: "where is order 1?" },
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            maxSteps: 3,
            maxTokens: 64,
            disableInternalFallback: true,
            ...(perCallTools ? { tools: perCallTools } : {}),
          });
          for await (const _chunk of result.stream) {
            // drain
          }
          assert.equal(
            executions,
            1,
            `precondition failed: the ${variant} tool did not run once`,
          );
          assert.equal(
            starts,
            1,
            `${variant} tool: tool:start count is not exactly one per execution`,
          );
          assert.equal(
            ends,
            1,
            `${variant} tool: tool:end count is not exactly one per execution`,
          );
          // The payload, not just the count: a wrapper that fired the right
          // number of events with the wrong classification or a zeroed
          // duration would still pass a count-only check.
          const end = endPayloads[0];
          assert.equal(
            end.success,
            true,
            `${variant} tool: tool:end did not report success for a successful run`,
          );
          assert.equal(
            end.toolName,
            toolName,
            `${variant} tool: tool:end names the wrong tool`,
          );
          assert.ok(
            typeof end.responseTime === "number" && end.responseTime > 0,
            `${variant} tool: tool:end responseTime is not the real duration`,
          );
          assert.equal(
            end.error,
            undefined,
            `${variant} tool: tool:end carries an error on a successful run`,
          );
        } finally {
          emitter.off("tool:start", onStart);
          emitter.off("tool:end", onEnd);
          await sdk.shutdown();
        }
      } finally {
        restore();
        await fixture.close();
      }
    }
  });

  await test("a tool that returns an MCP-shaped isError result emits one tool:end with success:false and the error text", async () => {
    // wrapExecuteWithEvents used to emit success:true for every non-throwing
    // execute, so tool spans and error metrics counted a returned MCP
    // failure as a success. The step-finish emitter it replaced classified
    // `{ isError: true }`; the wrapper must too.
    const toolName = "lookup_order";
    const fixture = await startAnthropicToolCallServer(toolName);
    const restore = withAnthropicEnv(fixture.port);
    const sdk = new NeuroLink();
    const ends: Array<Record<string, unknown>> = [];
    const emitter = sdk.getEventEmitter();
    const onEnd = (...args: unknown[]) => {
      ends.push((args[0] ?? {}) as Record<string, unknown>);
    };
    emitter.on("tool:end", onEnd);
    try {
      const result = await sdk.stream({
        input: { text: "where is order 1?" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxSteps: 3,
        maxTokens: 64,
        disableInternalFallback: true,
        tools: {
          [toolName]: tool({
            description: "look an order up",
            inputSchema: z.object({ orderId: z.string().optional() }),
            execute: async () => ({
              isError: true,
              content: [{ type: "text", text: "upstream 403" }],
            }),
          }),
        },
      });
      for await (const _chunk of result.stream) {
        // drain
      }
      assert.equal(ends.length, 1, "tool:end did not fire exactly once");
      assert.equal(
        ends[0].success,
        false,
        "an isError result was reported as a success",
      );
      assert.equal(
        ends[0].error,
        "upstream 403",
        "tool:end does not carry the text extracted from the isError result",
      );
      assert.equal(ends[0].toolName, toolName, "tool:end names the wrong tool");
    } finally {
      emitter.off("tool:end", onEnd);
      restore();
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("a placeholder error value (false) alongside isError:true does not suppress the real content text", async () => {
    // extractIsErrorText used to treat any error !== undefined/null as
    // meaningful, so a falsy placeholder like `error: false` — set on every
    // call by some tools regardless of outcome — serialized to the literal
    // string "false" instead of falling through to the real content text.
    const toolName = "lookup_order";
    const fixture = await startAnthropicToolCallServer(toolName);
    const restore = withAnthropicEnv(fixture.port);
    const sdk = new NeuroLink();
    const ends: Array<Record<string, unknown>> = [];
    const emitter = sdk.getEventEmitter();
    const onEnd = (...args: unknown[]) => {
      ends.push((args[0] ?? {}) as Record<string, unknown>);
    };
    emitter.on("tool:end", onEnd);
    try {
      const result = await sdk.stream({
        input: { text: "where is order 1?" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxSteps: 3,
        maxTokens: 64,
        disableInternalFallback: true,
        tools: {
          [toolName]: tool({
            description: "look an order up",
            inputSchema: z.object({ orderId: z.string().optional() }),
            execute: async () => ({
              isError: true,
              error: false,
              content: [{ type: "text", text: "upstream 403" }],
            }),
          }),
        },
      });
      for await (const _chunk of result.stream) {
        // drain
      }
      assert.equal(ends.length, 1, "tool:end did not fire exactly once");
      assert.equal(
        ends[0].error,
        "upstream 403",
        "a placeholder error:false must not shadow the real content text",
      );
    } finally {
      emitter.off("tool:end", onEnd);
      restore();
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("a throwing tool:end listener neither fails the tool run nor produces a second tool:end", async () => {
    // A metrics listener that throws on an unexpected payload used to
    // propagate out of the wrapper: the tool had run, the loop was told it
    // failed (so the model may retry a side effect), and the wrapper's catch
    // emitted a SECOND tool:end for the same execution.
    const toolName = "pay_invoice";
    const fixture = await startAnthropicToolCallServer(toolName);
    const restore = withAnthropicEnv(fixture.port);
    const sdk = new NeuroLink();
    const emitter = sdk.getEventEmitter();
    const seen: Array<Record<string, unknown>> = [];
    const thrower = () => {
      throw new Error("listener boom");
    };
    const observer = (...args: unknown[]) => {
      seen.push((args[0] ?? {}) as Record<string, unknown>);
    };
    // Observer FIRST: Node's EventEmitter stops at a throwing listener, so a
    // listener registered after the thrower never runs — that is the
    // emitter's contract, not the wrapper's. What the wrapper owns is that
    // the throw neither fails the run nor triggers a second tool:end, which
    // the earlier observer would see.
    emitter.on("tool:end", observer);
    emitter.on("tool:end", thrower);
    let sideEffects = 0;
    try {
      const result = await sdk.stream({
        input: { text: "pay invoice 1" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxSteps: 3,
        maxTokens: 64,
        disableInternalFallback: true,
        tools: {
          [toolName]: tool({
            description: "pay an invoice",
            inputSchema: z.object({ orderId: z.string().optional() }),
            execute: async () => {
              sideEffects++;
              return { paid: true };
            },
          }),
        },
      });
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
      assert.equal(sideEffects, 1, "the tool did not run exactly once");
      assert.ok(text.includes("it shipped"), "the turn did not complete");
      // Exactly one, successful, tool:end — a second one would have come
      // from the wrapper's catch treating the listener's throw as a failure.
      assert.equal(seen.length, 1, "tool:end did not fire exactly once");
      assert.equal(
        seen[0].success,
        true,
        "a successful run was reported as a failure because a listener threw",
      );
      const executions = result.toolExecutions as
        | ReadonlyArray<Record<string, unknown>>
        | undefined;
      assert.ok(
        Array.isArray(executions) &&
          executions.length === 1 &&
          executions[0].isError !== true,
        "the execution record marks a successful run as an error",
      );
    } finally {
      emitter.off("tool:end", thrower);
      emitter.off("tool:end", observer);
      restore();
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("a tool call the loop rejects before execute (unknown tool) still emits a tool:start / tool:end(success:false) pair — stream and generate", async () => {
    // A hallucinated tool name runs no executor, so nothing emitted for it
    // and event consumers saw zero attempts while toolResults held the
    // failure. Both the streamed OpenAI-compat loop and the native generate
    // loop must report the rejection.
    for (const surface of ["stream", "generate"] as const) {
      const fixture =
        surface === "stream"
          ? await startToolCallServer("ghost_tool")
          : await startScriptedOpenAIServer([
              { toolCall: { name: "ghost_tool", args: { city: "lisbon" } } },
              { text: "It is sunny." },
            ]);
      const sdk = new NeuroLink();
      const events: Array<[string, Record<string, unknown>]> = [];
      const emitter = sdk.getEventEmitter();
      const onStart = (...args: unknown[]) =>
        events.push(["start", (args[0] ?? {}) as Record<string, unknown>]);
      const onEnd = (...args: unknown[]) =>
        events.push(["end", (args[0] ?? {}) as Record<string, unknown>]);
      emitter.on("tool:start", onStart);
      emitter.on("tool:end", onEnd);
      try {
        const options = {
          input: { text: "what is the weather in lisbon" },
          provider: "openai",
          model: "gpt-4o-mini",
          maxSteps: 3,
          disableInternalFallback: true,
          enabledToolNames: ["real_tool"],
          credentials: {
            openai: {
              apiKey: "test-key",
              baseURL: `http://127.0.0.1:${fixture.port}/v1`,
            },
          },
          tools: {
            real_tool: tool({
              inputSchema: z.object({ city: z.string() }),
              execute: async () => ({ forecast: "sunny" }),
            }),
          },
        } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0];
        if (surface === "stream") {
          const result = await sdk.stream(options);
          for await (const _chunk of result.stream) {
            // drain
          }
        } else {
          await sdk.generate(options);
        }
        const ghost = events.filter(([, p]) => p.toolName === "ghost_tool");
        assert.equal(
          ghost.filter(([kind]) => kind === "start").length,
          1,
          `${surface}: the rejected call emitted no tool:start`,
        );
        const ends = ghost.filter(([kind]) => kind === "end");
        assert.equal(
          ends.length,
          1,
          `${surface}: the rejected call emitted no tool:end`,
        );
        assert.equal(
          ends[0][1].success,
          false,
          `${surface}: the rejected call was reported as a success`,
        );
        assert.ok(
          typeof ends[0][1].error === "string" && ends[0][1].error.length > 0,
          `${surface}: the rejected call's tool:end carries no error`,
        );
      } finally {
        emitter.off("tool:start", onStart);
        emitter.off("tool:end", onEnd);
        await sdk.shutdown();
        await fixture.close();
      }
    }
  });

  await test("OpenAI-compatible stream(): tool:start / tool:end and the tool's own execute options carry the model's toolCallId, and toolCalls / toolResults resolve after the drain", async () => {
    // The streamed loop called `execute(input, {})`, so the event wrapper had
    // no call id to stamp on tool:start / tool:end, and the result exposed no
    // live toolCalls / toolResults — `streamResult.toolCalls` stayed [] after
    // a tool really ran. The fixture's call id is `call_fixture_1`.
    const toolName = "get_weather";
    const fixture = await startToolCallServer(toolName);
    const sdk = new NeuroLink();
    const events: Array<[string, Record<string, unknown>]> = [];
    const emitter = sdk.getEventEmitter();
    const onStart = (...args: unknown[]) =>
      events.push(["start", (args[0] ?? {}) as Record<string, unknown>]);
    const onEnd = (...args: unknown[]) =>
      events.push(["end", (args[0] ?? {}) as Record<string, unknown>]);
    emitter.on("tool:start", onStart);
    emitter.on("tool:end", onEnd);
    const seenCallIds: unknown[] = [];
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
            execute: async (
              { city }: { city: string },
              execOptions?: { toolCallId?: unknown },
            ) => {
              seenCallIds.push(execOptions?.toolCallId);
              return { city, forecast: "sunny" };
            },
          }),
        },
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      for await (const _chunk of result.stream) {
        // drain
      }
      assert.equal(
        seenCallIds.length,
        1,
        "precondition failed: the tool did not run exactly once",
      );
      assert.equal(
        seenCallIds[0],
        "call_fixture_1",
        "the tool's execute options did not carry the model's tool call id",
      );
      const mine = events.filter(([, p]) => p.toolName === toolName);
      const start = mine.find(([kind]) => kind === "start")?.[1];
      const end = mine.find(([kind]) => kind === "end")?.[1];
      assert.ok(start && end, "precondition failed: no tool:start / tool:end");
      assert.equal(
        start?.toolCallId,
        "call_fixture_1",
        "tool:start does not carry the model's tool call id",
      );
      assert.equal(
        end?.toolCallId,
        "call_fixture_1",
        "tool:end does not carry the model's tool call id",
      );

      const calls = result.toolCalls ?? [];
      assert.equal(
        calls.length,
        1,
        "toolCalls did not record the one call the stream made",
      );
      assert.equal(
        calls[0]?.toolCallId,
        "call_fixture_1",
        "toolCalls entry carries the wrong call id",
      );
      assert.equal(
        calls[0]?.toolName,
        toolName,
        "toolCalls entry names the wrong tool",
      );
      assert.deepEqual(
        calls[0]?.args,
        { city: "lisbon" },
        "toolCalls entry lost the call's parsed arguments",
      );
      const results = result.toolResults ?? [];
      assert.equal(
        results.length,
        1,
        "toolResults did not record the one result the stream produced",
      );
      assert.equal(
        results[0]?.id,
        "call_fixture_1",
        "toolResults entry is not paired with its call",
      );
      assert.equal(
        results[0]?.status,
        "success",
        "toolResults reports a successful run as a failure",
      );
    } finally {
      emitter.off("tool:start", onStart);
      emitter.off("tool:end", onEnd);
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("OpenAI-compatible stream(): toolsUsed names only tools that ran successfully — unregistered and throwing calls are excluded, as on generate()", async () => {
    // Every attempted call went into the streamed loop's toolsUsed, so a
    // hallucinated or throwing tool counted as "used" (and reached memory's
    // shouldWrite) on stream() while generate() counted only successes. The
    // attempt itself must still be visible in toolExecutions / toolResults.
    const scenarios = [
      { label: "an unregistered tool", wireName: "ghost_tool" },
      { label: "a tool that throws", wireName: "failing_tool" },
    ] as const;
    for (const scenario of scenarios) {
      for (const surface of ["stream", "generate"] as const) {
        const fixture =
          surface === "stream"
            ? await startToolCallServer(scenario.wireName)
            : await startScriptedOpenAIServer([
                {
                  toolCall: {
                    name: scenario.wireName,
                    args: { city: "lisbon" },
                  },
                },
                { text: "It is sunny." },
              ]);
        const sdk = new NeuroLink();
        let failingRuns = 0;
        try {
          const options = {
            input: { text: "what is the weather in lisbon" },
            provider: "openai",
            model: "gpt-4o-mini",
            maxSteps: 3,
            disableInternalFallback: true,
            enabledToolNames: ["failing_tool"],
            credentials: {
              openai: {
                apiKey: "test-key",
                baseURL: `http://127.0.0.1:${fixture.port}/v1`,
              },
            },
            tools: {
              failing_tool: tool({
                inputSchema: z.object({ city: z.string() }),
                execute: async () => {
                  failingRuns++;
                  throw new Error("weather backend unavailable");
                },
              }),
            },
          } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0];
          let toolsUsed: string[] | undefined;
          let attempts: number;
          if (surface === "stream") {
            const result = await sdk.stream(options);
            for await (const _chunk of result.stream) {
              // drain
            }
            toolsUsed = result.toolsUsed;
            attempts = (result.toolResults ?? []).length;
            assert.equal(
              result.toolResults?.[0]?.status,
              "failure",
              `stream, ${scenario.label}: the failed attempt is not reported as a failure`,
            );
          } else {
            const result = await sdk.generate(
              options as Parameters<
                InstanceType<typeof NeuroLink>["generate"]
              >[0],
            );
            toolsUsed = result.toolsUsed;
            attempts = (result.toolExecutions ?? []).length;
          }
          if (scenario.wireName === "failing_tool") {
            assert.equal(
              failingRuns,
              1,
              `precondition failed: ${surface}, the throwing tool did not run once`,
            );
          }
          assert.equal(
            attempts,
            1,
            `${surface}, ${scenario.label}: the attempt is missing from the execution record`,
          );
          assert.deepEqual(
            toolsUsed ?? [],
            [],
            `${surface}, ${scenario.label}: toolsUsed counts a call that did not succeed`,
          );
        } finally {
          await sdk.shutdown();
          await fixture.close();
        }
      }
    }
  });

  await test("OpenAI-compatible stream(): toolTimeoutMs bounds a wedged tool, and the turn still answers", async () => {
    // The streamed loop awaited `execute` with no per-tool cap and no abort
    // race, so a tool that never settles parked the loop forever. With the
    // generate loop's guard the call fails after toolTimeoutMs, the model is
    // told, and the turn completes.
    const toolName = "get_weather";
    const fixture = await startToolCallServer(toolName);
    const sdk = new NeuroLink();
    let started = 0;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const run = (async () => {
        const result = await sdk.stream({
          input: { text: "what is the weather in lisbon" },
          provider: "openai",
          model: "gpt-4o-mini",
          maxSteps: 3,
          disableInternalFallback: true,
          toolTimeoutMs: 100,
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
              execute: () => {
                started++;
                // Never settles.
                return new Promise<never>(() => {});
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
        return { result, text };
      })();
      const timedOut = new Promise<"wedged">((resolve) => {
        watchdog = setTimeout(() => resolve("wedged"), 15_000);
      });
      const outcome = await Promise.race([run, timedOut]);
      assert.notEqual(
        outcome,
        "wedged",
        "the stream never finished: a tool that never settles parked the loop",
      );
      const { result, text } = outcome as Awaited<typeof run>;
      assert.equal(started, 1, "precondition failed: the tool did not start");
      assert.equal(
        fixture.requestCountNow(),
        2,
        "the turn did not go back to the model after the tool timed out",
      );
      assert.ok(
        text.includes("sunny"),
        "the post-timeout answer did not reach the drained stream",
      );
      const toolResult = result.toolResults?.[0];
      assert.equal(
        toolResult?.status,
        "failure",
        "the timed-out call is not reported as a failure",
      );
      assert.ok(
        typeof toolResult?.error === "string" &&
          toolResult.error.includes("timed out"),
        "the timed-out call does not say it timed out",
      );
      assert.deepEqual(
        result.toolsUsed ?? [],
        [],
        "a timed-out call is counted in toolsUsed",
      );
    } finally {
      if (watchdog) {
        clearTimeout(watchdog);
      }
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("a forced toolChoice lapses after toolChoiceSteps on generate() over the OpenAI-compatible loop and on the Anthropic stream (offline)", async () => {
    // Both sites were covered live only, so a regression that re-sent the
    // forced choice on every step (looping to maxSteps) left offline CI
    // green. The stand-ins record every body, so step 0 and step 1 are the
    // first two requests.
    const toolName = "get_weather";
    {
      const fixture = await startScriptedOpenAIServer([
        { toolCall: { name: toolName, args: { city: "lisbon" } } },
        { text: "It is sunny." },
      ]);
      const sdk = new NeuroLink();
      try {
        await sdk.generate({
          input: { text: "what is the weather in lisbon" },
          provider: "openai",
          model: "gpt-4o-mini",
          maxSteps: 3,
          disableInternalFallback: true,
          enabledToolNames: [toolName],
          toolChoice: { type: "tool", toolName },
          credentials: {
            openai: {
              apiKey: "test-key",
              baseURL: `http://127.0.0.1:${fixture.port}/v1`,
            },
          },
          tools: {
            [toolName]: tool({
              inputSchema: z.object({ city: z.string() }),
              execute: async ({ city }: { city: string }) => ({
                city,
                forecast: "sunny",
              }),
            }),
          },
        } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
        assert.equal(
          fixture.bodies.length,
          2,
          "generate: a forced call then an answer should take exactly two requests",
        );
        const step0 = fixture.bodies[0].tool_choice as
          | { type?: string; function?: { name?: string } }
          | undefined;
        assert.ok(
          step0?.type === "function" && step0.function?.name === toolName,
          "generate: step 0 did not carry the forced function tool_choice",
        );
        const step1 = fixture.bodies[1].tool_choice;
        assert.ok(
          step1 === undefined || step1 === "auto",
          "generate: step 1 still carried the forced tool_choice",
        );
      } finally {
        await sdk.shutdown();
        await fixture.close();
      }
    }
    {
      const fixture = await startAnthropicToolCallServer(toolName);
      const restore = withAnthropicEnv(fixture.port);
      const sdk = new NeuroLink();
      try {
        const result = await sdk.stream({
          input: { text: "what is the weather in lisbon" },
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          maxSteps: 3,
          maxTokens: 64,
          disableInternalFallback: true,
          toolChoice: { type: "tool", toolName },
          tools: {
            [toolName]: tool({
              inputSchema: z.object({ orderId: z.string().optional() }),
              execute: async () => ({ forecast: "sunny" }),
            }),
          },
        });
        for await (const _chunk of result.stream) {
          // drain
        }
        assert.equal(
          fixture.bodies.length,
          2,
          "anthropic stream: a forced call then an answer should take exactly two requests",
        );
        const step0 = fixture.bodies[0].tool_choice as
          | { type?: string; name?: string }
          | undefined;
        assert.ok(
          step0?.type === "tool" && step0.name === toolName,
          "anthropic stream: step 0 did not carry the forced tool_choice",
        );
        const step1 = fixture.bodies[1].tool_choice as
          | { type?: string }
          | undefined;
        assert.ok(
          step1 === undefined || step1.type === "auto",
          "anthropic stream: step 1 still carried the forced tool_choice",
        );
      } finally {
        restore();
        await sdk.shutdown();
        await fixture.close();
      }
    }
  });

  await test("tools.discovery: a tool hydrated by search_tools mid-turn is callable on the next step — Anthropic stream and OpenAI-compatible generate", async () => {
    // The provider loops must use BaseProvider's merged tool record AS IS.
    // A copy (a fresh `{}` from Object.entries) loses the discovery record's
    // non-enumerable resolver and never receives the tools search_tools
    // hydrates into the original, so the model's follow-up call to the
    // loaded tool failed with "Tool not found". Driven with a real stdio MCP
    // fixture, so the deferred catalog is genuine.
    const hydrated = "get_pull_request";
    for (const surface of ["anthropic-stream", "openai-generate"] as const) {
      const serverId = `discovery-${surface}-${process.pid}`;
      const sdk = new NeuroLink({ tools: { discovery: true } });
      const added = await sdk.addExternalMCPServer(serverId, {
        id: serverId,
        name: serverId,
        description: "discovery fixture",
        transport: "stdio",
        status: "initializing",
        tools: [],
        command: process.execPath,
        args: [MCP_FIXTURE],
      });
      assert.ok(added.success, `${surface}: the MCP fixture failed to connect`);
      const sessionId = `discovery-${surface}-${Date.now()}`;
      const anthropicFixture =
        surface === "anthropic-stream"
          ? await startScriptedAnthropicServer([
              { toolUse: { name: "search_tools", input: { query: hydrated } } },
              { toolUse: { name: hydrated, input: { echo: "hi" } } },
              { text: "done" },
            ])
          : undefined;
      const openaiFixture =
        surface === "openai-generate"
          ? await startScriptedOpenAIServer([
              { toolCall: { name: "search_tools", args: { query: hydrated } } },
              { toolCall: { name: hydrated, args: { echo: "hi" } } },
              { text: "done" },
            ])
          : undefined;
      const restore = anthropicFixture
        ? withAnthropicEnv(anthropicFixture.port)
        : () => {};
      try {
        if (surface === "anthropic-stream" && anthropicFixture) {
          const result = await sdk.stream({
            input: { text: "look up PR 1" },
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            maxSteps: 4,
            maxTokens: 64,
            disableInternalFallback: true,
            context: { sessionId },
          });
          for await (const _chunk of result.stream) {
            // drain
          }
          assert.equal(
            anthropicFixture.bodies.length,
            3,
            `${surface}: search then call then answer should take three requests`,
          );
          const step0Tools = (anthropicFixture.bodies[0].tools ?? []) as Array<{
            name: string;
          }>;
          assert.ok(
            step0Tools.some((t) => t.name === "search_tools") &&
              !step0Tools.some((t) => t.name === hydrated),
            `${surface}: precondition failed — the fixture tool was not deferred behind search_tools`,
          );
          const step2Tools = (anthropicFixture.bodies[2].tools ?? []) as Array<{
            name: string;
          }>;
          assert.ok(
            step2Tools.some((t) => t.name === hydrated),
            `${surface}: the hydrated tool was not advertised on the step after search_tools`,
          );
          const text = bodyText(anthropicFixture.bodies[2]);
          assert.ok(
            text.includes(`ran:${hydrated}:hi`),
            `${surface}: the hydrated tool's result did not reach the next step`,
          );
          assert.ok(
            !text.includes("Tool not found") &&
              !text.includes("not registered"),
            `${surface}: the hydrated tool call was rejected`,
          );
        } else if (openaiFixture) {
          await sdk.generate({
            input: { text: "look up PR 1" },
            provider: "openai",
            model: "gpt-4o-mini",
            maxSteps: 4,
            disableInternalFallback: true,
            context: { sessionId },
            credentials: {
              openai: {
                apiKey: "test-key",
                baseURL: `http://127.0.0.1:${openaiFixture.port}/v1`,
              },
            },
          });
          assert.equal(
            openaiFixture.bodies.length,
            3,
            `${surface}: search then call then answer should take three requests`,
          );
          const step0Tools = (openaiFixture.bodies[0].tools ?? []) as Array<{
            function?: { name?: string };
          }>;
          assert.ok(
            step0Tools.some((t) => t.function?.name === "search_tools") &&
              !step0Tools.some((t) => t.function?.name === hydrated),
            `${surface}: precondition failed — the fixture tool was not deferred behind search_tools`,
          );
          const text = bodyText(openaiFixture.bodies[2]);
          assert.ok(
            text.includes(`ran:${hydrated}:hi`),
            `${surface}: the hydrated tool's result did not reach the next step`,
          );
          assert.ok(
            !text.includes("Tool not found") &&
              !text.includes("not registered"),
            `${surface}: the hydrated tool call was rejected`,
          );
        }
      } finally {
        restore();
        await sdk.shutdownExternalMCPServers();
        await sdk.shutdown();
        await anthropicFixture?.close();
        await openaiFixture?.close();
      }
    }
  });

  await test("a tool that returns { error } emits tool:end success:false, reports isError in toolExecutions, and is stored as a failed call", async () => {
    // toolResultStatus only accepted `isError: true`, while the execution
    // recorder's isErrorShapedToolResult also accepted `{ error }` and a
    // failing `status` — the shape docs/sdk-custom-tools.md recommends. The
    // same call therefore emitted `tool:end` with success:true and was stored
    // success:true while `toolExecutions[].isError` said true. The four
    // classifiers now share one predicate.
    const toolName = "lookup_user";
    const fixture = await startAnthropicToolCallServer(toolName);
    const restore = withAnthropicEnv(fixture.port);
    const sessionId = `error-shape-${Date.now()}`;
    const sdk = new NeuroLink({ conversationMemory: { enabled: true } });
    const ends: Array<Record<string, unknown>> = [];
    const emitter = sdk.getEventEmitter();
    const onEnd = (...args: unknown[]) => {
      ends.push((args[0] ?? {}) as Record<string, unknown>);
    };
    emitter.on("tool:end", onEnd);
    try {
      const result = await sdk.stream({
        input: { text: "who is user 1?" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxSteps: 3,
        maxTokens: 64,
        disableInternalFallback: true,
        context: { sessionId },
        tools: {
          [toolName]: tool({
            description: "look a user up",
            inputSchema: z.object({ orderId: z.string().optional() }),
            execute: async () => ({ error: "User not found" }),
          }),
        },
      });
      for await (const _chunk of result.stream) {
        // drain
      }
      assert.equal(ends.length, 1, "tool:end did not fire exactly once");
      assert.equal(
        ends[0].success,
        false,
        "an { error } result was reported as a success by tool:end",
      );
      assert.equal(
        ends[0].error,
        "User not found",
        "tool:end does not carry the error text from the { error } result",
      );
      const executions = result.toolExecutions ?? [];
      assert.equal(
        executions.length,
        1,
        "toolExecutions does not record the single execution",
      );
      // The recorder's records carry `isError`; read it off a plain copy
      // since the public StreamResult type still declares the older shape.
      const firstExecution: Record<string, unknown> = { ...executions[0] };
      assert.equal(
        firstExecution.isError,
        true,
        "toolExecutions reports the { error } result as a success",
      );
      const rows = await sdk.getSessionMessages(sessionId);
      const stored = rows.find((r) => r.role === "tool_result");
      assert.ok(stored !== undefined, "no tool_result row was stored");
      assert.equal(
        stored?.result?.success,
        false,
        "the stored tool_result row reports success for the { error } result",
      );
      assert.equal(
        stored?.result?.error,
        "User not found",
        "the stored tool_result row does not carry the error text",
      );
    } finally {
      emitter.off("tool:end", onEnd);
      restore();
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("a prepareStep hook that rejects after the turn was aborted does not raise an unhandled rejection", async () => {
    // awaitPrepareStep returned a rejection for an already-aborted signal
    // without attaching any handler to the hook's own promise. When that
    // promise rejected later — a policy service failing after the caller
    // cancelled — it was an unhandled rejection, which terminates Node
    // under the default policy. The listener below is what keeps THIS
    // process alive on the old build; on the fixed build it never fires.
    const toolName = "get_weather";
    const fixture = await startScriptedOpenAIServer([
      { toolCall: { name: toolName, args: { city: "lisbon" } } },
      { text: "It is sunny." },
    ]);
    const sdk = new NeuroLink();
    const controller = new AbortController();
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);
    let hookCalls = 0;
    let hookRejected = false;
    try {
      let turnRejected = false;
      try {
        await sdk.generate({
          input: { text: "what is the weather in lisbon" },
          provider: "openai",
          model: "gpt-4o-mini",
          maxSteps: 3,
          disableInternalFallback: true,
          abortSignal: controller.signal,
          credentials: {
            openai: {
              apiKey: "test-key",
              baseURL: `http://127.0.0.1:${fixture.port}/v1`,
            },
          },
          tools: {
            [toolName]: tool({
              inputSchema: z.object({ city: z.string() }),
              execute: async ({ city }: { city: string }) => ({
                city,
                forecast: "sunny",
              }),
            }),
          },
          // Cancel the turn while the hook's promise is still pending, then
          // fail that promise after the loop has already moved on.
          prepareStep: () => {
            hookCalls++;
            controller.abort();
            return new Promise((_resolve, reject) => {
              setTimeout(() => {
                hookRejected = true;
                reject(new Error("policy service failed"));
              }, 50);
            });
          },
        } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
      } catch {
        turnRejected = true;
      }
      assert.equal(hookCalls, 1, "precondition failed: the hook did not run");
      assert.ok(
        turnRejected,
        "precondition failed: the aborted turn did not reject",
      );
      assert.equal(
        fixture.bodies.length,
        0,
        "precondition failed: the aborted turn still sent a request",
      );
      // Let the abandoned hook promise reject, and Node report it if it is
      // unobserved (the report is dispatched from the microtask/tick queue).
      await new Promise((r) => setTimeout(r, 250));
      assert.ok(
        hookRejected,
        "precondition failed: the hook's promise never rejected",
      );
      assert.equal(
        unhandled.length,
        0,
        "the hook's late rejection was left unhandled",
      );
    } finally {
      process.off("unhandledRejection", onUnhandled);
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("a prepareStep hook that rejects with its own AbortError, on a turn nobody cancelled, is a hook failure and the turn completes", async () => {
    // Abort-versus-failure was decided by `error.name === "AbortError"`, so
    // a hook whose policy-service call timed out (an AbortError of its own)
    // ended the whole turn. It is now decided by the loop's signal.
    const toolName = "get_weather";
    const fixture = await startScriptedOpenAIServer([
      { toolCall: { name: toolName, args: { city: "lisbon" } } },
      { text: "It is sunny." },
    ]);
    const sdk = new NeuroLink();
    let hookCalls = 0;
    try {
      const result = await sdk.generate({
        input: { text: "what is the weather in lisbon" },
        provider: "openai",
        model: "gpt-4o-mini",
        maxSteps: 3,
        disableInternalFallback: true,
        abortSignal: new AbortController().signal,
        credentials: {
          openai: {
            apiKey: "test-key",
            baseURL: `http://127.0.0.1:${fixture.port}/v1`,
          },
        },
        tools: {
          [toolName]: tool({
            inputSchema: z.object({ city: z.string() }),
            execute: async ({ city }: { city: string }) => ({
              city,
              forecast: "sunny",
            }),
          }),
        },
        prepareStep: async () => {
          hookCalls++;
          const error = new Error("policy service timed out");
          error.name = "AbortError";
          throw error;
        },
      } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);
      assert.ok(hookCalls >= 1, "precondition failed: the hook did not run");
      assert.equal(
        fixture.bodies.length,
        2,
        "the turn did not run to its answer after the hook's AbortError",
      );
      assert.ok(
        typeof result.content === "string" && result.content.includes("sunny"),
        "the turn's answer did not reach the caller",
      );
    } finally {
      await sdk.shutdown();
      await fixture.close();
    }
  });

  await test("stream(): a turn that used no tools hands its memory hooks an empty toolsUsed even while another stream's tool runs on the same instance", async () => {
    // The stream memory turn fell back to the INSTANCE-WIDE tool:start
    // events whenever the per-request list was empty, so a stream that used
    // no tools, running beside any other tool call on the same instance,
    // handed that tool's name to its shouldWrite / onBeforeStore. An empty
    // per-request list is authoritative now, as it is for generate().
    const server = await startToolByRequestServer();
    const fake = new FakeMemoryClient();
    const sdk = new NeuroLink({
      credentials: {
        openai: { apiKey: "sk-mock", baseURL: server.baseURL },
      },
      conversationMemory: {
        enabled: true,
        memory: { enabled: true, client: fake },
      },
    });
    const turns = new Map<string, { toolsUsed?: string[] }>();
    const gate = {
      toolStarted: () => {},
      releaseTool: () => {},
    };
    const toolStarted = new Promise<void>((resolve) => {
      gate.toolStarted = resolve;
    });
    const toolReleased = new Promise<void>((resolve) => {
      gate.releaseTool = resolve;
    });
    const shouldWrite = (turn: { userId: string; toolsUsed?: string[] }) => {
      turns.set(turn.userId, { toolsUsed: turn.toolsUsed });
      return true;
    };
    const drain = async (r: { stream: AsyncIterable<unknown> }) => {
      for await (const _chunk of r.stream) {
        // drain
      }
    };
    try {
      // The tool-less stream first, so its event listeners are attached
      // when the other stream's tool:start fires.
      const quiet = await sdk.stream({
        input: { text: "just say hello" },
        provider: "openai",
        model: "gpt-4o-mini",
        context: { userId: "user-quiet", sessionId: "session-quiet" },
        disableInternalFallback: true,
        disableTools: true,
        timeout: 30_000,
        memory: { shouldWrite },
      });
      const busy = await sdk.stream({
        input: { text: "run tool_busy" },
        provider: "openai",
        model: "gpt-4o-mini",
        context: { userId: "user-busy", sessionId: "session-busy" },
        maxSteps: 3,
        disableInternalFallback: true,
        timeout: 30_000,
        enabledToolNames: ["tool_busy"],
        tools: {
          tool_busy: tool({
            description: "a tool the other stream must not see",
            inputSchema: z.object({}),
            execute: async () => {
              gate.toolStarted();
              await toolReleased;
              return { ok: true };
            },
          }),
        },
        memory: { shouldWrite },
      });
      const busyDrained = drain(busy);
      // Hold the quiet stream's memory turn until the other tool has STARTED
      // (its tool:start has been emitted on the shared emitter).
      await toolStarted;
      await drain(quiet);
      assert.ok(
        await waitForCondition(() => turns.has("user-quiet")),
        "the tool-less stream's write never reached shouldWrite",
      );
      const quietTools = turns.get("user-quiet")?.toolsUsed ?? [];
      assert.equal(
        quietTools.length,
        0,
        "the tool-less stream's hook was handed another stream's tool",
      );
      gate.releaseTool();
      await busyDrained;
      assert.ok(
        await waitForCondition(() => turns.has("user-busy")),
        "the tool stream's write never reached shouldWrite",
      );
      assert.deepEqual(
        turns.get("user-busy")?.toolsUsed ?? [],
        ["tool_busy"],
        "the tool stream's hook does not see its own tool",
      );
    } finally {
      gate.releaseTool();
      await sdk.shutdown();
      await server.close();
    }
  });
});

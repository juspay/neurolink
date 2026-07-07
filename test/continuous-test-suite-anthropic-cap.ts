#!/usr/bin/env tsx
/**
 * Native Anthropic (Claude-on-Vertex) loop: reserved final_result step,
 * graceful step-cap recovery, honest finishReason, abortSignal wiring.
 *
 * Covers the SPEC "UNIT TESTS" list for
 * `fix(vertex): reserve final_result step + graceful cap recovery in native
 *  Anthropic loop`:
 *   - schema turns that exhaust the budget get ONE forced finalization call
 *     with tool_choice {type:"tool", name:"final_result"} (total create()
 *     calls === maxSteps) and never return content ""
 *   - schema turns that finish within budget are byte-identical to before
 *   - failed/malformed finalization → buildToolLoopCapMessage + "tool-calls"
 *   - non-schema pure tool-loops get a tools-disabled (tool_choice:"none")
 *     backstop call; on failure → cap message + "tool-calls"
 *   - the soft budget nudge ("Consolidate…") rides the tool_result user turn
 *   - abortSignal breaks the generate loop without throwing and without a
 *     finalization call; aborted tool calls are not recorded as failures
 *   - max_tokens still maps to "length" (precedence over "tool-calls")
 *   - the stream twin repeats the cap/finalization/backstop cases and yields
 *     exactly one non-empty chunk on the previously-empty cases
 *
 * Driven through mock-injected `client.messages.create` / `client.messages
 * .stream` (the private `createAnthropicVertexClient` is overridden with a
 * cast, matching the precedent in continuous-test-suite-gemini-abort.ts).
 *
 * Runner: `npx tsx test/continuous-test-suite-anthropic-cap.ts`
 * (package.json: `pnpm run test:anthropic-cap`).
 */
import "dotenv/config";

import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import {
  buildAbortedTurnMessage,
  buildToolLoopCapMessage,
} from "../src/lib/providers/googleNativeGemini3.js";
import { GoogleVertexProvider } from "../src/lib/providers/googleVertex.js";

// ---------------------------------------------------------------------------
// Env: satisfy the GoogleVertexProvider constructor without live network.
// The mock-injected createAnthropicVertexClient means no client is ever
// really built. (Mirrors continuous-test-suite-gemini-abort.ts.)
// ---------------------------------------------------------------------------
/** Run `fn` with `updates` applied to `process.env`, restoring prior values after. */
async function withTemporaryEnv<T>(
  updates: Record<string, string | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(updates)) {
    previous.set(key, process.env[key]);
    const next = updates[key];
    if (next === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = next;
    }
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

const VERTEX_ENV = {
  GOOGLE_APPLICATION_CREDENTIALS: "/tmp/neurolink-anthropic-cap-creds.json",
  GOOGLE_CLOUD_PROJECT_ID: "test-project",
  GOOGLE_CLOUD_PROJECT: "test-project",
  GOOGLE_CLOUD_LOCATION: "global",
};

const MODEL = "claude-sonnet-4-5@20250929";

// ---------------------------------------------------------------------------
// Mock @anthropic-ai/vertex-sdk client
// ---------------------------------------------------------------------------

type AnthropicRequestParams = {
  model: string;
  max_tokens: number;
  messages: Array<{ role: string; content: unknown }>;
  tools?: Array<{ name: string }>;
  tool_choice?: { type: string; name?: string };
  system?: unknown;
};

type AnthropicResponse = {
  content: Array<Record<string, unknown>>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  stop_reason?: string | null;
};

/** A response whose only content is a tool_use call (the "runaway" step). */
function toolUseResponse(
  name: string,
  input: Record<string, unknown>,
  extraText?: string,
): AnthropicResponse {
  return {
    content: [
      ...(extraText ? [{ type: "text", text: extraText }] : []),
      { type: "tool_use", id: `tu_${name}_${Math.random()}`, name, input },
    ],
    usage: { input_tokens: 5, output_tokens: 3 },
    stop_reason: "tool_use",
  };
}

/** A final_result tool_use response (what a forced finalization returns). */
function finalResultResponse(
  payload: Record<string, unknown>,
  stopReason = "tool_use",
): AnthropicResponse {
  return {
    content: [
      {
        type: "tool_use",
        id: "tu_final",
        name: "final_result",
        input: payload,
      },
    ],
    usage: { input_tokens: 5, output_tokens: 7 },
    stop_reason: stopReason,
  };
}

/** A plain-text terminal response (model stopped on its own). */
function textResponse(
  text: string,
  stopReason = "end_turn",
): AnthropicResponse {
  return {
    content: text ? [{ type: "text", text }] : [],
    usage: { input_tokens: 5, output_tokens: 7 },
    stop_reason: stopReason,
  };
}

function abortError(message = "Request was aborted."): Error {
  const e = new Error(message);
  e.name = "AbortError";
  return e;
}

/**
 * Behavior for one mocked model call: a response to return, an error to
 * throw, and (stream mock only) text deltas fired at the "text" listener
 * before finalMessage resolves.
 */
type CallBehavior = {
  response?: AnthropicResponse;
  reject?: Error;
  textDeltas?: string[];
  /** Side effect executed as the call is issued (e.g. trip an AbortController). */
  onCall?: () => void;
};

type GenerateRecorder = {
  calls: AnthropicRequestParams[];
  /** The request-options AbortSignal forwarded to each create() call. */
  signals: Array<AbortSignal | undefined>;
  client: {
    messages: {
      create: (
        p: AnthropicRequestParams,
        opts?: { signal?: AbortSignal },
      ) => Promise<AnthropicResponse>;
    };
  };
};

/** Recording mock for the generate path (client.messages.create). */
function makeGenerateMock(
  plan: (callIndex: number, params: AnthropicRequestParams) => CallBehavior,
): GenerateRecorder {
  const calls: AnthropicRequestParams[] = [];
  const signals: Array<AbortSignal | undefined> = [];
  return {
    calls,
    signals,
    client: {
      messages: {
        create: async (
          p: AnthropicRequestParams,
          opts?: { signal?: AbortSignal },
        ) => {
          const index = calls.length;
          calls.push(p);
          signals.push(opts?.signal);
          const behavior = plan(index, p);
          behavior.onCall?.();
          if (behavior.reject) {
            throw behavior.reject;
          }
          return behavior.response as AnthropicResponse;
        },
      },
    },
  };
}

type MockMessageStream = {
  on: (event: string, cb: (delta: string) => void) => MockMessageStream;
  controller: { abort: () => void };
  finalMessage: () => Promise<AnthropicResponse>;
};

type StreamRecorder = {
  calls: AnthropicRequestParams[];
  client: {
    messages: {
      stream: (p: AnthropicRequestParams) => MockMessageStream;
    };
  };
};

/** Recording mock for the stream path (client.messages.stream). */
function makeStreamMock(
  plan: (callIndex: number, params: AnthropicRequestParams) => CallBehavior,
): StreamRecorder {
  const calls: AnthropicRequestParams[] = [];
  return {
    calls,
    client: {
      messages: {
        stream: (p: AnthropicRequestParams) => {
          const index = calls.length;
          calls.push(p);
          const behavior = plan(index, p);
          behavior.onCall?.();
          const textListeners: Array<(delta: string) => void> = [];
          const stream: MockMessageStream = {
            on(event: string, cb: (delta: string) => void) {
              if (event === "text") {
                textListeners.push(cb);
              }
              return stream;
            },
            controller: {
              abort: () => {
                /* mid-flight cancel is simulated via behavior.reject */
              },
            },
            async finalMessage() {
              if (behavior.reject) {
                throw behavior.reject;
              }
              for (const delta of behavior.textDeltas ?? []) {
                for (const cb of textListeners) {
                  cb(delta);
                }
              }
              return behavior.response as AnthropicResponse;
            },
          };
          return stream;
        },
      },
    },
  };
}

/** Construct a provider with the mock Anthropic client injected. */
async function makeProvider(client: unknown): Promise<GoogleVertexProvider> {
  const provider = new GoogleVertexProvider(
    MODEL,
    undefined,
    undefined,
    "global",
  );
  (
    provider as unknown as {
      createAnthropicVertexClient: () => Promise<unknown>;
    }
  ).createAnthropicVertexClient = async () => client;
  return provider;
}

type GenResult = {
  content: string;
  finishReason: string;
  stopReason?: string;
  rawFinishReason?: string;
  stepsUsed?: number;
  usage: { input: number; output: number; total: number };
  toolsUsed?: string[];
  toolExecutions?: unknown[];
  enhancedWithTools?: boolean;
};

/** Invoke the private native-Anthropic generate loop against the mock client. */
async function runGenerate(
  provider: GoogleVertexProvider,
  options: Record<string, unknown>,
): Promise<GenResult> {
  return (
    provider as unknown as {
      executeNativeAnthropicGenerate(o: unknown): Promise<GenResult>;
    }
  ).executeNativeAnthropicGenerate(options);
}

type StreamResultShape = {
  finishReason?: string;
  stopReason?: string;
  rawFinishReason?: string;
  usage: { input: number; output: number; total: number };
  structuredOutput?: unknown;
  stream: AsyncIterable<{ content: string }>;
  metadata?: {
    stopReason?: string;
    rawFinishReason?: string;
    stepsUsed?: number;
  };
};

/** Invoke the private native-Anthropic stream loop and drain its chunks plus result. */
async function runStream(
  provider: GoogleVertexProvider,
  options: Record<string, unknown>,
): Promise<{ chunks: string[]; result: StreamResultShape }> {
  const result = (await (
    provider as unknown as {
      executeNativeAnthropicStream(o: unknown): Promise<StreamResultShape>;
    }
  ).executeNativeAnthropicStream(options)) as StreamResultShape;
  const collected: string[] = [];
  for await (const c of result.stream) {
    collected.push(c.content);
  }
  return { chunks: collected, result };
}

/** A simple echo tool the loop can execute. */
function makeTool(
  execute: (
    args: unknown,
    opts: { abortSignal?: AbortSignal },
  ) => Promise<unknown> = async () => ({ ok: true }),
) {
  return {
    myTool: {
      description: "A test tool",
      parameters: {
        type: "object",
        properties: { q: { type: "string" } },
      },
      execute,
    },
  };
}

/** Extract every "Consolidate" nudge text from a request's trailing user turn. */
function nudgeTextsInLastUserTurn(params: AnthropicRequestParams): string[] {
  const last = params.messages[params.messages.length - 1];
  if (!last || last.role !== "user" || !Array.isArray(last.content)) {
    return [];
  }
  return (last.content as Array<Record<string, unknown>>)
    .filter(
      (block) =>
        block.type === "text" &&
        typeof block.text === "string" &&
        (block.text as string).includes("Consolidate"),
    )
    .map((block) => block.text as string);
}

// ===========================================================================
// Suite
// ===========================================================================

const { test, runSuite } = defineSuite("Anthropic-on-Vertex Cap + Abort");

/** Registers and runs every case in the Anthropic cap/finalization/abort suite. */
async function main(): Promise<void> {
  const { z } = await import("zod");
  const SCHEMA = z.object({ answer: z.number() });
  const PAYLOAD = { answer: 42 };

  // -------------------------------------------------------------------------
  // 1. Generate + schema: budget exhausted -> reserved forced finalization
  // -------------------------------------------------------------------------
  await test("generate schema: never calls final_result -> forced finalization call, content=JSON, finishReason 'stop', create() calls === maxSteps", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 3;
      // Agentic steps (indices 0..maxSteps-2) return runaway tool calls; the
      // reserved finalization call (index maxSteps-1) returns final_result.
      const mock = makeGenerateMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD) },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(
        mock.calls.length,
        maxSteps,
        "agentic steps + 1 reserved finalization call",
      );
      // Loop steps force a tool call via tool_choice:"any"; the reserved
      // finalization call pins final_result.
      assertEqual(mock.calls[0].tool_choice?.type, "any");
      assertEqual(mock.calls[maxSteps - 1].tool_choice?.type, "tool");
      assertEqual(mock.calls[maxSteps - 1].tool_choice?.name, "final_result");
      assertEqual(result.content, JSON.stringify(PAYLOAD));
      assertEqual(
        JSON.stringify(JSON.parse(result.content)),
        JSON.stringify(PAYLOAD),
        "content must be valid structured JSON",
      );
      assertEqual(result.finishReason, "stop");
      assert(
        !(result.toolsUsed ?? []).includes("final_result"),
        "final_result must stay filtered from toolsUsed",
      );
      assert(
        result.usage.output >= 3 * 2 + 7 - 3,
        "finalization usage counted",
      );
    });
  });

  // -------------------------------------------------------------------------
  // 2. Generate + schema: final_result within budget -> unchanged behavior
  // -------------------------------------------------------------------------
  await test("generate schema: final_result at step 2 -> no finalization call, create() calls === 2", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeGenerateMock((i) =>
        i === 0
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD) },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps: 5,
      });
      assertEqual(
        mock.calls.length,
        2,
        "breaks at final_result, no extra call",
      );
      assert(
        mock.calls.every((c) => c.tool_choice?.type !== "tool"),
        "no forced-finalization call on a clean finish",
      );
      assertEqual(result.content, JSON.stringify(PAYLOAD));
      assertEqual(result.finishReason, "stop");
    });
  });

  // -------------------------------------------------------------------------
  // 3. Generate + schema: maxSteps=1 -> finalization IS the only call
  // -------------------------------------------------------------------------
  await test("generate schema: maxSteps=1 -> the finalization call is the only call", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeGenerateMock(() => ({
        response: finalResultResponse(PAYLOAD),
      }));
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps: 1,
      });
      assertEqual(mock.calls.length, 1);
      assertEqual(mock.calls[0].tool_choice?.type, "tool");
      assertEqual(mock.calls[0].tool_choice?.name, "final_result");
      assertEqual(result.content, JSON.stringify(PAYLOAD));
      assertEqual(result.finishReason, "stop");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Generate + schema: finalization throws -> cap message, "tool-calls"
  // -------------------------------------------------------------------------
  await test("generate schema: finalization call throws -> cap message, finishReason 'tool-calls', never ''", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeGenerateMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { reject: new Error("boom from finalization") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(result.content, buildToolLoopCapMessage(maxSteps, 1));
      assertEqual(result.finishReason, "tool-calls");
      assertEqual(
        result.stopReason,
        "step-cap",
        "genuine budget exhaustion must report stopReason 'step-cap'",
      );
      assert(result.content.length > 0, "content must never be empty");
    });
  });

  await test("generate schema: finalization returns malformed (no tool_use) -> cap message, 'tool-calls'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeGenerateMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: textResponse("not a tool call", "end_turn") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(result.content, buildToolLoopCapMessage(maxSteps, 1));
      assertEqual(result.finishReason, "tool-calls");
    });
  });

  // -------------------------------------------------------------------------
  // 5. Generate non-schema: pure tool-loop to cap -> tool_choice:"none" backstop
  // -------------------------------------------------------------------------
  await test("generate non-schema: pure tool-loop to cap -> tools-disabled backstop call, its text returned, finishReason 'stop'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeGenerateMock((i) =>
        i < maxSteps
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: textResponse("SYNTHESIZED ANSWER", "end_turn") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps,
      });
      assertEqual(mock.calls.length, maxSteps + 1, "loop + 1 backstop call");
      const backstop = mock.calls[maxSteps];
      // Anthropic rejects tool_use/tool_result history without a tools param,
      // so "tools disabled" must be tool_choice:"none" with tools retained.
      assertEqual(backstop.tool_choice?.type, "none");
      assert(
        Array.isArray(backstop.tools) && backstop.tools.length > 0,
        "backstop must keep the tools param (API validity + cache prefix)",
      );
      assertIncludes(
        JSON.stringify(backstop.system ?? ""),
        "no longer available",
      );
      assertEqual(result.content, "SYNTHESIZED ANSWER");
      // synthesizedFinalAnswer -> "stop", parity with the Gemini synth path.
      assertEqual(result.finishReason, "stop");
      assert(result.usage.output > 3 * maxSteps, "backstop tokens added");
    });
  });

  await test("generate non-schema: backstop fails -> cap message, finishReason 'tool-calls'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeGenerateMock((i) =>
        i < maxSteps
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { reject: new Error("backstop boom") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps,
      });
      assertEqual(result.content, buildToolLoopCapMessage(maxSteps, maxSteps));
      assertEqual(result.finishReason, "tool-calls");
    });
  });

  await test("generate non-schema: capped with mid-loop prose -> prose returned, 'tool-calls', no backstop call", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeGenerateMock((i) => {
        if (i < maxSteps) {
          return {
            response: toolUseResponse("myTool", { q: "x" }, `step${i} prose`),
          };
        }
        return { response: textResponse("SHOULD NOT BE CALLED") };
      });
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps,
      });
      assertEqual(mock.calls.length, maxSteps, "no backstop when prose exists");
      // Prose is ACCUMULATED across steps (appendStepText), not last-step-only.
      assertEqual(result.content, "step0 prose\nstep1 prose");
      assertEqual(result.finishReason, "tool-calls");
    });
  });

  // -------------------------------------------------------------------------
  // 6. Budget nudge
  // -------------------------------------------------------------------------
  await test("generate schema: budget nudge appended to tool_result turns when steps-remaining <= 3", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 5; // agentic budget 4, finalization reserved
      const mock = makeGenerateMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD) },
      );
      const provider = await makeProvider(mock.client);
      await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(mock.calls.length, maxSteps);
      // Request 0 carries no tool results yet -> no nudge anywhere.
      assertEqual(nudgeTextsInLastUserTurn(mock.calls[0]).length, 0);
      // After step 1 (3 agentic steps remain) the tool_result turn seen by
      // request 1 carries the nudge; same for 2 and 1 remaining.
      for (const [callIndex, remaining] of [
        [1, 3],
        [2, 2],
        [3, 1],
      ] as const) {
        const nudges = nudgeTextsInLastUserTurn(mock.calls[callIndex]);
        assert(
          nudges.length === 1,
          `request ${callIndex} must carry exactly one trailing nudge`,
        );
        assertIncludes(nudges[0], `Only ${remaining} tool step(s) remain`);
        assertIncludes(nudges[0], "call final_result with your best answer");
      }
    });
  });

  // -------------------------------------------------------------------------
  // 7. Abort wiring (generate)
  // -------------------------------------------------------------------------
  await test("generate: abort mid-turn -> loop breaks (no throw), no finalization call, cap message", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 10;
      const controller = new AbortController();
      const mock = makeGenerateMock((i) => {
        if (i === 0) {
          return { response: toolUseResponse("myTool", { q: "x" }) };
        }
        // Caller aborts right as the 2nd request starts; SDK rejects abort-shaped.
        return {
          onCall: () => controller.abort(),
          reject: abortError(),
        };
      });
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
        abortSignal: controller.signal,
      });
      // No throw escaped (we got a result); calls stopped immediately.
      assertEqual(mock.calls.length, 2, "create() calls stop on abort");
      assert(
        mock.calls.every((c) => c.tool_choice?.type !== "tool"),
        "no finalization call after abort (budget already blown)",
      );
      // The request signal is the loop's internal fan-in signal (caller
      // signal + turn-clock watchdogs): one stable AbortSignal that must be
      // aborted once the caller's signal fires — not just simulated by the
      // mock's injected rejection.
      assert(
        mock.signals.every(
          (s) => typeof AbortSignal !== "undefined" && s instanceof AbortSignal,
        ),
        "every create() must carry an AbortSignal request option",
      );
      assert(
        new Set(mock.signals).size === 1,
        "the same internal signal must ride every create()",
      );
      assert(
        (mock.signals[0] as AbortSignal).aborted,
        "the internal request signal must be aborted after the caller aborts",
      );
      // Honest abort message — never the step-cap text on an aborted turn.
      assertEqual(result.content, buildAbortedTurnMessage(1));
      // Aborted turns map finishReason from lastStopReason, not "tool-calls".
      assertEqual(result.finishReason, "stop");
    });
  });

  await test("generate: pre-aborted signal -> zero model calls, cap message", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const controller = new AbortController();
      controller.abort();
      const mock = makeGenerateMock(() => ({
        response: toolUseResponse("myTool", { q: "x" }),
      }));
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps: 5,
        abortSignal: controller.signal,
      });
      assertEqual(mock.calls.length, 0, "no request when already aborted");
      assertEqual(result.content, buildAbortedTurnMessage(0));
    });
  });

  await test("generate: aborted tool call not recorded as a failure; turn breaks", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      // No caller signal here: the tool throws an AbortError-named error, so
      // isAbortError is the SOLE discriminator that must break the turn.
      let executeCount = 0;
      const mock = makeGenerateMock(() => ({
        response: toolUseResponse("myTool", { q: "x" }),
      }));
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(async () => {
          executeCount++;
          throw abortError("aborted mid-tool");
        }),
        maxSteps: 6,
      });
      assertEqual(executeCount, 1, "aborted tool must not be retried");
      assertEqual(
        mock.calls.length,
        1,
        "aborted tool must break the turn — no further model request",
      );
      assert(
        !JSON.stringify(result.toolExecutions ?? []).includes(
          "Error executing tool",
        ),
        "aborted tool must not be recorded as a failed execution",
      );
      assertEqual(result.content, buildAbortedTurnMessage(1));
    });
  });

  // -------------------------------------------------------------------------
  // 8. max_tokens precedence
  // -------------------------------------------------------------------------
  await test("generate: max_tokens stop_reason maps to 'length' even when the cap was hit", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeGenerateMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD, "max_tokens") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(result.finishReason, "length");
      assertEqual(result.content, JSON.stringify(PAYLOAD));
    });
  });

  // -------------------------------------------------------------------------
  // 9. Regression: no empty content while tools ran
  // -------------------------------------------------------------------------
  await test("generate: clean text-exit with EMPTY text after tool steps -> cap message, never ''", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeGenerateMock((i) =>
        i === 0
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: textResponse("", "end_turn") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps: 5,
      });
      assert(
        result.content.length > 0,
        "content must never be empty when enhancedWithTools is true",
      );
      assertEqual(result.enhancedWithTools, true);
    });
  });

  // -------------------------------------------------------------------------
  // 10. Stream twin: cap -> forced finalization, exactly one JSON chunk
  // -------------------------------------------------------------------------
  await test("stream schema: cap -> forced finalization, exactly ONE JSON chunk, structuredOutput set, finishReason 'stop'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 3;
      const mock = makeStreamMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD) },
      );
      const provider = await makeProvider(mock.client);
      const { chunks, result } = await runStream(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(mock.calls.length, maxSteps);
      assertEqual(mock.calls[maxSteps - 1].tool_choice?.type, "tool");
      assertEqual(mock.calls[maxSteps - 1].tool_choice?.name, "final_result");
      assertEqual(chunks.length, 1, "exactly one non-empty chunk");
      assertEqual(chunks[0], JSON.stringify(PAYLOAD));
      assertEqual(
        JSON.stringify(result.structuredOutput),
        JSON.stringify(PAYLOAD),
      );
      assertEqual(result.finishReason, "stop");
    });
  });

  await test("stream schema: finalization fails -> exactly ONE cap chunk, finishReason 'tool-calls'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeStreamMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { reject: new Error("finalization boom") },
      );
      const provider = await makeProvider(mock.client);
      const { chunks, result } = await runStream(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(chunks.length, 1, "exactly one graceful chunk");
      assertEqual(chunks[0], buildToolLoopCapMessage(maxSteps, 1));
      assert(chunks[0].length > 0, "chunk must be non-empty");
      assertEqual(result.finishReason, "tool-calls");
    });
  });

  await test("stream schema: final_result within budget -> unchanged (one JSON chunk, no finalization call)", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeStreamMock((i) =>
        i === 0
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD) },
      );
      const provider = await makeProvider(mock.client);
      const { chunks, result } = await runStream(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps: 5,
      });
      assertEqual(mock.calls.length, 2);
      assert(
        mock.calls.every((c) => c.tool_choice?.type !== "tool"),
        "no forced-finalization call on a clean finish",
      );
      assertEqual(chunks.length, 1);
      assertEqual(chunks[0], JSON.stringify(PAYLOAD));
      assertEqual(result.finishReason, "stop");
    });
  });

  // -------------------------------------------------------------------------
  // 11. Stream twin: non-schema backstop
  // -------------------------------------------------------------------------
  await test("stream non-schema: pure tool-loop to cap -> tool_choice:'none' backstop, ONE text chunk, finishReason 'stop'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeStreamMock((i) =>
        i < maxSteps
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: textResponse("SYNTHESIZED ANSWER", "end_turn") },
      );
      const provider = await makeProvider(mock.client);
      const { chunks, result } = await runStream(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps,
      });
      assertEqual(mock.calls.length, maxSteps + 1, "loop + 1 backstop call");
      assertEqual(mock.calls[maxSteps].tool_choice?.type, "none");
      assert(
        Array.isArray(mock.calls[maxSteps].tools) &&
          (mock.calls[maxSteps].tools as unknown[]).length > 0,
        "backstop must keep the tools param",
      );
      assertEqual(chunks.length, 1, "backstop text pushed as one chunk");
      assertEqual(chunks[0], "SYNTHESIZED ANSWER");
      assertEqual(result.finishReason, "stop");
    });
  });

  await test("stream non-schema: backstop fails -> ONE cap chunk, finishReason 'tool-calls'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeStreamMock((i) =>
        i < maxSteps
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { reject: new Error("backstop boom") },
      );
      const provider = await makeProvider(mock.client);
      const { chunks, result } = await runStream(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps,
      });
      assertEqual(chunks.length, 1);
      assertEqual(chunks[0], buildToolLoopCapMessage(maxSteps, maxSteps));
      assertEqual(result.finishReason, "tool-calls");
    });
  });

  // -------------------------------------------------------------------------
  // 12. Stream twin: abort -> graceful single chunk, no stream error
  // -------------------------------------------------------------------------
  await test("stream: abort mid-turn -> ONE cap chunk, stream closes without error, no finalization call", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 10;
      const controller = new AbortController();
      const mock = makeStreamMock((i) => {
        if (i === 0) {
          return { response: toolUseResponse("myTool", { q: "x" }) };
        }
        return {
          onCall: () => controller.abort(),
          reject: abortError(),
        };
      });
      const provider = await makeProvider(mock.client);
      const { chunks, result } = await runStream(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
        abortSignal: controller.signal,
      });
      assertEqual(mock.calls.length, 2, "calls stop on abort");
      assert(
        mock.calls.every((c) => c.tool_choice?.type !== "tool"),
        "no finalization call after abort",
      );
      assertEqual(chunks.length, 1, "exactly one graceful chunk on abort");
      assertEqual(chunks[0], buildAbortedTurnMessage(1));
      assertEqual(result.finishReason, "stop");
      assertEqual(
        result.metadata?.stopReason,
        "aborted",
        "metadata.stopReason must resolve to 'aborted' after drain",
      );
      assertEqual(result.stopReason, "aborted", "top-level getter too");
    });
  });

  // -------------------------------------------------------------------------
  // 13. Stream twin: nudge parity
  // -------------------------------------------------------------------------
  await test("stream schema: budget nudge appended to tool_result turns when steps-remaining <= 3", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 5; // agentic budget 4
      const mock = makeStreamMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD) },
      );
      const provider = await makeProvider(mock.client);
      await runStream(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
      });
      assertEqual(mock.calls.length, maxSteps);
      const nudges = nudgeTextsInLastUserTurn(mock.calls[1]);
      assertEqual(nudges.length, 1, "request 1 carries the first nudge");
      assertIncludes(nudges[0], "Only 3 tool step(s) remain");
    });
  });

  // -------------------------------------------------------------------------
  // 14. Review fixes: finishReason survives wrapper spreads via metadata
  // -------------------------------------------------------------------------
  await test("stream: metadata.finishReason survives a pre-drain result spread (wrapper-spread snapshot)", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeStreamMock(() => ({
        response: textResponse("plain answer", "end_turn"),
      }));
      const provider = await makeProvider(mock.client);
      const result = (await (
        provider as unknown as {
          executeNativeAnthropicStream(o: unknown): Promise<StreamResultShape>;
        }
      ).executeNativeAnthropicStream({
        input: { text: "hi" },
        maxSteps: 3,
      })) as StreamResultShape & { metadata?: { finishReason?: string } };
      // Simulate the pre-existing stream wrappers, which spread the result
      // BEFORE the background loop resolves.
      const dto = { ...result };
      for await (const _chunk of result.stream) {
        // drain
      }
      assertEqual(
        (dto as { metadata?: { finishReason?: string } }).metadata
          ?.finishReason,
        "stop",
        "metadata.finishReason must survive the spread (mutable reference)",
      );
      assertEqual(
        result.finishReason,
        "stop",
        "top-level getter resolves on the original result",
      );
    });
  });

  // -------------------------------------------------------------------------
  // 15. Review fixes: aborted-step completed tools still persisted
  // -------------------------------------------------------------------------
  await test("generate: tools that completed in an aborted step are still persisted to conversation memory", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const stored: Array<{ calls: unknown[]; results: unknown[] }> = [];
      const mock = makeGenerateMock(() => ({
        response: {
          content: [
            { type: "tool_use", id: "tu_ok", name: "okTool", input: {} },
            { type: "tool_use", id: "tu_ab", name: "abortTool", input: {} },
          ],
          usage: { input_tokens: 5, output_tokens: 3 },
          stop_reason: "tool_use",
        },
      }));
      const provider = await makeProvider(mock.client);
      (
        provider as unknown as {
          handleToolExecutionStorage: (
            calls: unknown[],
            results: unknown[],
          ) => Promise<void>;
        }
      ).handleToolExecutionStorage = async (calls, results) => {
        stored.push({ calls, results });
      };
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: {
          okTool: {
            description: "completes",
            parameters: { type: "object", properties: {} },
            execute: async () => ({ ok: true }),
          },
          abortTool: {
            description: "throws AbortError",
            parameters: { type: "object", properties: {} },
            execute: async () => {
              throw abortError("aborted mid-tool");
            },
          },
        },
        maxSteps: 6,
      });
      assertEqual(mock.calls.length, 1, "turn breaks after the aborted tool");
      assertEqual(stored.length, 1, "storage hook must still run");
      const storedJson = JSON.stringify(stored[0]);
      assertIncludes(storedJson, "okTool");
      assert(
        JSON.stringify(stored[0].results).includes("okTool"),
        "the completed tool's result must be persisted",
      );
      // Pairing: the aborted call's row must carry a neutral cancellation
      // result — an unpaired tool_use replayed next turn would 400.
      assertEqual(
        stored[0].calls.length,
        stored[0].results.length,
        "every persisted tool call must have a paired result",
      );
      const abortedResult = JSON.stringify(
        (stored[0].results as Array<{ toolName?: string }>).find(
          (r) => r.toolName === "abortTool",
        ),
      );
      assertIncludes(abortedResult, '"aborted":true');
      assert(
        !abortedResult.includes("Error executing tool"),
        "the aborted call must not be persisted as a tool failure",
      );
      assert(result.content.length > 0, "graceful content after abort");
    });
  });

  // -------------------------------------------------------------------------
  // 16. Review fixes: abort prefers already-produced prose (generate)
  // -------------------------------------------------------------------------
  await test("generate: abort mid-turn with prior prose -> prose returned, not the cap message", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const controller = new AbortController();
      const mock = makeGenerateMock((i) => {
        if (i === 0) {
          return {
            response: toolUseResponse("myTool", { q: "x" }, "partial analysis"),
          };
        }
        return { onCall: () => controller.abort(), reject: abortError() };
      });
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps: 10,
        abortSignal: controller.signal,
      });
      assertEqual(
        result.content,
        "partial analysis",
        "abort must not discard prose the model already produced",
      );
      assert(
        !result.content.includes("step limit"),
        "no fabricated step-limit claim when prose exists",
      );
    });
  });

  // -------------------------------------------------------------------------
  // 17. Review fixes: abort landing in the FINAL budgeted step's tool exec
  // -------------------------------------------------------------------------
  await test("generate schema: abort during last budgeted step's tool exec -> terminal re-check skips the finalization call", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const controller = new AbortController();
      const mock = makeGenerateMock(() => ({
        response: toolUseResponse("myTool", { q: "x" }),
      }));
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(async () => {
          // Tool ignores the signal but the caller aborts while it runs; it
          // still returns normally, so the loop exits by budget, not abort.
          controller.abort();
          return { ok: true };
        }),
        schema: SCHEMA,
        maxSteps: 2, // agentic budget 1 — this tool step is the last one
        abortSignal: controller.signal,
      });
      assertEqual(
        mock.calls.length,
        1,
        "no terminal finalization call after a late-landing abort",
      );
      assert(
        mock.calls.every((c) => c.tool_choice?.type !== "tool"),
        "tool_choice:'tool' must never be issued post-abort",
      );
      assertEqual(result.content, buildAbortedTurnMessage(1));
    });
  });

  await test("stream schema: abort during last budgeted step's tool exec -> no terminal call, one cap chunk", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const controller = new AbortController();
      const mock = makeStreamMock(() => ({
        response: toolUseResponse("myTool", { q: "x" }),
      }));
      const provider = await makeProvider(mock.client);
      const { chunks } = await runStream(provider, {
        input: { text: "give me the answer" },
        tools: makeTool(async () => {
          controller.abort();
          return { ok: true };
        }),
        schema: SCHEMA,
        maxSteps: 2,
        abortSignal: controller.signal,
      });
      assertEqual(mock.calls.length, 1, "no terminal model call post-abort");
      assertEqual(chunks.length, 1, "exactly one graceful chunk");
      assertEqual(chunks[0], buildAbortedTurnMessage(1));
    });
  });

  // -------------------------------------------------------------------------
  // 18. Review fixes: live deltas already delivered suppress the abort cap
  // -------------------------------------------------------------------------
  await test("stream: abort after live text deltas were delivered -> no contradictory cap chunk appended", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const controller = new AbortController();
      const mock = makeStreamMock((i) => {
        if (i === 0) {
          // Deltas reach the consumer live even though the response carries
          // only a tool_use block (aggregatedTurnText stays empty).
          return {
            textDeltas: ["partial answer already delivered"],
            response: toolUseResponse("myTool", { q: "x" }),
          };
        }
        return { onCall: () => controller.abort(), reject: abortError() };
      });
      const provider = await makeProvider(mock.client);
      const { chunks } = await runStream(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps: 10,
        abortSignal: controller.signal,
      });
      assertEqual(chunks.length, 1, "only the live delta reaches the consumer");
      assertEqual(chunks[0], "partial answer already delivered");
      assert(
        chunks.every((c) => !c.includes("step limit")),
        "no cap chunk after delivered prose",
      );
    });
  });

  // -------------------------------------------------------------------------
  // 19. Review fixes: stream absolute empty backstop
  // -------------------------------------------------------------------------
  await test("stream non-schema: clean text-exit with EMPTY content after tool steps -> one cap chunk, never zero chunks", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeStreamMock((i) =>
        i === 0
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: textResponse("", "end_turn") },
      );
      const provider = await makeProvider(mock.client);
      const { chunks } = await runStream(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps: 5,
      });
      assertEqual(
        chunks.length,
        1,
        "stream must never close empty on a turn that ran tools",
      );
      assert(chunks[0].length > 0, "backstop chunk must be non-empty");
    });
  });

  // -------------------------------------------------------------------------
  // 20. Review fixes: lifecycle wrapping preserves live result accessors
  // -------------------------------------------------------------------------
  await test("stream: wrapStreamResultWithLifecycle preserves finishReason/structuredOutput getters through its spread", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const maxSteps = 2;
      const mock = makeStreamMock((i) =>
        i < maxSteps - 1
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: finalResultResponse(PAYLOAD) },
      );
      const provider = await makeProvider(mock.client);
      const options = {
        input: { text: "give me the answer" },
        tools: makeTool(),
        schema: SCHEMA,
        maxSteps,
        // A lifecycle callback forces the wrapper to take its spread path.
        onFinish: async () => undefined,
      };
      const inner = provider as unknown as {
        executeNativeAnthropicStream(o: unknown): Promise<StreamResultShape>;
      } as {
        executeNativeAnthropicStream(o: unknown): Promise<StreamResultShape>;
        wrapStreamResultWithLifecycle?: unknown;
      };
      const result = await inner.executeNativeAnthropicStream(options);
      const wrapped = (
        provider as unknown as {
          wrapStreamResultWithLifecycle(
            o: unknown,
            r: StreamResultShape,
            t: number,
          ): StreamResultShape & { structuredOutput?: unknown };
        }
      ).wrapStreamResultWithLifecycle(options, result, Date.now());
      assert(
        wrapped !== result,
        "wrapper must have taken the spread path (onFinish present)",
      );
      for await (const _chunk of wrapped.stream) {
        // drain through the WRAPPED iterable
      }
      assertEqual(
        wrapped.finishReason,
        "stop",
        "finishReason getter must survive the lifecycle wrapper spread",
      );
      assertEqual(
        JSON.stringify(wrapped.structuredOutput),
        JSON.stringify(PAYLOAD),
        "structuredOutput getter must survive the lifecycle wrapper spread",
      );
    });
  });

  // -------------------------------------------------------------------------
  // 20. Turn time budget on the generate loop (no defensive default here)
  // -------------------------------------------------------------------------
  await test("generate: turnTimeoutMs exceeded mid tool -> honest time message + stopReason 'time-limit', no step-cap text", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeGenerateMock(() => ({
        response: toolUseResponse("myTool", { q: "x" }),
      }));
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(async () => {
          // Sleeps past the 120ms turn deadline (ignores the signal), so the
          // deadline fires mid-tool and the next loop-entry check breaks.
          await new Promise<void>((resolvePromise) => {
            const t = setTimeout(resolvePromise, 400);
            (t as { unref?: () => void }).unref?.();
          });
          return { ok: true };
        }),
        maxSteps: 10,
        turnTimeoutMs: 120,
      });
      assert(
        result.content.includes("processing time limit"),
        `expected the turn-timeout message, got: ${result.content}`,
      );
      assert(
        !result.content.includes("step limit"),
        "a timed-out turn must not claim a step limit was reached",
      );
      assertEqual(
        result.stopReason,
        "time-limit",
        "stopReason must be 'time-limit'",
      );
      assert(mock.calls.length < 10, "turn ends well before the step budget");
    });
  });

  await test("generate: toolTimeoutMs bounds a wedged tool -> error tool_result, turn continues and completes", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeGenerateMock((i) =>
        i === 0
          ? { response: toolUseResponse("myTool", { q: "x" }) }
          : { response: textResponse("done after tool timeout", "end_turn") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(async () => {
          await new Promise<void>((resolvePromise) => {
            const t = setTimeout(resolvePromise, 5_000);
            (t as { unref?: () => void }).unref?.();
          });
          return { ok: true };
        }),
        maxSteps: 5,
        toolTimeoutMs: 100,
      });
      assertEqual(
        result.content,
        "done after tool timeout",
        "turn must continue past the timed-out tool and complete",
      );
      assertEqual(result.stopReason, "completed");
      assert(
        JSON.stringify(result.toolExecutions ?? []).includes("timed out"),
        "the timed-out tool must surface as an error tool execution",
      );
      assertEqual(mock.calls.length, 2, "loop continued to the next step");
    });
  });

  // -------------------------------------------------------------------------
  // 21. Deadline fires MID-MODEL-CALL: the cancelled request must resolve the
  //     turn as 'time-limit' — never reject out of generate()/stream()
  //     (a rejection routes callers into abortSignal-less fallback retries:
  //     the doubled-runaway hazard).
  // -------------------------------------------------------------------------
  await test("generate: turn deadline mid-model-call -> resolves with stopReason 'time-limit', never rejects", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const calls: AnthropicRequestParams[] = [];
      // First call: normal tool_use step. Second call: hangs until the
      // request signal (the loop's internal fan-in) fires, then rejects
      // abort-shaped — the SDK cancelling an in-flight request.
      const client = {
        messages: {
          create: async (
            p: AnthropicRequestParams,
            opts?: { signal?: AbortSignal },
          ) => {
            const index = calls.length;
            calls.push(p);
            if (index === 0) {
              return toolUseResponse("myTool", { q: "x" });
            }
            const signal = opts?.signal;
            await new Promise<void>((resolvePromise) => {
              if (!signal || signal.aborted) {
                resolvePromise();
                return;
              }
              signal.addEventListener("abort", () => resolvePromise(), {
                once: true,
              });
            });
            throw abortError();
          },
        },
      };
      const provider = await makeProvider(client);
      const result = await runGenerate(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps: 10,
        turnTimeoutMs: 120,
      });
      assertEqual(
        result.stopReason,
        "time-limit",
        "internal deadline cancellation must attribute as time-limit, not 'aborted'",
      );
      assert(
        result.content.includes("processing time limit"),
        `expected the turn-timeout message, got: ${result.content}`,
      );
      assertEqual(calls.length, 2, "aborted during the 2nd model call");
    });
  });

  await test("stream: turn deadline mid-model-call -> resolves with stopReason 'time-limit', never rejects", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const calls: AnthropicRequestParams[] = [];
      // First call resolves a tool_use step; the second hangs until the
      // loop's abortHandler calls controller.abort() (deadline -> internal
      // abort -> active stream cancel), then rejects abort-shaped.
      const client = {
        messages: {
          stream: (p: AnthropicRequestParams) => {
            const index = calls.length;
            calls.push(p);
            if (index === 0) {
              const first: MockMessageStream = {
                on: () => first,
                controller: { abort: () => undefined },
                finalMessage: async () => toolUseResponse("myTool", { q: "x" }),
              };
              return first;
            }
            let onAbort: (() => void) | undefined;
            const hanging: MockMessageStream = {
              on: () => hanging,
              controller: {
                abort: () => onAbort?.(),
              },
              finalMessage: () =>
                new Promise<AnthropicResponse>((_resolve, reject) => {
                  onAbort = () => reject(abortError());
                }),
            };
            return hanging;
          },
        },
      };
      const provider = await makeProvider(client);
      const { chunks, result } = await runStream(provider, {
        input: { text: "run tools" },
        tools: makeTool(),
        maxSteps: 10,
        turnTimeoutMs: 120,
      });
      assertEqual(
        result.metadata?.stopReason,
        "time-limit",
        "internal deadline cancellation must attribute as time-limit, not 'aborted'",
      );
      assertEqual(chunks.length, 1, "exactly one honest terminal chunk");
      assert(
        chunks[0].includes("processing time limit"),
        `expected the turn-timeout message, got: ${chunks[0]}`,
      );
      assertEqual(calls.length, 2, "aborted during the 2nd model call");
    });
  });

  // -------------------------------------------------------------------------
  // Context guard: stop the tool loop before the model window overflows
  // (claude-sonnet-4-5 on vertex → 200K window, guard threshold 170K).
  // -------------------------------------------------------------------------
  await test("generate: context guard trips -> tools-disabled backstop synthesis, stopReason 'completed'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeGenerateMock((i) =>
        i === 0
          ? {
              response: {
                content: [
                  {
                    type: "tool_use",
                    id: "tu_big",
                    name: "myTool",
                    input: { q: "x" },
                  },
                ],
                // Reported prompt already past the 170K threshold — the loop
                // must stop BEFORE issuing another agentic step.
                usage: { input_tokens: 180_000, output_tokens: 3 },
                stop_reason: "tool_use",
              },
            }
          : { response: textResponse("synthesized from gathered results") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "research everything" },
        tools: makeTool(),
        maxSteps: 10,
      });
      assertEqual(
        mock.calls.length,
        2,
        "1 agentic step + 1 backstop synthesis — no further tool steps",
      );
      assertEqual(
        mock.calls[1].tool_choice?.type,
        "none",
        "backstop must disable tools",
      );
      assertEqual(result.content, "synthesized from gathered results");
      assertEqual(
        result.stopReason,
        "completed",
        "a synthesized answer counts as completed",
      );
      assertEqual(result.finishReason, "stop");
    });
  });

  await test("generate: context guard trips and backstop returns no text -> honest context-cap message, stopReason 'context-cap'", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const mock = makeGenerateMock((i) =>
        i === 0
          ? {
              response: {
                content: [
                  {
                    type: "tool_use",
                    id: "tu_big",
                    name: "myTool",
                    input: { q: "x" },
                  },
                ],
                usage: { input_tokens: 180_000, output_tokens: 3 },
                stop_reason: "tool_use",
              },
            }
          : { response: textResponse("") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "research everything" },
        tools: makeTool(),
        maxSteps: 10,
      });
      assertEqual(result.stopReason, "context-cap");
      assertEqual(
        result.finishReason,
        "stop",
        "context-cap must NOT masquerade as the step-cap 'tool-calls'",
      );
      assertIncludes(
        result.content,
        "context window",
        "honest context-cap message",
      );
      assert(
        !result.content.includes("step limit"),
        "context exits must never claim a step limit was reached",
      );
    });
  });

  // -------------------------------------------------------------------------
  // Consecutive-failure breaker (ported from the Gemini loops)
  // -------------------------------------------------------------------------
  await test("generate: a tool that throws twice is short-circuited on the 3rd call (TOOL_PERMANENTLY_FAILED)", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      let execCount = 0;
      const tools = makeTool(async () => {
        execCount++;
        throw new Error("boom");
      });
      const mock = makeGenerateMock((i) =>
        i < 3
          ? { response: toolUseResponse("myTool", { q: `try${i}` }) }
          : { response: textResponse("done without the tool") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "keep trying" },
        tools,
        maxSteps: 10,
      });
      assertEqual(
        execCount,
        2,
        "execution stops at DEFAULT_TOOL_MAX_RETRIES failures",
      );
      assertIncludes(
        JSON.stringify(mock.calls[3].messages),
        "TOOL_PERMANENTLY_FAILED",
        "the 3rd attempt returns a permanent-failure tool_result to the model",
      );
      assertEqual(result.content, "done without the tool");
      assertEqual(result.stopReason, "completed");
    });
  });

  await test("generate: error-shaped RESULTS (MCP isError) count toward the breaker — proxy-blocked tools stop being retried", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      let execCount = 0;
      const tools = makeTool(async () => {
        execCount++;
        // MCP tools report failure by RETURNING isError, not throwing —
        // the shape curator's mcp-proxy uses for blocked tools.
        return {
          isError: true,
          content: [{ type: "text", text: "Tool blocked by proxy" }],
        };
      });
      const mock = makeGenerateMock((i) =>
        i < 3
          ? { response: toolUseResponse("myTool", { q: `try${i}` }) }
          : { response: textResponse("done without the tool") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "keep trying" },
        tools,
        maxSteps: 10,
      });
      assertEqual(
        execCount,
        2,
        "error-shaped results must trip the breaker without a single throw",
      );
      assertIncludes(
        JSON.stringify(mock.calls[3].messages),
        "TOOL_PERMANENTLY_FAILED",
        "the 3rd attempt returns a permanent-failure tool_result to the model",
      );
      assertEqual(result.content, "done without the tool");
    });
  });

  await test("generate: the breaker is genuinely CONSECUTIVE — a success between failures resets the strike count", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      let execCount = 0;
      // Alternates: fail, succeed, fail, succeed — the strike count resets on
      // every success, so the tool must NEVER be short-circuited.
      const tools = makeTool(async () => {
        execCount++;
        if (execCount % 2 === 1) {
          return {
            isError: true,
            content: [{ type: "text", text: `not found #${execCount}` }],
          };
        }
        return { ok: true };
      });
      const mock = makeGenerateMock((i) =>
        i < 4
          ? { response: toolUseResponse("myTool", { q: `try${i}` }) }
          : { response: textResponse("all four attempts executed") },
      );
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "alternating outcomes" },
        tools,
        maxSteps: 10,
      });
      assertEqual(
        execCount,
        4,
        "interleaved successes must reset the breaker — no short-circuit",
      );
      assert(
        !JSON.stringify(mock.calls.map((c) => c.messages)).includes(
          "TOOL_PERMANENTLY_FAILED",
        ),
        "no permanent-failure result may appear when failures never run consecutively",
      );
      assertEqual(result.content, "all four attempts executed");
    });
  });

  // -------------------------------------------------------------------------
  // Per-tool abort check: a multi-tool step must stop executing its batch
  // the moment the turn is aborted (deadline overshoot fix).
  // -------------------------------------------------------------------------
  await test("generate: abort between tool executions skips the remaining batch (stopReason 'aborted')", async () => {
    await withTemporaryEnv(VERTEX_ENV, async () => {
      const controller = new AbortController();
      let execCount = 0;
      const tools = makeTool(async () => {
        execCount++;
        // The turn is aborted while the FIRST tool of the batch runs; the
        // second tool_use in the same step must never execute.
        controller.abort();
        return { ok: true };
      });
      const mock = makeGenerateMock(() => ({
        response: {
          content: [
            { type: "tool_use", id: "tu_a", name: "myTool", input: { q: "a" } },
            { type: "tool_use", id: "tu_b", name: "myTool", input: { q: "b" } },
          ],
          usage: { input_tokens: 5, output_tokens: 3 },
          stop_reason: "tool_use",
        },
      }));
      const provider = await makeProvider(mock.client);
      const result = await runGenerate(provider, {
        input: { text: "run both tools" },
        tools,
        maxSteps: 5,
        abortSignal: controller.signal,
      });
      assertEqual(execCount, 1, "second tool in the batch must be skipped");
      assertEqual(mock.calls.length, 1, "no further model calls after abort");
      assertEqual(result.stopReason, "aborted");
      assertIncludes(result.content, "stopped before I could finish");
    });
  });
}

await runSuite(main);

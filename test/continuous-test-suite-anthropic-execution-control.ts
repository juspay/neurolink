#!/usr/bin/env tsx
import "./helpers/credentialFreeEnv.js";
import "./helpers/emptyWorkingDirectory.js";
import "dotenv/config";

/**
 * Continuous Test Suite — the opt-in `executionControl` contract on the direct
 * Anthropic stream path.
 *
 * `executionControl` exists because the two knobs that already bound a turn
 * cannot express "run as long as real progress continues". `timeout` and
 * `turnTimeoutMs` are both fixed ceilings, and a caller who wants no ceiling
 * has, until now, had to fake one with an enormous number — which is a lie
 * that eventually fires. The contract here is narrow and additive:
 *
 *  - `requestTimeoutMs` (required, finite, positive) bounds ONE HTTP request.
 *    A stalled upstream is always caught, whatever the turn-level policy is.
 *  - `lifetimeTimeoutMs` says what the TURN's ceiling is: `null` means there
 *    is no lifetime timer at all, a finite positive number is an explicit cap,
 *    zero is invalid, and absent inherits the legacy handling untouched.
 *  - `beforeStep` runs at the safe step boundary — after that step's tool
 *    results have settled, before the step cap is re-checked — and may renew a
 *    finite `maxSteps` and append a planning nudge into the SAME loop and the
 *    SAME history.
 *
 * Absent, none of it applies and the turn behaves byte-for-byte as before.
 *
 * Everything drives the shipped surface: `new NeuroLink().stream()` from
 * `../dist/index.js`, answered by a local server speaking genuine SSE framing,
 * so the real Anthropic SDK's own event parsing and abort handling run.
 *
 * ONE Rule 15 exception, and this file is on the rule's allow list for it:
 * `resolveToolTimeoutMs`, imported from the built `../dist/core/constants.js`.
 * It is a pure translation table — absent, a number, or an explicit `null`
 * mapped onto a bound or no bound — and two of those three cannot be told
 * apart from outside. "No bound" and "the 300_000ms default" differ only for a
 * tool that runs longer than 300s, and a case here has 60s, so no live
 * `stream()` call can distinguish an honoured opt-out from one that silently
 * collapsed back to the default. That collapse is precisely the regression the
 * opt-out exists to prevent, so leaving it unpinned would ship the central
 * claim of the compatibility fix untested. Everything else in this file drives
 * `new NeuroLink().stream()`, and nothing here imports from `src/` except
 * types.
 *
 * On clocks: the durations here are real and small (hundreds of ms), not faked.
 * The SDK's abort path runs through undici's fetch and the Anthropic SDK's
 * stream reader, neither of which can be driven by a fake timer without also
 * faking the socket — which would stop testing the thing that broke. The
 * "no lifetime ceiling" case therefore proves that the turn outlives a legacy
 * timeout that WOULD have killed it and keeps renewing, not that it runs for
 * six hours; the mechanism is the same at either scale, and the ceiling being
 * absent is what the assertion pins.
 *
 * Run: node --import tsx test/continuous-test-suite-anthropic-execution-control.ts
 *      pnpm run test:anthropic-execution-control
 */

import { createServer, type Server, type ServerResponse } from "node:http";
import { jsonSchema, type ExecutionControlOptions } from "../dist/index.js";
// Rule 15 exception — see the header. This is the one function whose contract
// no live call can observe.
import {
  DEFAULT_TOOL_EXECUTION_TIMEOUT_MS,
  resolveToolTimeoutMs,
} from "../dist/core/constants.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { Tool } from "../src/lib/types/index.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "Anthropic execution control",
  // Nothing here leaves the machine, so a test that never finishes can only be
  // a defect in this package — a timeout must fail, not skip.
  { offline: true, perTestTimeoutMs: 60_000 },
);

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "claude-3-5-sonnet-20241022";

const TOUCHED_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
] as const;

function withAnthropicEnv(port: number): () => void {
  const saved: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    saved[key] = process.env[key];
  }
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${port}/v1`;
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
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

/** A complete turn that emits text and stops. */
function textTurn(text: string): string[] {
  return [
    sse("message_start", {
      message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
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

/** A complete turn that asks for one tool call. */
function toolTurn(name: string, id: string): string[] {
  return [
    sse("message_start", {
      message: { id, usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    sse("content_block_start", {
      index: 0,
      content_block: { type: "tool_use", id: `${id}_use`, name, input: {} },
    }),
    sse("content_block_delta", {
      index: 0,
      delta: { type: "input_json_delta", partial_json: "{}" },
    }),
    sse("content_block_stop", { index: 0 }),
    sse("message_delta", {
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 6 },
    }),
    sse("message_stop", {}),
  ];
}

/**
 * A turn cut off before its terminal events: the tool block is complete on the
 * wire, but neither `message_delta` nor `message_stop` ever arrives and the
 * response simply ends. This is what a dropped connection looks like to the
 * SDK, and it is indistinguishable from a finished turn unless someone checks.
 */
function truncatedToolTurn(name: string, id: string): string[] {
  return [
    sse("message_start", {
      message: { id, usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    sse("content_block_start", {
      index: 0,
      content_block: { type: "tool_use", id: `${id}_use`, name, input: {} },
    }),
    sse("content_block_delta", {
      index: 0,
      delta: { type: "input_json_delta", partial_json: "{}" },
    }),
    sse("content_block_stop", { index: 0 }),
  ];
}

/**
 * A turn that asks for a tool but reports `end_turn` rather than `tool_use`.
 *
 * Unusual on the wire, and deliberately so: it is the one shape that separates
 * the two readings of `hadToolCallsAtCap`. `mapFinishReason` short-circuits on
 * `tool_use` — that raw reason maps to "tool-calls" whether or not the turn
 * ran out of steps — so a turn that stops on `tool_use` cannot show whether
 * the engine still knows it was capped. With `end_turn` the flag is the only
 * input left, and a turn that ran out of steps mid-tool-call reports
 * "tool-calls" while one that did not reports "stop".
 */
function toolTurnReportingEndTurn(name: string, id: string): string[] {
  return [
    sse("message_start", {
      message: { id, usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    sse("content_block_start", {
      index: 0,
      content_block: { type: "tool_use", id: `${id}_use`, name, input: {} },
    }),
    sse("content_block_delta", {
      index: 0,
      delta: { type: "input_json_delta", partial_json: "{}" },
    }),
    sse("content_block_stop", { index: 0 }),
    sse("message_delta", {
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 6 },
    }),
    sse("message_stop", {}),
  ];
}

type StandInCall = { body: Record<string, unknown> };

type Reply = {
  frames: string[];
  /** false → write the frames and HOLD the connection open forever. */
  end?: boolean;
  /** Delay before the frames are written, to model a slow upstream. */
  delayMs?: number;
};

type StandIn = {
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

async function startStandIn(
  reply: (callIndex: number) => Reply,
): Promise<StandIn> {
  const calls: StandInCall[] = [];
  const held = new Set<ServerResponse>();
  const timers = new Set<NodeJS.Timeout>();
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
      const turn = reply(calls.length - 1);
      const write = () => {
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const frame of turn.frames) {
          res.write(frame);
        }
        if (turn.end === false) {
          held.add(res);
          res.on("close", () => held.delete(res));
          return;
        }
        res.end();
      };
      if (turn.delayMs) {
        const timer = setTimeout(() => {
          timers.delete(timer);
          write();
        }, turn.delayMs);
        timers.add(timer);
        return;
      }
      write();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        for (const timer of timers) {
          clearTimeout(timer);
        }
        timers.clear();
        for (const res of held) {
          res.destroy();
        }
        held.clear();
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

function countingTool(counter: { calls: number }): Record<string, Tool> {
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
        return { found: true, at: counter.calls };
      },
    },
  };
}

/**
 * A tool that never returns AND never looks at its abort signal — the shape
 * every turn-level timer is blind to. Between two steps the request deadline
 * has been disposed and the next one is not armed yet, so nothing but a
 * per-tool bound can end this.
 */
function wedgedTool(counter: { calls: number }): Record<string, Tool> {
  return {
    lookup: {
      description: "look a value up",
      inputSchema: jsonSchema({
        type: "object",
        properties: {},
        additionalProperties: true,
      }),
      execute: () => {
        counter.calls++;
        return new Promise<never>(() => {});
      },
    },
  };
}

type ToolSignalReport = {
  entered: number;
  aborted: boolean;
  abortedAfterMs: number | undefined;
  reasonSaidTimedOut: boolean;
};

/**
 * A slow tool that watches the signal it was handed and records what happened
 * to it.
 *
 * This is what separates cancelling a tool from abandoning one. A deadline that
 * only stops the loop waiting leaves the call running: the model is told the
 * tool failed while it is still working, still holding whatever it holds, and
 * — if it writes anything — still writing. The signal is the only channel the
 * engine has for saying "stop", so a test that does not read it cannot tell the
 * two apart.
 */
function signalWatchingTool(
  report: ToolSignalReport,
  runsForMs = 5_000,
): Record<string, Tool> {
  return {
    lookup: {
      description: "look a value up, slowly",
      inputSchema: jsonSchema({
        type: "object",
        properties: {},
        additionalProperties: true,
      }),
      execute: async (_args: Record<string, unknown>, opts: unknown) => {
        report.entered++;
        const signal = (opts as { abortSignal?: AbortSignal }).abortSignal;
        const startedAt = Date.now();
        const note = () => {
          report.aborted = true;
          report.abortedAfterMs = Date.now() - startedAt;
          const reason: unknown = signal?.reason;
          report.reasonSaidTimedOut =
            reason instanceof Error && reason.message.includes("timed out");
        };
        await new Promise<void>((resolve) => {
          const finish = setTimeout(resolve, runsForMs);
          if (!signal) {
            return;
          }
          if (signal.aborted) {
            note();
            clearTimeout(finish);
            resolve();
            return;
          }
          signal.addEventListener(
            "abort",
            () => {
              note();
              clearTimeout(finish);
              resolve();
            },
            { once: true },
          );
        });
        return { done: true };
      },
    },
  };
}

/** Drain a stream, returning what the consumer saw and what it threw. */
async function drain(
  stream: AsyncIterable<unknown>,
): Promise<{ text: string; error?: Error }> {
  let text = "";
  try {
    for await (const chunk of stream) {
      if (
        chunk &&
        typeof chunk === "object" &&
        "content" in chunk &&
        typeof (chunk as { content?: unknown }).content === "string"
      ) {
        text += (chunk as { content: string }).content;
      }
    }
    return { text };
  } catch (error) {
    return {
      text,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/** Every request body this turn sent, as one searchable string. */
function bodiesOf(server: StandIn): string {
  return JSON.stringify(server.calls.map((c) => c.body));
}

// ---------------------------------------------------------------------------

section("the opt-in is genuinely opt-in");

await test("a turn with no executionControl behaves exactly as it did before", async () => {
  const server = await startStandIn((i) =>
    i === 0
      ? { frames: toolTurn("lookup", "msg_1") }
      : { frames: textTurn("done") },
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  let stopReason: unknown;
  let finishReason: unknown;
  let text: string | undefined;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: countingTool(counter),
    });
    ({ text } = await drain(result.stream));
    stopReason = result.metadata?.stopReason;
    finishReason = result.metadata?.finishReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] no control: calls=${server.calls.length} toolExecs=${counter.calls} stopReason=${String(stopReason)} finishReason=${String(finishReason)}`,
  );
  assert(text?.includes("done") === true, "the turn's text was not surfaced");
  assert(
    server.calls.length === 2 && counter.calls === 1,
    `a plain tool round trip should be 2 calls / 1 execution, was ${server.calls.length} / ${counter.calls}`,
  );
  assert(
    finishReason === "stop" && stopReason === undefined,
    `an untouched turn must still report a plain stop, reported ${String(finishReason)} / ${String(stopReason)}`,
  );
});

section("validation of the control itself");

await test("requestTimeoutMs must be present, finite and positive", async () => {
  const server = await startStandIn(() => ({
    frames: textTurn("never asked"),
  }));
  const restore = withAnthropicEnv(server.port);
  // Structural outcomes, not raw strings. The harness downgrades a failed case
  // to SKIP when the thrown message matches `isExpectedProviderError()`, so an
  // assertion message that interpolates an uncontrolled provider error can
  // turn a genuine regression into a green run. Labels and counts are ours;
  // the provider's own words go to `console.log` and stay out of `assert`.
  const outcomes: Array<{
    label: string;
    rejected: boolean;
    namedField: boolean;
    detail: string;
  }> = [];
  const cases: Array<[string, Record<string, unknown>]> = [
    ["missing", { lifetimeTimeoutMs: null }],
    ["zero", { requestTimeoutMs: 0 }],
    ["negative", { requestTimeoutMs: -1 }],
    ["infinite", { requestTimeoutMs: Number.POSITIVE_INFINITY }],
  ];
  try {
    const nl = new NeuroLink();
    for (const [label, control] of cases) {
      try {
        const result = await nl.stream({
          input: { text: "hi" },
          provider: "anthropic",
          disableInternalFallback: true,
          model: MODEL,
          maxTokens: 32,
          // The only cast in this file, and it is on the VALUE, not on the
          // options object: these shapes are invalid on purpose, and the point
          // of the case is that the runtime rejects them. Everything else here
          // — `executionControl` being a real key of the shipped StreamOptions
          // included — is still checked by the compiler.
          executionControl: control as ExecutionControlOptions,
        });
        await drain(result.stream);
        outcomes.push({
          label,
          rejected: false,
          namedField: false,
          detail: "ACCEPTED",
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        outcomes.push({
          label,
          rejected: true,
          namedField: detail.includes("requestTimeoutMs"),
          detail,
        });
      }
    }
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] requestTimeoutMs cases: ${outcomes
      .map((o) => `${o.label}:${o.detail}`)
      .join(" | ")}`,
  );
  const accepted = outcomes.filter((o) => !o.rejected).map((o) => o.label);
  assert(
    accepted.length === 0,
    `every invalid requestTimeoutMs must be rejected; accepted: ${accepted.join(", ") || "(none)"}`,
  );
  const unnamed = outcomes
    .filter((o) => o.rejected && !o.namedField)
    .map((o) => o.label);
  assert(
    unnamed.length === 0,
    `each rejection must name the field it rejected; did not: ${unnamed.join(", ") || "(none)"} — see the diagnostic line above for the text`,
  );
  assert(
    server.calls.length === 0,
    `an invalid control must be rejected before any request goes out, ${server.calls.length} went out`,
  );
});

await test("lifetimeTimeoutMs zero is rejected, and null is not", async () => {
  const server = await startStandIn(() => ({ frames: textTurn("ok") }));
  const restore = withAnthropicEnv(server.port);
  let zeroRejection = "";
  let zeroNamedField = false;
  let nullAccepted: boolean | undefined;
  try {
    const nl = new NeuroLink();
    try {
      const result = await nl.stream({
        input: { text: "hi" },
        provider: "anthropic",
        disableInternalFallback: true,
        model: MODEL,
        maxTokens: 32,
        executionControl: { requestTimeoutMs: 5_000, lifetimeTimeoutMs: 0 },
      });
      await drain(result.stream);
    } catch (error) {
      zeroRejection = error instanceof Error ? error.message : String(error);
      zeroNamedField = zeroRejection.includes("lifetimeTimeoutMs");
    }
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      executionControl: { requestTimeoutMs: 5_000, lifetimeTimeoutMs: null },
    });
    const drained = await drain(result.stream);
    nullAccepted = drained.text.includes("ok");
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] lifetime zero rejection: ${zeroRejection || "(none)"} ; null accepted: ${nullAccepted}`,
  );
  assert(
    zeroNamedField,
    `lifetimeTimeoutMs: 0 must be rejected by name; rejected=${zeroRejection.length > 0} — see the diagnostic line above for the text`,
  );
  assert(
    nullAccepted === true,
    "lifetimeTimeoutMs: null must be accepted and run the turn normally",
  );
});

await test("a provider without native executionControl support rejects it outright", async () => {
  // Silently ignoring the control is the failure mode this rules out: a caller
  // that asked for no lifetime ceiling would get one anyway, and only find out
  // when a long turn died at a limit it thought it had removed.
  const server = await startStandIn(() => ({
    frames: textTurn("unreachable"),
  }));
  const restore = withAnthropicEnv(server.port);
  let message: string | undefined;
  let namedControl = false;
  try {
    const nl = new NeuroLink();
    try {
      const result = await nl.stream({
        input: { text: "hi" },
        provider: "openai",
        model: "gpt-4o-mini",
        disableInternalFallback: true,
        maxTokens: 32,
        executionControl: { requestTimeoutMs: 5_000, lifetimeTimeoutMs: null },
      });
      await drain(result.stream);
      message = "ACCEPTED";
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
      namedControl = message.includes("executionControl");
    }
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] unsupported provider: ${(message ?? "").slice(0, 220)}`,
  );
  assert(
    message !== "ACCEPTED",
    "an unsupported provider silently accepted the control",
  );
  assert(
    namedControl,
    "the rejection must name executionControl — see the diagnostic line above for what it said instead",
  );
});

await test("turnTimeoutMs alongside an explicit lifetimeTimeoutMs is rejected, not dropped", async () => {
  // Both name the turn's wall-clock ceiling and executionControl wins, so the
  // turnTimeoutMs used to be read by nothing at all — the caller's stated
  // ceiling discarded in silence, which is the defect class this whole
  // contract exists to remove. The second half of the case pins the boundary:
  // with lifetimeTimeoutMs ABSENT there is nothing to discard, the documented
  // "inherit the legacy handling" case still applies, and the turn runs.
  const server = await startStandIn(() => ({ frames: textTurn("ok") }));
  const restore = withAnthropicEnv(server.port);
  let combinedRejection = "";
  let namedBothCeilings = false;
  let callsAfterRejection: number | undefined;
  let inheritedAccepted: boolean | undefined;
  try {
    const nl = new NeuroLink();
    try {
      const result = await nl.stream({
        input: { text: "hi" },
        provider: "anthropic",
        disableInternalFallback: true,
        model: MODEL,
        maxTokens: 32,
        turnTimeoutMs: 5_000,
        executionControl: { requestTimeoutMs: 5_000, lifetimeTimeoutMs: null },
      });
      await drain(result.stream);
    } catch (error) {
      combinedRejection =
        error instanceof Error ? error.message : String(error);
      namedBothCeilings =
        combinedRejection.includes("turnTimeoutMs") &&
        combinedRejection.includes("lifetimeTimeoutMs");
    }
    callsAfterRejection = server.calls.length;

    const result = await nl.stream({
      input: { text: "hi" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      turnTimeoutMs: 5_000,
      executionControl: { requestTimeoutMs: 5_000 },
    });
    inheritedAccepted = (await drain(result.stream)).text.includes("ok");
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] combined: rejection="${combinedRejection.slice(0, 120)}" callsBeforeReject=${callsAfterRejection} inheritedAccepted=${String(inheritedAccepted)}`,
  );
  assert(
    combinedRejection.length > 0,
    "turnTimeoutMs combined with an explicit lifetimeTimeoutMs must be rejected, it was accepted",
  );
  assert(
    namedBothCeilings,
    "the rejection must name both ceilings — see the diagnostic line above for what it said instead",
  );
  assert(
    callsAfterRejection === 0,
    `the combination must be rejected before any request goes out, ${callsAfterRejection} went out`,
  );
  assert(
    inheritedAccepted === true,
    "an executionControl without lifetimeTimeoutMs must still inherit turnTimeoutMs and run",
  );
});

section("lifetime policy");

await test("a finite lifetimeTimeoutMs still caps the turn", async () => {
  const server = await startStandIn(() => ({
    frames: [
      sse("message_start", {
        message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
      }),
      sse("content_block_start", {
        index: 0,
        content_block: { type: "text", text: "" },
      }),
      sse("content_block_delta", {
        index: 0,
        delta: { type: "text_delta", text: "thinking" },
      }),
    ],
    end: false,
  }));
  const restore = withAnthropicEnv(server.port);
  // Timed from AFTER stream() returns. Constructing a NeuroLink and resolving
  // its tool catalogue costs seconds on this machine, and folding that into
  // the measurement would let a 3s ceiling pass an assertion meant to pin a
  // 250ms one.
  let elapsed: number | undefined;
  let stopReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "take your time" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      executionControl: { requestTimeoutMs: 30_000, lifetimeTimeoutMs: 250 },
    });
    const startedAt = Date.now();
    await drain(result.stream);
    elapsed = Date.now() - startedAt;
    stopReason = result.metadata?.stopReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] finite lifetime: stopReason=${String(stopReason)} elapsed=${elapsed}ms`,
  );
  assert(
    stopReason === "time-limit",
    `an explicit lifetime cap must report "time-limit", reported ${String(stopReason)}`,
  );
  assert(
    elapsed !== undefined && elapsed < 2_500,
    `a 250ms lifetime cap must end the turn promptly, the drain took ${elapsed}ms`,
  );
});

await test("lifetimeTimeoutMs null outlives the legacy timeout and renews across many steps", async () => {
  // `timeout: 150` is the legacy knob that WOULD have armed the whole-stream
  // timer. With an explicit null lifetime there is no lifetime timer at all,
  // so the turn is bounded only by its per-request deadline and its step cap —
  // and the step cap is what `beforeStep` renews. Each upstream turn takes
  // 120ms, so surviving four of them is already well past the legacy ceiling.
  const RENEWAL_LIMIT = 3;
  let renewals = 0;
  const server = await startStandIn((i) => ({
    frames: toolTurn("lookup", `msg_${i}`),
    delayMs: 120,
  }));
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  const startedAt = Date.now();
  let stopReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep working" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 1,
      disableTools: false,
      tools: countingTool(counter),
      timeout: 150,
      executionControl: {
        requestTimeoutMs: 10_000,
        lifetimeTimeoutMs: null,
        beforeStep: ({ maxSteps }) => {
          if (renewals >= RENEWAL_LIMIT) {
            return undefined;
          }
          renewals++;
          return { maxSteps: maxSteps + 1 };
        },
      },
    });
    await drain(result.stream);
    stopReason = result.metadata?.stopReason;
  } finally {
    restore();
    await server.close();
  }
  const elapsed = Date.now() - startedAt;
  console.log(
    `    [diagnostic] null lifetime: calls=${server.calls.length} renewals=${renewals} toolExecs=${counter.calls} elapsed=${elapsed}ms stopReason=${String(stopReason)}`,
  );
  assert(
    renewals === RENEWAL_LIMIT,
    `every renewal offered must have been taken, took ${renewals} of ${RENEWAL_LIMIT}`,
  );
  assert(
    server.calls.length === 1 + RENEWAL_LIMIT,
    `a maxSteps of 1 renewed ${RENEWAL_LIMIT} times should make ${1 + RENEWAL_LIMIT} calls, made ${server.calls.length}`,
  );
  assert(
    elapsed > 150,
    `the turn must outlive the legacy ${150}ms timeout, ran only ${elapsed}ms`,
  );
  assert(
    stopReason !== "time-limit",
    "a turn with no lifetime ceiling must never report a time limit",
  );
});

await test("an explicit lifetimeTimeoutMs of undefined inherits the ceiling, it does not remove it", async () => {
  // `{ lifetimeTimeoutMs: undefined }` is what programmatic construction
  // produces — an optional field spread, a JSON round trip, a config object
  // assembled key by key — and TypeScript cannot warn about it, because the
  // field is `?: number | null`. Read with `in`, that shape said "no lifetime
  // timer at all" and silently removed the caller's ceiling; the documented
  // contract is that an absent value means "no opinion" and inherits
  // turnTimeoutMs. The stand-in holds its response open forever, so the only
  // thing that can end this turn is the ceiling being armed.
  const server = await startStandIn(() => ({
    frames: [
      sse("message_start", {
        message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
      }),
      sse("content_block_start", {
        index: 0,
        content_block: { type: "text", text: "" },
      }),
      sse("content_block_delta", {
        index: 0,
        delta: { type: "text_delta", text: "thinking" },
      }),
    ],
    end: false,
  }));
  const restore = withAnthropicEnv(server.port);
  const control: ExecutionControlOptions = {
    requestTimeoutMs: 30_000,
    // Present, holding undefined — the case `in` got wrong.
    lifetimeTimeoutMs: undefined,
  };
  let elapsed: number | undefined;
  let stopReason: unknown;
  let finishReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "take your time" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      turnTimeoutMs: 250,
      executionControl: control,
    });
    const startedAt = Date.now();
    await drain(result.stream);
    elapsed = Date.now() - startedAt;
    stopReason = result.metadata?.stopReason;
    finishReason = result.metadata?.finishReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] explicit undefined lifetime: stopReason=${String(stopReason)} finishReason=${String(finishReason)} elapsed=${elapsed}ms`,
  );
  assert(
    stopReason === "time-limit",
    `an explicit undefined lifetime must inherit turnTimeoutMs and report "time-limit", reported ${String(stopReason)}`,
  );
  assert(
    elapsed !== undefined && elapsed < 2_500,
    `the inherited 250ms ceiling must end the turn promptly, the drain took ${elapsed}ms`,
  );
});

section("the step boundary");

await test("beforeStep renews maxSteps and its nudge lands in the same history", async () => {
  const server = await startStandIn((i) =>
    i < 2
      ? { frames: toolTurn("lookup", `msg_${i}`) }
      : { frames: textTurn("wrapped up") },
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  const boundaries: Array<{ stepsCompleted: number; maxSteps: number }> = [];
  let text: string | undefined;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep working" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 1,
      disableTools: false,
      tools: countingTool(counter),
      executionControl: {
        requestTimeoutMs: 10_000,
        lifetimeTimeoutMs: null,
        beforeStep: (context) => {
          boundaries.push({
            stepsCompleted: context.stepsCompleted,
            maxSteps: context.maxSteps,
          });
          return {
            maxSteps: context.maxSteps + 1,
            nudge: "BUDGET-NUDGE: two steps left, start converging.",
          };
        },
      },
    });
    ({ text } = await drain(result.stream));
  } finally {
    restore();
    await server.close();
  }
  const bodies = bodiesOf(server);
  console.log(
    `    [diagnostic] renewal: calls=${server.calls.length} boundaries=${JSON.stringify(boundaries)} nudgeInHistory=${bodies.includes("BUDGET-NUDGE")}`,
  );
  assert(
    server.calls.length === 3,
    `two renewals from maxSteps 1 should reach 3 calls, reached ${server.calls.length}`,
  );
  assert(
    text?.includes("wrapped up") === true,
    "the renewed turn's final text was lost",
  );
  assert(
    boundaries.length >= 2 && boundaries[0]?.stepsCompleted === 1,
    `the boundary must report settled steps, saw ${JSON.stringify(boundaries)}`,
  );
  assert(
    bodies.includes("BUDGET-NUDGE"),
    "the planning nudge never reached the conversation sent back to the model",
  );
});

await test("a renewal does not re-run the tools of the step that already settled", async () => {
  // The renewal raises a cap; it must never replay a step. A tool that ran
  // once before the boundary must still have run exactly once after it.
  const server = await startStandIn((i) =>
    i < 3
      ? { frames: toolTurn("lookup", `msg_${i}`) }
      : { frames: textTurn("done") },
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  let renewals = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep working" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 1,
      disableTools: false,
      tools: countingTool(counter),
      executionControl: {
        requestTimeoutMs: 10_000,
        lifetimeTimeoutMs: null,
        beforeStep: ({ maxSteps }) => {
          renewals++;
          return { maxSteps: maxSteps + 1 };
        },
      },
    });
    await drain(result.stream);
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] no replay: calls=${server.calls.length} toolExecs=${counter.calls} renewals=${renewals}`,
  );
  assert(
    server.calls.length === 4,
    `three tool turns then a text turn is 4 calls, made ${server.calls.length}`,
  );
  assert(
    counter.calls === 3,
    `three tool turns must run the tool exactly three times, ran it ${counter.calls}`,
  );
});

await test("maxSteps still caps the turn when no beforeStep is supplied", async () => {
  const server = await startStandIn((i) => ({
    frames: toolTurn("lookup", `msg_${i}`),
  }));
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  let stopReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 2,
      disableTools: false,
      tools: countingTool(counter),
      executionControl: { requestTimeoutMs: 10_000, lifetimeTimeoutMs: null },
    });
    await drain(result.stream);
    stopReason = result.metadata?.stopReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] cap with no callback: calls=${server.calls.length} stopReason=${String(stopReason)}`,
  );
  assert(
    server.calls.length === 2,
    `maxSteps 2 must still bound the turn at 2 calls, made ${server.calls.length}`,
  );
  assert(
    stopReason === "step-cap",
    `the capped turn must report "step-cap", reported ${String(stopReason)}`,
  );
});

await test("a beforeStep that declines to renew leaves the turn a step-limit outcome", async () => {
  const server = await startStandIn((i) => ({
    frames: toolTurn("lookup", `msg_${i}`),
  }));
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  let consulted = 0;
  let stopReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 2,
      disableTools: false,
      tools: countingTool(counter),
      executionControl: {
        requestTimeoutMs: 10_000,
        lifetimeTimeoutMs: null,
        beforeStep: () => {
          consulted++;
          return undefined;
        },
      },
    });
    await drain(result.stream);
    stopReason = result.metadata?.stopReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] denial: calls=${server.calls.length} consulted=${consulted} stopReason=${String(stopReason)}`,
  );
  assert(consulted > 0, "the boundary callback was never consulted");
  assert(
    server.calls.length === 2,
    `a declined renewal must leave the original cap, made ${server.calls.length} calls`,
  );
  assert(
    stopReason === "step-cap",
    `a declined renewal must stay a step-limit outcome, reported ${String(stopReason)}`,
  );
});

await test("a fractional renewal is not a renewal, and does not un-cap the turn", async () => {
  // `stepCap + 0.5` floors back to the cap already in force, so it renews
  // nothing. Compared before flooring it still passed the "strictly larger"
  // guard, left the cap exactly where it was, and cleared the engine's record
  // that the turn had run out of steps mid-tool-call — after which a capped
  // turn reports itself as one the model ended, and loses the last-step-text
  // fallback that record gates.
  const server = await startStandIn((i) => ({
    frames: toolTurnReportingEndTurn("lookup", `msg_${i}`),
  }));
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  let renewalsOffered = 0;
  let stopReason: unknown;
  let finishReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 1,
      disableTools: false,
      tools: countingTool(counter),
      executionControl: {
        requestTimeoutMs: 10_000,
        lifetimeTimeoutMs: null,
        beforeStep: ({ maxSteps }) => {
          renewalsOffered++;
          return { maxSteps: maxSteps + 0.5 };
        },
      },
    });
    await drain(result.stream);
    stopReason = result.metadata?.stopReason;
    finishReason = result.metadata?.finishReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] fractional renewal: offered=${renewalsOffered} calls=${server.calls.length} toolExecs=${counter.calls} stopReason=${String(stopReason)} finishReason=${String(finishReason)}`,
  );
  assert(
    renewalsOffered === 1 && server.calls.length === 1,
    `the boundary must be reached once and the cap must not move, offered=${renewalsOffered} calls=${server.calls.length}`,
  );
  assert(
    finishReason === "tool-calls" && stopReason === "step-cap",
    `a turn the fractional renewal did not extend is still a capped turn, reported ${String(finishReason)} / ${String(stopReason)}`,
  );
});

section("a tool is bounded even when the turn is not");

await test("a wedged tool is ended by its own deadline, with no lifetime ceiling in force", async () => {
  // The gap this closes: `lifetimeTimeoutMs: null` deliberately arms no
  // turn-level timer, the per-request deadline bounds one messages.create and
  // is disposed when the step settles, and the step cap only advances when a
  // step completes. Between two steps a tool that neither returns nor watches
  // its signal therefore had nothing at all watching it, and the turn hung
  // forever — the exact regression mode this suite's `offline` timeout exists
  // to catch, which is why a hang here is a failure rather than a skip.
  const server = await startStandIn((i) =>
    i === 0
      ? { frames: toolTurn("lookup", "msg_1") }
      : { frames: textTurn("recovered") },
  );
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  let elapsed: number | undefined;
  let text: string | undefined;
  let bodies: string | undefined;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: wedgedTool(counter),
      // Supplied, so the case does not have to wait out the engine's 300s
      // default. Absent, the same code path applies that default — a tool call
      // is bounded whether or not the caller says by how much.
      toolTimeoutMs: 400,
      executionControl: { requestTimeoutMs: 10_000, lifetimeTimeoutMs: null },
    });
    const startedAt = Date.now();
    ({ text } = await drain(result.stream));
    elapsed = Date.now() - startedAt;
    bodies = bodiesOf(server);
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] wedged tool: elapsed=${elapsed}ms calls=${server.calls.length} toolExecs=${counter.calls} text="${text ?? ""}"`,
  );
  assert(
    counter.calls === 1,
    `the wedged tool must have been entered exactly once, was ${counter.calls}`,
  );
  assert(
    // 3s, not 10s: the bound under test is 400ms plus two local round-trips, so
    // a ten-second budget would still pass if a regression slackened the
    // deadline to five. Sibling cases in this file use 2.5s; this one carries
    // the extra 400ms it is actually measuring.
    elapsed !== undefined && elapsed < 3_000,
    `a 400ms tool deadline must end the wedged call promptly, the drain took ${elapsed}ms`,
  );
  assert(
    server.calls.length === 2 && text?.includes("recovered") === true,
    `the turn must continue past the failed tool, calls=${server.calls.length} recoveredTextSeen=${text?.includes("recovered") === true}`,
  );
  assert(
    bodies?.includes("timed out") === true,
    "the timed-out tool must report its failure back to the model as a tool result",
  );
});

await test("a tool that outruns its deadline is told to stop, not just abandoned", async () => {
  // The distinction the assertions turn on: at the deadline the engine stops
  // WAITING for the tool either way, but only a per-call controller also tells
  // the tool to stop. Handed the turn's own signal — which the per-tool
  // deadline never fires — a wedged-but-live tool keeps running after the model
  // has been told it failed: a terminal outcome reported for something that has
  // not terminated, still holding its resources and still applying its effects.
  const server = await startStandIn((i) =>
    i === 0
      ? { frames: toolTurn("lookup", "msg_1") }
      : { frames: textTurn("carried on") },
  );
  const restore = withAnthropicEnv(server.port);
  const report: ToolSignalReport = {
    entered: 0,
    aborted: false,
    abortedAfterMs: undefined,
    reasonSaidTimedOut: false,
  };
  let text: string | undefined;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: signalWatchingTool(report),
      toolTimeoutMs: 400,
      executionControl: { requestTimeoutMs: 10_000, lifetimeTimeoutMs: null },
    });
    ({ text } = await drain(result.stream));
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] cancelled tool: entered=${report.entered} aborted=${report.aborted} afterMs=${String(report.abortedAfterMs)} reasonSaidTimedOut=${report.reasonSaidTimedOut}`,
  );
  assert(
    report.entered === 1,
    `the tool must have been entered exactly once, was ${report.entered}`,
  );
  assert(
    report.aborted,
    "a tool that outran its deadline must have had its own signal aborted, and did not — it was abandoned still running",
  );
  assert(
    report.reasonSaidTimedOut,
    "the abort handed to the tool must carry the deadline's own reason, so a tool can tell a timeout from a caller cancel",
  );
  assert(
    text?.includes("carried on") === true,
    "the turn must still continue past the cancelled tool",
  );
});

await test("cancelling the turn still reaches a tool that is already running", async () => {
  // The per-call controller must not become a wall between the turn and its
  // tools. A caller cancel is forwarded into it, so a tool that honours its
  // signal sees a cancelled turn exactly as it did when it was handed the
  // turn's signal directly.
  const server = await startStandIn(() => ({
    frames: toolTurn("lookup", "msg_1"),
  }));
  const restore = withAnthropicEnv(server.port);
  const controller = new AbortController();
  const report: ToolSignalReport = {
    entered: 0,
    aborted: false,
    abortedAfterMs: undefined,
    reasonSaidTimedOut: false,
  };
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: signalWatchingTool(report),
      // Long enough that the deadline cannot be what aborts the tool: only the
      // caller's cancel can, which is the whole point of the case.
      toolTimeoutMs: 30_000,
      abortSignal: controller.signal,
    });
    const cancel = (async () => {
      while (report.entered === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      controller.abort();
    })();
    await drain(result.stream);
    await cancel;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] cancelled turn: entered=${report.entered} aborted=${report.aborted} afterMs=${String(report.abortedAfterMs)} reasonSaidTimedOut=${report.reasonSaidTimedOut}`,
  );
  assert(
    report.entered === 1,
    `the tool must have been entered exactly once, was ${report.entered}`,
  );
  assert(
    report.aborted,
    "a turn cancelled while a tool was running must reach that tool's signal",
  );
  assert(
    !report.reasonSaidTimedOut,
    "a caller cancel must not reach the tool dressed as a deadline breach",
  );
});

section("opting out of the per-tool bound");

await test("toolTimeoutMs distinguishes absent, a number, and an explicit null", async () => {
  // The three-way distinction the whole opt-out rests on, pinned at the one
  // function that owns it. Every other case in this file drives `stream()`,
  // but none of them can separate "no bound" from "the 300s default": the only
  // difference between those two is a tool that outruns 300s, and a case here
  // has 60s. A `null` that silently collapsed back to the default would
  // reinstate the very bound the caller removed and would look identical to a
  // working opt-out in every behavioural case below.
  const resolved = {
    absent: resolveToolTimeoutMs(undefined),
    explicitNull: resolveToolTimeoutMs(null),
    number: resolveToolTimeoutMs(1_234),
  };
  console.log(
    `    [diagnostic] resolveToolTimeoutMs: absent=${String(resolved.absent)} null=${String(resolved.explicitNull)} number=${String(resolved.number)}`,
  );
  assert(
    resolved.absent === DEFAULT_TOOL_EXECUTION_TIMEOUT_MS,
    `an omitted toolTimeoutMs must take the default, took ${String(resolved.absent)}`,
  );
  assert(
    resolved.explicitNull === null,
    `an explicit null must stay null — collapsing it to the default silently reinstates the bound the caller removed — resolved to ${String(resolved.explicitNull)}`,
  );
  assert(
    resolved.number === 1_234,
    `a supplied number must be honoured verbatim, became ${String(resolved.number)}`,
  );
});

await test("toolTimeoutMs null removes the bound that would otherwise have fired", async () => {
  // The compatibility half of the per-tool deadline. Bedrock and AI Studio ran
  // tools with no per-tool timer at all before the engine gained one, and a
  // finite number cannot express "no bound" — it is always a ceiling, and
  // Infinity silently becomes setTimeout's ~24.9-day cap. The same tool is run
  // twice against the same 600ms of work: once under a bound it exceeds, once
  // with the bound removed.
  const bounded: ToolSignalReport = {
    entered: 0,
    aborted: false,
    abortedAfterMs: undefined,
    reasonSaidTimedOut: false,
  };
  const unbounded: ToolSignalReport = {
    entered: 0,
    aborted: false,
    abortedAfterMs: undefined,
    reasonSaidTimedOut: false,
  };
  const server = await startStandIn((i) =>
    i % 2 === 0
      ? { frames: toolTurn("lookup", `msg_${i}`) }
      : { frames: textTurn("finished") },
  );
  const restore = withAnthropicEnv(server.port);
  let boundedBodies: string | undefined;
  let unboundedBodies: string | undefined;
  let unboundedText: string | undefined;
  try {
    const nl = new NeuroLink();
    const boundedResult = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: signalWatchingTool(bounded, 600),
      toolTimeoutMs: 200,
    });
    await drain(boundedResult.stream);
    boundedBodies = bodiesOf(server);

    const unboundedResult = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: signalWatchingTool(unbounded, 600),
      toolTimeoutMs: null,
    });
    ({ text: unboundedText } = await drain(unboundedResult.stream));
    unboundedBodies = bodiesOf(server).slice((boundedBodies ?? "").length);
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] bounded: entered=${bounded.entered} aborted=${bounded.aborted} | unbounded: entered=${unbounded.entered} aborted=${unbounded.aborted}`,
  );
  assert(
    bounded.entered === 1 && unbounded.entered === 1,
    `each turn must run the tool once, ran it ${bounded.entered} and ${unbounded.entered}`,
  );
  assert(
    bounded.aborted,
    "the 200ms bound must have fired on 600ms of work, and did not — the control half of this case proves nothing otherwise",
  );
  assert(
    !unbounded.aborted,
    "toolTimeoutMs: null must leave the tool unbounded, but its signal was aborted anyway",
  );
  assert(
    boundedBodies?.includes("timed out") === true,
    "the bounded run must report its timeout back to the model",
  );
  assert(
    unboundedBodies?.includes("timed out") === false,
    "the unbounded run must not report a timeout to the model",
  );
  assert(
    unboundedText?.includes("finished") === true,
    "the unbounded turn must complete normally after its slow tool returned",
  );
});

await test("toolTimeoutMs null is refused when lifetimeTimeoutMs null already removed the ceiling", async () => {
  // Each of the two opt-outs is legitimate alone. Together they leave the turn
  // with nothing watching it anywhere: no wall-clock ceiling, no per-tool
  // deadline, and a step cap that does not advance while a tool is in flight.
  // Refused rather than resolved, because choosing which one to keep would be
  // exactly the silent substitution this contract exists to remove.
  const server = await startStandIn(() => ({ frames: textTurn("ok") }));
  const restore = withAnthropicEnv(server.port);
  let refusal = "";
  let namedBothOptOuts = false;
  let callsAfterRefusal: number | undefined;
  let finiteLifetimeAccepted: boolean | undefined;
  try {
    const nl = new NeuroLink();
    try {
      const result = await nl.stream({
        input: { text: "hi" },
        provider: "anthropic",
        disableInternalFallback: true,
        model: MODEL,
        maxTokens: 32,
        toolTimeoutMs: null,
        executionControl: { requestTimeoutMs: 5_000, lifetimeTimeoutMs: null },
      });
      await drain(result.stream);
    } catch (error) {
      refusal = error instanceof Error ? error.message : String(error);
      namedBothOptOuts =
        refusal.includes("toolTimeoutMs") &&
        refusal.includes("lifetimeTimeoutMs");
    }
    callsAfterRefusal = server.calls.length;

    // The boundary: an unbounded tool is fine as long as SOMETHING still
    // bounds the turn.
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      toolTimeoutMs: null,
      executionControl: { requestTimeoutMs: 5_000, lifetimeTimeoutMs: 10_000 },
    });
    finiteLifetimeAccepted = (await drain(result.stream)).text.includes("ok");
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] no bound anywhere: refusal="${refusal.slice(0, 140)}" callsBeforeRefusal=${callsAfterRefusal} finiteLifetimeAccepted=${String(finiteLifetimeAccepted)}`,
  );
  assert(
    refusal.length > 0,
    "a turn with no lifetime ceiling and no per-tool bound must be refused, it was accepted",
  );
  assert(
    namedBothOptOuts,
    "the refusal must name both opt-outs — see the diagnostic line above for what it said instead",
  );
  assert(
    callsAfterRefusal === 0,
    `the refusal must land before any request goes out, ${callsAfterRefusal} went out`,
  );
  assert(
    finiteLifetimeAccepted === true,
    "an unbounded tool under a finite lifetime ceiling must still be accepted",
  );
});

section("a stream that never finished is never a success");

await test("an SSE response that ends before its terminal event is not a completed turn", async () => {
  // The tool block on the wire is complete, so without an end-of-stream check
  // the loop would dispatch it and carry on as though the model had asked.
  const server = await startStandIn(() => ({
    frames: truncatedToolTurn("lookup", "msg_1"),
  }));
  const restore = withAnthropicEnv(server.port);
  const counter = { calls: 0 };
  let finishReason: unknown;
  let errorMessage: string | undefined;
  let errorSeen: boolean | undefined;
  let errorNamedTruncation: boolean | undefined;
  let text: string | undefined;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "look something up" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      tools: countingTool(counter),
      executionControl: { requestTimeoutMs: 10_000, lifetimeTimeoutMs: null },
    });
    const drained = await drain(result.stream);
    text = drained.text;
    errorMessage = drained.error?.message ?? "";
    // Captured as booleans here, at the point the outcome is known, so the
    // assertions below can name what failed without carrying provider text
    // into a message the harness would classify as an expected provider error
    // and downgrade to a skip.
    errorSeen = drained.error !== undefined;
    errorNamedTruncation = errorMessage.includes("terminal message_stop");
    finishReason = result.metadata?.finishReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] truncated SSE: calls=${server.calls.length} toolExecs=${counter.calls} finishReason=${String(finishReason)} error=${(errorMessage ?? "").slice(0, 160)} text=${JSON.stringify((text ?? "").slice(0, 80))}`,
  );
  // Asserted BEFORE the outcome checks below, because without it they cannot
  // tell "the consumer was told" from "the consumer got silence". `finishReason
  // !== "stop"` is already satisfied by `undefined`, which is the value a
  // passing run produces — so a regression that detected the truncation and
  // then failed to surface the error would leave an empty, error-free stream
  // for a turn that never finished, and every other assertion here would still
  // pass. That is exactly what this section's title forbids.
  assert(
    errorSeen === true,
    "a truncated stream must surface an error to the consumer, and nothing was thrown — see the diagnostic line above",
  );
  assert(
    errorNamedTruncation === true,
    "the error must identify the truncation rather than some other failure — see the diagnostic line above for what it said instead",
  );
  assert(
    counter.calls === 0,
    `a stream that never ended must not dispatch its tools, dispatched ${counter.calls}`,
  );
  assert(
    finishReason !== "stop",
    `a truncated stream must not report a normal stop, reported ${String(finishReason)}`,
  );
  assert(
    server.calls.length === 1,
    `a truncated turn must not be retried into a second request, made ${server.calls.length}`,
  );
});

await test("a stalled request is ended by requestTimeoutMs, carrying the timer's identity", async () => {
  const server = await startStandIn(() => ({
    frames: [
      sse("message_start", {
        message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
      }),
    ],
    end: false,
  }));
  const restore = withAnthropicEnv(server.port);
  // Timed from after stream() returns, for the same reason as the lifetime
  // case above: the SDK's own setup dwarfs the deadline under test.
  let elapsed: number | undefined;
  let errorMessage: string | undefined;
  let carriedTimerIdentity: boolean | undefined;
  let finishReason: unknown;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hang" },
      provider: "anthropic",
      disableInternalFallback: true,
      model: MODEL,
      maxTokens: 32,
      executionControl: { requestTimeoutMs: 250, lifetimeTimeoutMs: null },
    });
    const startedAt = Date.now();
    const drained = await drain(result.stream);
    elapsed = Date.now() - startedAt;
    errorMessage = drained.error?.message ?? "";
    carriedTimerIdentity = errorMessage.includes("timed out");
    finishReason = result.metadata?.finishReason;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] stalled request: elapsed=${elapsed}ms finishReason=${String(finishReason)} error=${(errorMessage ?? "").slice(0, 200)}`,
  );
  assert(
    elapsed !== undefined && elapsed < 2_500,
    `a 250ms request deadline must end a stalled turn promptly, the drain took ${elapsed}ms`,
  );
  assert(
    carriedTimerIdentity === true,
    `the request timer's own identity must reach the caller; anErrorWasThrown=${errorMessage !== undefined && errorMessage.length > 0} — see the diagnostic line above for its text`,
  );
  assert(
    finishReason !== "stop",
    `a stalled turn must not report a normal stop, reported ${String(finishReason)}`,
  );
});

await runSuite();

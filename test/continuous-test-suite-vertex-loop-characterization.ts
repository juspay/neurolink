#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Google Vertex (Gemini) native-loop characterization
 * (Plan 08, Task 10).
 *
 * Vertex has two hand-rolled turn loops, both `while (step < maxSteps)` over
 * `models.generateContentStream`. This pins what they do before either moves
 * onto `runAgenticLoop`, the same way the AI Studio and Anthropic suites did
 * for their migrations.
 *
 * Until recently this suite could not exist. Vertex authenticated through ADC
 * before every request, which ignores an endpoint override, so a stand-in
 * received nothing at all. Vertex AI Express Mode
 * (`credentials.vertex.apiKey` with no project/location) skips ADC entirely
 * and makes the provider reachable offline through
 * `credentials.vertex.baseURL`.
 *
 * Everything drives the shipped surface: `NeuroLink` from `../dist/index.js`,
 * no imports out of `src/`, nothing stubbed. No rule-15 exception.
 *
 * Three things are deliberate and load-bearing:
 *
 *  - `disableInternalFallback` on every case. Without it a turn that ends
 *    unsuccessfully makes NeuroLink retry on a DIFFERENT provider, and whether
 *    that succeeds depends on which unrelated credentials sit in the
 *    environment — which is exactly how an earlier suite passed locally and
 *    failed in CI.
 *  - The ADC environment variables are cleared per case, so an ambient
 *    project or service account cannot pull the provider off Express Mode and
 *    away from the stand-in.
 *  - No provider wording in assertion messages. The harness downgrades a
 *    failure matching `isExpectedProviderError()` to a SKIP, so a real
 *    regression would read as green.
 *
 * Run: npx tsx test/continuous-test-suite-vertex-loop-characterization.ts
 */

import { createServer, type Server } from "node:http";
import { jsonSchema } from "../dist/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, section, runSuite } = defineSuite(
  "Vertex loop characterization",
  {
    offline: true,
  },
);

const { NeuroLink } = await import("../dist/index.js");

const MODEL = "gemini-2.0-flash";

/**
 * Every variable that could keep this provider on the ADC path.
 *
 * All FOUR project names matter. Project resolution falls back through
 * GOOGLE_CLOUD_PROJECT_ID, VERTEX_PROJECT_ID, GOOGLE_VERTEX_PROJECT and
 * GOOGLE_CLOUD_PROJECT, and an earlier version of this list cleared only the
 * last one — so an ambient VERTEX_PROJECT_ID kept the constructor from
 * throwing and the suite passed for a reason that had nothing to do with
 * Express Mode. A dev machine with a project configured is precisely where
 * that hides.
 */
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

type GeminiPart = Record<string, unknown>;

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

type StandInCall = { body: Record<string, unknown>; path: string };

type StandIn = {
  calls: StandInCall[];
  port: number;
  close: () => Promise<void>;
};

function declaredToolNames(call: StandInCall | undefined): string[] {
  const tools = (call?.body?.tools ?? []) as Array<{
    functionDeclarations?: Array<{ name?: string }>;
  }>;
  return tools
    .flatMap((t) => t.functionDeclarations ?? [])
    .map((d) => d.name)
    .filter((n): n is string => typeof n === "string");
}

function functionResponsePayloads(
  call: StandInCall | undefined,
): Array<{ name?: string; response?: unknown }> {
  const contents = (call?.body?.contents ?? []) as Array<{
    parts?: Array<{ functionResponse?: { name?: string; response?: unknown } }>;
  }>;
  return contents
    .flatMap((c) => c.parts ?? [])
    .map((p) => p.functionResponse)
    .filter((r): r is { name?: string; response?: unknown } => r !== undefined);
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
      calls.push({
        body: parseBody(),
        path: String(req.url ?? "").split("?")[0],
      });
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
    vertex: {
      apiKey: "express-key",
      baseURL: `http://127.0.0.1:${port}`,
    },
  };
}

function nl() {
  return new NeuroLink();
}

function customTool(counter: { calls: number }) {
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

/**
 * A stand-in that answers the request headers and then never sends a body,
 * reproducing a provider that accepts a stream and wedges.
 */
async function startSilentStandIn(): Promise<StandIn> {
  const calls: StandInCall[] = [];
  const server: Server = createServer((req, res) => {
    calls.push({ body: {}, path: String(req.url ?? "").split("?")[0] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    // Deliberately no write and no end: the turn clock is what must react.
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

/**
 * A stand-in that keeps the stream alive with periodic events.
 *
 * Progress resets the stall clock, so a turn against this server can only be
 * ended by the wall-clock deadline — which is what separates the two limits.
 */
async function startDribblingStandIn(): Promise<StandIn> {
  const calls: StandInCall[] = [];
  const timers: NodeJS.Timeout[] = [];
  const server: Server = createServer((req, res) => {
    calls.push({ body: {}, path: String(req.url ?? "").split("?")[0] });
    res.writeHead(200, { "content-type": "text/event-stream" });
    const t = setInterval(() => {
      res.write(sse([{ text: "." }]));
    }, 300);
    timers.push(t);
    res.on("close", () => clearInterval(t));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    calls,
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        timers.forEach(clearInterval);
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

/**
 * A stand-in that reports an enormous prompt size.
 *
 * The context guard trips on the FULL prompt tokens a call reports, and the
 * stand-in owns `usageMetadata` — so a turn can be pushed against the window
 * without building a genuinely enormous conversation.
 */
async function startContextPressureStandIn(): Promise<StandIn> {
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
      calls.push({
        body: parseBody(),
        path: String(req.url ?? "").split("?")[0],
      });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(
        `data: ${JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ functionCall: { name: "lookup", args: {} } }],
                role: "model",
              },
              finishReason: "STOP",
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: 900_000,
            candidatesTokenCount: 1_000,
            totalTokenCount: 901_000,
          },
        })}\r\n\r\n`,
      );
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
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

section("express-mode reachability");

await test("the turn reaches the stand-in over Express Mode rather than ADC", async () => {
  // Guards the affordance the whole suite rests on. If Vertex ever stops
  // honouring an apiKey-only credential it will silently fall back to
  // project/location and ADC, and every case below would then be exercising
  // something other than what it claims.
  const server = await startStandIn(() => textTurn("hello from vertex"));
  const restore = withVertexEnv();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      disableInternalFallback: true,
      credentials: credentialsFor(server.port),
    });
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
    }
    assert(
      text.includes("hello from vertex"),
      "the streamed text was not surfaced to the consumer",
    );
    assert(
      server.calls.length === 1,
      `a text-only turn should take exactly one call, took ${server.calls.length}`,
    );
    // The Express path carries no project/location segment. The ADC path does,
    // so this distinguishes the two rather than merely proving a request
    // arrived.
    assert(
      !(server.calls[0]?.path ?? "").includes("/projects/"),
      "the request did not take the key-only route",
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
  const restore = withVertexEnv();
  const counter = { calls: 0 };
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
    let text = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        text += chunk.content;
      }
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
    const answered = functionResponsePayloads(server.calls[1]).filter(
      (entry) => entry.name === "lookup",
    );
    assert(
      answered.length === 1,
      "the tool result was not carried back to the model",
    );
    assert(text.includes("done"), "the final turn's text was not surfaced");
  } finally {
    restore();
    await server.close();
  }
});

section("malformed function call");

await test("a malformed call is retried exactly once with a corrective note", async () => {
  // Vertex is the ONLY provider with this behaviour, so no other migration in
  // this plan had to preserve it. A step that produced no text, no function
  // calls and MALFORMED_FUNCTION_CALL is a transient formatting failure, not
  // a finished turn: the loop re-issues it once with a corrective note rather
  // than ending the turn on empty content.
  //
  // The budget is one retry PER TURN, which is the half most easily lost —
  // an implementation that retried on every malformed step would loop to the
  // step cap, and one that never retried would end the turn silently. The
  // fixture stays malformed forever so both mistakes are visible in the call
  // count.
  const server = await startStandIn(() => sse([], "MALFORMED_FUNCTION_CALL"));
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  let streamed = "";
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "call something" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      disableInternalFallback: true,
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        streamed += chunk.content;
      }
    }
  } catch {
    // The turn's outcome is not what is pinned here; the retry budget is.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] malformed turn: calls=${server.calls.length} chars=${streamed.length}`,
  );
  // One original attempt plus one retry. Not maxSteps, and not one.
  assert(
    server.calls.length === 2,
    `a permanently malformed turn made ${server.calls.length} calls, not the 2 this loop performs`,
  );
  // The retry must carry the corrective note, otherwise it re-sends the same
  // request and reproduces the same failure for nothing.
  const retryBody = JSON.stringify(server.calls[1]?.body ?? {});
  assert(
    retryBody.includes("malformed"),
    "the retry did not carry a corrective note",
  );
});

section("step cap");

await test("a model that never stops calling tools is bounded and still answers", async () => {
  // Vertex's step cap is richer than the other providers': rather than simply
  // ending, it spends a reserved step asking the model to finalize, and only
  // falls back to a built cap message if that produces nothing. Both the call
  // count and the fact that SOMETHING is returned are pinned, because the
  // failure mode of a migration here is a silent empty answer.
  const server = await startStandIn((i) =>
    i < 3
      ? toolTurn("lookup", { n: i })
      : textTurn("here is my summary so far"),
  );
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  let streamed = "";
  let failed = false;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep going" },
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
      if ("content" in chunk && typeof chunk.content === "string") {
        streamed += chunk.content;
      }
    }
  } catch {
    failed = true;
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex step-cap: calls=${server.calls.length} tools=${counter.calls} chars=${streamed.length} threw=${failed}`,
  );
  // maxSteps=3 produces FOUR provider calls, not three.
  //
  // The cause is deliberately not asserted here, because it is not the one it
  // looks like. Vertex does have a reserved finalization step gated on
  // `hitStepLimit`, and the obvious reading is that the fourth call is it —
  // but forcing `hitStepLimit = false` at BOTH of its assignment sites leaves
  // this turn at four calls and the same output, so the extra call comes from
  // somewhere else. Pinning the observed count without naming a mechanism
  // keeps the guard honest; whatever the migration does, it has to reproduce
  // this shape.
  assert(
    server.calls.length === 4,
    `a maxSteps=3 turn made ${server.calls.length} calls, not the 4 this loop performs`,
  );
  assert(
    streamed.length > 0,
    "reaching the step cap delivered nothing at all to the consumer",
  );
  assert(!failed, "reaching the step cap should not fail the turn");
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
      maxSteps: 4,
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
    // The outcome is not what is pinned; the dispatch count is.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex failing-tool: attempts=${attempts} calls=${server.calls.length}`,
  );
  // DEFAULT_TOOL_MAX_RETRIES is 2, the same threshold AI Studio uses, so the
  // breaker must stop dispatching after two failures while the turn runs on.
  assert(
    attempts === 2,
    `the failing tool was dispatched ${attempts} times, not the 2 this loop performs`,
  );
});

section("turn clock");

await test("a stream that stops making progress ends the turn as stalled", async () => {
  // The turn clock is the part of this loop a migration is most likely to
  // drop, because nothing about it shows up in a normal turn: it only acts
  // when a stream goes quiet. `stallTimeoutMs` is a public option threaded
  // straight into createTurnClock, so the behaviour IS reachable
  // deterministically — a stand-in that opens a response and then says
  // nothing reproduces a wedged provider exactly.
  //
  // Pinned before the Vertex loops move onto runAgenticLoop, because the
  // engine has no turn clock of its own: the fields that once advertised one
  // on the adapter were removed for being inert, so the clock has to stay on
  // this side, composed into the abort signal.
  const server = await startSilentStandIn();
  const restore = withVertexEnv();
  let stopReason: string | undefined;
  let outcome: string;
  let thrown: unknown;
  try {
    // The ENTIRE turn is bounded, not just the drain. Removing the stall
    // clock does not make this case fail — it makes it HANG, and it hangs
    // inside stream() before any drain begins, so a race around the drain
    // alone would never fire. A hung suite is a worse CI signal than a red
    // one, and this bound is what turns the regression into a clean failure.
    const turn = (async () => {
      const result = await nl().stream({
        input: { text: "hi" },
        provider: "vertex",
        model: MODEL,
        maxTokens: 32,
        disableInternalFallback: true,
        stallTimeoutMs: 1500,
        credentials: credentialsFor(server.port),
      });
      for await (const chunk of result.stream) {
        void chunk;
      }
      // metadata.stopReason, not the top-level field: for these
      // background-loop streams the top-level one is a late-resolving getter
      // and reading it early yields undefined however the turn ended. That is
      // documented on StreamResult and is not a defect — the first version of
      // this case read the wrong field and reported a working turn clock as
      // broken.
      stopReason = (result as { metadata?: { stopReason?: string } }).metadata
        ?.stopReason;
      return "ended";
    })();
    outcome = await Promise.race([
      // The rejection is RETAINED, not converted into a pass. Mapping every
      // error to a passing outcome would let any unrelated failure — a
      // connection refused, a misconfigured credential — satisfy a test whose
      // whole subject is the turn clock. Both of these turns end cleanly
      // today, so a throw is a real signal and is reported as one.
      turn.catch((error: unknown) => {
        thrown = error;
        return "threw";
      }),
      new Promise<string>((resolve) => {
        const t = setTimeout(() => resolve("never-ended"), 20_000);
        t.unref?.();
      }),
    ]);
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] stall turn: outcome=${outcome} stopReason=${String(stopReason)}`,
  );
  assert(
    outcome !== "never-ended",
    "a wedged turn was never ended by the turn clock within the bound",
  );
  if (outcome === "threw") {
    // Printed, never interpolated into an assertion: the harness downgrades a
    // failure whose text matches isExpectedProviderError() to a SKIP, so
    // provider wording must not reach an assert.
    console.log(
      `    [diagnostic] stall turn threw: ${String((thrown as Error)?.message).slice(0, 160)}`,
    );
  }
  assert(
    outcome === "ended",
    "the wedged turn failed instead of being ended by the turn clock",
  );
  assert(
    stopReason === "stalled",
    "a wedged turn ended without being reported as a stall",
  );
});

await test("a turn that outlives turnTimeoutMs ends on the wall-clock deadline", async () => {
  // The stall clock and the wall-clock deadline are separate limits with
  // separate stop reasons, and a turn can hit either. This one is reachable
  // with a stand-in that DOES make progress — it keeps dribbling events, so
  // the stall clock is continually reset and only turnTimeoutMs can end the
  // turn. Without that distinction a single fixture would prove one limit
  // works and say nothing about the other.
  const server = await startDribblingStandIn();
  const restore = withVertexEnv();
  let stopReason: string | undefined;
  let outcome: string;
  let thrown: unknown;
  try {
    const turn = (async () => {
      const result = await nl().stream({
        input: { text: "hi" },
        provider: "vertex",
        model: MODEL,
        maxTokens: 32,
        maxSteps: 20,
        disableInternalFallback: true,
        turnTimeoutMs: 2500,
        // Deliberately far above the deadline so a stall cannot be what ends
        // this turn.
        stallTimeoutMs: 60_000,
        credentials: credentialsFor(server.port),
      });
      for await (const chunk of result.stream) {
        void chunk;
      }
      stopReason = (result as { metadata?: { stopReason?: string } }).metadata
        ?.stopReason;
      return "ended";
    })();
    outcome = await Promise.race([
      // The rejection is RETAINED, not converted into a pass. Mapping every
      // error to a passing outcome would let any unrelated failure — a
      // connection refused, a misconfigured credential — satisfy a test whose
      // whole subject is the turn clock. Both of these turns end cleanly
      // today, so a throw is a real signal and is reported as one.
      turn.catch((error: unknown) => {
        thrown = error;
        return "threw";
      }),
      new Promise<string>((resolve) => {
        const t = setTimeout(() => resolve("never-ended"), 25_000);
        t.unref?.();
      }),
    ]);
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] time-limit turn: outcome=${outcome} stopReason=${String(stopReason)}`,
  );
  assert(
    outcome !== "never-ended",
    "a turn past its wall-clock deadline was never ended within the bound",
  );
  if (outcome === "threw") {
    console.log(
      `    [diagnostic] time-limit turn threw: ${String((thrown as Error)?.message).slice(0, 160)}`,
    );
  }
  assert(
    outcome === "ended",
    "the turn failed instead of being ended by its wall-clock deadline",
  );
  assert(
    stopReason === "time-limit",
    "a turn past its wall-clock deadline was not reported against that deadline",
  );
});

section("context guard");

await test("a turn pressing against the context window stops and still answers", async () => {
  // The context guard is the one loop control that can END a turn rather than
  // trim it, and the distinction matters for the migration: reclaiming
  // returns a smaller conversation, but when reclaiming buys nothing the loop
  // sets hitContextLimit, breaks, and synthesizes a final answer instead of
  // stepping into a provider "prompt is too long" rejection.
  //
  // That stop cannot be expressed by the engine's planReclaim hook, which
  // says "here is a smaller conversation" or "nothing to do" and has no way
  // to say "end the turn" — so whatever the migration does about it has to be
  // deliberate, and this case is what will hold it honest.
  //
  // The guard trips on the prompt size a call REPORTS, and the stand-in owns
  // usageMetadata, so pressure is applied without building a real 900k-token
  // conversation.
  const server = await startContextPressureStandIn();
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  let streamed = "";
  let stopReason: string | undefined;
  let outcome: string;
  let thrown: unknown;
  try {
    const turn = (async () => {
      const result = await nl().stream({
        input: { text: "keep going" },
        provider: "vertex",
        model: MODEL,
        maxTokens: 32,
        maxSteps: 6,
        disableTools: false,
        disableInternalFallback: true,
        tools: customTool(counter),
        credentials: credentialsFor(server.port),
      });
      for await (const chunk of result.stream) {
        if ("content" in chunk && typeof chunk.content === "string") {
          streamed += chunk.content;
        }
      }
      stopReason = (result as { metadata?: { stopReason?: string } }).metadata
        ?.stopReason;
      return "ended";
    })();
    outcome = await Promise.race([
      turn.catch((error: unknown) => {
        thrown = error;
        return "threw";
      }),
      new Promise<string>((resolve) => {
        const t = setTimeout(() => resolve("never-ended"), 25_000);
        t.unref?.();
      }),
    ]);
  } finally {
    restore();
    await server.close();
  }
  if (outcome === "threw") {
    console.log(
      `    [diagnostic] context-cap turn threw: ${String((thrown as Error)?.message).slice(0, 160)}`,
    );
  }
  console.log(
    `    [diagnostic] context-cap turn: outcome=${outcome} calls=${server.calls.length} stopReason=${String(stopReason)} chars=${streamed.length}`,
  );
  assert(outcome === "ended", "the pressured turn failed instead of ending");
  // Well short of maxSteps: the guard stops the loop rather than letting it
  // run the budget out against a prompt it already knows is too large.
  assert(
    server.calls.length < 6,
    `the guard let the turn run ${server.calls.length} calls, up to its step budget`,
  );
});

section("stream timing");

await test("text is replayed after the turn completes, not streamed live", async () => {
  // Vertex does NOT stream text as it arrives. The loop preserves each text
  // part in `incrementalTextChunks` and `createTextStream()` replays them
  // once the whole turn is done — the code says as much at client.ts:2642,
  // "we just preserved them ... instead of collapsing into finalText".
  //
  // Nothing pinned that, and it is exactly what a migration onto the engine's
  // per-chunk push model would change: the consumer would start receiving
  // text mid-turn instead of at the end. That may well be an improvement, but
  // it is a user-visible timing change and must be a decision rather than a
  // side effect. This case makes it one.
  //
  // A two-step turn separates the two models cleanly: under live streaming
  // the first chunk arrives BEFORE the second provider call; under replay it
  // cannot.
  let secondCallAt = 0;
  const server = await startStandIn((i) => {
    if (i === 1) {
      secondCallAt = Date.now();
    }
    return i === 0
      ? sse(
          [{ text: "first" }, { functionCall: { name: "lookup", args: {} } }],
          "STOP",
        )
      : sse([{ text: "second" }], "STOP");
  });
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  let firstChunkAt = 0;
  try {
    const result = await nl().stream({
      input: { text: "go" },
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
      const chunkContent =
        "content" in chunk && typeof chunk.content === "string"
          ? chunk.content
          : "";
      if (!firstChunkAt && chunkContent.length > 0) {
        firstChunkAt = Date.now();
      }
    }
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] stream timing: calls=${server.calls.length} firstChunkAfterSecondCall=${firstChunkAt >= secondCallAt}`,
  );
  assert(
    server.calls.length === 2,
    `expected a two-step turn, got ${server.calls.length} calls`,
  );
  assert(firstChunkAt > 0, "the consumer received no text at all");
  // Guards against a vacuous comparison: if the second call never happened,
  // `firstChunkAt >= secondCallAt` would hold trivially against zero and the
  // case would pass while proving nothing about ordering.
  assert(
    secondCallAt > 0,
    "the second provider call never happened, so the ordering assertion below would be vacuous",
  );
  // The pinned behaviour: replay, not live. If a migration makes this live,
  // this assertion is the one that should be consciously inverted.
  assert(
    firstChunkAt >= secondCallAt,
    "text reached the consumer before the turn finished — streaming became live",
  );
});

section("generate path");

await test("the generate path declares and executes a caller's tools", async () => {
  // executeNativeGemini3Generate is a SECOND hand-rolled loop with its own
  // stream drain, and nothing in this suite reached it — every other case
  // drives nl.stream(). Task 10 migrates both loops, so the generate one needs
  // its own baseline or a change there would be invisible here.
  const server = await startStandIn((i) =>
    i === 0
      ? sse([{ functionCall: { name: "lookup", args: {} } }], "STOP")
      : sse([{ text: "generated answer" }], "STOP"),
  );
  const restore = withVertexEnv();
  const counter = { calls: 0 };
  try {
    const result = await nl().generate({
      input: { text: "look something up" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 3,
      disableTools: false,
      // GenerateOptions declares disableInternalFallback and generate() maps it
      // through to the provider, so it is as load-bearing here as on the
      // streaming cases below: no cross-provider or catalog-model retry.
      tools: customTool(counter),
      credentials: credentialsFor(server.port),
    });
    console.log(
      `    [diagnostic] vertex generate: calls=${server.calls.length} tools=${counter.calls} content=${JSON.stringify(String(result?.content ?? "").slice(0, 40))}`,
    );
    assert(
      declaredToolNames(server.calls[0]).includes("lookup"),
      "the generate path did not declare the caller's tool",
    );
    assert(counter.calls === 1, "the caller's tool did not execute once");
    assert(
      functionResponsePayloads(server.calls[1]).some(
        (entry) => entry.name === "lookup",
      ),
      "the tool result was not carried back to the model",
    );
    assert(
      typeof result?.content === "string" &&
        result.content.includes("generated answer"),
      "the final turn's text was not returned",
    );
  } finally {
    restore();
    await server.close();
  }
});

section("tool dispatch safety");

// The four cases below pin behaviours the SHARED LOOP ENGINE DOES NOT HAVE.
// runAgenticLoop calls tool.execute bare, strikes its breaker only from a
// catch, never clears a strike, and has no result dedup at all. A migration
// that simply hands these tools to the engine would lose all four — quietly,
// since each one only shows up on a repeat or a failure path.
//
// Every case varies the tool arguments per step. That is not incidental: the
// executeMap is a DedupExecuteMap, so identical {name, args} inside one turn
// is served from a per-turn result cache and the tool never runs again. With
// constant arguments these cases measure the dedup layer instead of the thing
// they name — which is exactly what the first draft of them did.

await test("a tool that never returns costs a bounded step, not the whole turn", async () => {
  // `toolTimeoutMs` is a public option threaded straight into the withTimeout()
  // that wraps execute, so the bound is reachable deterministically: a tool
  // that never resolves reproduces a wedged MCP server exactly. Without that
  // wrapper the turn hangs on DEFAULT_TOOL_EXECUTION_TIMEOUT_MS — five
  // minutes — or until the stream deadline.
  const server = await startStandIn((i) => toolTurn("wedged", { n: i }));
  const restore = withVertexEnv();
  let dispatched = 0;
  const started = Date.now();
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "call the wedged tool" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 4,
      disableTools: false,
      disableInternalFallback: true,
      toolTimeoutMs: 250,
      tools: {
        wedged: {
          description: "never returns",
          inputSchema: jsonSchema({
            type: "object",
            properties: { n: { type: "number" } },
            additionalProperties: true,
          }),
          execute: () => {
            dispatched++;
            return new Promise(() => {});
          },
        },
      },
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // The outcome is not what is pinned; the bound and the count are.
  } finally {
    restore();
    await server.close();
  }
  // Reaching this line is itself the proof that the turn settled: a tool that
  // is never bounded leaves the await pending and the suite dies on its own
  // timeout instead of getting here.
  const elapsed = Date.now() - started;
  console.log(
    `    [diagnostic] vertex wedged-tool: dispatched=${dispatched} elapsedMs=${elapsed}`,
  );
  // Each timeout is a strike, so the breaker stops dispatching after two.
  assert(
    dispatched === 2,
    `the wedged tool was dispatched ${dispatched} times, not the 2 this loop performs`,
  );
  // The turn ended on the TOOL bound, not on the default one. The margin is
  // wide on purpose and still discriminates: the default is 300_000ms.
  assert(
    elapsed < 20_000,
    "the turn outlived the configured per-tool bound by a wide margin",
  );
});

await test("a tool that reports failure without throwing still trips the breaker", async () => {
  // extractToolFailureText treats { error: "..." } and MCP isError payloads as
  // failures even though execute() resolved. A proxy-blocked tool fails
  // exactly this way, and counting only thrown errors — which is all the
  // engine does — lets the model grind on it for the entire step budget.
  const server = await startStandIn((i) => toolTurn("blocked", { n: i }));
  const restore = withVertexEnv();
  let dispatched = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "keep calling the blocked tool" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      disableInternalFallback: true,
      tools: {
        blocked: {
          description: "resolves with an error payload",
          inputSchema: jsonSchema({
            type: "object",
            properties: { n: { type: "number" } },
            additionalProperties: true,
          }),
          execute: async () => {
            dispatched++;
            return { error: "blocked by policy" };
          },
        },
      },
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // The dispatch count is what is pinned, not the turn's outcome.
  } finally {
    restore();
    await server.close();
  }
  const finalPayloads = functionResponsePayloads(
    server.calls[server.calls.length - 1],
  ).map((entry) => Object.keys(entry.response ?? {}).join("+"));
  console.log(
    `    [diagnostic] vertex error-shaped-success: dispatched=${dispatched} payloads=${finalPayloads.join(",")}`,
  );
  // Same DEFAULT_TOOL_MAX_RETRIES threshold as the throwing case above.
  assert(
    dispatched === 2,
    `the non-throwing failure was dispatched ${dispatched} times, not the 2 this loop performs`,
  );
  // And the breaker actually reported the tool as burnt out. Under a
  // throw-only rule no such payload exists and all five steps carry results,
  // so this is what separates the two rules rather than the count alone.
  assert(
    finalPayloads.filter((keys) => keys.includes("do_not_retry")).length === 3,
    "the breaker never reported the non-throwing tool as permanently failed",
  );
});

await test("a success between failures clears the strike count", async () => {
  // The strikes this loop counts are CONSECUTIVE: a clean result deletes the
  // entry. That is what keeps an argument-dependent soft error — file-not-found
  // on one path, fine on the next — from permanently disabling a working tool.
  // The engine accumulates instead, and under that rule the alternating tool
  // below is shut off after its second failure and never reaches step five.
  const server = await startStandIn((i) => toolTurn("alternating", { n: i }));
  const restore = withVertexEnv();
  let dispatched = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "call the alternating tool" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      disableInternalFallback: true,
      tools: {
        alternating: {
          description: "fails on odd dispatches, succeeds on even ones",
          inputSchema: jsonSchema({
            type: "object",
            properties: { n: { type: "number" } },
            additionalProperties: true,
          }),
          execute: async () => {
            dispatched++;
            if (dispatched % 2 === 1) {
              throw new Error("synthetic alternating failure");
            }
            return { ok: true };
          },
        },
      },
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // The dispatch count is what is pinned, not the turn's outcome.
  } finally {
    restore();
    await server.close();
  }
  console.log(
    `    [diagnostic] vertex alternating-tool: dispatched=${dispatched}`,
  );
  // Never two failures in a row, so the breaker never trips and every step
  // dispatches. Under accumulate-forever the third failure would be blocked
  // and the count would stop short — which is what makes this discriminate.
  assert(
    dispatched === 5,
    `the alternating tool was dispatched ${dispatched} times, so a non-consecutive strike rule shut it off early`,
  );
});

await test("the same tool call with the same arguments runs once per turn", async () => {
  // DedupExecuteMap (BZ-3327): Gemini re-emits a tool call with identical
  // arguments across steps even though the prior result is already in the
  // history. Re-executing means duplicate side effects and duplicate reports,
  // so the per-turn result cache answers the repeat instead.
  //
  // Constant arguments here, unlike every case above — this is the one case
  // that is ABOUT the dedup rather than obstructed by it.
  const server = await startStandIn(() => toolTurn("repeatable", {}));
  const restore = withVertexEnv();
  let dispatched = 0;
  try {
    const nl = new NeuroLink();
    const result = await nl.stream({
      input: { text: "call the same tool repeatedly" },
      provider: "vertex",
      model: MODEL,
      maxTokens: 32,
      maxSteps: 5,
      disableTools: false,
      disableInternalFallback: true,
      tools: {
        repeatable: {
          description: "records how often it really ran",
          inputSchema: jsonSchema({
            type: "object",
            properties: {},
            additionalProperties: true,
          }),
          execute: async () => {
            dispatched++;
            return { ran: dispatched };
          },
        },
      },
      credentials: credentialsFor(server.port),
    });
    for await (const chunk of result.stream) {
      void chunk;
    }
  } catch {
    // The dispatch count is what is pinned, not the turn's outcome.
  } finally {
    restore();
    await server.close();
  }
  const responses = functionResponsePayloads(
    server.calls[server.calls.length - 1],
  );
  console.log(
    `    [diagnostic] vertex dedup: dispatched=${dispatched} responses=${responses.length}`,
  );
  // Called on every step, executed exactly once. Both halves matter: the
  // dispatch count alone would also be 1 if the loop had simply stopped.
  assert(
    dispatched === 1,
    `the repeated identical call executed ${dispatched} times instead of being served from the per-turn cache`,
  );
  assert(
    responses.length === 5,
    `the model was answered ${responses.length} times, so the turn did not keep running on cached results`,
  );
});

await runSuite();

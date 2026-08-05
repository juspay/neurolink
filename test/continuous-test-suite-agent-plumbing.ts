#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Agent Plumbing (N1)
 *
 * abortSignal + turn-budget threading from AgentExecutionOptions into
 * generate(), the no-ghost-runs pre-check on both execute() and stream(),
 * AgentResult stopReason/toolExecutions pass-through, and AgentNetwork's
 * inputSchema-honouring agent tools.
 *
 * Migrated from test/agentPlumbing.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-agent-plumbing.ts
 */

import { z } from "zod";
import { Agent } from "../src/lib/agent/agent.js";
import { AgentNetwork } from "../src/lib/agent/agentNetwork.js";
import type { NeuroLink } from "../src/lib/neurolink.js";
import type {
  GenerateOptions,
  GenerateResult,
  Tool,
  ToolExecutionRecord,
} from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { spy } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("Agent Plumbing (N1)");

/** Structural comparison — the harness's assertEqual is strict `!==`. */
const assertDeepEqual = (
  actual: unknown,
  expected: unknown,
  msg: string,
): void => assertEqual(JSON.stringify(actual), JSON.stringify(expected), msg);

const record: ToolExecutionRecord = {
  toolName: "grep",
  params: { q: "x" },
  resultText: "hit",
  isError: false,
  startedAt: 1000,
  durationMs: 12,
};

function makeNeurolink(partial?: Partial<GenerateResult>) {
  const generate = spy(
    async (_opts: GenerateOptions) =>
      ({
        content: "agent answer",
        provider: "fake",
        model: "fake",
        usage: { input: 1, output: 2, total: 3 },
        toolsUsed: ["grep"],
        toolExecutions: [record],
        stopReason: "time-limit",
        ...partial,
      }) as GenerateResult,
  );
  const neurolink = {
    generate: generate.fn,
    getAllAvailableTools: async () => [],
  } as unknown as NeuroLink;
  return { neurolink, generate };
}

const definition = {
  id: "researcher",
  name: "Researcher",
  description: "finds things",
  instructions: "Find things.",
};

await test("threads abortSignal and the turn budget into generate()", async () => {
  const { neurolink, generate } = makeNeurolink();
  const agent = new Agent(definition, neurolink);
  const controller = new AbortController();

  await agent.execute("find it", {
    abortSignal: controller.signal,
    turnTimeoutMs: 90_000,
    wrapupTimeLeadMs: 10_000,
    stallTimeoutMs: 15_000,
    timeout: 30_000,
  });

  const opts = generate.calls[0][0] as GenerateOptions;
  assert(
    opts.abortSignal === controller.signal,
    "the caller's very signal must be forwarded, not a copy",
  );
  assertEqual(opts.turnTimeoutMs, 90_000, "turnTimeoutMs must be threaded");
  assertEqual(
    opts.wrapupTimeLeadMs,
    10_000,
    "wrapupTimeLeadMs must be threaded",
  );
  assertEqual(opts.stallTimeoutMs, 15_000, "stallTimeoutMs must be threaded");
  assertEqual(opts.timeout, 30_000, "timeout must be threaded");
});

await test("an already-aborted parent stops execute() before any model call", async () => {
  const { neurolink, generate } = makeNeurolink();
  const agent = new Agent(definition, neurolink);
  const controller = new AbortController();
  controller.abort();

  const result = await agent.execute("find it", {
    abortSignal: controller.signal,
  });

  assertEqual(
    result.status,
    "error",
    "an aborted parent must not report success",
  );
  assert(
    (result.error ?? "").includes("aborted"),
    `the error must name the abort, got: ${result.error}`,
  );
  assertEqual(
    generate.callCount,
    0,
    "no ghost run: the model must never be called",
  );
});

await test("an already-aborted parent stops stream() before any model call too", async () => {
  const { neurolink, generate } = makeNeurolink();
  const streamFn = spy(() => undefined);
  (neurolink as unknown as { stream: unknown }).stream = streamFn.fn;
  const agent = new Agent(definition, neurolink);
  const controller = new AbortController();
  controller.abort();

  const chunks: { type: string }[] = [];
  for await (const chunk of agent.stream("find it", {
    abortSignal: controller.signal,
  })) {
    chunks.push(chunk);
  }

  assert(
    chunks.some((c) => c.type === "agent-error"),
    "the stream must emit an agent-error chunk",
  );
  assertEqual(streamFn.callCount, 0, "no ghost run on the stream path");
  assertEqual(generate.callCount, 0, "and none on the generate path either");
});

await test("passes real toolExecutions and stopReason through to AgentResult", async () => {
  const { neurolink } = makeNeurolink();
  const agent = new Agent(definition, neurolink);
  const result = await agent.execute("find it");

  assertDeepEqual(
    result.toolExecutions,
    [record],
    "tool executions must survive verbatim",
  );
  assertEqual(result.stopReason, "time-limit", "stopReason must be carried");
  assertDeepEqual(
    result.usage,
    { input: 1, output: 2, total: 3 },
    "usage must be carried",
  );
});

await test("AgentNetwork uses the declared inputSchema and passes the parsed object through", async () => {
  const executed: unknown[] = [];
  const inputSchema = z.object({ query: z.string(), limit: z.number() });

  // Assertions inside a mock would be swallowed by whatever catches around it,
  // so record what was observed and assert on it afterwards.
  const observed: { toolPresent?: boolean; schemaIsSame?: boolean } = {};

  const routerGenerate = async (opts: GenerateOptions) => {
    const tools = opts.tools as Record<string, Tool>;
    const agentTool = tools["agent_researcher"] as Tool & {
      inputSchema?: unknown;
      execute?: (params: unknown) => Promise<unknown>;
    };
    observed.toolPresent = agentTool !== undefined;
    // The declared schema must be used verbatim, not the task-string default.
    observed.schemaIsSame = agentTool?.inputSchema === inputSchema;
    await agentTool?.execute?.({ query: "auth", limit: 3 });
    return {
      content: "router answer",
      provider: "fake",
      model: "fake",
      usage: { input: 1, output: 1, total: 2 },
      toolExecutions: [{ ...record, toolName: "agent_researcher" }],
    } as GenerateResult;
  };

  const agentGenerate = async (opts: GenerateOptions) => {
    executed.push(opts.input?.text);
    return {
      content: "agent answer",
      provider: "fake",
      model: "fake",
    } as GenerateResult;
  };

  const neurolink = {
    // The router call carries agent tools; the sub-agent call does not.
    generate: async (opts: GenerateOptions) =>
      opts.tools ? routerGenerate(opts) : agentGenerate(opts),
    getAllAvailableTools: async () => [],
  } as unknown as NeuroLink;

  const network = new AgentNetwork(
    { name: "net", agents: [{ ...definition, inputSchema }] },
    neurolink,
  );

  const result = await network.execute({ message: "do the thing" });

  assertEqual(result.status, "completed", "the network run must complete");
  assert(observed.toolPresent === true, "the agent tool must be exposed");
  assert(
    observed.schemaIsSame === true,
    "the declared inputSchema must be used verbatim",
  );
  assert(
    String(executed[0]).includes('"query":"auth"'),
    `the structured object must reach the agent's prompt, got: ${String(executed[0])}`,
  );

  // Trace steps must consume the ToolExecutionRecord shape.
  const step = result.trace.steps[0] as {
    primitive?: { id?: string };
    input?: unknown;
    duration?: number;
  };
  assertEqual(step.primitive?.id, "researcher", "the step must name the agent");
  assertDeepEqual(
    step.input,
    { q: "x" },
    "the step must carry the tool params",
  );
  assertEqual(step.duration, 12, "the step must carry the duration");
});

await runSuite();

#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Host-Loop Delegation (N5)
 *
 * Per-turn cap counting, depth withholding, the process-wide pool with queue
 * timeout, open-handle conflicts scoped to host + session, and the recovery
 * text every refusal must carry.
 *
 * Migrated from test/agentDelegation.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-agent-delegation.ts
 */

import {
  acquireDelegationSlot,
  beginDelegationTurn,
  registerAgentTool,
  resetDelegationPoolForTests,
  runWithNestedDelegationDepth,
} from "../src/lib/agent/agentToolRegistrar.js";
import {
  runIsolatedAgent,
  stopIsolatedAgent,
} from "../src/lib/agent/isolatedAgentRunner.js";
import type { NeuroLink } from "../src/lib/neurolink.js";
import type {
  GenerateOptions,
  GenerateResult,
  IsolatedAgentDefinition,
} from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { spy } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("Agent Delegation (N5)");

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (params: unknown, context?: unknown) => Promise<unknown>;
};

type WorkerRecord = { setToolContext: ReturnType<typeof spy> };

function makeDelegationHost(args?: {
  toolContext?: Record<string, unknown>;
  workerBehavior?: (opts: GenerateOptions) => Partial<GenerateResult>;
  workerDelayMs?: number;
}): {
  host: NeuroLink;
  tools: Map<string, RegisteredTool>;
  workers: WorkerRecord[];
} {
  const tools = new Map<string, RegisteredTool>();
  // Vitest read the factory's return value off `.mock.results`; keep the
  // created workers explicitly instead so the assertions stay direct.
  const workers: WorkerRecord[] = [];
  const behavior =
    args?.workerBehavior ??
    (() => ({ content: "worker done", stopReason: "completed" as const }));

  const host = {
    registerTool: (name: string, tool: RegisteredTool) => {
      tools.set(name, tool);
    },
    getToolContext: () => args?.toolContext,
    createWorkerInstance: () => {
      const setToolContext = spy((_ctx: unknown) => undefined);
      workers.push({ setToolContext });
      return {
        setToolContext: setToolContext.fn,
        dispose: async () => undefined,
        generate: async (opts: GenerateOptions) => {
          if (args?.workerDelayMs) {
            await new Promise((r) => setTimeout(r, args.workerDelayMs));
          }
          return {
            content: "",
            provider: "fake",
            model: "fake",
            usage: { input: 1, output: 1, total: 2 },
            ...behavior(opts),
          } as GenerateResult;
        },
      };
    },
  } as unknown as NeuroLink;

  return { host, tools, workers };
}

const def: IsolatedAgentDefinition = {
  id: "code_researcher",
  name: "Code Researcher",
  description: "investigates code",
  instructions: "Investigate.",
};

/** The pool is process-global; every test must start from a clean one. */
const reset = (slots?: number): void => resetDelegationPoolForTests(slots);

// ---------------------------------------------------------------------------
// registerAgentTool
// ---------------------------------------------------------------------------

await test("registers under the definition id by default, with a task schema", () => {
  reset();
  const { host, tools } = makeDelegationHost();
  const { name } = registerAgentTool(host, def);

  assertEqual(
    name,
    "code_researcher",
    "the definition id becomes the tool name",
  );
  const tool = tools.get(name);
  assert(
    (tool?.description ?? "").includes("Code Researcher"),
    "the description must name the agent",
  );
  assertEqual(
    (tool?.inputSchema as { type?: string })?.type,
    "object",
    "the schema must be an object schema",
  );
  assertEqual(
    JSON.stringify((tool?.inputSchema as { required?: string[] })?.required),
    JSON.stringify(["task"]),
    "task must be the required field",
  );
});

await test("rejects duplicate registrations on the same instance", () => {
  reset();
  const { host } = makeDelegationHost();
  registerAgentTool(host, def);

  let caught: unknown;
  try {
    registerAgentTool(host, def);
  } catch (error) {
    caught = error;
  }
  assert(
    caught instanceof Error && /already registered/.test(caught.message),
    `a second registration must be rejected, got: ${String(caught)}`,
  );
});

// ---------------------------------------------------------------------------
// Per-turn delegation caps
// ---------------------------------------------------------------------------

await test("counts per top-level generate and refuses with recovery text at the cap", async () => {
  reset();
  const { host, tools } = makeDelegationHost();
  registerAgentTool(host, def, { maxDelegationsPerTurn: 2 });
  const tool = tools.get("code_researcher")!;

  const scope = beginDelegationTurn(host, {});
  assert(scope !== null, "a top-level generate must open a delegation turn");
  await scope!.run(async () => {
    const first = (await tool.execute({ task: "a" })) as { status?: string };
    const second = (await tool.execute({ task: "b" })) as { status?: string };
    assertEqual(first.status, "completed", "the first delegation is allowed");
    assertEqual(second.status, "completed", "the second reaches the cap");

    const third = (await tool.execute({ task: "c" })) as {
      isError?: boolean;
      error?: string;
    };
    assertEqual(third.isError, true, "the third must be refused");
    // A refusal that does not tell the model what to do instead just gets
    // retried, so the recovery wording is the point of the test.
    assert(
      (third.error ?? "").includes("Do not call code_researcher again"),
      "the refusal must tell the model to stop calling the tool",
    );
    assert(
      (third.error ?? "").includes("synthesize from the investigations"),
      "…and what to do instead",
    );
  });

  // A NEW turn resets the counter.
  const scope2 = beginDelegationTurn(host, {});
  await scope2!.run(async () => {
    const again = (await tool.execute({ task: "d" })) as { status?: string };
    assertEqual(again.status, "completed", "a fresh turn starts from zero");
  });
});

await test("nested scopes share the top-level turn's counters", async () => {
  reset();
  const { host } = makeDelegationHost();
  registerAgentTool(host, def, { maxDelegationsPerTurn: 1 });
  const outer = beginDelegationTurn(host, {});
  await outer!.run(async () => {
    // A re-entrant generate calls beginDelegationTurn again; it must return
    // null so the inner call shares this turn's counters rather than getting
    // a fresh allowance.
    assertEqual(
      beginDelegationTurn(host, {}),
      null,
      "a nested turn must not open a second budget",
    );
  });
});

// ---------------------------------------------------------------------------
// Depth withholding
// ---------------------------------------------------------------------------

await test("withholds depth-limited agent tools from the request via excludeTools", () => {
  reset();
  const { host } = makeDelegationHost({ toolContext: { agentDepth: 1 } });
  registerAgentTool(host, def, { maxDepth: 1 });
  const scope = beginDelegationTurn(host, { maxSteps: 3 });

  assert(
    ((scope!.options as GenerateOptions).excludeTools ?? []).includes(
      "code_researcher",
    ),
    "at the depth limit the tool must not even be offered",
  );
});

await test("leaves the tool available below the depth limit", () => {
  reset();
  const { host } = makeDelegationHost({ toolContext: { agentDepth: 0 } });
  registerAgentTool(host, def, { maxDepth: 1 });
  const scope = beginDelegationTurn(host, { maxSteps: 3 });

  assert(
    !((scope!.options as GenerateOptions).excludeTools ?? []).includes(
      "code_researcher",
    ),
    "below the limit the tool must stay offered",
  );
});

await test("execute refuses at the depth limit as defense in depth", async () => {
  reset();
  const { host, tools } = makeDelegationHost({
    toolContext: { agentDepth: 2 },
  });
  registerAgentTool(host, def, { maxDepth: 2 });

  const result = (await tools
    .get("code_researcher")!
    .execute({ task: "x" })) as {
    isError?: boolean;
    error?: string;
  };
  assertEqual(result.isError, true, "withholding is not enough on its own");
  assert(
    (result.error ?? "").includes("depth limit"),
    "the refusal must name the depth limit",
  );
});

await test("the delegated worker receives agentDepth + 1 in its tool context", async () => {
  reset();
  const { host, tools, workers } = makeDelegationHost({
    toolContext: { agentDepth: 0 },
  });
  registerAgentTool(host, def, { maxDepth: 3 });
  await tools.get("code_researcher")!.execute({ task: "x" });

  assertEqual(workers.length, 1, "one delegation creates one worker");
  const contexts = workers[0].setToolContext.calls.map((c) => c[0]);
  assert(
    contexts.some((ctx) => (ctx as { agentDepth?: number })?.agentDepth === 1),
    `the worker must be told it is one level deeper, got: ${JSON.stringify(contexts)}`,
  );
});

// ---------------------------------------------------------------------------
// Process-wide delegation pool
// ---------------------------------------------------------------------------

await test("bounds concurrency and refuses with recovery text on queue timeout", async () => {
  reset(1);
  const { host, tools } = makeDelegationHost({ workerDelayMs: 200 });
  registerAgentTool(host, def, { poolQueueTimeoutMs: 30 });
  const tool = tools.get("code_researcher")!;

  const busy = tool.execute({ task: "long" });
  // Give the first call time to take the only slot.
  await new Promise((r) => setTimeout(r, 20));
  const refused = (await tool.execute({ task: "queued" })) as {
    isError?: boolean;
    error?: string;
  };

  assertEqual(refused.isError, true, "the queued call must time out");
  assert(
    (refused.error ?? "").includes("delegation slots are busy"),
    "the refusal must explain the pool is saturated",
  );
  assert(
    (refused.error ?? "").includes("synthesize"),
    "…and give the model a way forward",
  );
  await busy;
});

await test("released slots grant queued waiters", async () => {
  reset(1);
  const releaseFirst = await acquireDelegationSlot(1_000);
  const secondPromise = acquireDelegationSlot(1_000);
  releaseFirst();
  const releaseSecond = await secondPromise;
  releaseSecond();
  // Reaching here at all is the assertion: a waiter that is never granted
  // would hang until the harness's per-test timeout.
  assert(true, "the queued waiter was granted the released slot");
});

// ---------------------------------------------------------------------------
// Open-handle conflicts (host + session scoped)
// ---------------------------------------------------------------------------

await test("refuses only the SAME host + sessionId; other sessions proceed", async () => {
  reset();
  const { host, tools } = makeDelegationHost({
    workerBehavior: () => ({ content: "leg", stopReason: "step-cap" }),
  });
  registerAgentTool(host, def, { leg: { budgetMs: 5_000 } });
  const tool = tools.get("code_researcher")!;

  // Session A opens a leashed handle…
  const first = (await tool.execute(
    { task: "start" },
    { sessionId: "thread-A" },
  )) as { status?: string; handle?: string };
  assertEqual(first.status, "in_progress", "a leashed run stays open");
  assert(Boolean(first.handle), "an open run must return a handle");

  // …so session A's next delegation is refused with the handle hint…
  const refused = (await tool.execute(
    { task: "again" },
    { sessionId: "thread-A" },
  )) as { isError?: boolean; error?: string };
  assertEqual(refused.isError, true, "the same session must be refused");
  assert(
    (refused.error ?? "").includes("continue it via its handle"),
    "the refusal must point at the open handle",
  );

  // …but session B, a different conversation, is NOT refused.
  const otherSession = (await tool.execute(
    { task: "unrelated" },
    { sessionId: "thread-B" },
  )) as { status?: string; handle?: string };
  assertEqual(
    otherSession.status,
    "in_progress",
    "a different session must not be blocked by session A's handle",
  );

  await stopIsolatedAgent(host, first.handle!);
  await stopIsolatedAgent(host, otherSession.handle!);
});

await test("a handle on a DIFFERENT host never causes a refusal", async () => {
  reset();
  const { host: hostA } = makeDelegationHost({
    workerBehavior: () => ({ content: "leg", stopReason: "step-cap" }),
  });
  const leg = await runIsolatedAgent(hostA, def, "start", {
    leg: { budgetMs: 5_000 },
    toolContext: { sessionId: "thread-A" },
  });
  assertEqual(leg.status, "in_progress", "host A holds an open handle");

  const { host: hostB, tools } = makeDelegationHost();
  registerAgentTool(hostB, def);
  const result = (await tools
    .get("code_researcher")!
    .execute({ task: "go" }, { sessionId: "thread-A" })) as { status?: string };

  assertEqual(
    result.status,
    "completed",
    "the same sessionId on another host must be unaffected",
  );
  await stopIsolatedAgent(hostA, leg.handle!);
});

// ---------------------------------------------------------------------------
// Refusals do not consume the per-turn cap
// ---------------------------------------------------------------------------

await test("a depth-refused call leaves the cap intact for a later valid call", async () => {
  reset();
  const { host, tools } = makeDelegationHost();
  registerAgentTool(host, def, { maxDelegationsPerTurn: 1, maxDepth: 1 });
  const tool = tools.get("code_researcher")!;

  const scope = beginDelegationTurn(host, {});
  await scope!.run(async () => {
    // Refused on depth (the execution context carries agentDepth 1)…
    const refused = (await tool.execute(
      { task: "nested" },
      { agentDepth: 1 },
    )) as { isError?: boolean; error?: string };
    assertEqual(refused.isError, true, "the nested call is refused");
    assert(
      (refused.error ?? "").includes("depth limit"),
      "refused for depth, not for the cap",
    );

    // …and the single per-turn delegation is still available.
    const allowed = (await tool.execute({ task: "top" })) as {
      status?: string;
    };
    assertEqual(
      allowed.status,
      "completed",
      "a refusal must not have spent the turn's one delegation",
    );
  });
});

// ---------------------------------------------------------------------------
// Nested delegations bypass the pool
// ---------------------------------------------------------------------------

await test("a depth>0 delegation proceeds while the pool is fully held", async () => {
  reset(1);
  const { host, tools } = makeDelegationHost({ workerDelayMs: 150 });
  registerAgentTool(host, def, { poolQueueTimeoutMs: 30 });
  const tool = tools.get("code_researcher")!;

  const outerBusy = tool.execute({ task: "outer" });
  await new Promise((r) => setTimeout(r, 20));

  // The outer delegation holds the only slot. A nested call must not queue
  // behind it, or the two would deadlock against each other.
  const nested = (await tool.execute({ task: "inner" }, { agentDepth: 1 })) as {
    status?: string;
  };
  assertEqual(
    nested.status,
    "completed",
    "the nested call must bypass the pool",
  );
  await outerBusy;
});

await test("runWithNestedDelegationDepth makes inner delegations nested", async () => {
  // Simulates AgentNetwork's composition: the network's tool holds a pool slot
  // and the agent's own generate delegates via a registered agent tool. The
  // inner call must take the nested path (pool bypass) AND still hit depth
  // limits, with no execution-context agentDepth anywhere.
  reset(1);
  const { host, tools } = makeDelegationHost();
  registerAgentTool(host, def, { poolQueueTimeoutMs: 30, maxDepth: 2 });
  const tool = tools.get("code_researcher")!;

  const scope = beginDelegationTurn(host, {});
  await scope!.run(async () => {
    // The outer network delegation holds the only slot for its duration…
    const releaseOuter = await acquireDelegationSlot(1_000);
    try {
      // …and the agent's inner delegation, one level deeper, bypasses it.
      const inner = (await runWithNestedDelegationDepth(() =>
        tool.execute({ task: "inner" }),
      )) as { status?: string };
      assertEqual(inner.status, "completed", "one level deeper is allowed");

      // Two levels deeper hits maxDepth and is refused with recovery text.
      const tooDeep = (await runWithNestedDelegationDepth(() =>
        runWithNestedDelegationDepth(() => tool.execute({ task: "too deep" })),
      )) as { isError?: boolean; error?: string };
      assertEqual(tooDeep.isError, true, "two levels deeper is refused");
      assert(
        (tooDeep.error ?? "").includes("depth limit"),
        "the refusal must name the depth limit",
      );
    } finally {
      releaseOuter();
    }
  });
});

await runSuite();

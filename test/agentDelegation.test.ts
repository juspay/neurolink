/**
 * Vitest tests for host-loop delegation (N5): per-turn cap counting, depth
 * withholding, the process-wide pool with queue timeout, open-handle
 * conflicts, and refusal recovery text.
 *
 * Run:
 *   pnpm exec vitest run test/agentDelegation.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

type RegisteredTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (params: unknown, context?: unknown) => Promise<unknown>;
};

function makeDelegationHost(args?: {
  toolContext?: Record<string, unknown>;
  workerBehavior?: (opts: GenerateOptions) => Partial<GenerateResult>;
  workerDelayMs?: number;
}): { host: NeuroLink; tools: Map<string, RegisteredTool> } {
  const tools = new Map<string, RegisteredTool>();
  const behavior =
    args?.workerBehavior ??
    (() => ({ content: "worker done", stopReason: "completed" as const }));
  const host = {
    registerTool: vi.fn((name: string, tool: RegisteredTool) => {
      tools.set(name, tool);
    }),
    getToolContext: vi.fn(() => args?.toolContext),
    createWorkerInstance: vi.fn(() => ({
      setToolContext: vi.fn(),
      dispose: vi.fn(async () => undefined),
      generate: vi.fn(async (opts: GenerateOptions) => {
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
      }),
    })),
  } as unknown as NeuroLink;
  return { host, tools };
}

const def: IsolatedAgentDefinition = {
  id: "code_researcher",
  name: "Code Researcher",
  description: "investigates code",
  instructions: "Investigate.",
};

beforeEach(() => {
  resetDelegationPoolForTests();
});

afterEach(() => {
  resetDelegationPoolForTests();
});

describe("registerAgentTool", () => {
  it("registers under the definition id by default, with a task schema", () => {
    const { host, tools } = makeDelegationHost();
    const { name } = registerAgentTool(host, def);
    expect(name).toBe("code_researcher");
    const tool = tools.get(name);
    expect(tool?.description).toContain("Code Researcher");
    expect(tool?.inputSchema).toMatchObject({
      type: "object",
      required: ["task"],
    });
  });

  it("rejects duplicate registrations on the same instance", () => {
    const { host } = makeDelegationHost();
    registerAgentTool(host, def);
    expect(() => registerAgentTool(host, def)).toThrow(/already registered/);
  });
});

describe("per-turn delegation caps", () => {
  it("counts per top-level generate and refuses with recovery text at the cap", async () => {
    const { host, tools } = makeDelegationHost();
    registerAgentTool(host, def, { maxDelegationsPerTurn: 2 });
    const tool = tools.get("code_researcher")!;

    const scope = beginDelegationTurn(host, {});
    expect(scope).not.toBeNull();
    await scope!.run(async () => {
      const first = (await tool.execute({ task: "a" })) as { status?: string };
      const second = (await tool.execute({ task: "b" })) as {
        status?: string;
      };
      expect(first.status).toBe("completed");
      expect(second.status).toBe("completed");

      const third = (await tool.execute({ task: "c" })) as {
        isError?: boolean;
        error?: string;
      };
      expect(third.isError).toBe(true);
      expect(third.error).toContain("Do not call code_researcher again");
      expect(third.error).toContain("synthesize from the investigations");
    });

    // A NEW turn resets the counter.
    const scope2 = beginDelegationTurn(host, {});
    await scope2!.run(async () => {
      const again = (await tool.execute({ task: "d" })) as { status?: string };
      expect(again.status).toBe("completed");
    });
  });

  it("nested scopes share the top-level turn's counters", async () => {
    const { host } = makeDelegationHost();
    registerAgentTool(host, def, { maxDelegationsPerTurn: 1 });
    const outer = beginDelegationTurn(host, {});
    await outer!.run(async () => {
      // Re-entrant generate would call beginDelegationTurn again — it must
      // return null so the inner call shares this turn's counters.
      expect(beginDelegationTurn(host, {})).toBeNull();
    });
  });
});

describe("depth withholding", () => {
  it("withholds depth-limited agent tools from the request via excludeTools", () => {
    const { host } = makeDelegationHost({ toolContext: { agentDepth: 1 } });
    registerAgentTool(host, def, { maxDepth: 1 });
    const scope = beginDelegationTurn(host, { maxSteps: 3 });
    expect((scope!.options as GenerateOptions).excludeTools).toContain(
      "code_researcher",
    );
  });

  it("leaves the tool available below the limit", () => {
    const { host } = makeDelegationHost({ toolContext: { agentDepth: 0 } });
    registerAgentTool(host, def, { maxDepth: 1 });
    const scope = beginDelegationTurn(host, { maxSteps: 3 });
    expect(
      (scope!.options as GenerateOptions).excludeTools ?? [],
    ).not.toContain("code_researcher");
  });

  it("execute refuses at the depth limit as defense in depth", async () => {
    const { host, tools } = makeDelegationHost({
      toolContext: { agentDepth: 2 },
    });
    registerAgentTool(host, def, { maxDepth: 2 });
    const result = (await tools
      .get("code_researcher")!
      .execute({ task: "x" })) as { isError?: boolean; error?: string };
    expect(result.isError).toBe(true);
    expect(result.error).toContain("depth limit");
  });

  it("the delegated worker receives agentDepth + 1 in its tool context", async () => {
    const { host, tools } = makeDelegationHost({
      toolContext: { agentDepth: 0 },
    });
    registerAgentTool(host, def, { maxDepth: 3 });
    await tools.get("code_researcher")!.execute({ task: "x" });
    const worker = (
      host.createWorkerInstance as unknown as ReturnType<typeof vi.fn>
    ).mock.results[0].value as { setToolContext: ReturnType<typeof vi.fn> };
    expect(worker.setToolContext).toHaveBeenCalledWith(
      expect.objectContaining({ agentDepth: 1 }),
    );
  });
});

describe("process-wide delegation pool", () => {
  it("bounds concurrency and refuses with recovery text on queue timeout", async () => {
    resetDelegationPoolForTests(1);
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
    expect(refused.isError).toBe(true);
    expect(refused.error).toContain("delegation slots are busy");
    expect(refused.error).toContain("synthesize");
    await busy;
  });

  it("released slots grant queued waiters", async () => {
    resetDelegationPoolForTests(1);
    const releaseFirst = await acquireDelegationSlot(1_000);
    const secondPromise = acquireDelegationSlot(1_000);
    releaseFirst();
    const releaseSecond = await secondPromise;
    releaseSecond();
  });
});

describe("open-handle conflict (host + session scoped)", () => {
  it("refuses only the SAME host + sessionId; other sessions proceed", async () => {
    const { host, tools } = makeDelegationHost({
      workerBehavior: () => ({ content: "leg", stopReason: "step-cap" }),
    });
    registerAgentTool(host, def, { leg: { budgetMs: 5_000 } });
    const tool = tools.get("code_researcher")!;

    // Session A opens a leashed handle...
    const first = (await tool.execute(
      { task: "start" },
      { sessionId: "thread-A" },
    )) as { status?: string; handle?: string };
    expect(first.status).toBe("in_progress");
    expect(first.handle).toBeTruthy();

    // ...so session A's next delegation is refused with the handle hint...
    const refused = (await tool.execute(
      { task: "again" },
      { sessionId: "thread-A" },
    )) as { isError?: boolean; error?: string };
    expect(refused.isError).toBe(true);
    expect(refused.error).toContain("continue it via its handle");

    // ...but session B (a different conversation) is NOT refused.
    const otherSession = (await tool.execute(
      { task: "unrelated" },
      { sessionId: "thread-B" },
    )) as { status?: string; handle?: string };
    expect(otherSession.status).toBe("in_progress");

    await stopIsolatedAgent(host, first.handle!);
    await stopIsolatedAgent(host, otherSession.handle!);
  });

  it("a handle on a DIFFERENT host never causes a refusal", async () => {
    const { host: hostA } = makeDelegationHost({
      workerBehavior: () => ({ content: "leg", stopReason: "step-cap" }),
    });
    const leg = await runIsolatedAgent(hostA, def, "start", {
      leg: { budgetMs: 5_000 },
      toolContext: { sessionId: "thread-A" },
    });
    expect(leg.status).toBe("in_progress");

    const { host: hostB, tools } = makeDelegationHost();
    registerAgentTool(hostB, def);
    const result = (await tools
      .get("code_researcher")!
      .execute({ task: "go" }, { sessionId: "thread-A" })) as {
      status?: string;
    };
    expect(result.status).toBe("completed");

    await stopIsolatedAgent(hostA, leg.handle!);
  });
});

describe("refusals do not consume the per-turn cap", () => {
  it("a depth-refused call leaves the cap intact for a later valid call", async () => {
    const { host, tools } = makeDelegationHost();
    registerAgentTool(host, def, {
      maxDelegationsPerTurn: 1,
      maxDepth: 1,
    });
    const tool = tools.get("code_researcher")!;

    const scope = beginDelegationTurn(host, {});
    await scope!.run(async () => {
      // Refused on depth (execution context carries agentDepth 1)...
      const refused = (await tool.execute(
        { task: "nested" },
        { agentDepth: 1 },
      )) as { isError?: boolean; error?: string };
      expect(refused.isError).toBe(true);
      expect(refused.error).toContain("depth limit");

      // ...and the single per-turn delegation is still available.
      const allowed = (await tool.execute({ task: "top" })) as {
        status?: string;
      };
      expect(allowed.status).toBe("completed");
    });
  });
});

describe("nested delegations bypass the pool", () => {
  it("a depth>0 delegation proceeds while the pool is fully held", async () => {
    resetDelegationPoolForTests(1);
    const { host, tools } = makeDelegationHost({ workerDelayMs: 150 });
    registerAgentTool(host, def, { poolQueueTimeoutMs: 30 });
    const tool = tools.get("code_researcher")!;

    const outerBusy = tool.execute({ task: "outer" });
    await new Promise((r) => setTimeout(r, 20));

    // Nested call (agentDepth 1) must not queue behind the full pool —
    // the outer delegation already holds the only slot.
    const nested = (await tool.execute(
      { task: "inner" },
      { agentDepth: 1 },
    )) as { status?: string };
    expect(nested.status).toBe("completed");
    await outerBusy;
  });

  it("composed path: runWithNestedDelegationDepth makes inner delegations nested", async () => {
    // Simulates AgentNetwork's composition: the network's tool holds a pool
    // slot and the agent's own generate delegates via a registered agent
    // tool — the inner call must take the nested path (pool bypass) AND hit
    // depth limits, without any execution-context agentDepth.
    resetDelegationPoolForTests(1);
    const { host, tools } = makeDelegationHost();
    registerAgentTool(host, def, {
      poolQueueTimeoutMs: 30,
      maxDepth: 2,
    });
    const tool = tools.get("code_researcher")!;

    const scope = beginDelegationTurn(host, {});
    await scope!.run(async () => {
      // Outer network delegation holds the only slot for its duration…
      const releaseOuter = await acquireDelegationSlot(1_000);
      try {
        // …and the agent's inner delegation, one level deeper, bypasses it.
        const inner = (await runWithNestedDelegationDepth(async () => {
          return tool.execute({ task: "inner" });
        })) as { status?: string };
        expect(inner.status).toBe("completed");

        // Two levels deeper hits maxDepth and is refused with recovery text.
        const tooDeep = (await runWithNestedDelegationDepth(() =>
          runWithNestedDelegationDepth(async () => {
            return tool.execute({ task: "too deep" });
          }),
        )) as { isError?: boolean; error?: string };
        expect(tooDeep.isError).toBe(true);
        expect(tooDeep.error).toContain("depth limit");
      } finally {
        releaseOuter();
      }
    });
  });
});

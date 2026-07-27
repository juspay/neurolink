/**
 * Vitest tests for N1 agent plumbing: abortSignal + turn-budget threading
 * from AgentExecutionOptions into generate(), the no-ghost-runs pre-check,
 * AgentResult stopReason/toolExecutions pass-through, and AgentNetwork's
 * inputSchema-honoring agent tools.
 *
 * Run:
 *   pnpm exec vitest run test/agentPlumbing.test.ts
 */

import { describe, expect, it, vi } from "vitest";
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

const record: ToolExecutionRecord = {
  toolName: "grep",
  params: { q: "x" },
  resultText: "hit",
  isError: false,
  startedAt: 1000,
  durationMs: 12,
};

function makeNeurolink(partial?: Partial<GenerateResult>): {
  neurolink: NeuroLink;
  generate: ReturnType<typeof vi.fn>;
} {
  const generate = vi.fn(async (_opts: GenerateOptions) => {
    return {
      content: "agent answer",
      provider: "fake",
      model: "fake",
      usage: { input: 1, output: 2, total: 3 },
      toolsUsed: ["grep"],
      toolExecutions: [record],
      stopReason: "time-limit",
      ...partial,
    } as GenerateResult;
  });
  const neurolink = {
    generate,
    getAllAvailableTools: vi.fn(async () => []),
  } as unknown as NeuroLink;
  return { neurolink, generate };
}

const definition = {
  id: "researcher",
  name: "Researcher",
  description: "finds things",
  instructions: "Find things.",
};

describe("Agent.execute — N1 plumbing", () => {
  it("threads abortSignal and turn-budget options into generate()", async () => {
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

    const opts = generate.mock.calls[0][0] as GenerateOptions;
    expect(opts.abortSignal).toBe(controller.signal);
    expect(opts.turnTimeoutMs).toBe(90_000);
    expect(opts.wrapupTimeLeadMs).toBe(10_000);
    expect(opts.stallTimeoutMs).toBe(15_000);
    expect(opts.timeout).toBe(30_000);
  });

  it("an already-aborted parent stops the agent before any model call", async () => {
    const { neurolink, generate } = makeNeurolink();
    const agent = new Agent(definition, neurolink);
    const controller = new AbortController();
    controller.abort();

    const result = await agent.execute("find it", {
      abortSignal: controller.signal,
    });
    expect(result.status).toBe("error");
    expect(result.error).toContain("aborted");
    expect(generate).not.toHaveBeenCalled();
  });

  it("an already-aborted parent stops stream() before any model call too", async () => {
    const { neurolink, generate } = makeNeurolink();
    const streamFn = vi.fn();
    (neurolink as unknown as { stream: typeof streamFn }).stream = streamFn;
    const agent = new Agent(definition, neurolink);
    const controller = new AbortController();
    controller.abort();

    const chunks = [];
    for await (const chunk of agent.stream("find it", {
      abortSignal: controller.signal,
    })) {
      chunks.push(chunk);
    }
    expect(chunks.some((c) => c.type === "agent-error")).toBe(true);
    expect(streamFn).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("passes real toolExecutions and stopReason through to AgentResult", async () => {
    const { neurolink } = makeNeurolink();
    const agent = new Agent(definition, neurolink);
    const result = await agent.execute("find it");
    expect(result.toolExecutions).toEqual([record]);
    expect(result.stopReason).toBe("time-limit");
    expect(result.usage).toEqual({ input: 1, output: 2, total: 3 });
  });
});

describe("AgentNetwork — inputSchema honored on agent tools", () => {
  it("uses the declared inputSchema and passes the parsed object through", async () => {
    const executed: unknown[] = [];
    const inputSchema = z.object({
      query: z.string(),
      limit: z.number(),
    });

    const generate = vi.fn(async (opts: GenerateOptions) => {
      const tools = opts.tools as Record<string, Tool>;
      const agentTool = tools["agent_researcher"] as Tool & {
        inputSchema?: unknown;
        execute?: (params: unknown) => Promise<unknown>;
      };
      expect(agentTool).toBeDefined();
      // The declared schema is used verbatim (not the task-string default).
      expect(agentTool.inputSchema).toBe(inputSchema);
      // Structured params pass through to the agent untouched.
      await agentTool.execute?.({ query: "auth", limit: 3 });
      return {
        content: "router answer",
        provider: "fake",
        model: "fake",
        usage: { input: 1, output: 1, total: 2 },
        toolExecutions: [{ ...record, toolName: "agent_researcher" }],
      } as GenerateResult;
    });

    const agentGenerate = vi.fn(async (opts: GenerateOptions) => {
      executed.push(opts.input?.text);
      return {
        content: "agent answer",
        provider: "fake",
        model: "fake",
      } as GenerateResult;
    });

    const neurolink = {
      generate: vi.fn(async (opts: GenerateOptions) =>
        // Router call carries agent tools; the sub-agent call does not.
        opts.tools ? generate(opts) : agentGenerate(opts),
      ),
      getAllAvailableTools: vi.fn(async () => []),
    } as unknown as NeuroLink;

    const network = new AgentNetwork(
      {
        name: "net",
        agents: [{ ...definition, inputSchema }],
      },
      neurolink,
    );

    const result = await network.execute({ message: "do the thing" });
    expect(result.status).toBe("completed");
    // The agent received the structured object serialized into its prompt.
    expect(String(executed[0])).toContain('"query":"auth"');
    // Trace steps consume the new ToolExecutionRecord shape.
    expect(result.trace.steps[0]).toMatchObject({
      primitive: { id: "researcher" },
      input: { q: "x" },
      duration: 12,
    });
  });
});

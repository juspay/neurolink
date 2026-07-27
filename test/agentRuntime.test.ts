/**
 * Vitest tests for runIsolatedAgent (N4): budget/wrap-up behavior, abort
 * chaining, recovery re-asks, delivery guarantee, waste signatures, and the
 * leg/handle lifecycle including TTL expiry (fake timers).
 *
 * The host/worker are scripted fakes — these are unit tests of the runner's
 * orchestration contract, not provider integration tests.
 *
 * Run:
 *   pnpm exec vitest run test/agentRuntime.test.ts
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  continueIsolatedAgent,
  runIsolatedAgent,
  stopIsolatedAgent,
} from "../src/lib/agent/isolatedAgentRunner.js";
import type { NeuroLink } from "../src/lib/neurolink.js";
import type {
  AgentRunEvent,
  GenerateOptions,
  GenerateResult,
  IsolatedAgentDefinition,
  ToolExecutionRecord,
} from "../src/lib/types/index.js";

type GenerateScript = (
  opts: GenerateOptions,
  info: { phase: "research" | "extraction" | "next-plan"; call: number },
) => Promise<Partial<GenerateResult>> | Partial<GenerateResult>;

type FakeWorker = {
  generate: ReturnType<typeof vi.fn>;
  setToolContext: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  toolContext?: Record<string, unknown>;
};

function classifyCall(
  opts: GenerateOptions,
): "research" | "extraction" | "next-plan" {
  const text = opts.input?.text ?? "";
  if (text.includes("next concrete step")) {
    return "next-plan";
  }
  return opts.disableTools ? "extraction" : "research";
}

/** Simulate a tool execution flowing through the N2 capture callback. */
function simulateToolCall(
  opts: GenerateOptions,
  record: Partial<ToolExecutionRecord> & { toolName: string },
): void {
  opts.toolExecutionCapture?.onRecord?.({
    params: {},
    resultText: "result",
    isError: false,
    startedAt: Date.now(),
    durationMs: 5,
    ...record,
  } as ToolExecutionRecord);
}

function makeHost(script: GenerateScript): {
  host: NeuroLink;
  workers: FakeWorker[];
} {
  const workers: FakeWorker[] = [];
  const host = {
    createWorkerInstance: vi.fn(() => {
      let calls = 0;
      const worker: FakeWorker = {
        setToolContext: vi.fn((ctx: Record<string, unknown>) => {
          worker.toolContext = ctx;
        }),
        dispose: vi.fn(async () => undefined),
        generate: vi.fn(async (opts: GenerateOptions) => {
          calls++;
          const phase = classifyCall(opts);
          const partial = await script(opts, { phase, call: calls });
          return {
            content: "",
            provider: "fake",
            model: "fake-model",
            usage: { input: 10, output: 5, total: 15 },
            ...partial,
          } as GenerateResult;
        }),
      };
      workers.push(worker);
      return worker;
    }),
  } as unknown as NeuroLink;
  return { host, workers };
}

const plainDef: IsolatedAgentDefinition = {
  id: "researcher",
  name: "Researcher",
  description: "test agent",
  instructions: "Investigate things.",
};

const extractionDef: IsolatedAgentDefinition = {
  ...plainDef,
  extraction: {
    schema: z.object({ findings: z.array(z.string()) }),
    shapeDoc: '{ "findings": string[] }',
    maxRetries: 1,
  },
};

afterEach(() => {
  vi.useRealTimers();
});

describe("runIsolatedAgent — core contract", () => {
  it("worker lifecycle: tool context set (sessionId defaulted), disposed in finally", async () => {
    const { host, workers } = makeHost(() => ({
      content: "done",
      stopReason: "completed",
    }));
    const outcome = await runIsolatedAgent(host, plainDef, "look", {
      toolContext: { team: "core" },
    });
    expect(outcome.status).toBe("completed");
    expect(workers).toHaveLength(1);
    expect(workers[0].toolContext).toMatchObject({ team: "core" });
    expect(typeof workers[0].toolContext?.sessionId).toBe("string");
    expect(workers[0].dispose).toHaveBeenCalledTimes(1);
  });

  it("threads budgets/overrides into the research generate", async () => {
    let researchOpts: GenerateOptions | undefined;
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        researchOpts = opts;
      }
      return { content: "ok", stopReason: "completed" };
    });
    await runIsolatedAgent(host, plainDef, "task", {
      overrides: {
        turnTimeoutMs: 30_000,
        stallTimeoutMs: 5_000,
        maxSteps: 7,
        model: "override-model",
      },
    });
    expect(researchOpts?.turnTimeoutMs).toBe(30_000);
    expect(researchOpts?.stallTimeoutMs).toBe(5_000);
    expect(researchOpts?.maxSteps).toBe(7);
    expect(researchOpts?.model).toBe("override-model");
    expect(researchOpts?.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("a budget-capped research turn (stopReason time-limit) yields status partial and a wrapup event", async () => {
    const events: AgentRunEvent[] = [];
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, { toolName: "grep", resultText: "hit" });
        return { content: "partial notes", stopReason: "time-limit" };
      }
      return { content: '{"findings":["hit"]}' };
    });
    const outcome = await runIsolatedAgent(host, extractionDef, "task", {
      onEvent: (e) => events.push(e),
    });
    expect(outcome.status).toBe("partial");
    expect(outcome.stopReason).toBe("time-limit");
    expect(outcome.data).toEqual({ findings: ["hit"] });
    expect(events.map((e) => e.type)).toContain("wrapup");
  });

  it("extraction still runs when the research generate DIED, fed from the records", async () => {
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, {
          toolName: "search",
          resultText: "evidence-42",
        });
        throw new Error("provider exploded");
      }
      // Extraction sees the evidence even though research died.
      expect(opts.input?.text).toContain("evidence-42");
      return { content: '{"findings":["evidence-42"]}' };
    });
    const outcome = await runIsolatedAgent(host, extractionDef, "task");
    expect(outcome.data).toEqual({ findings: ["evidence-42"] });
    expect(outcome.stopReason).toBe("provider-error");
    expect(outcome.status).toBe("partial");
  });

  it("corrective re-ask: validation errors + shapeDoc ride the retry prompt", async () => {
    const extractionPrompts: string[] = [];
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, { toolName: "grep", resultText: "x" });
        return { content: "notes", stopReason: "completed" };
      }
      extractionPrompts.push(opts.input?.text ?? "");
      if (extractionPrompts.length === 1) {
        return { content: '{"findings": "not-an-array"}' };
      }
      return { content: '{"findings":["fixed"]}' };
    });
    const outcome = await runIsolatedAgent(host, extractionDef, "task");
    expect(outcome.status).toBe("completed");
    expect(outcome.data).toEqual({ findings: ["fixed"] });
    expect(extractionPrompts).toHaveLength(2);
    expect(extractionPrompts[1]).toContain("failed validation");
    expect(extractionPrompts[1]).toContain('{ "findings": string[] }');
  });

  it("delivery guarantee: unrecoverable extraction returns a mechanical digest, never empty", async () => {
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, { toolName: "grep", resultText: "useful" });
        simulateToolCall(opts, {
          toolName: "read",
          resultText: "err",
          isError: true,
        });
        return { content: "notes", stopReason: "completed" };
      }
      return { content: "no json at all" };
    });
    const outcome = await runIsolatedAgent(host, extractionDef, "task");
    expect(outcome.status).toBe("partial");
    expect(outcome.extractionError).toBeTruthy();
    const digest = outcome.data as {
      kind: string;
      toolsRun: Record<string, { calls: number; ok: number; failed: number }>;
    };
    expect(digest.kind).toBe("mechanical-digest");
    expect(digest.toolsRun.grep).toEqual({ calls: 1, ok: 1, failed: 0 });
    expect(digest.toolsRun.read).toEqual({ calls: 1, ok: 0, failed: 1 });
  });

  it("insufficient_data when research completed with no evidence and extraction found nothing", async () => {
    const { host } = makeHost((_opts, info) =>
      info.phase === "research"
        ? { content: "", stopReason: "completed" }
        : { content: "not json" },
    );
    const outcome = await runIsolatedAgent(host, extractionDef, "task");
    expect(outcome.status).toBe("insufficient_data");
  });

  it("a provider that never sets stopReason (chat-completions/LiteLLM) still completes", async () => {
    // Regression: leg-finished must derive from the runner's own control
    // flow, not from provider stopReason vocabulary.
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, { toolName: "grep", resultText: "hit" });
        // stopReason deliberately ABSENT — real chat-completions behavior.
        return { content: "healthy run", stopReason: undefined };
      }
      return { content: '{"findings":["hit"]}' };
    });
    const outcome = await runIsolatedAgent(host, extractionDef, "task");
    expect(outcome.status).toBe("completed");
    expect(outcome.data).toEqual({ findings: ["hit"] });
  });

  it("extraction phase deadline (totalTimeoutMs) bounds all attempts", async () => {
    let extractionCalls = 0;
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, { toolName: "grep", resultText: "hit" });
        return { content: "notes", stopReason: "completed" };
      }
      extractionCalls++;
      return { content: "never json" };
    });
    const outcome = await runIsolatedAgent(
      host,
      {
        ...plainDef,
        extraction: {
          schema: z.object({ findings: z.array(z.string()) }),
          maxRetries: 5,
          totalTimeoutMs: 0, // deadline already passed → zero attempts
        },
      },
      "task",
    );
    expect(extractionCalls).toBe(0);
    expect(outcome.extractionError).toContain("deadline");
    // Delivery guarantee still holds.
    expect((outcome.data as { kind: string }).kind).toBe("mechanical-digest");
  });

  it("abort chaining: a pre-aborted parent cancels the run, no ghost worker", async () => {
    const controller = new AbortController();
    controller.abort();
    const { host, workers } = makeHost((opts) => {
      if (opts.abortSignal?.aborted) {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }
      return { content: "should not happen" };
    });
    const outcome = await runIsolatedAgent(host, extractionDef, "task", {
      abortSignal: controller.signal,
    });
    expect(outcome.stopReason).toBe("aborted");
    expect(outcome.status).toBe("error");
    expect(workers[0].dispose).toHaveBeenCalled();
  });

  it("fires lifecycle events and swallows listener errors", async () => {
    const events: AgentRunEvent[] = [];
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, { toolName: "grep", resultText: "hit" });
      }
      return { content: "done", stopReason: "completed" };
    });
    const outcome = await runIsolatedAgent(host, plainDef, "task", {
      onEvent: (e) => {
        events.push(e);
        throw new Error("listener boom");
      },
    });
    expect(outcome.status).toBe("completed");
    const types = events.map((e) => e.type);
    expect(types).toContain("start");
    expect(types).toContain("phase");
    expect(types).toContain("tool_call");
    expect(types).toContain("tool_result");
    expect(types).toContain("complete");
  });
});

describe("runIsolatedAgent — waste signatures", () => {
  it("duplicate call hash trips the leg early with wasteSignals populated", async () => {
    const { host } = makeHost(async (opts, info) => {
      if (info.phase === "research") {
        for (let i = 0; i < 4; i++) {
          simulateToolCall(opts, {
            toolName: "grep",
            params: { q: "same" },
            resultText: `r${i}`,
          });
          if (opts.abortSignal?.aborted) {
            const error = new Error("aborted mid-loop");
            error.name = "AbortError";
            throw error;
          }
        }
        return { content: "notes", stopReason: "completed" };
      }
      return { content: "next step" };
    });
    const outcome = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 60_000 },
    });
    expect(outcome.wasteSignals?.join(" ")).toContain("duplicate-call");
    if (outcome.handle) {
      await stopIsolatedAgent(host, outcome.handle);
    }
  });

  it("error streak trips at the configured threshold", async () => {
    const { host } = makeHost(async (opts, info) => {
      if (info.phase === "research") {
        for (let i = 0; i < 3; i++) {
          simulateToolCall(opts, {
            toolName: `t${i}`,
            params: { i },
            resultText: "boom",
            isError: true,
          });
          if (opts.abortSignal?.aborted) {
            const error = new Error("aborted");
            error.name = "AbortError";
            throw error;
          }
        }
        return { content: "", stopReason: "completed" };
      }
      return { content: "plan" };
    });
    const outcome = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 60_000 },
      waste: { errorStreakLimit: 2 },
    });
    expect(outcome.wasteSignals?.join(" ")).toContain("error-streak");
    if (outcome.handle) {
      await stopIsolatedAgent(host, outcome.handle);
    }
  });

  it("a waste-tripped leg leaves a synthetic assistant message so the resume is not blind", async () => {
    const histories: string[][] = [];
    const { host } = makeHost(async (opts, info) => {
      if (info.phase === "research") {
        histories.push((opts.conversationMessages ?? []).map((m) => m.content));
        for (let i = 0; i < 3; i++) {
          simulateToolCall(opts, {
            toolName: "grep",
            params: { q: "same" },
            resultText: `r${i}`,
          });
          if (opts.abortSignal?.aborted) {
            const error = new Error("aborted mid-loop");
            error.name = "AbortError";
            throw error;
          }
        }
        return { content: "notes", stopReason: "completed" };
      }
      return { content: "plan" };
    });
    const first = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 60_000 },
    });
    expect(first.status).toBe("in_progress");
    const second = await continueIsolatedAgent(host, first.handle!);
    // The second leg's history must describe the first leg's tool activity
    // and the tripped waste signal — no blind resume.
    const secondLegHistory = histories[1].join("\n");
    expect(secondLegHistory).toContain("waste signals");
    expect(secondLegHistory).toContain("grep(");
    if (second.handle) {
      await stopIsolatedAgent(host, second.handle);
    }
  });
});

describe("runIsolatedAgent — leashed mode", () => {
  function leashedScript(): GenerateScript {
    return (opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, {
          toolName: "grep",
          params: { call: info.call },
          resultText: `hit-${info.call}`,
        });
        return { content: `notes leg`, stopReason: "step-cap" };
      }
      if (info.phase === "next-plan") {
        return { content: "Next I will read the file." };
      }
      return { content: '{"findings":["hit"]}' };
    };
  }

  it("a budget-capped leg returns in_progress with handle/delta/nextPlan/budget", async () => {
    const { host, workers } = makeHost(leashedScript());
    const outcome = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
    });
    expect(outcome.status).toBe("in_progress");
    expect(outcome.handle).toMatch(/^agent-run-/);
    expect(outcome.leg).toMatchObject({ index: 0, toolCalls: 1 });
    expect(outcome.delta?.[0]).toContain("grep");
    expect(outcome.nextPlan).toContain("read the file");
    expect(outcome.budget?.spentToolCalls).toBe(1);
    // Worker stays alive for the handle.
    expect(workers[0].dispose).not.toHaveBeenCalled();
    await stopIsolatedAgent(host, outcome.handle!);
  });

  it("continueAgent appends guidance as a user turn and runs the next leg", async () => {
    let sawGuidance = false;
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        const history = opts.conversationMessages ?? [];
        if (
          history.some((m) => m.content.includes("focus on the auth module"))
        ) {
          sawGuidance = true;
        }
        simulateToolCall(opts, {
          toolName: "grep",
          params: { call: info.call },
          resultText: "hit",
        });
        return { content: "leg notes", stopReason: "step-cap" };
      }
      if (info.phase === "next-plan") {
        return { content: "plan" };
      }
      return { content: '{"findings":["done"]}' };
    });
    const first = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
    });
    expect(first.status).toBe("in_progress");
    const second = await continueIsolatedAgent(
      host,
      first.handle!,
      "focus on the auth module",
    );
    expect(sawGuidance).toBe(true);
    expect(second.status).toBe("in_progress");
    expect(second.leg?.index).toBe(1);
    await stopIsolatedAgent(host, second.handle!);
  });

  it("stopAgent disposes the worker and returns a mechanical digest", async () => {
    const { host, workers } = makeHost(leashedScript());
    const leg = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
    });
    const final = await stopIsolatedAgent(host, leg.handle!);
    expect(final.status).toBe("partial");
    expect((final.data as { kind: string }).kind).toBe("mechanical-digest");
    expect(workers[0].dispose).toHaveBeenCalledTimes(1);
    await expect(stopIsolatedAgent(host, leg.handle!)).rejects.toThrow(
      /Unknown agent handle/,
    );
  });

  it("TTL expiry auto-disposes and tombstones the outcome, retrievable once", async () => {
    vi.useFakeTimers();
    const { host, workers } = makeHost(leashedScript());
    const leg = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
      handleTtlMs: 1_000,
    });
    expect(leg.status).toBe("in_progress");

    await vi.advanceTimersByTimeAsync(1_500);
    expect(workers[0].dispose).toHaveBeenCalledTimes(1);

    const tombstone = await continueIsolatedAgent(host, leg.handle!);
    expect(tombstone.stopReason).toBe("handle-ttl-expired");
    expect((tombstone.data as { kind: string }).kind).toBe("mechanical-digest");
    // Exactly once.
    await expect(continueIsolatedAgent(host, leg.handle!)).rejects.toThrow(
      /Unknown agent handle/,
    );
  });

  it("tombstones are evicted after a grace period — abandoned handles don't leak", async () => {
    vi.useFakeTimers();
    const { host } = makeHost(leashedScript());
    const leg = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
      handleTtlMs: 1_000,
    });
    // TTL fires at 1s (tombstone), grace eviction at 2s.
    await vi.advanceTimersByTimeAsync(2_500);
    await expect(continueIsolatedAgent(host, leg.handle!)).rejects.toThrow(
      /Unknown agent handle/,
    );
  });

  it("an expired handle tombstones BEFORE disposal — a racing continueAgent gets the outcome, never a disposing worker", async () => {
    vi.useFakeTimers();
    let disposeStarted = false;
    let finishDispose: (() => void) | undefined;
    const { host, workers } = makeHost(leashedScript());
    const leg = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
      handleTtlMs: 1_000,
    });
    // Make disposal slow so expiry is mid-dispose when the caller races in.
    workers[0].dispose.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          disposeStarted = true;
          finishDispose = resolve;
        }),
    );
    // Fire the TTL; expireSession sets the tombstone synchronously, then
    // awaits the (slow) dispose.
    await vi.advanceTimersByTimeAsync(1_100);
    expect(disposeStarted).toBe(true);
    // A continueAgent racing in DURING disposal must get the tombstoned
    // outcome — never start a leg on the worker being disposed.
    const raced = await continueIsolatedAgent(host, leg.handle!);
    expect(raced.stopReason).toBe("handle-ttl-expired");
    finishDispose?.();
  });

  it("refuses a second concurrent continueAgent on the same handle", async () => {
    let releaseLeg: (() => void) | undefined;
    const { host } = makeHost(async (opts, info) => {
      if (info.phase === "research" && info.call > 1) {
        // Second leg blocks until released, keeping the handle in flight.
        await new Promise<void>((resolve) => {
          releaseLeg = resolve;
        });
      }
      if (info.phase === "research") {
        simulateToolCall(opts, {
          toolName: "grep",
          params: { call: info.call },
          resultText: "hit",
        });
        return { content: "leg", stopReason: "step-cap" };
      }
      return { content: info.phase === "next-plan" ? "plan" : "{}" };
    });
    const first = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
    });
    const inFlight = continueIsolatedAgent(host, first.handle!);
    await new Promise((r) => setTimeout(r, 20));
    await expect(continueIsolatedAgent(host, first.handle!)).rejects.toThrow(
      /already has a leg in progress/,
    );
    await expect(stopIsolatedAgent(host, first.handle!)).rejects.toThrow(
      /leg in progress/,
    );
    releaseLeg?.();
    const second = await inFlight;
    if (second.handle) {
      await stopIsolatedAgent(host, second.handle);
    }
  });

  it("handles are owned by their host — another instance cannot continue them", async () => {
    const { host } = makeHost(leashedScript());
    const { host: otherHost } = makeHost(leashedScript());
    const leg = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
    });
    await expect(continueIsolatedAgent(otherHost, leg.handle!)).rejects.toThrow(
      /Unknown agent handle/,
    );
    await stopIsolatedAgent(host, leg.handle!);
  });

  it("terminal outcomes carry ALL legs' records; in_progress legs carry per-leg records", async () => {
    const { host } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, {
          toolName: `tool_leg${info.call}`,
          params: { call: info.call },
          resultText: `hit-${info.call}`,
        });
        // First leg is cut by the step cap; the second finishes cleanly.
        return info.call === 1
          ? { content: "leg1", stopReason: "step-cap" }
          : { content: "done", stopReason: "completed" };
      }
      return { content: info.phase === "next-plan" ? "plan" : "{}" };
    });
    const first = await runIsolatedAgent(host, plainDef, "task", {
      leg: { budgetMs: 5_000 },
    });
    expect(first.status).toBe("in_progress");
    expect(first.toolExecutions.map((r) => r.toolName)).toEqual(["tool_leg1"]);
    const final = await continueIsolatedAgent(host, first.handle!);
    expect(final.status).toBe("completed");
    expect(final.toolExecutions.map((r) => r.toolName)).toEqual([
      "tool_leg1",
      "tool_leg3",
    ]);
  });

  it("a leg whose model finishes cleanly runs extraction and completes", async () => {
    const { host, workers } = makeHost((opts, info) => {
      if (info.phase === "research") {
        simulateToolCall(opts, { toolName: "grep", resultText: "hit" });
        return { content: "all done", stopReason: "completed" };
      }
      return { content: '{"findings":["hit"]}' };
    });
    const outcome = await runIsolatedAgent(host, extractionDef, "task", {
      leg: { budgetMs: 5_000 },
    });
    expect(outcome.status).toBe("completed");
    expect(outcome.handle).toBeUndefined();
    expect(workers[0].dispose).toHaveBeenCalledTimes(1);
  });
});

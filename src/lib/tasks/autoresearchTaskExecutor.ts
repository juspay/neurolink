/**
 * Autoresearch task executor — bridges TaskManager with the
 * autoresearch experiment loop.
 *
 * Each tick:
 * 1. Loads/creates a ResearchWorker for the task's tag
 * 2. Gets the phase-appropriate tool filter
 * 3. Calls NeuroLink.generate() with research tools + prompt
 * 4. Advances phase based on which tools the AI called
 * 5. Returns a TaskRunResult
 *
 * Workers are cached by tag to avoid re-initialization on each tick.
 * Forwards the NeuroLink emitter to each worker for lifecycle events.
 */

import { ResearchWorker } from "../autoresearch/worker.js";
import { withTimeout } from "../utils/errorHandling.js";
import type {
  AutoresearchEmitter,
  ExperimentPhase,
  ResearchConfig,
  NeuroLinkExecutable,
  Task,
  TaskRunResult,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

// ── Worker cache ────────────────────────────────────────

const workerCache = new Map<string, ResearchWorker>();

/**
 * Clear all cached workers. Called by TaskManager.shutdown().
 */
export function clearWorkerCache(): void {
  workerCache.clear();
  logger.debug("[AutoresearchExecutor] Worker cache cleared");
}

// ── Phase advancement ──────────────────────────────────

/**
 * Determine the next phase based on which tools the AI called.
 *
 * The worker path (`runExperimentCycle`) drives phases internally.
 * The task path must replicate that advancement here. The mapping:
 *
 *   bootstrap → (get_context called) → propose
 *   propose   → (read_file called)   → edit
 *   edit      → (write_candidate)    → commit
 *   commit    → (commit_candidate)   → run
 *   run       → (run_experiment)     → evaluate
 *   evaluate  → (parse_log)          → record
 *   record    → (record called)      → accept_or_revert
 *   accept_or_revert → (accept/revert) → propose
 *
 * Returns null if no advancement is indicated (e.g. no recognised tools called).
 */
function inferNextPhase(
  currentPhase: ExperimentPhase,
  calledTools: string[],
): ExperimentPhase | null {
  if (calledTools.length === 0) {
    return null;
  }

  // Compute phase advancement per-tool against the running accumulated phase
  function phaseAfterTool(
    toolName: string,
    phase: ExperimentPhase,
  ): ExperimentPhase {
    switch (toolName) {
      case "research_get_context":
        return phase === "bootstrap" || phase === "propose" ? "propose" : phase;
      case "research_read_file":
        return phase === "propose" ? "edit" : phase;
      case "research_write_candidate":
        return "commit";
      case "research_commit_candidate":
        return "run";
      case "research_run_experiment":
        return "evaluate";
      case "research_parse_log":
        return "record";
      case "research_record":
        return "accept_or_revert";
      case "research_accept":
        return "propose";
      case "research_revert":
        return "propose";
      default:
        return phase; // informational tools don't advance
    }
  }

  // Walk the called tools in order, accumulating phase progression
  let nextPhase: ExperimentPhase = currentPhase;
  for (const toolName of calledTools) {
    nextPhase = phaseAfterTool(toolName, nextPhase);
  }

  return nextPhase !== currentPhase ? nextPhase : null;
}

/**
 * Get or create a ResearchWorker for the given task.
 * When an emitter is provided, it is injected into the worker
 * so that autoresearch:* events flow through the central event bus.
 */
async function getOrCreateWorker(
  task: Task & {
    autoresearch?: Partial<ResearchConfig> & {
      repoPath: string;
      mutablePaths: string[];
      runCommand: string;
      metric: ResearchConfig["metric"];
    };
  },
  emitter?: AutoresearchEmitter,
): Promise<ResearchWorker> {
  const tag = `task-${task.id}`;

  const cached = workerCache.get(tag);
  if (cached) {
    // Re-inject emitter in case it changed (e.g. after re-initialization)
    if (emitter) {
      cached.setEmitter(emitter);
    }
    // Attempt to resume existing state
    try {
      await cached.resume();
      return cached;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Only re-initialize if state is genuinely missing; surface other errors
      if (msg.includes("STATE_NOT_FOUND") || msg.includes("No state file")) {
        workerCache.delete(tag);
      } else {
        throw err;
      }
    }
  }

  // Validated at caller (line 184 returns early if missing)
  const config = task.autoresearch as NonNullable<typeof task.autoresearch>;
  const worker = new ResearchWorker({
    repoPath: config.repoPath,
    mutablePaths: config.mutablePaths,
    runCommand: config.runCommand,
    metric: config.metric,
    ...(config.immutablePaths ? { immutablePaths: config.immutablePaths } : {}),
    ...(config.timeoutMs ? { timeoutMs: config.timeoutMs } : {}),
    ...(config.provider ? { provider: config.provider } : {}),
    ...(config.model ? { model: config.model } : {}),
    ...(config.thinkingLevel ? { thinkingLevel: config.thinkingLevel } : {}),
    ...(config.maxExperiments ? { maxExperiments: config.maxExperiments } : {}),
    // Forward artifact layout fields so scheduled runs match standalone config
    ...(config.programPath ? { programPath: config.programPath } : {}),
    ...(config.resultsPath ? { resultsPath: config.resultsPath } : {}),
    ...(config.statePath ? { statePath: config.statePath } : {}),
    ...(config.logPath ? { logPath: config.logPath } : {}),
    ...(config.branchPrefix ? { branchPrefix: config.branchPrefix } : {}),
    ...(config.memoryMetric ? { memoryMetric: config.memoryMetric } : {}),
  });

  // Inject emitter before initialization so init events are captured
  if (emitter) {
    worker.setEmitter(emitter);
  }

  // Try resuming existing state first; only initialize if state is genuinely missing
  try {
    await worker.resume();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("STATE_NOT_FOUND") || msg.includes("No state file")) {
      await worker.initialize(tag);
    } else {
      throw err;
    }
  }
  workerCache.set(tag, worker);
  return worker;
}

/**
 * Execute one autoresearch tick for a task.
 *
 * Returns a TaskRunResult-shaped object.
 * If the task is missing autoresearch config, returns an error result
 * instead of throwing (so the scheduler can record the failure).
 *
 * @param emitter - Optional emitter to forward autoresearch lifecycle events
 */
export async function executeAutoresearchTick(
  task: Task & { autoresearch?: unknown },
  neurolink: NeuroLinkExecutable,
  emitter?: AutoresearchEmitter,
): Promise<TaskRunResult> {
  const startTime = Date.now();
  const runId = `ar_${Date.now()}`;

  // Validate config presence
  if (!task.autoresearch) {
    return {
      taskId: task.id,
      runId,
      status: "error",
      error: `Task ${task.id} has type=autoresearch but no autoresearch config`,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const worker = await getOrCreateWorker(
      task as Task & {
        autoresearch: Partial<ResearchConfig> & {
          repoPath: string;
          mutablePaths: string[];
          runCommand: string;
          metric: ResearchConfig["metric"];
        };
      },
      emitter,
    );

    // Get phase-appropriate tools and filter
    const tools = worker.getTools();
    const toolFilter = await worker.getToolFilterForCurrentPhase();
    const systemPrompt = await worker.getSystemPrompt();
    const cyclePrompt = await worker.getCyclePrompt();

    // Register research tools on NeuroLink if it supports registerTool
    const sdk = neurolink as Record<string, unknown>;
    if (typeof sdk.registerTool === "function") {
      for (const [name, tool] of Object.entries(tools)) {
        (sdk.registerTool as (name: string, tool: unknown) => void)(name, tool);
      }
    }

    // Get the current phase's forced tool (if any)
    const phasePolicy = await worker.getPhaseToolPolicy();

    // Extract provider/model from autoresearch config
    const arConfig = task.autoresearch as Record<string, unknown> | undefined;

    // Create an AbortController so the tick respects the task timeout.
    // Each tick should complete within a bounded time; 20 tool-call steps
    // is enough for one explore→write→experiment→record cycle.
    const tickTimeoutMs = (task.timeout ?? 120_000) as number;
    const abortController = new AbortController();
    const abortTimer = setTimeout(() => abortController.abort(), tickTimeoutMs);

    // Call generate
    const generateOptions: Record<string, unknown> = {
      input: { text: cyclePrompt },
      systemPrompt,
      tools: true,
      skipToolPromptInjection: true,
      maxSteps: 20, // Bound tool-call steps per tick to avoid runaway loops
      abortSignal: abortController.signal,
      // Forward provider/model from autoresearch config
      ...(arConfig?.provider ? { provider: arConfig.provider } : {}),
      ...(arConfig?.model ? { model: arConfig.model } : {}),
      ...(arConfig?.thinkingLevel || task.thinkingLevel
        ? {
            thinkingConfig: {
              thinkingLevel: arConfig?.thinkingLevel ?? task.thinkingLevel,
            },
          }
        : {}),
      ...(task.timeout ? { timeout: task.timeout } : {}),
      // Phase tool restrictions
      toolFilter,
      // Use prepareStep to force tool only on first step, not all steps
      ...(phasePolicy.forcedTool
        ? {
            prepareStep: ({ stepNumber }: { stepNumber: number }) => {
              if (stepNumber === 0 && phasePolicy.forcedTool) {
                return {
                  toolChoice: {
                    type: "tool" as const,
                    toolName: phasePolicy.forcedTool,
                  },
                };
              }
              return {};
            },
          }
        : {}),
      // Observability
      requestId: runId,
      ...(task.metadata?.maxBudgetUsd
        ? { maxBudgetUsd: task.metadata.maxBudgetUsd }
        : {}),
    };

    let result: Awaited<ReturnType<typeof neurolink.generate>> | undefined;
    try {
      result = await withTimeout(
        neurolink.generate(generateOptions),
        tickTimeoutMs,
        new Error(`Autoresearch tick exceeded ${tickTimeoutMs}ms timeout`),
      );
    } finally {
      clearTimeout(abortTimer);
    }

    // ── Phase advancement ──────────────────────────────
    // The deterministic worker path (runExperimentCycle) advances
    // phases internally.  The task path must do it here, based on
    // which tools the AI actually called this tick.
    const calledTools: string[] = (result.toolExecutions ?? [])
      .map((te) => {
        const t = te as Record<string, unknown>;
        return typeof t.name === "string" ? t.name : "";
      })
      .filter(Boolean);

    const currentState = await worker.getState();
    const currentPhase = currentState?.currentPhase ?? "bootstrap";
    const nextPhase = inferNextPhase(currentPhase, calledTools);
    if (nextPhase) {
      await worker.advancePhase(nextPhase);
      logger.debug("[AutoresearchExecutor] Phase advanced", {
        from: currentPhase,
        to: nextPhase,
        calledTools,
      });
    }

    return {
      taskId: task.id,
      runId,
      status: "success",
      output: result.content,
      toolCalls: result.toolExecutions?.map((te) => ({
        name: te.name,
        input: te.input,
        output: te.output,
      })),
      tokensUsed: result.usage
        ? { input: result.usage.input ?? 0, output: result.usage.output ?? 0 }
        : undefined,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[AutoresearchExecutor] Tick failed", {
      taskId: task.id,
      runId,
      error: msg,
    });

    return {
      taskId: task.id,
      runId,
      status: "error",
      error: msg,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

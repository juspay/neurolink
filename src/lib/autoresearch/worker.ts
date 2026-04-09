/**
 * Research worker — orchestrates the full experiment loop.
 *
 * Wires tools, state, policy, and NeuroLink generate() into a
 * single experiment cycle. Can run standalone or via TaskManager.
 *
 * Emits autoresearch:* lifecycle events through an injected emitter
 * and wraps key operations in OpenTelemetry spans for observability.
 */

import { execFileSync } from "node:child_process";
import { ATTR } from "../telemetry/attributes.js";
import { tracers } from "../telemetry/tracers.js";
import { withSpan } from "../telemetry/withSpan.js";
import type {
  AutoresearchEmitter,
  ExperimentPhase,
  ExperimentRecord,
  ExperimentStatus,
  MetricDirection,
  PhaseToolPolicy,
  ResearchConfig,
  ResearchState,
} from "../types/autoresearchTypes.js";
import { withTimeout } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import { resolveConfig, validateConfig } from "./config.js";
import { AutoresearchError } from "./errors.js";
import { getPhaseToolPolicy } from "./phasePolicy.js";
import { PromptCompiler } from "./promptCompiler.js";
import { RepoPolicy } from "./repoPolicy.js";
import { ResultRecorder } from "./resultRecorder.js";
import { ExperimentRunner } from "./runner.js";
import { ResearchStateStore } from "./stateStore.js";
import { createResearchTools } from "./tools.js";

function isBetter(
  candidate: number,
  best: number,
  direction: MetricDirection,
): boolean {
  return direction === "lower" ? candidate < best : candidate > best;
}

function decideOutcome(
  metric: number | null,
  crashed: boolean,
  timedOut: boolean,
  bestMetric: number | null,
  direction: MetricDirection,
): ExperimentStatus {
  if (timedOut) {
    return "timeout";
  }
  if (crashed || metric === null) {
    return "crash";
  }
  if (bestMetric === null) {
    return "keep";
  } // First run is baseline
  return isBetter(metric, bestMetric, direction) ? "keep" : "discard";
}

export class ResearchWorker {
  private config: ResearchConfig;
  private stateStore: ResearchStateStore;
  private repoPolicy: RepoPolicy;
  private runner: ExperimentRunner;
  private recorder: ResultRecorder;
  private promptCompiler: PromptCompiler;
  private initialized = false;

  /** Event emitter injected by NeuroLink/TaskManager for lifecycle events. */
  private emitter?: AutoresearchEmitter;

  constructor(
    configInput: Partial<ResearchConfig> & {
      repoPath: string;
      mutablePaths: string[];
      runCommand: string;
      metric: ResearchConfig["metric"];
    },
  ) {
    this.config = resolveConfig(configInput);
    this.stateStore = new ResearchStateStore(
      this.config.repoPath,
      this.config.statePath,
    );
    this.repoPolicy = new RepoPolicy(this.config);
    this.runner = new ExperimentRunner(this.config);
    this.recorder = new ResultRecorder(this.config);
    this.promptCompiler = new PromptCompiler(this.config);
  }

  // ── Emitter integration ──────────────────────────────────

  /** Set the event emitter (called by NeuroLink/TaskManager during integration). */
  setEmitter(emitter: AutoresearchEmitter): void {
    this.emitter = emitter;
  }

  /** Emit a lifecycle event. Safe to call when no emitter is set. */
  private emit(event: string, ...args: unknown[]): void {
    this.emitter?.emit(event, ...args);
  }

  // ── Lifecycle ────────────────────────────────────────────

  /** Initialize: validate config, ensure branch, create state */
  async initialize(tag: string): Promise<ResearchState> {
    return withSpan(
      {
        name: "autoresearch.initialize",
        tracer: tracers.autoresearch,
        attributes: {
          [ATTR.AR_TAG]: tag,
          [ATTR.AR_BRANCH]: `${this.config.branchPrefix}${tag}`,
        },
      },
      async (span) => {
        validateConfig(this.config);

        const branch = `${this.config.branchPrefix}${tag}`;

        // Create branch if it doesn't exist
        try {
          const currentBranch = execFileSync(
            "git",
            ["rev-parse", "--abbrev-ref", "HEAD"],
            {
              cwd: this.config.repoPath,
              encoding: "utf-8",
            },
          ).trim();

          if (currentBranch !== branch) {
            try {
              execFileSync("git", ["checkout", "-b", branch], {
                cwd: this.config.repoPath,
                stdio: "ignore",
              });
            } catch {
              // Branch may already exist
              execFileSync("git", ["checkout", branch], {
                cwd: this.config.repoPath,
                stdio: "ignore",
              });
            }
          }
        } catch (error) {
          this.emitError(
            tag,
            "BRANCH_ERROR",
            `Failed to setup branch ${branch}`,
          );
          throw AutoresearchError.create(
            "BRANCH_ERROR",
            `Failed to setup branch ${branch}`,
            {
              cause: error instanceof Error ? error : undefined,
            },
          );
        }

        // Initialize state
        const state = await this.stateStore.initialize(tag, branch);

        // Ensure results file exists
        await this.recorder.ensureResultsFile();

        this.initialized = true;

        span.setAttribute(ATTR.AR_PHASE, state.currentPhase);
        logger.info("[Autoresearch] Worker initialized", { tag, branch });

        this.emit("autoresearch:initialized", {
          tag,
          branch,
          config: {
            repoPath: this.config.repoPath,
            runCommand: this.config.runCommand,
            metric: this.config.metric,
            timeoutMs: this.config.timeoutMs,
          },
        });

        return state;
      },
    );
  }

  /** Load existing state (for resuming) */
  async resume(): Promise<ResearchState> {
    return withSpan(
      {
        name: "autoresearch.resume",
        tracer: tracers.autoresearch,
      },
      async (span) => {
        const state = await this.stateStore.load();
        if (!state) {
          throw AutoresearchError.create(
            "STATE_NOT_FOUND",
            "No state file found. Run initialize() first.",
          );
        }
        validateConfig(this.config);

        // Ensure we're on the correct branch (may have changed after restart)
        try {
          const currentBranch = execFileSync(
            "git",
            ["rev-parse", "--abbrev-ref", "HEAD"],
            { cwd: this.config.repoPath, encoding: "utf-8" },
          ).trim();
          if (currentBranch !== state.branch) {
            execFileSync("git", ["checkout", state.branch], {
              cwd: this.config.repoPath,
              stdio: "ignore",
            });
          }
        } catch (branchErr) {
          logger.error("[Autoresearch] Failed to restore branch", {
            expected: state.branch,
            error:
              branchErr instanceof Error
                ? branchErr.message
                : String(branchErr),
          });
          throw AutoresearchError.create(
            "BRANCH_ERROR",
            `Failed to checkout branch ${state.branch} during resume`,
            { cause: branchErr instanceof Error ? branchErr : undefined },
          );
        }

        this.initialized = true;

        span.setAttribute(ATTR.AR_TAG, state.tag);
        span.setAttribute(ATTR.AR_BRANCH, state.branch);
        span.setAttribute(ATTR.AR_RUN_COUNT, state.runCount);
        span.setAttribute(ATTR.AR_PHASE, state.currentPhase);

        this.emit("autoresearch:resumed", {
          tag: state.tag,
          branch: state.branch,
          runCount: state.runCount,
          currentPhase: state.currentPhase,
        });

        return state;
      },
    );
  }

  /** Run one full experiment cycle without AI — just the deterministic parts */
  async runExperimentCycle(description: string): Promise<ExperimentRecord> {
    if (!this.initialized) {
      throw AutoresearchError.create(
        "WORKER_NOT_INITIALIZED",
        "Call initialize() or resume() first",
      );
    }

    const state = await this.stateStore.load();
    if (!state) {
      throw AutoresearchError.create("STATE_NOT_FOUND", "State file missing");
    }

    return withSpan(
      {
        name: "autoresearch.experiment_cycle",
        tracer: tracers.autoresearch,
        attributes: {
          [ATTR.AR_TAG]: state.tag,
          [ATTR.AR_RUN_COUNT]: state.runCount,
          [ATTR.AR_DESCRIPTION]: description,
        },
      },
      async (span) => {
        const cycleStart = Date.now();

        this.emit("autoresearch:experiment-started", {
          tag: state.tag,
          runCount: state.runCount,
          description,
        });

        await this.advancePhase("run");

        // Run the experiment
        logger.info("[Autoresearch] Running experiment", {
          runCount: state.runCount,
          description,
        });

        const summary = await withSpan(
          {
            name: "autoresearch.experiment_run",
            tracer: tracers.autoresearch,
            attributes: { [ATTR.AR_TAG]: state.tag },
          },
          async () => {
            return withTimeout(
              this.runner.run(),
              this.config.timeoutMs + 30_000,
              new Error("Experiment runner exceeded safety timeout"),
            );
          },
        );

        await this.advancePhase("evaluate");

        // Deterministic decision
        const status = decideOutcome(
          summary.metric,
          summary.crashed,
          summary.timedOut,
          state.bestMetric,
          this.config.metric.direction,
        );

        // Get commit hash
        const commit = this.repoPolicy.getHeadCommit() || "unknown";

        // Build record
        const record: ExperimentRecord = {
          commit,
          metric: summary.metric,
          memoryGb: summary.memoryValue,
          status,
          description,
          timestamp: new Date().toISOString(),
        };

        // Record result
        await this.recorder.appendTsv(record);
        await this.recorder.appendJsonl(record);

        await this.advancePhase("accept_or_revert");

        // Update state based on outcome
        if (status === "keep") {
          await this.stateStore.update({
            acceptedCommit: commit,
            bestMetric: summary.metric,
            baselineMetric: state.baselineMetric ?? summary.metric,
            keepCount: state.keepCount + 1,
            runCount: state.runCount + 1,
            lastStatus: status,
            candidateCommit: null,
          });

          // Emit metric-improved if this beats a previous best
          if (
            summary.metric !== null &&
            state.bestMetric !== null &&
            isBetter(
              summary.metric,
              state.bestMetric,
              this.config.metric.direction,
            )
          ) {
            this.emit("autoresearch:metric-improved", {
              tag: state.tag,
              previousBest: state.bestMetric,
              newBest: summary.metric,
              commit,
              direction: this.config.metric.direction,
              runCount: state.runCount + 1,
            });
          }
        } else {
          // Revert on discard/crash/timeout
          if (state.acceptedCommit) {
            this.emit("autoresearch:revert", {
              tag: state.tag,
              targetCommit: state.acceptedCommit,
              reason: status,
              runCount: state.runCount,
            });

            try {
              execFileSync("git", ["reset", "--hard", state.acceptedCommit], {
                cwd: this.config.repoPath,
                stdio: "ignore",
              });
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              logger.error("[Autoresearch] Revert failed — state NOT updated", {
                error: errorMsg,
              });

              this.emit("autoresearch:revert-failed", {
                tag: state.tag,
                targetCommit: state.acceptedCommit,
                error: errorMsg,
                runCount: state.runCount,
              });

              this.emitError(
                state.tag,
                "REVERT_FAILED",
                `Failed to revert to ${state.acceptedCommit}. Manual intervention required.`,
                state.currentPhase,
                state.runCount,
              );

              // Do NOT advance state — repo is in unknown state
              throw AutoresearchError.create(
                "REVERT_FAILED",
                `Failed to revert to ${state.acceptedCommit}. Manual intervention required.`,
                {
                  cause: error instanceof Error ? error : undefined,
                },
              );
            }
          }
          // Only reach here if revert succeeded (or no acceptedCommit to revert to)
          // currentPhase advancement happens unconditionally below via advancePhase("propose")
          await this.stateStore.update({
            runCount: state.runCount + 1,
            lastStatus: status,
            candidateCommit: null,
          });
        }

        const durationMs = Date.now() - cycleStart;

        // Set span attributes for the completed cycle
        span.setAttribute(ATTR.AR_STATUS, status);
        if (summary.metric !== null) {
          span.setAttribute(ATTR.AR_METRIC, summary.metric);
        }
        span.setAttribute(ATTR.AR_COMMIT, commit);
        span.setAttribute(ATTR.AR_DURATION_MS, durationMs);

        logger.info("[Autoresearch] Experiment complete", {
          status,
          metric: summary.metric,
          runCount: state.runCount + 1,
        });

        this.emit("autoresearch:experiment-completed", {
          tag: state.tag,
          runCount: state.runCount + 1,
          status,
          metric: summary.metric,
          commit,
          description,
          durationMs,
        });

        // Emit state-updated with final state snapshot
        const updatedState = await this.stateStore.load();
        if (updatedState) {
          this.emit("autoresearch:state-updated", {
            tag: updatedState.tag,
            phase: updatedState.currentPhase,
            runCount: updatedState.runCount,
            keepCount: updatedState.keepCount,
            bestMetric: updatedState.bestMetric,
          });
        }

        await this.advancePhase("propose");
        return record;
      },
    );
  }

  /** Get the tools record for use with NeuroLink.generate() */
  getTools(): Record<string, unknown> {
    return createResearchTools({
      config: this.config,
      stateStore: this.stateStore,
      repoPolicy: this.repoPolicy,
      runner: this.runner,
      recorder: this.recorder,
    });
  }

  /** Build system prompt */
  async getSystemPrompt(): Promise<string> {
    return this.promptCompiler.buildSystemPrompt();
  }

  /** Build cycle prompt */
  async getCyclePrompt(): Promise<string> {
    const state = await this.stateStore.load();
    if (!state) {
      throw AutoresearchError.create("STATE_NOT_FOUND", "No state");
    }
    const results = await this.recorder.readAll();
    return this.promptCompiler.buildCyclePrompt(state, results);
  }

  /** Get current state */
  async getState(): Promise<ResearchState | null> {
    return this.stateStore.load();
  }

  /** Get results stats */
  async getStats() {
    return this.recorder.getStats();
  }

  /** Get config */
  getConfig(): ResearchConfig {
    return this.config;
  }

  // ── Phase management (Phase 1b/1c) ──────────────────────

  /**
   * Single authority for phase transitions.
   * Persists the new phase to the state store and emits phase-changed event.
   */
  async advancePhase(phase: ExperimentPhase): Promise<void> {
    const currentState = await this.stateStore.load();
    const fromPhase = currentState?.currentPhase ?? "bootstrap";

    await this.stateStore.update({ currentPhase: phase });
    logger.debug("[Autoresearch] Phase advanced", { phase });

    if (fromPhase !== phase) {
      this.emit("autoresearch:phase-changed", {
        from: fromPhase,
        to: phase,
        runCount: currentState?.runCount ?? 0,
        tag: currentState?.tag ?? "",
      });
    }
  }

  /**
   * Returns the phase tool policy for the current phase.
   * Reads the phase from persisted state.
   */
  async getPhaseToolPolicy(): Promise<PhaseToolPolicy> {
    const state = await this.stateStore.load();
    if (!state) {
      throw AutoresearchError.create(
        "STATE_NOT_FOUND",
        "No state for getPhaseToolPolicy",
      );
    }
    return getPhaseToolPolicy(state.currentPhase);
  }

  /**
   * Returns a tool filter object for the current phase, compatible
   * with NeuroLink generate()'s toolFilter option.
   *
   * Returns { include: string[] } listing only the tools allowed
   * in the current phase.
   */
  async getToolFilterForCurrentPhase(): Promise<{ include: string[] }> {
    const policy = await this.getPhaseToolPolicy();
    return { include: [...policy.activeTools] };
  }

  // ── Private helpers ──────────────────────────────────────

  /** Emit an autoresearch:error event. */
  private emitError(
    tag: string,
    code: string,
    message: string,
    phase?: ExperimentPhase,
    runCount?: number,
  ): void {
    this.emit("autoresearch:error", {
      tag,
      error: message,
      code,
      phase,
      runCount,
    });
  }
}

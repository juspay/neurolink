/**
 * Type definitions for the NeuroLink AutoResearch system.
 *
 * An autonomous experiment loop that proposes code changes, executes
 * experiments, evaluates results against a deterministic metric, and
 * keeps or discards each change — running unattended for hours.
 */

import type { RepoPolicy } from "../autoresearch/repoPolicy.js";
import type { ResearchStateStore } from "../autoresearch/stateStore.js";
import type { ResultRecorder } from "../autoresearch/resultRecorder.js";
import type { ExperimentRunner } from "../autoresearch/runner.js";
import type { ThinkingLevel } from "./config.js";

// ── Metric Configuration ─────────────────────────────────

export type MetricDirection = "lower" | "higher";

export type MetricConfig = {
  name: string;
  direction: MetricDirection;
  pattern: string; // regex with one capture group
};

export type MemoryMetricConfig = {
  name: string;
  pattern: string;
};

// ── Research Configuration ───────────────────────────────

export type ResearchConfig = {
  repoPath: string;
  programPath: string;
  mutablePaths: string[];
  immutablePaths: string[];
  resultsPath: string;
  statePath: string;
  runCommand: string;
  logPath: string;
  metric: MetricConfig;
  memoryMetric?: MemoryMetricConfig;
  timeoutMs: number;
  branchPrefix: string;
  provider?: string;
  model?: string;
  maxExperiments?: number;
  thinkingLevel?: ThinkingLevel;
};

// ── Experiment Status & Phase ────────────────────────────

export type ExperimentStatus = "keep" | "discard" | "crash" | "timeout";

export type ExperimentPhase =
  | "bootstrap"
  | "baseline"
  | "propose"
  | "edit"
  | "commit"
  | "run"
  | "evaluate"
  | "record"
  | "accept_or_revert";

// ── Research State ───────────────────────────────────────

export type ResearchState = {
  branch: string;
  acceptedCommit: string | null;
  baselineMetric: number | null;
  bestMetric: number | null;
  candidateCommit: string | null;
  runCount: number;
  keepCount: number;
  lastStatus: ExperimentStatus | null;
  currentPhase: ExperimentPhase;
  tag: string;
  startedAt: string;
  updatedAt: string;
  lastSummary?: ExperimentSummary | null;
};

// ── Experiment Results ───────────────────────────────────

export type ExperimentSummary = {
  crashed: boolean;
  timedOut: boolean;
  metric: number | null;
  memoryValue: number | null;
  trainingSeconds: number | null;
  rawTail: string;
};

export type ExperimentRecord = {
  commit: string;
  metric: number | null;
  memoryGb: number | null;
  status: ExperimentStatus;
  description: string;
  timestamp: string;
};

export type ExperimentStats = {
  total: number;
  keepCount: number;
  discardCount: number;
  crashCount: number;
  timeoutCount: number;
  keepRate: number;
  bestMetric: number | null;
  bestCommit: string | null;
};

// ── Worker Types ─────────────────────────────────────────

export type ResearchWorkerConfig = Omit<
  Partial<ResearchConfig>,
  "repoPath" | "mutablePaths" | "runCommand" | "metric"
> & {
  repoPath: string;
  mutablePaths: string[];
  runCommand: string;
  metric: MetricConfig;
};

export type PhaseToolPolicy = {
  activeTools: string[];
  forcedTool?: string;
};

// ── Event Payloads ──────────────────────────────────────

export type AutoresearchInitializedEvent = {
  tag: string;
  branch: string;
  config: {
    repoPath: string;
    runCommand: string;
    metric: MetricConfig;
    timeoutMs: number;
  };
};

export type AutoresearchResumedEvent = {
  tag: string;
  branch: string;
  runCount: number;
  currentPhase: ExperimentPhase;
};

export type AutoresearchPhaseChangedEvent = {
  from: ExperimentPhase;
  to: ExperimentPhase;
  runCount: number;
  tag: string;
};

export type AutoresearchExperimentStartedEvent = {
  tag: string;
  runCount: number;
  description: string;
};

export type AutoresearchExperimentCompletedEvent = {
  tag: string;
  runCount: number;
  status: ExperimentStatus;
  metric: number | null;
  commit: string;
  description: string;
  durationMs: number;
};

export type AutoresearchMetricImprovedEvent = {
  tag: string;
  previousBest: number | null;
  newBest: number;
  commit: string;
  direction: MetricDirection;
  runCount: number;
};

export type AutoresearchRevertEvent = {
  tag: string;
  targetCommit: string;
  reason: ExperimentStatus;
  runCount: number;
};

export type AutoresearchRevertFailedEvent = {
  tag: string;
  targetCommit: string;
  error: string;
  runCount: number;
};

export type AutoresearchStateUpdatedEvent = {
  tag: string;
  phase: ExperimentPhase;
  runCount: number;
  keepCount: number;
  bestMetric: number | null;
};

export type AutoresearchErrorEvent = {
  tag: string;
  error: string;
  code?: string;
  phase?: ExperimentPhase;
  runCount?: number;
};

/**
 * Union map of all autoresearch event names to their payload types.
 * Used by TypedEventEmitter consumers for documentation;
 * NeuroLinkEvents uses `unknown` payloads for flexibility.
 */
export type AutoresearchEventMap = {
  "autoresearch:initialized": AutoresearchInitializedEvent;
  "autoresearch:resumed": AutoresearchResumedEvent;
  "autoresearch:phase-changed": AutoresearchPhaseChangedEvent;
  "autoresearch:experiment-started": AutoresearchExperimentStartedEvent;
  "autoresearch:experiment-completed": AutoresearchExperimentCompletedEvent;
  "autoresearch:metric-improved": AutoresearchMetricImprovedEvent;
  "autoresearch:revert": AutoresearchRevertEvent;
  "autoresearch:revert-failed": AutoresearchRevertFailedEvent;
  "autoresearch:state-updated": AutoresearchStateUpdatedEvent;
  "autoresearch:error": AutoresearchErrorEvent;
};

/** All known autoresearch event names. */
export type AutoresearchEventName = keyof AutoresearchEventMap;

// ── Emitter Interface ───────────────────────────────────

/**
 * Minimal emitter interface accepted by autoresearch subsystems.
 * Matches the shape injected by NeuroLink via setEmitter().
 */
export type AutoresearchEmitter = {
  emit(event: string, ...args: unknown[]): boolean;
};

// ── Defaults ─────────────────────────────────────────────

export const AUTORESEARCH_DEFAULTS = {
  programPath: "program.md",
  resultsPath: "results.tsv",
  statePath: ".autoresearch/state.json",
  logPath: "run.log",
  timeoutMs: 600_000,
  branchPrefix: "autoresearch/",
  thinkingLevel: "medium" as ThinkingLevel,
} as const;

// =============================================================================
// RESEARCH TOOLS FACTORY (from autoresearch/tools.ts)
// =============================================================================

/** Dependencies required to create research tools. */
export type ResearchToolsDeps = {
  config: ResearchConfig;
  stateStore: ResearchStateStore;
  repoPolicy: RepoPolicy;
  runner: ExperimentRunner;
  recorder: ResultRecorder;
};

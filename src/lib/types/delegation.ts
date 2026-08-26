/**
 * Async delegation (N2) — spawn a background worker, collect it later, in any
 * order — types.
 *
 * Delegation today is a synchronous tool call: the supervising agent blocks
 * until the worker is done, so four investigations take four times as long as
 * one and the supervisor cannot do anything useful while it waits. These types
 * describe the background form — `spawn` hands back a `DelegateHandle`
 * immediately, `collect` returns whichever worker finished FIRST regardless of
 * which was started first, and each outcome carries a bounded summary plus a
 * {@link BankedArtifactRef} to the worker's full report, which is banked to a
 * file rather than pushed into the conversation.
 *
 * Naming: `agentNetwork.ts` already owns `DelegationRule` / `DelegationCondition`
 * and `isolatedAgent.ts` owns `AgentDelegationTurnState`, so everything here
 * carries the `Delegate` prefix (Critical Rule 9).
 */

import type { BankedArtifactRef } from "./artifact.js";
import type { AgentRunStatus } from "./isolatedAgent.js";

/** What a supervisor hands down when it spawns a background worker. */
export type DelegateSpawnOptions = {
  /** The task, in the supervisor's own words. Required and non-empty. */
  task: string;
  /** What the worker may look at — files, directories, systems. */
  scope?: string;
  /** Brief slice of context handed down (never the whole rulebook). */
  context?: string;
  /** Model override for this worker. */
  model?: string;
  /** Provider override for this worker. */
  provider?: string;
  /** Read-only tool allowlist for the worker (tool names). */
  tools?: string[];
  /**
   * Caller's session. Collection is scoped to it, and it is the key the task
   * checklist's `delegatesPending` / `delegatesReady` counters are read by.
   * Defaults to the session the host's tool context declares.
   */
  sessionId?: string;
  /** Caller's delegation depth; the worker runs one level deeper. */
  depth?: number;
  /** Short human label used in logs and in the banked report's name. */
  label?: string;
  /** Parent cancellation — an aborted parent cancels this worker. */
  abortSignal?: AbortSignal;
  /** Max agentic steps for the worker's research pass. */
  maxSteps?: number;
  /** Wall-clock budget for the worker's research pass (ms). */
  budgetMs?: number;
};

/**
 * Returned the moment a worker is spawned — before it has run anything.
 * `queued` is true when the process-wide delegation pool was full and the
 * worker is waiting for a slot.
 */
export type DelegateHandle = {
  workerId: string;
  spawnedAt: number;
  queued: boolean;
};

/**
 * A settled worker, claimed exactly once.
 *
 * `summary` is bounded; `report` points at the COMPLETE report on disk. The
 * two are not alternatives — the summary is what the conversation carries, the
 * report is what the evidence lives in.
 */
export type DelegateOutcome = {
  workerId: string;
  /** Human label the spawn was given (defaults to the worker id). */
  label: string;
  /** Reused from the isolated-agent runner — no parallel taxonomy. */
  status: AgentRunStatus;
  /** True for `completed` and `partial`: the worker produced usable evidence. */
  ok: boolean;
  /** Bounded narrative for the conversation. Never the whole report. */
  summary: string;
  /** The FULL report, always banked to a file. */
  report: BankedArtifactRef;
  durationMs: number;
  toolCallsUsed: number;
  /** Mechanical waste signatures the runner tripped, if any. */
  wasteSignals?: string[];
  /** `continueAgent()` handle when the worker was cut short mid-investigation. */
  handle?: string;
  /** Why the worker failed, when it did. */
  error?: string;
};

/** `any` returns the first worker to finish; `all` waits for every one. */
export type DelegateCollectMode = "any" | "all";

/**
 * What to collect. `waitMs` of 0 polls (return what is ready right now);
 * omitting it uses the runtime default.
 */
export type DelegateCollectRequest =
  | { mode: DelegateCollectMode; waitMs?: number; sessionId?: string }
  | { workerId: string; waitMs?: number; sessionId?: string };

/**
 * Outcomes claimed by one collect call, in COMPLETION order — the order
 * workers finished in, which has nothing to do with the order they were
 * spawned in.
 */
export type DelegateCollectResult = {
  /** Claimed exactly once: these outcomes are gone from the registry. */
  completed: DelegateOutcome[];
  /** Still running or waiting for a pool slot. */
  pending: number;
  /** Finished but not yet claimed. */
  ready: number;
  /**
   * True when the wait expired before this call claimed what it asked for:
   * for a named worker, that worker's outcome; for `any`, any outcome while
   * work was still pending; for `all`, pending work remained when the wait
   * ran out. A collect that claimed something reports `false` even if other
   * work is still outstanding — `pending`/`ready` carry that.
   */
  timedOut: boolean;
};

/** Lifecycle of one background job. `claimed` jobs are dropped immediately. */
export type DelegateJobPhase = "queued" | "running" | "ready" | "claimed";

/**
 * One background job in the module-level registry.
 *
 * Generic over the host instance for the same reason
 * {@link IsolatedAgentSessionState} is: the types folder must not import the
 * `NeuroLink` class.
 *
 * @internal
 */
export type DelegateJobState<TInstance> = {
  workerId: string;
  host: TInstance;
  /** Caller's session — collection scope and checklist-counter key. */
  sessionId: string;
  label: string;
  task: string;
  /** Caller's depth; the worker itself runs at `depth + 1`. */
  depth: number;
  phase: DelegateJobPhase;
  spawnedAt: number;
  /** Monotonic settle sequence, so `all` can return completion order. */
  settledOrder: number;
  controller: AbortController;
  /** Detaches the parent-abort listener once the job settles. */
  detachParent?: () => void;
  /** Resolves with the outcome. Never rejects. */
  settled: Promise<DelegateOutcome>;
  outcome?: DelegateOutcome;
  /** True once someone called `cancelDelegates` on this job. */
  cancelled: boolean;
};

/**
 * Provider/model a model-invoked `delegate_task` spawn falls back to. The spawn
 * schema deliberately exposes no `provider` — a model cannot name a provider it
 * cannot see — so without a default the worker instance falls back to provider
 * auto-selection, which on a host with stray credentials puts a worker on a
 * provider nobody configured — observed live as workers walking several
 * unconfigured providers before reaching the configured one. The model's own
 * `model` argument still wins over `model` here.
 */
export type DelegateSpawnDefaults = {
  provider?: string;
  model?: string;
};

/** Per-host delegation policy, resolved from registration options. */
export type DelegateRuntimeSettings = {
  /** Caller depth at which `delegate_task` refuses rather than spawning. */
  maxDepth: number;
  /** How long a spawned worker waits for a pool slot before giving up (ms). */
  poolQueueTimeoutMs: number;
  /** Default `waitMs` for a collect that does not name one (ms). */
  defaultCollectWaitMs: number;
  /** Defaults merged under every model-invoked `delegate_task` spawn. */
  spawnDefaults?: DelegateSpawnDefaults;
};

/** Options for `NeuroLink.registerDelegationTools()`. */
export type DelegateRegistrationOptions = {
  /**
   * Caller depth at which further delegation is refused. Default 1: a
   * background worker does not spawn background workers, because nothing
   * would ever collect them.
   */
  maxDepth?: number;
  /**
   * Raise the process-wide delegation pool to at least this many concurrent
   * workers. The pool is shared with `registerAgentTool` and only ever rises.
   */
  maxConcurrent?: number;
  /** Queue wait before a spawned worker gives up on a pool slot (ms). */
  poolQueueTimeoutMs?: number;
  /** Provider/model for model-invoked spawns — see {@link DelegateSpawnDefaults}. */
  spawnDefaults?: DelegateSpawnDefaults;
};

/** What `delegate_task` returns: the handle plus the outstanding counters. */
export type DelegateSpawnToolResult = DelegateHandle & {
  pending: number;
  ready: number;
};

/** Refusal shape shared with the agent tool registrar: recovery text included. */
export type DelegateRefusal = { isError: true; error: string };

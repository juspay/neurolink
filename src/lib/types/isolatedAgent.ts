/**
 * Isolated sub-agent runtime types: worker-mode instances, the
 * runIsolatedAgent() two-pass runner, leashed legs/handles, waste detection,
 * and host-loop delegation (registerAgentTool).
 *
 * Design contract: no product policy lives here — every tunable is an option
 * with a sane default, and all shapes were validated against the three
 * production consumers (Curator's research + log-analysis workers, Yama's
 * ContextExplorerService). See docs/plans/2026-07-27-isolated-agent-runner-rfc.md.
 */

import type { z } from "zod";
import type { TokenUsage } from "./analytics.js";
import type { AgentDefinition } from "./agentNetwork.js";
import type { ChatMessage } from "./conversation.js";
import type {
  GenerateResult,
  GenerateStopReason,
  ToolExecutionRecord,
} from "./generate.js";

// ============================================================================
// WORKER-MODE INSTANCES (N3)
// ============================================================================

/**
 * A log event forwarded by a worker instance's log bridge.
 */
export type WorkerLogEvent = {
  /** Caller-supplied tag identifying which worker produced the event. */
  tag: string;
  /** Log level ("debug" | "info" | "warn" | "error"). */
  level: string;
  /** Log message. */
  message: string;
  /** Epoch milliseconds. */
  timestamp: number;
  /** Structured payload attached to the log call, if any. */
  data?: unknown;
};

/**
 * Options for `NeuroLink.createWorkerInstance()`.
 *
 * A worker instance is a sub-agent-grade NeuroLink: conversation memory off,
 * orchestration off, observability inherited from the creating instance with
 * `autoDetectExternalProvider: true` + `skipLangfuseSpanProcessor: true`
 * (so worker spans join the host's tracer without duplicate Langfuse
 * exports), and an internal log bridge attached with a caller-supplied tag.
 */
export type WorkerInstanceOptions = {
  /** Tag stamped on every forwarded log event (default "worker"). */
  logTag?: string;
  /**
   * Log bridge sink. Fire-and-forget: listener errors never disrupt the
   * worker.
   *
   * KNOWN LIMITATION: the underlying NeuroLink logger is process-global with
   * a single active emitter, so this bridge receives ALL NeuroLink log
   * events emitted in the process (host, other workers, MCP) for the
   * worker's lifetime, each stamped with this worker's `tag`. The tag
   * identifies which bridge forwarded the event, not which instance emitted
   * it. Per-instance log attribution requires per-instance logger routing —
   * tracked as follow-up work in the RFC.
   */
  onLog?: (event: WorkerLogEvent) => void;
  /**
   * Share the creating instance's tool registry (custom tools + in-memory
   * MCP servers) so the worker calls tools through the host's existing
   * connections. Default: true.
   */
  shareToolRegistry?: boolean;
  /**
   * Extra constructor config merged into the worker (e.g. `credentials`,
   * `tools`, `modelPool`). Worker-mode fields (memory off, orchestration
   * off, observability flags) always win over this merge.
   */
  config?: Record<string, unknown>;
};

// ============================================================================
// ISOLATED AGENT DEFINITION + EXTRACTION (N4)
// ============================================================================

/**
 * Structured-extraction configuration for an isolated agent run.
 *
 * The extraction pass always runs tools-off on its own timeout, fed from the
 * run's tool-execution records — so a research generate that died on a
 * provider error still extracts from the records instead of losing the run.
 */
export type IsolatedAgentExtraction = {
  /** Local validator (lenient — may carry defaults/catch). Required. */
  schema: z.ZodSchema;
  /**
   * Provider-attached wire schema (strict: no defaults/catch, which many
   * providers reject in constrained decoding). Falls back to `schema`.
   */
  wireSchema?: z.ZodSchema;
  /**
   * Human/model-readable JSON shape description used in the extraction
   * prompt and in corrective retries alongside validation errors.
   */
  shapeDoc?: string;
  /**
   * Normalizer applied to every recovery candidate before validation
   * (e.g. wrap a bare top-level array into the expected envelope).
   */
  coerce?: (candidate: unknown) => unknown;
  /** Corrective re-ask attempts after ladder failure (default 2). */
  maxRetries?: number;
  /**
   * Per-attempt extraction timeout in ms (default 60_000). Never carved out
   * of the research budget.
   */
  timeoutMs?: number;
  /**
   * Phase-level deadline bounding ALL extraction attempts (ms). Defaults to
   * `(maxRetries + 1) × timeoutMs` — i.e. 180s at the defaults. Callers that
   * derive an outer tool-execution ceiling from the leg budget must add this
   * bound (plus the ~20s next-plan ask in leashed mode) on top of the
   * research budget.
   */
  totalTimeoutMs?: number;
};

/**
 * Definition of an isolated sub-agent: a standard AgentDefinition plus
 * optional structured extraction.
 */
export type IsolatedAgentDefinition = AgentDefinition & {
  extraction?: IsolatedAgentExtraction;
};

// ============================================================================
// RUN OPTIONS (N4)
// ============================================================================

/** Per-run overrides for an isolated agent run (internal-caller knobs). */
export type AgentRunOverrides = {
  /** Wall-clock cap for the research pass (ms). */
  turnTimeoutMs?: number;
  /** Stall watchdog for the research pass (ms). */
  stallTimeoutMs?: number;
  /** Wrap-up lead for the research pass (ms). */
  wrapupTimeLeadMs?: number;
  /** Max agentic steps for the research pass. */
  maxSteps?: number;
  /** Max output tokens per model call. */
  maxTokens?: number;
  /** Model override (wins over the definition). */
  model?: string;
  /** Provider override (wins over the definition). */
  provider?: string;
};

/** Leg budget for leashed mode. Setting either enables leashed mode. */
export type AgentLegOptions = {
  /** Wall-clock budget for one leg (ms). */
  budgetMs?: number;
  /** Tool-call budget for one leg. */
  budgetToolCalls?: number;
};

/**
 * Mechanical waste-signature thresholds, checked per tool call. A tripped
 * signature ends the leg early with `wasteSignals` populated.
 */
export type AgentWasteThresholds = {
  /**
   * Max times the same call hash (tool + normalized params) may be seen in
   * one run before tripping (default 2 — the third identical call trips).
   */
  duplicateCallLimit?: number;
  /** Consecutive empty/zero-result calls before tripping (default 3). */
  emptyResultStreakLimit?: number;
  /** Consecutive error results before tripping (default 3). */
  errorStreakLimit?: number;
  /**
   * Calls without a new distinct result payload before tripping
   * (default 8).
   */
  noNewResultsLimit?: number;
};

/** Lifecycle event types emitted by an isolated agent run. */
export type AgentRunEventType =
  | "start"
  | "tool_call"
  | "tool_result"
  | "phase"
  | "wrapup"
  | "leg_end"
  | "waste"
  | "complete"
  | "error";

/**
 * Lifecycle event for `AgentRunOptions.onEvent`. Fire-and-forget — listener
 * errors never break the run.
 *
 * Note: `tool_call` and `tool_result` both fire AFTER the execution
 * completes (they are driven by the capture record) — a long-running tool
 * emits nothing until it returns. Treat them as accounting events, not
 * live started/finished signals.
 */
export type AgentRunEvent = {
  type: AgentRunEventType;
  /** Run id (also the default tool-context sessionId). */
  runId: string;
  /** Agent definition id. */
  agentId: string;
  /** Epoch milliseconds. */
  timestamp: number;
  /** Current phase, on `phase` events. */
  phase?: "research" | "extraction";
  /** Tool name, on tool_call/tool_result events. */
  toolName?: string;
  /** Tool params, on tool_call events. */
  params?: unknown;
  /** Bounded result summary, on tool_result events. */
  resultSummary?: string;
  /** Whether the tool result was an error, on tool_result events. */
  isError?: boolean;
  /** Leg index, on leg_end events (leashed mode). */
  legIndex?: number;
  /** Tripped waste signatures, on waste events. */
  wasteSignals?: string[];
  /** Error message, on error events. */
  error?: string;
  /** Final status, on complete events. */
  status?: AgentRunStatus;
};

/**
 * Options for one isolated agent run (`NeuroLink.runIsolatedAgent`).
 */
export type AgentRunOptions = {
  /**
   * Parent cancellation. When provided it MUST be honored: an aborted parent
   * stops research AND extraction cleanly, the outcome reports the run was
   * cancelled, and no ghost workers survive.
   */
  abortSignal?: AbortSignal;
  /** Per-run overrides (internal-caller knobs). */
  overrides?: AgentRunOverrides;
  /**
   * Set on the worker for EVERY tool call (merged into the worker's tool
   * context), including a caller-supplied `sessionId`; the run id is used
   * when no sessionId is supplied.
   */
  toolContext?: Record<string, unknown>;
  /** Lifecycle event stream. Fire-and-forget. */
  onEvent?: (event: AgentRunEvent) => void;
  /** Leg budget — enables leashed mode. */
  leg?: AgentLegOptions;
  /** TTL for a leashed handle in ms (default 600_000 = 10 min). */
  handleTtlMs?: number;
  /** Waste-signature thresholds (defaults apply when omitted). */
  waste?: AgentWasteThresholds;
  /**
   * Bounds for the run's tool execution records. Raise `maxResultChars`
   * when the CALLER verifies evidence from `toolExecutions` (raw result
   * texts must be available up to the cap).
   */
  capture?: {
    maxResultChars?: number;
    maxRecords?: number;
  };
};

// ============================================================================
// RUN OUTCOME (N4)
// ============================================================================

/** Terminal (or leg-boundary) status of an isolated agent run. */
export type AgentRunStatus =
  | "completed"
  | "partial"
  | "in_progress"
  | "insufficient_data"
  | "error";

/** Per-leg accounting for leashed runs. */
export type AgentRunLegInfo = {
  /** 0-based leg index. */
  index: number;
  /** Tool calls made this leg. */
  toolCalls: number;
  /** Wall-clock duration of this leg (ms). */
  durationMs: number;
};

/** Cumulative budget accounting for leashed runs. */
export type AgentRunBudget = {
  /** Total wall-clock spent across legs (ms). */
  spentMs: number;
  /** Remaining wall-clock vs the leg budget (ms; 0 when exhausted). */
  remainingMs: number;
  /** Total tool calls across legs. */
  spentToolCalls: number;
};

/**
 * Outcome of an isolated agent run.
 *
 * Delivery guarantee: a run with a non-empty execution record never returns
 * an empty result — when extraction is unrecoverable, `data` carries a
 * mechanical digest (which tools ran, ok/failed counts, bounded excerpts of
 * successful payloads).
 */
export type AgentRunOutcome = {
  status: AgentRunStatus;
  /** Schema-valid extraction output when `extraction.schema` was given. */
  data?: unknown;
  /** Final research-pass text (the worker's own narrative). */
  content?: string;
  /** Why the research turn ended (honest — see GenerateStopReason). */
  stopReason?: GenerateStopReason | string;
  /**
   * Real tool execution records (params/results/timing). Terminal outcomes
   * carry the WHOLE run's records (all legs — what `data` was built from);
   * `in_progress` legs carry this leg's records only.
   */
  toolExecutions: ToolExecutionRecord[];
  /** Aggregated token usage for the run (research + extraction). */
  usage?: TokenUsage;
  /** Wall-clock duration of this call (ms). */
  durationMs: number;
  /** Present when extraction fell back through the recovery ladder. */
  extractionSource?: string;
  /** Extraction/validation error summary when data is a mechanical digest. */
  extractionError?: string;
  // ── leashed mode only ─────────────────────────────────────────────
  /** Resume handle (status "in_progress" only). */
  handle?: string;
  /** This leg's accounting. */
  leg?: AgentRunLegInfo;
  /** One-line query→outcome summaries for this leg. */
  delta?: string[];
  /** The worker's own stated intent for the next leg. */
  nextPlan?: string;
  /** Tripped waste signatures, if any. */
  wasteSignals?: string[];
  /** Cumulative budget accounting. */
  budget?: AgentRunBudget;
};

// ============================================================================
// HOST-LOOP DELEGATION (N5)
// ============================================================================

// ============================================================================
// STRUCTURED RECOVERY (N4 internals, used by src/lib/agent/structuredRecovery.ts)
// ============================================================================

/** Where a recovered value came from, for observability and outcome fields. */
export type StructuredRecoverySource =
  | "structured-data"
  | "raw-json"
  | "json-fence"
  | "brace-span"
  | "top-level-array";

/** One recovery candidate: source label + parsed (uncoerced) value. */
export type StructuredRecoveryCandidate = {
  source: StructuredRecoverySource;
  value: unknown;
};

/** Result of a structured recovery attempt. */
export type StructuredRecoveryResult = {
  /** Schema-valid data, when any candidate survived validation. */
  data?: unknown;
  /** Which ladder rung produced the winning candidate. */
  source?: StructuredRecoverySource;
  /** Validation error summaries per failed candidate (for re-ask prompts). */
  errors: string[];
};

// ============================================================================
// RUNNER INTERNALS (used by src/lib/agent/isolatedAgentRunner.ts)
// ============================================================================

/** Waste-detector streak counters, reset per leg. @internal */
export type IsolatedAgentWasteState = {
  emptyStreak: number;
  errorStreak: number;
  callsSinceNewResult: number;
};

/** Result of one research leg. @internal */
export type IsolatedAgentLegResult = {
  result?: GenerateResult;
  researchError?: string;
  legRecords: ToolExecutionRecord[];
  wasteSignals: string[];
  toolCalls: number;
  durationMs: number;
  aborted: boolean;
  budgetTripped: boolean;
};

/**
 * Live state of a leashed isolated-agent session (generic over the host
 * instance type to avoid a types→runtime import). @internal
 */
export type IsolatedAgentSessionState<TInstance> = {
  handle: string;
  runId: string;
  host: TInstance;
  worker: TInstance;
  definition: IsolatedAgentDefinition;
  options: AgentRunOptions;
  /** Caller-supplied sessionId (open-handle conflicts are scoped to it). */
  callerSessionId?: string;
  /** True while a leg is executing — guards concurrent continue/stop. */
  running: boolean;
  history: ChatMessage[];
  legIndex: number;
  spentMs: number;
  spentToolCalls: number;
  allRecords: ToolExecutionRecord[];
  usage: TokenUsage;
  seenCallHashes: Map<string, number>;
  seenResultHashes: Set<string>;
  ttlTimer?: ReturnType<typeof setTimeout>;
  /** Set on TTL expiry: the final outcome, retrievable once. */
  tombstone?: AgentRunOutcome;
};

/** Mechanical digest shape (delivery-guarantee fallback payload). */
export type AgentMechanicalDigest = {
  kind: "mechanical-digest";
  toolsRun: Record<string, { calls: number; ok: number; failed: number }>;
  excerpts: Array<{ toolName: string; params: string; resultText: string }>;
};

// ============================================================================
// DELEGATION INTERNALS (used by src/lib/agent/agentToolRegistrar.ts)
// ============================================================================

/** One registered agent tool on a host instance. @internal */
export type AgentToolRegistrationRecord = {
  name: string;
  definition: IsolatedAgentDefinition;
  options: AgentToolRegistrationOptions;
};

/** Per-top-level-generate delegation counters + request-scoped depth. @internal */
export type AgentDelegationTurnState = {
  counts: Map<string, number>;
  /**
   * Delegation depth of this turn. Nested scopes (e.g. AgentNetwork
   * standalone delegations wrapping their agents' generates) share the
   * counters but run one level deeper, so composed inner delegations take
   * the nested pool path and hit depth limits.
   */
  depth: number;
};

/**
 * Options for `NeuroLink.registerAgentTool()` — wraps an isolated agent as a
 * tool on the HOST instance so its existing generate() loop delegates
 * without a second router generate.
 */
export type AgentToolRegistrationOptions = {
  /** Tool name (default: the agent definition id). */
  name?: string;
  /**
   * Max delegations to this tool per top-level generate() turn, counted in
   * the loop itself. A refused call returns a recovery instruction, never a
   * silent failure.
   */
  maxDelegationsPerTurn?: number;
  /**
   * Max delegation depth (via tool context `agentDepth`). At the limit the
   * tool is withheld from the request entirely.
   */
  maxDepth?: number;
  /**
   * Process-wide concurrent delegation pool size. The pool is shared across
   * all registered agent tools; the largest registered value wins (default
   * 4) — registering raises the pool and can never lower it, so this is NOT
   * a per-agent throttle. Nested delegations (agentDepth > 0) bypass the
   * pool: the outer delegation already holds a slot, and queueing nested
   * work behind a full pool would deadlock it.
   */
  maxConcurrent?: number;
  /** Queue timeout when the pool is saturated (ms, default 30_000). */
  poolQueueTimeoutMs?: number;
  /** Leashed-by-default leg budget for this tool. */
  leg?: AgentLegOptions;
  /** Handle TTL for leashed delegations (ms, default 600_000). */
  handleTtlMs?: number;
  /** Waste thresholds forwarded to each delegated run. */
  waste?: AgentWasteThresholds;
  /** Per-run overrides forwarded to each delegated run. */
  overrides?: AgentRunOverrides;
};

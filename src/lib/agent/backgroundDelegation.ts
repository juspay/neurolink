/**
 * Async delegation (N2) — spawn a background worker, collect it later, in any
 * order.
 *
 * Delegation through `registerAgentTool` is synchronous: the supervising
 * agent's loop blocks on the worker, so four investigations cost four times
 * one investigation and the supervisor sits idle while each runs. This module
 * keeps the same worker machinery and changes only WHEN the caller waits.
 * `spawnDelegate` records the job and returns a `workerId` immediately;
 * `collectDelegates` hands back whichever worker finished FIRST, which has
 * nothing to do with which was spawned first.
 *
 * Everything underneath already existed and is reused, not re-implemented:
 *
 *  - `runIsolatedAgent` gives the worker a fresh session on a worker instance
 *    that SHARES the host's tool registry (so live MCP connections are reused),
 *    plus waste detection, honest stop reasons and continuation handles;
 *  - the process-wide delegation pool in `agentToolRegistrar` bounds
 *    concurrency — one pool, not a second one competing with the first;
 *  - `bankArtifact` (N3) writes each worker's FULL report to a file, so the
 *    conversation carries a bounded summary and a read-back call rather than
 *    a report that has been truncated into uselessness;
 *  - the checklist's `delegatesPending` / `delegatesReady` counters (N1) are
 *    fed from here, which is how the model learns "a worker finished" from any
 *    `tasks_list` — no polling loop, and no change to the core generate loop.
 *
 * @module agent/backgroundDelegation
 */

import { z } from "zod";
import type { NeuroLink } from "../neurolink.js";
import type {
  AgentRunOptions,
  AgentRunOutcome,
  AgentRunOverrides,
  BankedArtifactRef,
  ChecklistDelegateCounts,
  DelegateCollectRequest,
  DelegateCollectResult,
  DelegateHandle,
  DelegateJobState,
  DelegateOutcome,
  DelegateRefusal,
  DelegateRegistrationOptions,
  DelegateRuntimeSettings,
  DelegateSpawnOptions,
  DelegateSpawnToolResult,
  IsolatedAgentDefinition,
  MCPExecutableTool,
  ToolExecutionRecord,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  DELEGATION_RESULT_CONTENT_CHARS,
  acquireDelegationSlot,
  raiseDelegationPoolCapacity,
  resolveDelegationDepth,
  tryAcquireDelegationSlot,
} from "./agentToolRegistrar.js";
import {
  buildMechanicalDigest,
  runIsolatedAgent,
} from "./isolatedAgentRunner.js";
import {
  resolveChecklistSessionId,
  setChecklistDelegateCountsSource,
} from "./taskChecklist.js";

/**
 * Every outstanding job in the process, keyed by workerId.
 *
 * Module-level for the same reason the checklist is: a job outlives the tool
 * call that spawned it and must survive compaction, which rewrites messages
 * and cannot touch a module map. Claimed jobs are deleted on the spot, so this
 * holds only work that has not been accounted for.
 */
const jobs = new Map<string, DelegateJobState<NeuroLink>>();

const hostSettings = new WeakMap<object, DelegateRuntimeSettings>();

/**
 * Default depth ceiling: a background worker does not spawn background
 * workers. Its own delegates would outlive it with nobody left to collect
 * them — an orphan that burns pool slots and is never read.
 */
const DEFAULT_DELEGATE_MAX_DEPTH = 1;

/** How long a spawned worker waits for a pool slot before giving up. */
const DEFAULT_DELEGATE_POOL_QUEUE_TIMEOUT_MS = 120_000;

/** How long a collect waits when the caller names no bound. */
const DEFAULT_COLLECT_WAIT_MS = 300_000;

/** Grace period for cancelled workers to unwind before `cancelDelegates` returns. */
const CANCEL_SETTLE_GRACE_MS = 15_000;

/**
 * Per-record evidence kept for a delegated worker (default is ~8 KB).
 *
 * Raised because these records are BANKED, not sent to a model: the banked
 * report is the run's evidence, and evidence that was cut at 8 KB before it
 * ever reached the file is evidence nobody can recover.
 */
const DELEGATE_CAPTURE_RESULT_CHARS = 100_000;

/** Preview cut into the conversation from each banked report. */
const REPORT_PREVIEW_CHARS = 600;

/** Longest label derived from a task string. */
const LABEL_MAX_CHARS = 60;

let workerCounter = 0;
let settleCounter = 0;
let checklistCountsInstalled = false;

// ── Small helpers ──────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Matches `agentToolRegistrar`'s convention: the recovery step is IN the text. */
function refusal(message: string): DelegateRefusal {
  return { isError: true, error: message };
}

function bounded(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function firstLine(text: string, maxChars: number): string {
  const line = text.split("\n", 1)[0]?.trim() ?? "";
  return bounded(line, maxChars);
}

function jsonBlock(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch (error) {
    return `[unserializable: ${errorMessage(error)}]`;
  }
}

/** A timer that never keeps the process alive for a collect nobody awaits. */
function afterMs(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, Math.max(0, ms));
    timer.unref?.();
  });
}

function whenAborted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function deferredOutcome(): {
  promise: Promise<DelegateOutcome>;
  resolve: (outcome: DelegateOutcome) => void;
} {
  let resolve: (outcome: DelegateOutcome) => void = () => undefined;
  const promise = new Promise<DelegateOutcome>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

// ── Settings ───────────────────────────────────────────────────────────────

function settingsFor(host: NeuroLink): DelegateRuntimeSettings {
  return (
    hostSettings.get(host) ?? {
      maxDepth: DEFAULT_DELEGATE_MAX_DEPTH,
      poolQueueTimeoutMs: DEFAULT_DELEGATE_POOL_QUEUE_TIMEOUT_MS,
      defaultCollectWaitMs: DEFAULT_COLLECT_WAIT_MS,
    }
  );
}

/**
 * Feed the task checklist's delegate counters, once per process.
 *
 * Keyed by session alone because that is the signature the checklist offers —
 * and the right key anyway: a checklist and the workers a run spawned belong
 * to the same session, which is exactly what `delegatesPending` reports.
 */
function installChecklistCounts(): void {
  if (checklistCountsInstalled) {
    return;
  }
  setChecklistDelegateCountsSource(countsForSession);
  checklistCountsInstalled = true;
}

/**
 * Apply registration options for one host: depth ceiling, queue wait, and a
 * raise (never a lowering) of the shared delegation pool.
 */
export function configureDelegation(
  host: NeuroLink,
  options: DelegateRegistrationOptions = {},
): DelegateRuntimeSettings {
  const settings: DelegateRuntimeSettings = {
    maxDepth: options.maxDepth ?? DEFAULT_DELEGATE_MAX_DEPTH,
    poolQueueTimeoutMs:
      options.poolQueueTimeoutMs ?? DEFAULT_DELEGATE_POOL_QUEUE_TIMEOUT_MS,
    defaultCollectWaitMs: DEFAULT_COLLECT_WAIT_MS,
    ...(options.spawnDefaults !== undefined && {
      spawnDefaults: options.spawnDefaults,
    }),
  };
  hostSettings.set(host, settings);
  if (options.maxConcurrent !== undefined) {
    raiseDelegationPoolCapacity(options.maxConcurrent);
  }
  installChecklistCounts();
  return settings;
}

// ── Counting ───────────────────────────────────────────────────────────────

function isReady(job: DelegateJobState<NeuroLink>): boolean {
  return job.phase === "ready" && job.outcome !== undefined;
}

function outstandingFor(
  host: NeuroLink,
  sessionId: string,
): DelegateJobState<NeuroLink>[] {
  return [...jobs.values()].filter(
    (job) =>
      job.host === host &&
      job.sessionId === sessionId &&
      job.phase !== "claimed",
  );
}

function tally(
  candidates: DelegateJobState<NeuroLink>[],
): ChecklistDelegateCounts {
  let pending = 0;
  let ready = 0;
  for (const job of candidates) {
    if (isReady(job)) {
      ready += 1;
    } else {
      pending += 1;
    }
  }
  return { pending, ready };
}

/** Counts across every host for one session — what the checklist reads. */
function countsForSession(sessionId: string): ChecklistDelegateCounts {
  return tally(
    [...jobs.values()].filter(
      (job) => job.sessionId === sessionId && job.phase !== "claimed",
    ),
  );
}

/**
 * Outstanding workers for a host's session: `pending` are still running or
 * queued, `ready` finished and are waiting to be claimed. This is what feeds
 * every `ChecklistToolResult`, so the model learns a worker landed from any
 * `tasks_list` call.
 */
export function delegateCounts(
  host: NeuroLink,
  sessionId?: string,
): ChecklistDelegateCounts {
  const session = sessionId ?? resolveChecklistSessionId(host);
  return tally(outstandingFor(host, session));
}

// ── Report assembly ────────────────────────────────────────────────────────

function renderRecords(records: ToolExecutionRecord[]): string {
  if (records.length === 0) {
    return "(no tools were called)";
  }
  return records
    .map(
      (record, index) =>
        `[${index + 1}] ${record.toolName}(${jsonBlock(record.params)}) → ` +
        `${record.isError ? "ERROR" : "ok"} (${record.durationMs}ms)\n` +
        record.resultText,
    )
    .join("\n\n");
}

/**
 * The worker's complete report, as it goes to disk.
 *
 * Everything the run produced is here — narrative, structured data, a digest,
 * and every tool execution record in full. The bounded thing is the SUMMARY
 * that goes into the conversation; this is the thing the summary points at, so
 * cutting it would defeat the point of banking it.
 */
function buildReportBody(
  job: DelegateJobState<NeuroLink>,
  outcome: AgentRunOutcome,
): string {
  const header = [
    `workerId: ${job.workerId}`,
    `label: ${job.label}`,
    `status: ${outcome.status}`,
    outcome.stopReason ? `stopReason: ${outcome.stopReason}` : "",
    `durationMs: ${outcome.durationMs}`,
    `toolCalls: ${outcome.toolExecutions.length}`,
    outcome.handle ? `continuationHandle: ${outcome.handle}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "# Delegated worker report",
    header,
    `## Task\n${job.task}`,
    `## Report\n${outcome.content?.trim() || "(the worker produced no narrative)"}`,
    outcome.data !== undefined
      ? `## Structured data\n${jsonBlock(outcome.data)}`
      : "",
    outcome.wasteSignals?.length
      ? `## Waste signals\n${outcome.wasteSignals.join("\n")}`
      : "",
    outcome.extractionError
      ? `## Extraction errors\n${outcome.extractionError}`
      : "",
    `## Tool execution digest\n${jsonBlock(
      buildMechanicalDigest(outcome.toolExecutions),
    )}`,
    `## Tool executions (${outcome.toolExecutions.length}, complete)\n${renderRecords(
      outcome.toolExecutions,
    )}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Bank the report and hand back the pointer.
 *
 * A banking failure is reported in the reference rather than thrown: losing
 * the file must not also lose the worker's outcome, and the caller is told in
 * so many words that the read-back is not available and why.
 */
async function bankReport(
  job: DelegateJobState<NeuroLink>,
  body: string,
): Promise<BankedArtifactRef> {
  const label = `delegate:${job.label}`;
  try {
    return await job.host.bankArtifact(body, {
      kind: "worker-report",
      label,
      sessionId: job.sessionId,
      previewChars: REPORT_PREVIEW_CHARS,
    });
  } catch (error) {
    const message = errorMessage(error);
    logger.warn("[BackgroundDelegation] Banking the worker report failed", {
      workerId: job.workerId,
      error: message,
    });
    return {
      artifactId: "",
      label,
      kind: "worker-report",
      sizeBytes: Buffer.byteLength(body, "utf-8"),
      preview: bounded(body, REPORT_PREVIEW_CHARS),
      readBackHint:
        `The full report could NOT be banked (${message}), so there is nothing to ` +
        "read back — what survived is this preview. Re-run the task if you need the rest.",
    };
  }
}

// ── Settling ───────────────────────────────────────────────────────────────

function markSettled(
  job: DelegateJobState<NeuroLink>,
  outcome: DelegateOutcome,
): DelegateOutcome {
  job.outcome = outcome;
  job.settledOrder = ++settleCounter;
  job.phase = "ready";
  logger.debug("[BackgroundDelegation] Worker settled", {
    workerId: job.workerId,
    status: outcome.status,
    durationMs: outcome.durationMs,
    artifactId: outcome.report.artifactId,
  });
  return outcome;
}

async function settleRun(
  job: DelegateJobState<NeuroLink>,
  outcome: AgentRunOutcome,
  startedAt: number,
): Promise<DelegateOutcome> {
  const report = await bankReport(job, buildReportBody(job, outcome));
  const summary =
    outcome.content?.trim() ||
    `Worker ${job.workerId} finished with status "${outcome.status}" and ` +
      `${outcome.toolExecutions.length} tool calls but wrote no narrative; ` +
      "the banked report holds the evidence.";
  return markSettled(job, {
    workerId: job.workerId,
    label: job.label,
    status: outcome.status,
    ok: outcome.status === "completed" || outcome.status === "partial",
    summary: bounded(summary, DELEGATION_RESULT_CONTENT_CHARS),
    report,
    durationMs: Date.now() - startedAt,
    toolCallsUsed: outcome.toolExecutions.length,
    ...(outcome.wasteSignals?.length && { wasteSignals: outcome.wasteSignals }),
    ...(outcome.handle && { handle: outcome.handle }),
    // A cancelled worker still runs to a real outcome (the runner unwinds and
    // reports what it had). Say WHY it is short, or the supervisor reads a
    // truncated investigation as a completed one.
    ...(job.cancelled && {
      error: `Worker ${job.workerId} was cancelled by the caller.`,
    }),
  });
}

/**
 * A worker that never produced an outcome — cancelled, refused a pool slot, or
 * broken. It still settles into a claimable outcome with a banked report: a
 * failure the supervisor cannot see is worse than a failure it can.
 */
async function settleFailure(
  job: DelegateJobState<NeuroLink>,
  reason: string,
  startedAt: number,
): Promise<DelegateOutcome> {
  const body = [
    "# Delegated worker report",
    `workerId: ${job.workerId}\nlabel: ${job.label}\nstatus: error`,
    `## Task\n${job.task}`,
    `## Failure\n${reason}`,
  ].join("\n\n");
  const report = await bankReport(job, body);
  return markSettled(job, {
    workerId: job.workerId,
    label: job.label,
    status: "error",
    ok: false,
    summary: bounded(reason, DELEGATION_RESULT_CONTENT_CHARS),
    report,
    durationMs: Date.now() - startedAt,
    toolCallsUsed: 0,
    error: reason,
  });
}

// ── Running one job ────────────────────────────────────────────────────────

function buildDefinition(
  job: DelegateJobState<NeuroLink>,
  options: DelegateSpawnOptions,
): IsolatedAgentDefinition {
  const instructions = [
    "You are a background worker. A supervising agent delegated exactly one task to you " +
      "and is doing other work while you run.",
    "Use your tools to gather real evidence, then finish with a SELF-CONTAINED report: " +
      "what you did, what you found, and the evidence for each finding. The supervisor " +
      "cannot see your tool calls — whatever is not in your report did not happen.",
    "Stay inside your task. Do not start adjacent work you were not asked for.",
    options.scope ? `Scope — what you may look at:\n${options.scope}` : "",
    options.context ? `Context from the supervisor:\n${options.context}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    id: `delegate-${job.workerId}`,
    name: job.label,
    description: `Background worker: ${firstLine(job.task, LABEL_MAX_CHARS)}`,
    instructions,
    ...(options.provider && { provider: options.provider }),
    ...(options.model && { model: options.model }),
    ...(options.tools?.length && { tools: options.tools }),
    ...(options.maxSteps !== undefined && { maxSteps: options.maxSteps }),
  };
}

function buildRunOptions(
  job: DelegateJobState<NeuroLink>,
  options: DelegateSpawnOptions,
): AgentRunOptions {
  const overrides: AgentRunOverrides = {
    ...(options.budgetMs !== undefined && { turnTimeoutMs: options.budgetMs }),
    ...(options.maxSteps !== undefined && { maxSteps: options.maxSteps }),
  };
  return {
    abortSignal: job.controller.signal,
    // Depth travels so a worker's own delegation attempts hit the ceiling.
    // The caller's sessionId deliberately does NOT: the worker gets its own
    // session (runIsolatedAgent stamps the run id), so its checklist and its
    // delegate counters stay separate from the supervisor's.
    toolContext: {
      agentDepth: job.depth + 1,
      delegateWorkerId: job.workerId,
    },
    capture: { maxResultChars: DELEGATE_CAPTURE_RESULT_CHARS },
    ...(Object.keys(overrides).length > 0 && { overrides }),
  };
}

/**
 * The detached body of one delegation. Never rejects: every path ends in a
 * claimable outcome, because a job that vanishes is a job the supervisor waits
 * on forever.
 */
async function runJob(
  job: DelegateJobState<NeuroLink>,
  options: DelegateSpawnOptions,
  settings: DelegateRuntimeSettings,
  preAcquired: (() => void) | undefined,
): Promise<DelegateOutcome> {
  const startedAt = Date.now();
  let release = preAcquired;
  try {
    if (!release) {
      const queued = acquireDelegationSlot(settings.poolQueueTimeoutMs);
      const raced = await Promise.race([
        queued.then(
          (grant) => ({ kind: "granted" as const, grant }),
          (error: unknown) => ({ kind: "queue-timeout" as const, error }),
        ),
        whenAborted(job.controller.signal).then(() => ({
          kind: "aborted" as const,
        })),
      ]);
      if (raced.kind === "granted") {
        release = raced.grant;
      } else {
        // Whatever we stopped waiting for may still be granted — hand it
        // straight back rather than leaking a slot nobody will ever use.
        void queued.then((grant) => grant()).catch(() => undefined);
        return raced.kind === "aborted"
          ? await settleFailure(
              job,
              `Worker ${job.workerId} was cancelled while waiting for a delegation slot.`,
              startedAt,
            )
          : await settleFailure(
              job,
              `Worker ${job.workerId} never got a delegation slot: ${errorMessage(
                raced.error,
              )}. The pool was saturated for ${settings.poolQueueTimeoutMs}ms.`,
              startedAt,
            );
      }
    }
    if (job.controller.signal.aborted) {
      return await settleFailure(
        job,
        `Worker ${job.workerId} was cancelled before it started.`,
        startedAt,
      );
    }
    job.phase = "running";
    const outcome = await runIsolatedAgent(
      job.host,
      buildDefinition(job, options),
      job.task,
      buildRunOptions(job, options),
    );
    return await settleRun(job, outcome, startedAt);
  } catch (error) {
    return await settleFailure(
      job,
      job.cancelled
        ? `Worker ${job.workerId} was cancelled: ${errorMessage(error)}`
        : `Worker ${job.workerId} failed: ${errorMessage(error)}`,
      startedAt,
    );
  } finally {
    release?.();
    job.detachParent?.();
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

function depthRefusal(depth: number, maxDepth: number): string {
  return (
    `Delegation depth limit reached (${depth}/${maxDepth}). Complete this investigation ` +
    "yourself with your own tools instead of delegating further."
  );
}

/**
 * Start a background worker and return its handle immediately — before the
 * pool is waited on, and long before the worker finishes.
 *
 * The worker runs through `runIsolatedAgent`, so it gets a fresh session on a
 * worker instance sharing this host's tool registry (live MCP connections
 * included), waste detection, and an honest stop reason. Its full report is
 * banked to a file when it settles; `collectDelegates` hands back the bounded
 * summary and the pointer.
 *
 * @throws when the task is empty or the caller is already at the depth ceiling
 */
export async function spawnDelegate(
  host: NeuroLink,
  options: DelegateSpawnOptions,
): Promise<DelegateHandle> {
  const task = options.task?.trim() ?? "";
  if (!task) {
    throw new Error(
      "delegate_task needs a task: state, in one or two sentences, exactly what the " +
        "worker should investigate and what it should report back.",
    );
  }
  const settings = settingsFor(host);
  const depth = options.depth ?? resolveDelegationDepth(host);
  if (depth >= settings.maxDepth) {
    throw new Error(depthRefusal(depth, settings.maxDepth));
  }

  installChecklistCounts();

  workerCounter += 1;
  const workerId = `w${workerCounter}`;
  const controller = new AbortController();
  // Chain the parent, and remember how to unchain: one long-lived run signal
  // with many delegates hung off it would otherwise accumulate a listener per
  // worker for the life of the run.
  let detachParent: (() => void) | undefined;
  const parentSignal = options.abortSignal;
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      const onParentAbort = (): void => controller.abort();
      parentSignal.addEventListener("abort", onParentAbort, { once: true });
      detachParent = () =>
        parentSignal.removeEventListener("abort", onParentAbort);
    }
  }

  // Ask for a slot without queueing, so the handle can say truthfully whether
  // this worker is running or waiting.
  const immediate = tryAcquireDelegationSlot();
  const settled = deferredOutcome();
  const job: DelegateJobState<NeuroLink> = {
    workerId,
    host,
    sessionId: options.sessionId ?? resolveChecklistSessionId(host),
    label:
      options.label?.trim() || firstLine(task, LABEL_MAX_CHARS) || workerId,
    task,
    depth,
    phase: immediate ? "running" : "queued",
    spawnedAt: Date.now(),
    settledOrder: 0,
    controller,
    ...(detachParent && { detachParent }),
    settled: settled.promise,
    cancelled: false,
  };
  jobs.set(workerId, job);

  // Detached on purpose: this is the whole point of the primitive.
  void runJob(job, options, settings, immediate).then(settled.resolve);

  logger.debug("[BackgroundDelegation] Worker spawned", {
    workerId,
    sessionId: job.sessionId,
    queued: immediate === undefined,
    depth,
  });
  return {
    workerId,
    spawnedAt: job.spawnedAt,
    queued: immediate === undefined,
  };
}

function claim(job: DelegateJobState<NeuroLink>): DelegateOutcome | undefined {
  const outcome = job.outcome;
  if (!outcome) {
    return undefined;
  }
  job.phase = "claimed";
  jobs.delete(job.workerId);
  return outcome;
}

function bySettleOrder(
  left: DelegateJobState<NeuroLink>,
  right: DelegateJobState<NeuroLink>,
): number {
  return left.settledOrder - right.settledOrder;
}

/**
 * Claim finished workers.
 *
 * `{ mode: "any" }` returns the first worker to FINISH — spawn order is
 * irrelevant. `{ mode: "all" }` returns every outstanding worker in completion
 * order. `{ workerId }` waits for one named worker. Each outcome is claimed
 * exactly once and then dropped, so two collects never report the same work
 * twice.
 *
 * `waitMs: 0` polls (whatever is ready right now); omitting it waits up to the
 * runtime default. `timedOut` says work was still outstanding when the call
 * returned — the signal to come back later, not an error.
 *
 * @throws when a named workerId is unknown to this host and session
 */
export async function collectDelegates(
  host: NeuroLink,
  request: DelegateCollectRequest,
): Promise<DelegateCollectResult> {
  const settings = settingsFor(host);
  const sessionId = request.sessionId ?? resolveChecklistSessionId(host);
  const waitMs = request.waitMs ?? settings.defaultCollectWaitMs;

  if ("workerId" in request) {
    const job = jobs.get(request.workerId);
    if (!job || job.host !== host || job.sessionId !== sessionId) {
      const known = outstandingFor(host, sessionId).map((j) => j.workerId);
      throw new Error(
        known.length > 0
          ? `No outstanding worker "${request.workerId}". Outstanding workers are ${known.join(
              ", ",
            )} — collect one of those, or use { mode: "any" }.`
          : `No outstanding worker "${request.workerId}": every worker has already been ` +
              "collected. Do not collect again; work with the results you have.",
      );
    }
    if (!isReady(job)) {
      await Promise.race([job.settled, afterMs(waitMs)]);
    }
    const outcome = isReady(job) ? claim(job) : undefined;
    const counts = tally(outstandingFor(host, sessionId));
    return {
      completed: outcome ? [outcome] : [],
      ...counts,
      timedOut: outcome === undefined,
    };
  }

  const mode = request.mode;
  let ready = outstandingFor(host, sessionId).filter(isReady);
  if (mode === "any") {
    if (ready.length === 0) {
      const unsettled = outstandingFor(host, sessionId).filter(
        (job) => !isReady(job),
      );
      if (unsettled.length > 0) {
        await Promise.race([
          ...unsettled.map((job) => job.settled),
          afterMs(waitMs),
        ]);
        ready = outstandingFor(host, sessionId).filter(isReady);
      }
    }
    const first = [...ready].sort(bySettleOrder)[0];
    const outcome = first ? claim(first) : undefined;
    const counts = tally(outstandingFor(host, sessionId));
    return {
      completed: outcome ? [outcome] : [],
      ...counts,
      timedOut: outcome === undefined && counts.pending > 0,
    };
  }

  const unsettled = outstandingFor(host, sessionId).filter(
    (job) => !isReady(job),
  );
  if (unsettled.length > 0) {
    await Promise.race([
      Promise.all(unsettled.map((job) => job.settled)),
      afterMs(waitMs),
    ]);
  }
  const completed = outstandingFor(host, sessionId)
    .filter(isReady)
    .sort(bySettleOrder)
    .map(claim)
    .filter((outcome): outcome is DelegateOutcome => outcome !== undefined);
  const counts = tally(outstandingFor(host, sessionId));
  return { completed, ...counts, timedOut: counts.pending > 0 };
}

/**
 * Cancel background workers: one by id, or every outstanding worker this host
 * spawned. Cancelled workers still settle into a claimable outcome saying they
 * were cancelled — silence would leave the supervisor waiting on a worker that
 * is never coming back.
 *
 * @returns how many workers were cancelled
 */
export async function cancelDelegates(
  host: NeuroLink,
  workerId?: string,
): Promise<number> {
  const targets = [...jobs.values()].filter(
    (job) =>
      job.host === host &&
      job.phase !== "claimed" &&
      !job.controller.signal.aborted &&
      (workerId === undefined || job.workerId === workerId),
  );
  for (const job of targets) {
    job.cancelled = true;
    job.controller.abort();
  }
  if (targets.length > 0) {
    // Bounded: a worker that ignores its abort must not hang the caller.
    await Promise.race([
      Promise.all(targets.map((job) => job.settled)),
      afterMs(CANCEL_SETTLE_GRACE_MS),
    ]);
  }
  logger.debug("[BackgroundDelegation] Workers cancelled", {
    cancelled: targets.length,
    ...(workerId && { workerId }),
  });
  return targets.length;
}

// ── Model-facing tools ─────────────────────────────────────────────────────

const SPAWN_SCHEMA = z.object({
  task: z
    .string()
    .describe(
      "Exactly what this worker must investigate and report back. Self-contained: " +
        "the worker cannot see your conversation.",
    ),
  scope: z
    .string()
    .optional()
    .describe("What the worker may look at — files, directories, systems."),
  context: z
    .string()
    .optional()
    .describe(
      "A brief slice of background the worker needs. Keep it short; do not paste whole documents.",
    ),
  tools: z
    .array(z.string())
    .optional()
    .describe("Restrict the worker to these tool names."),
  model: z.string().optional().describe("Model override for this worker."),
});

const COLLECT_SCHEMA = z.object({
  mode: z
    .enum(["any", "all"])
    .optional()
    .describe(
      '"any" (default) returns the first worker to finish; "all" waits for every outstanding worker.',
    ),
  workerId: z
    .string()
    .optional()
    .describe("Collect one specific worker instead of using mode."),
  waitMs: z
    .number()
    .optional()
    .describe(
      "How long to wait, in milliseconds. 0 returns only what is already finished.",
    ),
});

/**
 * `delegate_task` and `collect_results`, bound to `host`. Register them with
 * `host.registerTool()` (see `NeuroLink.registerDelegationTools()`), never on
 * the tool registry directly: only the "user-defined" category reaches the
 * LLM's tool schema.
 */
export function createDelegationTools(
  host: NeuroLink,
): Record<string, MCPExecutableTool> {
  return {
    delegate_task: {
      name: "delegate_task",
      description:
        "Hand one self-contained task to a background worker and get a workerId back " +
        "IMMEDIATELY — the worker runs while you keep working. Delegate the big, " +
        "separable investigations; do the small ones yourself. Collect the results later " +
        "with collect_results; they come back in whatever order the workers finish.",
      inputSchema: SPAWN_SCHEMA,
      execute: async (params: unknown, executionContext?: unknown) => {
        const parsed = SPAWN_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            "delegate_task expects { task, scope?, context?, tools?, model? } with task a " +
              "non-empty string. Call it again with the task spelled out.",
          );
        }
        const contextRecord = asRecord(executionContext);
        const sessionId = resolveChecklistSessionId(host, executionContext);
        // Registration-time defaults under the model's arguments: the model's own
        // `model` wins, `provider` can only come from here (the schema has none).
        const defaults = settingsFor(host).spawnDefaults;
        try {
          const handle = await spawnDelegate(host, {
            ...(defaults?.provider !== undefined && {
              provider: defaults.provider,
            }),
            ...(defaults?.model !== undefined && { model: defaults.model }),
            ...parsed.data,
            sessionId,
            depth: resolveDelegationDepth(host, contextRecord),
          });
          const counts = delegateCounts(host, sessionId);
          const result: DelegateSpawnToolResult = {
            ...handle,
            pending: counts.pending,
            ready: counts.ready,
          };
          return result;
        } catch (error) {
          return refusal(errorMessage(error));
        }
      },
    },

    collect_results: {
      name: "collect_results",
      description:
        "Claim finished background workers. Each result carries a bounded summary and a " +
        "read-back call for the worker's FULL report, which was banked to a file. Results " +
        "are returned in completion order, not the order you spawned them, and each one is " +
        "handed out exactly once. pending/ready tell you what is still outstanding.",
      inputSchema: COLLECT_SCHEMA,
      execute: async (params: unknown, executionContext?: unknown) => {
        const parsed = COLLECT_SCHEMA.safeParse(params ?? {});
        if (!parsed.success) {
          return refusal(
            'collect_results expects { mode?: "any" | "all", workerId?, waitMs? }. ' +
              "Call it again with no arguments to take the next finished worker.",
          );
        }
        const sessionId = resolveChecklistSessionId(host, executionContext);
        const { mode, workerId, waitMs } = parsed.data;
        try {
          return await collectDelegates(
            host,
            workerId
              ? {
                  workerId,
                  sessionId,
                  ...(waitMs !== undefined && { waitMs }),
                }
              : {
                  mode: mode ?? "any",
                  sessionId,
                  ...(waitMs !== undefined && { waitMs }),
                },
          );
        } catch (error) {
          return refusal(errorMessage(error));
        }
      },
    },
  };
}

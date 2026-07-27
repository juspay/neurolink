/**
 * runIsolatedAgent() — the production sub-agent runner.
 *
 * One function replacing what every consumer hand-rolled on top of
 * generate(): a worker-mode instance (memory off, orchestration off,
 * observability inherited), a tool-using research pass under the turn budget
 * (wrap-up nudge + stall watchdog + honest stopReason), an extraction pass
 * that ALWAYS runs tools-off on its own timeout, a structured-recovery
 * ladder with corrective re-asks, a delivery guarantee (non-empty execution
 * records never produce an empty result), abort chaining, a lifecycle event
 * stream, leashed legs with TTL'd resume handles, and mechanical
 * waste-signature detection.
 *
 * Behavioral contract: docs/plans/2026-07-27-isolated-agent-runner-rfc.md.
 */

import { randomUUID } from "crypto";
import type { NeuroLink } from "../neurolink.js";
import type {
  AgentLegOptions,
  AgentRunEvent,
  AgentRunOptions,
  AgentRunOutcome,
  AgentRunStatus,
  AgentWasteThresholds,
  ChatMessage,
  GenerateOptions,
  GenerateResult,
  GenerateStopReason,
  IsolatedAgentDefinition,
  TokenUsage,
  ToolExecutionRecord,
} from "../types/index.js";
import type {
  IsolatedAgentLegResult,
  IsolatedAgentSessionState,
  IsolatedAgentWasteState,
  StructuredRecoverySource,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { recoverStructuredData } from "./structuredRecovery.js";

// ── Defaults (all overridable via options) ─────────────────────────────────

const DEFAULT_HANDLE_TTL_MS = 600_000; // 10 min
const DEFAULT_EXTRACTION_TIMEOUT_MS = 60_000;
const DEFAULT_EXTRACTION_MAX_RETRIES = 2;
const DEFAULT_MAX_STEPS = 10; // AgentDefinition's documented default
const DEFAULT_DUPLICATE_CALL_LIMIT = 2;
const DEFAULT_EMPTY_RESULT_STREAK_LIMIT = 3;
const DEFAULT_ERROR_STREAK_LIMIT = 3;
const DEFAULT_NO_NEW_RESULTS_LIMIT = 8;
/** Evidence text budget for the extraction prompt. */
const EXTRACTION_EVIDENCE_MAX_CHARS = 120_000;
/** Bounded per-event result summary for onEvent listeners. */
const EVENT_RESULT_SUMMARY_CHARS = 400;

// ── Session registry (leashed handles) ─────────────────────────────────────

const sessions = new Map<string, IsolatedAgentSessionState<NeuroLink>>();

/**
 * True when the SAME host + caller session already has an open (live)
 * leashed handle for this agent definition.
 *
 * Deliberately narrow: a handle belongs to the conversation that opened it,
 * so the conflict only exists when the caller-supplied `sessionId` matches —
 * a multi-tenant host must never refuse thread B because thread A has an
 * in-flight leg (thread B cannot see, continue, or legitimately steer that
 * handle). Callers without a stable sessionId get no conflict detection;
 * cross-session concurrency is the delegation pool's job.
 */
export function hasOpenIsolatedAgentHandle(
  host: unknown,
  definitionId: string,
  callerSessionId?: string,
): {
  open: boolean;
  handle?: string;
} {
  if (callerSessionId === undefined) {
    return { open: false };
  }
  for (const session of sessions.values()) {
    if (
      session.host === host &&
      session.definition.id === definitionId &&
      session.callerSessionId === callerSessionId &&
      !session.tombstone
    ) {
      return { open: true, handle: session.handle };
    }
  }
  return { open: false };
}

// ── Small helpers ──────────────────────────────────────────────────────────

function emitEvent(
  options: AgentRunOptions | undefined,
  event: AgentRunEvent,
): void {
  if (!options?.onEvent) {
    return;
  }
  try {
    options.onEvent(event);
  } catch {
    // Listener errors never break the run.
  }
}

function stableStringify(value: unknown): string {
  try {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value) ?? "undefined";
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`)
      .join(",")}}`;
  } catch {
    return String(value);
  }
}

function isEmptyResultText(resultText: string): boolean {
  const trimmed = resultText.trim();
  return (
    trimmed === "" ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "[]" ||
    trimmed === "{}" ||
    trimmed === '""'
  );
}

function summarizeParams(params: unknown, maxChars = 120): string {
  const text = stableStringify(params);
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function addUsage(total: TokenUsage, delta?: TokenUsage): void {
  if (!delta) {
    return;
  }
  total.input += delta.input ?? 0;
  total.output += delta.output ?? 0;
  total.total += delta.total ?? 0;
}

function chatMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: randomUUID(), role, content };
}

function isAbortLikeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  return name === "AbortError" || /abort/i.test(message);
}

/**
 * A leg is "cut short" — and therefore resumable in leashed mode — only when
 * something bounded it: the turn budget (`time-limit`), the step cap, the
 * leg's own tool-call budget, or a waste trip. A generate that returned
 * normally WITHOUT a stopReason is a finished turn: several provider loops
 * (e.g. the chat-completions/LiteLLM path) never set `stopReason`, and
 * inferring "unfinished" from its absence would leave those paths
 * `in_progress` forever (and mislabel every healthy non-leashed run partial).
 */
function isLegCutShort(legOutcome: IsolatedAgentLegResult): boolean {
  const stop = legOutcome.result?.stopReason;
  return (
    stop === "time-limit" ||
    stop === "step-cap" ||
    legOutcome.budgetTripped ||
    legOutcome.wasteSignals.length > 0
  );
}

/**
 * Mechanical digest of a run's execution records: which tools ran, ok/failed
 * counts, and bounded excerpts of successful payloads. The delivery
 * guarantee's last line of defense — a non-empty execution record can never
 * produce an empty result.
 */
export function buildMechanicalDigest(records: ToolExecutionRecord[]): {
  kind: "mechanical-digest";
  toolsRun: Record<string, { calls: number; ok: number; failed: number }>;
  excerpts: Array<{ toolName: string; params: string; resultText: string }>;
} {
  const toolsRun: Record<
    string,
    { calls: number; ok: number; failed: number }
  > = {};
  for (const record of records) {
    const entry = (toolsRun[record.toolName] ??= {
      calls: 0,
      ok: 0,
      failed: 0,
    });
    entry.calls++;
    if (record.isError) {
      entry.failed++;
    } else {
      entry.ok++;
    }
  }
  const excerpts = records
    .filter((r) => !r.isError && !isEmptyResultText(r.resultText))
    .slice(-10)
    .map((r) => ({
      toolName: r.toolName,
      params: summarizeParams(r.params),
      resultText:
        r.resultText.length > 2000
          ? `${r.resultText.slice(0, 2000)}…`
          : r.resultText,
    }));
  return { kind: "mechanical-digest", toolsRun, excerpts };
}

// ── Waste detection ────────────────────────────────────────────────────────

function checkWasteSignatures(
  record: ToolExecutionRecord,
  session: Pick<
    IsolatedAgentSessionState<NeuroLink>,
    "seenCallHashes" | "seenResultHashes"
  >,
  state: IsolatedAgentWasteState,
  thresholds: AgentWasteThresholds | undefined,
): string[] {
  const tripped: string[] = [];
  const duplicateLimit =
    thresholds?.duplicateCallLimit ?? DEFAULT_DUPLICATE_CALL_LIMIT;
  const emptyLimit =
    thresholds?.emptyResultStreakLimit ?? DEFAULT_EMPTY_RESULT_STREAK_LIMIT;
  const errorLimit = thresholds?.errorStreakLimit ?? DEFAULT_ERROR_STREAK_LIMIT;
  const noNewLimit =
    thresholds?.noNewResultsLimit ?? DEFAULT_NO_NEW_RESULTS_LIMIT;

  // Duplicate call hash (same tool + same normalized params in this run)
  const callHash = `${record.toolName}:${stableStringify(record.params)}`;
  const seenCount = (session.seenCallHashes.get(callHash) ?? 0) + 1;
  session.seenCallHashes.set(callHash, seenCount);
  if (seenCount > duplicateLimit) {
    tripped.push(
      `duplicate-call: ${record.toolName} called ${seenCount}× with identical params`,
    );
  }

  // Consecutive empty results
  if (!record.isError && isEmptyResultText(record.resultText)) {
    state.emptyStreak++;
    if (state.emptyStreak >= emptyLimit) {
      tripped.push(
        `empty-results: ${state.emptyStreak} consecutive empty/zero results`,
      );
    }
  } else {
    state.emptyStreak = 0;
  }

  // Consecutive errors
  if (record.isError) {
    state.errorStreak++;
    if (state.errorStreak >= errorLimit) {
      tripped.push(`error-streak: ${state.errorStreak} consecutive failures`);
    }
  } else {
    state.errorStreak = 0;
  }

  // Budget burn without new distinct results
  const resultHash = stableStringify(record.resultText);
  if (
    session.seenResultHashes.has(resultHash) ||
    record.isError ||
    isEmptyResultText(record.resultText)
  ) {
    state.callsSinceNewResult++;
    if (state.callsSinceNewResult >= noNewLimit) {
      tripped.push(
        `no-new-results: ${state.callsSinceNewResult} calls without a new distinct result`,
      );
    }
  } else {
    session.seenResultHashes.add(resultHash);
    state.callsSinceNewResult = 0;
  }

  return tripped;
}

// ── Extraction ─────────────────────────────────────────────────────────────

function buildEvidenceBlock(records: ToolExecutionRecord[]): string {
  const lines: string[] = [];
  let budget = EXTRACTION_EVIDENCE_MAX_CHARS;
  // Newest evidence is the most relevant — walk backwards, then restore order.
  for (let i = records.length - 1; i >= 0 && budget > 0; i--) {
    const r = records[i];
    const line = `[${i + 1}] ${r.toolName}(${summarizeParams(r.params, 300)}) → ${
      r.isError ? "ERROR" : "ok"
    } (${r.durationMs}ms)\n${r.resultText}`;
    budget -= line.length;
    if (budget < 0 && lines.length > 0) {
      break;
    }
    lines.push(line);
  }
  return lines.reverse().join("\n\n");
}

async function runExtractionPass(args: {
  worker: NeuroLink;
  definition: IsolatedAgentDefinition;
  runOptions: AgentRunOptions | undefined;
  runId: string;
  records: ToolExecutionRecord[];
  researchContent: string;
  usage: TokenUsage;
  abortSignal?: AbortSignal;
}): Promise<{
  data?: unknown;
  source?: StructuredRecoverySource;
  errors: string[];
}> {
  const extraction = args.definition.extraction;
  if (!extraction) {
    return { errors: [] };
  }
  const maxRetries = extraction.maxRetries ?? DEFAULT_EXTRACTION_MAX_RETRIES;
  const timeoutMs = extraction.timeoutMs ?? DEFAULT_EXTRACTION_TIMEOUT_MS;
  // Phase-level deadline so the composed wall-clock is bounded by ONE knob:
  // callers deriving outer ceilings need a single number, not
  // (maxRetries + 1) × timeoutMs arithmetic.
  const totalTimeoutMs =
    extraction.totalTimeoutMs ?? (maxRetries + 1) * timeoutMs;
  const extractionDeadline = Date.now() + totalTimeoutMs;
  const wireSchema = extraction.wireSchema ?? extraction.schema;

  emitEvent(args.runOptions, {
    type: "phase",
    runId: args.runId,
    agentId: args.definition.id,
    timestamp: Date.now(),
    phase: "extraction",
  });

  const evidence = buildEvidenceBlock(args.records);
  const basePrompt = [
    "You are the extraction pass of a two-pass research agent. Produce ONLY the requested JSON — no prose, no markdown fencing.",
    extraction.shapeDoc ? `Required JSON shape:\n${extraction.shapeDoc}` : "",
    evidence
      ? `Evidence — tool executions from the research pass:\n${evidence}`
      : "No tool executions were recorded.",
    args.researchContent ? `Researcher's notes:\n${args.researchContent}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let prompt = basePrompt;
  let attachSchema = true;
  const allErrors: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (args.abortSignal?.aborted) {
      allErrors.push("extraction aborted by parent signal");
      return { errors: allErrors };
    }
    const remainingMs = extractionDeadline - Date.now();
    if (remainingMs <= 0) {
      allErrors.push(
        `extraction phase deadline reached (${totalTimeoutMs}ms total)`,
      );
      break;
    }
    const attemptTimeoutMs = Math.min(timeoutMs, remainingMs);
    let result: GenerateResult | undefined;
    try {
      result = await args.worker.generate({
        input: { text: prompt },
        systemPrompt:
          "You convert research evidence into schema-valid JSON. Output only JSON.",
        provider:
          args.runOptions?.overrides?.provider ?? args.definition.provider,
        model: args.runOptions?.overrides?.model ?? args.definition.model,
        disableTools: true,
        // The extraction pass runs on its OWN timeout — never carved out of
        // the research budget.
        timeout: attemptTimeoutMs,
        turnTimeoutMs: attemptTimeoutMs,
        maxSteps: 1,
        ...(args.runOptions?.overrides?.maxTokens !== undefined && {
          maxTokens: args.runOptions.overrides.maxTokens,
        }),
        ...(attachSchema && { schema: wireSchema }),
        ...(args.abortSignal && { abortSignal: args.abortSignal }),
      } as GenerateOptions);
    } catch (error) {
      if (args.abortSignal?.aborted || isAbortLikeError(error)) {
        allErrors.push("extraction aborted");
        return { errors: allErrors };
      }
      const message = error instanceof Error ? error.message : String(error);
      allErrors.push(`extraction generate failed: ${message}`);
      if (attachSchema) {
        // Providers can reject the wire schema (constrained-decoding
        // complexity limits) — retry without it; the local ladder still
        // validates.
        attachSchema = false;
        continue;
      }
      continue;
    }
    addUsage(args.usage, result.usage);

    const recovered = recoverStructuredData({
      content: result.content,
      structuredData: (result as { structuredData?: unknown }).structuredData,
      schema: extraction.schema,
      coerce: extraction.coerce,
    });
    if (recovered.data !== undefined) {
      return {
        data: recovered.data,
        source: recovered.source,
        errors: allErrors,
      };
    }
    allErrors.push(...recovered.errors);

    // Corrective re-ask: carry the validation errors and the shape doc.
    prompt = [
      basePrompt,
      `Your previous output failed validation:\n${recovered.errors.join("\n")}`,
      extraction.shapeDoc
        ? `Fix the output to match this shape exactly:\n${extraction.shapeDoc}`
        : "Fix the output to be valid JSON matching the required schema exactly.",
    ].join("\n\n");
  }

  return { errors: allErrors };
}

// ── Research leg ───────────────────────────────────────────────────────────

async function runResearchLeg(
  session: IsolatedAgentSessionState<NeuroLink>,
  prompt: string,
): Promise<IsolatedAgentLegResult> {
  const { definition, options, worker, runId } = session;
  const overrides = options.overrides;
  const leg: AgentLegOptions | undefined = options.leg;
  const legStart = Date.now();
  const legRecords: ToolExecutionRecord[] = [];
  const wasteSignals: string[] = [];
  const wasteState: IsolatedAgentWasteState = {
    emptyStreak: 0,
    errorStreak: 0,
    callsSinceNewResult: 0,
  };

  // Internal controller: waste trips and tool-call budgets end the leg early;
  // the parent signal chains in so an aborted parent stops the leg too.
  const legController = new AbortController();
  let abortedByParent = false;
  let budgetTripped = false;
  const onParentAbort = () => {
    abortedByParent = true;
    legController.abort();
  };
  if (options.abortSignal) {
    if (options.abortSignal.aborted) {
      onParentAbort();
    } else {
      options.abortSignal.addEventListener("abort", onParentAbort, {
        once: true,
      });
    }
  }

  const onRecord = (record: ToolExecutionRecord) => {
    legRecords.push(record);
    session.allRecords.push(record);
    session.spentToolCalls++;
    emitEvent(options, {
      type: "tool_call",
      runId,
      agentId: definition.id,
      timestamp: record.startedAt,
      toolName: record.toolName,
      params: record.params,
    });
    emitEvent(options, {
      type: "tool_result",
      runId,
      agentId: definition.id,
      timestamp: Date.now(),
      toolName: record.toolName,
      resultSummary: record.resultText.slice(0, EVENT_RESULT_SUMMARY_CHARS),
      isError: record.isError,
    });

    const tripped = checkWasteSignatures(
      record,
      session,
      wasteState,
      options.waste,
    );
    if (tripped.length > 0) {
      wasteSignals.push(...tripped.filter((t) => !wasteSignals.includes(t)));
      emitEvent(options, {
        type: "waste",
        runId,
        agentId: definition.id,
        timestamp: Date.now(),
        wasteSignals: [...wasteSignals],
      });
      legController.abort();
    }
    if (
      leg?.budgetToolCalls !== undefined &&
      legRecords.length >= leg.budgetToolCalls &&
      !legController.signal.aborted
    ) {
      budgetTripped = true;
      legController.abort();
    }
  };

  // Leg wall-clock budget rides the REAL turn budget machinery: the model
  // gets the wrap-up nudge and consolidates — never a bare wall-clock kill.
  const turnBudgetCandidates = [overrides?.turnTimeoutMs, leg?.budgetMs].filter(
    (v): v is number => typeof v === "number" && v > 0,
  );
  const turnTimeoutMs =
    turnBudgetCandidates.length > 0
      ? Math.min(...turnBudgetCandidates)
      : undefined;

  const generateOptions: GenerateOptions = {
    input: { text: prompt },
    systemPrompt: definition.instructions,
    provider: overrides?.provider ?? definition.provider,
    model: overrides?.model ?? definition.model,
    ...(definition.temperature !== undefined && {
      temperature: definition.temperature,
    }),
    ...(definition.tools &&
      definition.tools.length > 0 && { toolFilter: definition.tools }),
    maxSteps: overrides?.maxSteps ?? definition.maxSteps ?? DEFAULT_MAX_STEPS,
    ...(overrides?.maxTokens !== undefined && {
      maxTokens: overrides.maxTokens,
    }),
    ...(turnTimeoutMs !== undefined && { turnTimeoutMs }),
    ...(overrides?.stallTimeoutMs !== undefined && {
      stallTimeoutMs: overrides.stallTimeoutMs,
    }),
    ...(overrides?.wrapupTimeLeadMs !== undefined && {
      wrapupTimeLeadMs: overrides.wrapupTimeLeadMs,
    }),
    abortSignal: legController.signal,
    requestId: `${runId}-leg${session.legIndex}`,
    toolExecutionCapture: {
      ...(options.capture ?? {}),
      onRecord,
    },
    ...(session.history.length > 0 && {
      conversationMessages: session.history,
    }),
    context: {
      agentId: definition.id,
      runId,
      ...(options.toolContext ?? {}),
    },
  };

  let result: GenerateResult | undefined;
  let researchError: string | undefined;
  try {
    result = await worker.generate(generateOptions);
  } catch (error) {
    if (abortedByParent || legController.signal.aborted) {
      // Early leg end (parent abort / waste trip / tool budget) — the
      // records survive; extraction still runs from them.
    } else {
      researchError = error instanceof Error ? error.message : String(error);
      emitEvent(options, {
        type: "error",
        runId,
        agentId: definition.id,
        timestamp: Date.now(),
        error: researchError,
      });
    }
  } finally {
    if (options.abortSignal) {
      options.abortSignal.removeEventListener("abort", onParentAbort);
    }
  }

  if (result?.stopReason === "time-limit") {
    emitEvent(options, {
      type: "wrapup",
      runId,
      agentId: definition.id,
      timestamp: Date.now(),
    });
  }
  if (result?.usage) {
    addUsage(session.usage, result.usage);
  }

  // Maintain the worker's conversation for continuation legs.
  session.history.push(chatMessage("user", prompt));
  if (result?.content) {
    session.history.push(chatMessage("assistant", result.content));
  } else if (legRecords.length > 0 || wasteSignals.length > 0) {
    // An early leg end (waste trip / tool budget / parent abort) killed the
    // generate mid-step, so there is no assistant text. Push a synthetic
    // assistant message from what the runner already knows — otherwise the
    // resumed worker (and askNextPlan, which replays this history) is blind
    // to its own prior tool activity and re-runs the same queries, which the
    // run-scoped duplicate-call signature then trips on immediately.
    const header =
      wasteSignals.length > 0
        ? `[leg ended early — waste signals: ${wasteSignals.join("; ")}]`
        : "[leg ended early before a written summary]";
    session.history.push(
      chatMessage(
        "assistant",
        `${header}\nTool activity this leg:\n${buildDelta(legRecords).join("\n")}`,
      ),
    );
  }

  const durationMs = Date.now() - legStart;
  session.spentMs += durationMs;

  return {
    result,
    researchError,
    legRecords,
    wasteSignals,
    toolCalls: legRecords.length,
    durationMs,
    aborted: abortedByParent,
    budgetTripped,
  };
}

/** Ask the worker for its own 1–2 sentence next-step statement (leg wrap). */
async function askNextPlan(
  session: IsolatedAgentSessionState<NeuroLink>,
): Promise<string | undefined> {
  try {
    const result = await session.worker.generate({
      input: {
        text: "In 1-2 sentences, state the next concrete step you would take to finish this investigation. Output only the statement.",
      },
      systemPrompt: session.definition.instructions,
      provider:
        session.options.overrides?.provider ?? session.definition.provider,
      model: session.options.overrides?.model ?? session.definition.model,
      disableTools: true,
      maxSteps: 1,
      timeout: 20_000,
      turnTimeoutMs: 20_000,
      conversationMessages: session.history,
      ...(session.options.abortSignal && {
        abortSignal: session.options.abortSignal,
      }),
    } as GenerateOptions);
    addUsage(session.usage, result.usage);
    return result.content?.trim() || undefined;
  } catch {
    return undefined;
  }
}

// ── Outcome assembly ───────────────────────────────────────────────────────

function resolveBudget(session: IsolatedAgentSessionState<NeuroLink>): {
  spentMs: number;
  remainingMs: number;
  spentToolCalls: number;
} {
  const budgetMs = session.options.leg?.budgetMs;
  return {
    spentMs: session.spentMs,
    remainingMs:
      budgetMs !== undefined ? Math.max(0, budgetMs - session.spentMs) : 0,
    spentToolCalls: session.spentToolCalls,
  };
}

function buildDelta(legRecords: ToolExecutionRecord[]): string[] {
  return legRecords.map(
    (r) =>
      `${r.toolName}(${summarizeParams(r.params, 80)}) → ${
        r.isError
          ? "error"
          : isEmptyResultText(r.resultText)
            ? "empty"
            : `ok (${r.resultText.length} chars)`
      }`,
  );
}

async function finalizeOutcome(
  session: IsolatedAgentSessionState<NeuroLink>,
  legOutcome: IsolatedAgentLegResult,
  startedAt: number,
): Promise<AgentRunOutcome> {
  const { definition, options, runId } = session;
  const result = legOutcome.result;
  const researchStop: GenerateStopReason | string | undefined =
    legOutcome.aborted
      ? "aborted"
      : (result?.stopReason ??
        (legOutcome.researchError ? "provider-error" : undefined));
  const researchContent = result?.content ?? "";
  const records = session.allRecords;

  // Extraction ALWAYS runs when configured — even when the research generate
  // died, it extracts from the execution records instead of losing the run.
  // Parent abort is the one exception: a cancelled run stops cleanly.
  let data: unknown;
  let extractionSource: string | undefined;
  let extractionError: string | undefined;
  if (definition.extraction && !options.abortSignal?.aborted) {
    const extracted = await runExtractionPass({
      worker: session.worker,
      definition,
      runOptions: options,
      runId,
      records,
      researchContent,
      usage: session.usage,
      abortSignal: options.abortSignal,
    });
    data = extracted.data;
    extractionSource = extracted.source;
    if (data === undefined && extracted.errors.length > 0) {
      extractionError = extracted.errors.slice(-4).join(" | ");
    }
  }

  const hasEvidence = records.length > 0 || researchContent.trim().length > 0;

  // "Research finished cleanly" is derived from the leg's own control flow,
  // not from provider stopReason vocabulary: a missing stopReason (e.g. the
  // chat-completions loop never sets one) is a clean finish, while any
  // runner-imposed cut (time-limit / step-cap / tool budget / waste) is not.
  const researchCleanFinish =
    !isLegCutShort(legOutcome) &&
    (researchStop === "completed" || researchStop === undefined);

  let status: AgentRunStatus;
  if (legOutcome.aborted) {
    status = hasEvidence ? "partial" : "error";
  } else if (data !== undefined) {
    status = researchCleanFinish ? "completed" : "partial";
  } else if (definition.extraction) {
    if (!hasEvidence) {
      status = legOutcome.researchError ? "error" : "insufficient_data";
    } else {
      // Delivery guarantee: mechanical digest instead of an empty result.
      data = buildMechanicalDigest(records);
      status = legOutcome.researchError ? "error" : "partial";
    }
  } else {
    status = legOutcome.researchError
      ? "error"
      : researchCleanFinish
        ? "completed"
        : "partial";
  }

  const outcome: AgentRunOutcome = {
    status,
    ...(data !== undefined && { data }),
    ...(researchContent && { content: researchContent }),
    ...(researchStop !== undefined && { stopReason: researchStop }),
    // Terminal outcomes carry the WHOLE run's records (all legs) — the data
    // above was built from all of them; in_progress legs carry per-leg
    // records instead.
    toolExecutions: records,
    usage: { ...session.usage },
    durationMs: Date.now() - startedAt,
    ...(extractionSource && { extractionSource }),
    ...(extractionError && { extractionError }),
    ...(legOutcome.wasteSignals.length > 0 && {
      wasteSignals: legOutcome.wasteSignals,
    }),
    ...(options.leg && { budget: resolveBudget(session) }),
  };

  emitEvent(options, {
    type: status === "error" ? "error" : "complete",
    runId,
    agentId: definition.id,
    timestamp: Date.now(),
    status,
    ...(legOutcome.researchError && { error: legOutcome.researchError }),
  });

  return outcome;
}

async function disposeWorkerQuietly(worker: NeuroLink): Promise<void> {
  try {
    await worker.dispose();
  } catch (error) {
    logger.debug("[IsolatedAgent] Worker dispose failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function registerHandle(session: IsolatedAgentSessionState<NeuroLink>): void {
  sessions.set(session.handle, session);
  const ttlMs = session.options.handleTtlMs ?? DEFAULT_HANDLE_TTL_MS;
  session.ttlTimer = setTimeout(() => {
    void expireSession(session);
  }, ttlMs);
  // Never keep the process alive for an abandoned handle.
  session.ttlTimer.unref?.();
}

async function expireSession(
  session: IsolatedAgentSessionState<NeuroLink>,
): Promise<void> {
  // The session may have been finalized/stopped between the timer firing
  // and this callback running — never expire an entry we no longer own.
  if (sessions.get(session.handle) !== session || session.tombstone) {
    return;
  }
  // In-flight guard: the TTL can fire in the race window before
  // continueIsolatedAgent clears the timer. Never dispose a worker
  // mid-generate — the running leg's own completion path re-registers the
  // handle (fresh TTL) or finalizes and cleans up.
  if (session.running) {
    return;
  }
  // TTL expiry: auto-dispose, keep the final outcome retrievable once —
  // an abandoned leg is never silently lost. The tombstone is set BEFORE
  // the async dispose so a concurrent continueAgent/stopAgent sees it and
  // returns it instead of starting a leg on a worker being disposed.
  const records = session.allRecords;
  session.tombstone = {
    status: records.length > 0 ? "partial" : "error",
    data: buildMechanicalDigest(records),
    stopReason: "handle-ttl-expired",
    toolExecutions: records,
    usage: { ...session.usage },
    durationMs: session.spentMs,
    ...(session.options.leg && { budget: resolveBudget(session) }),
  };
  await disposeWorkerQuietly(session.worker);
  logger.debug("[IsolatedAgent] Handle expired; outcome tombstoned", {
    handle: session.handle,
    agentId: session.definition.id,
  });
  // Second stage: evict the tombstone if nobody ever retrieves it, so an
  // abandoned handle doesn't retain its records/history forever.
  const graceTimer = setTimeout(() => {
    if (sessions.get(session.handle) === session) {
      sessions.delete(session.handle);
    }
  }, session.options.handleTtlMs ?? DEFAULT_HANDLE_TTL_MS);
  graceTimer.unref?.();
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Run an isolated sub-agent: research pass with tools under the turn budget,
 * extraction pass tools-off on its own timeout, structured recovery,
 * delivery guarantee, abort chaining, events, and (when `options.leg` is
 * set) leashed legs with a TTL'd resume handle.
 */
export async function runIsolatedAgent(
  host: NeuroLink,
  definition: IsolatedAgentDefinition,
  input: string | Record<string, unknown>,
  options: AgentRunOptions = {},
): Promise<AgentRunOutcome> {
  if (!definition?.id || !definition?.instructions) {
    throw new Error(
      "runIsolatedAgent: definition must include id and instructions",
    );
  }
  const startedAt = Date.now();
  const runId = randomUUID();
  const leashed = !!options.leg;

  const worker = host.createWorkerInstance({
    logTag: `agent:${definition.id}`,
  });

  const session: IsolatedAgentSessionState<NeuroLink> = {
    handle: `agent-run-${runId}`,
    runId,
    host,
    worker,
    definition,
    options,
    callerSessionId: options.toolContext?.sessionId as string | undefined,
    running: false,
    history: [],
    legIndex: 0,
    spentMs: 0,
    spentToolCalls: 0,
    allRecords: [],
    usage: { input: 0, output: 0, total: 0 },
    seenCallHashes: new Map(),
    seenResultHashes: new Set(),
  };

  // Tool context — set on the worker for EVERY tool call, including the
  // caller-supplied sessionId (run id when none supplied).
  worker.setToolContext({
    ...(options.toolContext ?? {}),
    sessionId: (options.toolContext?.sessionId as string | undefined) ?? runId,
  });

  emitEvent(options, {
    type: "start",
    runId,
    agentId: definition.id,
    timestamp: startedAt,
  });
  emitEvent(options, {
    type: "phase",
    runId,
    agentId: definition.id,
    timestamp: Date.now(),
    phase: "research",
  });

  const prompt =
    typeof input === "string" ? input : JSON.stringify(input, null, 2);

  let keepAlive = false;
  try {
    const legOutcome = await runResearchLeg(session, prompt);

    // Leashed mode: a leg the runner CUT SHORT (budget / step cap / waste)
    // returns in_progress with a resume handle. A generate that returned
    // normally — with or without a provider stopReason — is a finished turn
    // and finalizes (see isLegCutShort).
    if (
      leashed &&
      !legOutcome.aborted &&
      !legOutcome.researchError &&
      isLegCutShort(legOutcome)
    ) {
      const nextPlan = await askNextPlan(session);
      const legInfo = {
        index: session.legIndex,
        toolCalls: legOutcome.toolCalls,
        durationMs: legOutcome.durationMs,
      };
      emitEvent(options, {
        type: "leg_end",
        runId,
        agentId: definition.id,
        timestamp: Date.now(),
        legIndex: session.legIndex,
        ...(legOutcome.wasteSignals.length > 0 && {
          wasteSignals: legOutcome.wasteSignals,
        }),
      });
      session.legIndex++;
      registerHandle(session);
      keepAlive = true;
      return {
        status: "in_progress",
        ...(legOutcome.result?.content && {
          content: legOutcome.result.content,
        }),
        ...(legOutcome.result?.stopReason && {
          stopReason: legOutcome.result.stopReason,
        }),
        toolExecutions: legOutcome.legRecords,
        usage: { ...session.usage },
        durationMs: Date.now() - startedAt,
        handle: session.handle,
        leg: legInfo,
        delta: buildDelta(legOutcome.legRecords),
        ...(nextPlan && { nextPlan }),
        ...(legOutcome.wasteSignals.length > 0 && {
          wasteSignals: legOutcome.wasteSignals,
        }),
        budget: resolveBudget(session),
      };
    }

    return await finalizeOutcome(session, legOutcome, startedAt);
  } finally {
    if (!keepAlive) {
      await disposeWorkerQuietly(worker);
    }
  }
}

/**
 * Resume a leashed run. `guidance`, when provided, is appended as a user
 * turn before the next leg — this is how a supervisor re-steers a drifting
 * worker. An expired handle returns its tombstoned final outcome once.
 * Handles are owned by the host that created them; a handle with a leg
 * already in flight refuses a second continuation instead of racing it.
 */
export async function continueIsolatedAgent(
  host: NeuroLink,
  handle: string,
  guidance?: string,
): Promise<AgentRunOutcome> {
  const session = sessions.get(handle);
  if (!session || session.host !== host) {
    throw new Error(
      `Unknown agent handle "${handle}" — it may belong to another instance, or it expired and its final outcome was already retrieved.`,
    );
  }
  if (session.tombstone) {
    // Retrievable exactly once.
    sessions.delete(handle);
    return session.tombstone;
  }
  if (session.running) {
    throw new Error(
      `Agent handle "${handle}" already has a leg in progress — await it before continuing.`,
    );
  }
  session.running = true;
  if (session.ttlTimer) {
    clearTimeout(session.ttlTimer);
    session.ttlTimer = undefined;
  }

  if (guidance) {
    session.history.push(chatMessage("user", guidance));
  }

  const startedAt = Date.now();
  let keepAlive = false;
  try {
    const legOutcome = await runResearchLeg(
      session,
      guidance
        ? "Follow the supervisor guidance above and continue the investigation."
        : "Continue the investigation from where you left off.",
    );

    if (
      !legOutcome.aborted &&
      !legOutcome.researchError &&
      isLegCutShort(legOutcome)
    ) {
      const nextPlan = await askNextPlan(session);
      const legInfo = {
        index: session.legIndex,
        toolCalls: legOutcome.toolCalls,
        durationMs: legOutcome.durationMs,
      };
      emitEvent(session.options, {
        type: "leg_end",
        runId: session.runId,
        agentId: session.definition.id,
        timestamp: Date.now(),
        legIndex: session.legIndex,
      });
      session.legIndex++;
      registerHandle(session);
      keepAlive = true;
      return {
        status: "in_progress",
        ...(legOutcome.result?.content && {
          content: legOutcome.result.content,
        }),
        ...(legOutcome.result?.stopReason && {
          stopReason: legOutcome.result.stopReason,
        }),
        toolExecutions: legOutcome.legRecords,
        usage: { ...session.usage },
        durationMs: Date.now() - startedAt,
        handle: session.handle,
        leg: legInfo,
        delta: buildDelta(legOutcome.legRecords),
        ...(nextPlan && { nextPlan }),
        ...(legOutcome.wasteSignals.length > 0 && {
          wasteSignals: legOutcome.wasteSignals,
        }),
        budget: resolveBudget(session),
      };
    }

    sessions.delete(handle);
    return await finalizeOutcome(session, legOutcome, startedAt);
  } finally {
    session.running = false;
    if (!keepAlive) {
      sessions.delete(handle);
      await disposeWorkerQuietly(session.worker);
    }
  }
}

/**
 * Stop a leashed run: dispose the worker and return the final outcome
 * (mechanical digest over everything gathered so far). Refuses while a leg
 * is in flight — cancel an in-flight leg via the run's `abortSignal` instead
 * of disposing its worker mid-generate.
 */
export async function stopIsolatedAgent(
  host: NeuroLink,
  handle: string,
): Promise<AgentRunOutcome> {
  const session = sessions.get(handle);
  if (!session || session.host !== host) {
    throw new Error(
      `Unknown agent handle "${handle}" — it may belong to another instance, or it expired and its final outcome was already retrieved.`,
    );
  }
  if (session.running) {
    throw new Error(
      `Agent handle "${handle}" has a leg in progress — await it (or abort via the run's abortSignal) before stopping.`,
    );
  }
  sessions.delete(handle);
  if (session.tombstone) {
    return session.tombstone;
  }
  if (session.ttlTimer) {
    clearTimeout(session.ttlTimer);
  }
  await disposeWorkerQuietly(session.worker);
  const records = session.allRecords;
  return {
    status: records.length > 0 ? "partial" : "error",
    data: buildMechanicalDigest(records),
    stopReason: "stopped",
    toolExecutions: records,
    usage: { ...session.usage },
    durationMs: session.spentMs,
    ...(session.options.leg && { budget: resolveBudget(session) }),
  };
}

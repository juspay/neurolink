/**
 * The one HITL confirmation step every tool-execution path shares.
 *
 * `NeuroLink.executeTool` runs it once per call, before the circuit breaker,
 * the retry loop and the attempt timeout, and records the decision on the
 * call's `HITLExecutionState`. The tool registry and the external server
 * manager run the same step inline only for a caller that arrives with no
 * recorded decision, so a gated call is never asked twice.
 */

import { isDeepStrictEqual } from "node:util";
import type { Span } from "@opentelemetry/api";
import type {
  ConfirmationResult,
  HITLConfirmationContext,
  HITLConfirmationOutcome,
  HITLDecision,
  HITLExecutionState,
  HITLManager,
  HITLOutcomeAction,
  PauseDeadline,
} from "../types/index.js";
import {
  HITLCancelledError,
  HITLError,
  HITLTimeoutError,
  HITLUserRejectedError,
} from "./hitlErrors.js";
import { describeAbortReason } from "./hitlManager.js";

/**
 * The tool and arguments a state's recorded `approved` or `not-required`
 * decision was made for. The decision covers that tool with those arguments
 * only: a caller that reuses the state for another tool or with other
 * arguments is asked again.
 */
const decidedArguments = new WeakMap<
  HITLExecutionState,
  { toolName: string; args: unknown }
>();

/**
 * The states `createHITLExecutionState` made, each for one `executeTool`
 * call. Their decision is bound to the arguments object itself: one approval
 * covers every attempt of that call, even when a tool or middleware changes
 * the object between attempts. Any other state is the caller's, and its
 * decision is bound to a copy taken when it was made.
 */
const callStates = new WeakSet<HITLExecutionState>();

/** Stands in for decided arguments that could not be copied; nothing equals it. */
const UNCOPYABLE_ARGUMENTS = Symbol("uncopyable decided arguments");

/**
 * A fresh state for one tool call. `triggered` is kept for callers that read
 * it and is only ever true once a human approved the call.
 */
export function createHITLExecutionState(): HITLExecutionState {
  const state: HITLExecutionState = {
    get triggered() {
      return state.decision === "approved";
    },
  };
  callStates.add(state);
  return state;
}

/**
 * Record what `state`'s decision was made for: the arguments object for a
 * call's own state, a copy of it for a caller's, so that changing the
 * object in place afterwards is a change. Arguments that cannot be copied
 * (a function value, for example) never match again: the caller is asked.
 */
function bindDecidedArguments(
  state: HITLExecutionState,
  toolName: string,
  args: unknown,
): void {
  if (callStates.has(state)) {
    decidedArguments.set(state, { toolName, args });
    return;
  }
  try {
    decidedArguments.set(state, { toolName, args: structuredClone(args) });
  } catch {
    decidedArguments.set(state, { toolName, args: UNCOPYABLE_ARGUMENTS });
  }
}

/** A copy of `args` that later changes to the original cannot reach. */
function snapshotArguments(args: unknown): unknown {
  try {
    return structuredClone(args);
  } catch {
    return args;
  }
}

/**
 * Built-in tools that change the machine. While HITL is enabled they require
 * confirmation on every call, whatever `dangerousActions` lists, unless the
 * host sets `hitl.confirmBuiltinTools: false`. The other built-ins (clock,
 * arithmetic, reads, directory listings, CSV analysis, web search) are gated
 * by `dangerousActions` keywords and `customRules` like every other tool.
 */
const HITL_ALWAYS_CONFIRM_BUILT_IN_TOOLS: ReadonlySet<string> = new Set([
  "writeFile",
  "executeBashCommand",
]);

/**
 * Whether `hitl` confirms every call to the built-in tool `toolName`, whether
 * or not its rule matches the name: true for the built-ins that change the
 * machine unless the host set `hitl.confirmBuiltinTools: false`.
 */
export function builtInToolAlwaysConfirmed(
  hitl: HITLManager,
  toolName: string,
): boolean {
  return (
    HITL_ALWAYS_CONFIRM_BUILT_IN_TOOLS.has(toolName) &&
    hitl.getConfig().confirmBuiltinTools !== false
  );
}

/**
 * Tool results that carry a HITL refusal. A cache of tool results must not
 * keep one, the per-turn one of the Gemini loops (`DedupExecuteMap`)
 * included: the identical call has to raise a fresh card.
 */
const refusalResults = new WeakSet<object>();

/** Mark `result` as a HITL refusal and return it. */
export function markRefusalResult<T extends object>(result: T): T {
  refusalResults.add(result);
  return result;
}

/** Whether `result` was marked as a HITL refusal (`markRefusalResult`). */
export function isRefusalResult(result: unknown): boolean {
  return (
    typeof result === "object" && result !== null && refusalResults.has(result)
  );
}

/** Whether a recorded decision lets the tool run. */
function hitlDecisionAllowsExecution(decision: HITLDecision): boolean {
  return decision === "approved" || decision === "not-required";
}

/**
 * Whether the call's recorded decision refused it. The result of such a call
 * is a refusal, and a refusal must never be cached: the next identical call
 * has to raise a fresh card.
 */
export function hitlStateRefused(
  state: HITLExecutionState | undefined,
): boolean {
  return (
    state?.decision !== undefined &&
    !hitlDecisionAllowsExecution(state.decision)
  );
}

/**
 * A promise that rejects with `HITLCancelledError` once `signal` has aborted,
 * so a manager that ignores the signal cannot keep the call waiting. It
 * rejects one macrotask after the abort: a manager that honours the signal,
 * as the shipped one does, has rejected by then, and its own cancellation is
 * what the call reports. `detach` drops the listener once the wait settles.
 */
function rejectOnAbort(
  signal: AbortSignal,
  toolName: string,
): { promise: Promise<never>; detach: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const promise = new Promise<never>((_resolve, reject) => {
    onAbort = () => {
      timer = setTimeout(
        () =>
          reject(
            new HITLCancelledError(
              `Confirmation cancelled for tool: ${toolName}`,
              undefined,
              describeAbortReason(signal),
            ),
          ),
        0,
      );
    };
    if (signal.aborted) {
      onAbort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
  return {
    promise,
    detach: () => {
      if (onAbort) {
        signal.removeEventListener("abort", onAbort);
      }
      clearTimeout(timer);
    },
  };
}

/**
 * Ask the human whether `toolName` may run with `args`, and say what they
 * decided. Never throws: a timed-out card is `timeout`, any other failure of
 * the wait (an abort, a manager cleanup) is `cancelled`, and an approval that
 * arrives after `context.signal` aborted is `cancelled` too, because the call
 * that asked has already been told it did not run. An abort ends the wait
 * even when the manager ignores the signal; such a manager keeps its card,
 * and a later answer to it runs nothing.
 *
 * `options.pauseDeadline` stops the caller's outer deadlines for the wait
 * only (a model loop's per-tool bound), and every outcome resumes them with
 * the time that was left. `options.alwaysConfirm` asks even when the rule
 * does not match.
 */
async function confirmWithHitl(
  hitl: HITLManager,
  toolName: string,
  args: unknown,
  context: HITLConfirmationContext,
  onRequest: () => void,
  options: { pauseDeadline?: PauseDeadline; alwaysConfirm?: boolean } = {},
): Promise<HITLConfirmationOutcome> {
  if (!options.alwaysConfirm && !hitl.requiresConfirmation(toolName, args)) {
    return { decision: "not-required", args };
  }
  onRequest();
  // The human reviews, and the tool runs with, this snapshot: the caller's
  // object (or a manager) changing it during the wait cannot change what was
  // approved. Arguments that cannot be copied are presented as they are.
  const presented = snapshotArguments(args);
  let result: ConfirmationResult;
  const resume = options.pauseDeadline?.();
  const abort = context.signal
    ? rejectOnAbort(context.signal, toolName)
    : undefined;
  try {
    const answer = hitl.requestConfirmation(toolName, presented, context);
    result = abort ? await Promise.race([answer, abort.promise]) : await answer;
  } catch (error) {
    return {
      decision: error instanceof HITLTimeoutError ? "timeout" : "cancelled",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    abort?.detach();
    resume?.();
  }
  if (!result.approved) {
    return { decision: "denied", reason: result.reason };
  }
  if (context.signal?.aborted) {
    return {
      decision: "cancelled",
      error: new HITLCancelledError("Tool call was cancelled before it ran"),
    };
  }
  return { decision: "approved", args: result.modifiedArguments ?? presented };
}

/** What an outcome means for the call; the refusal texts live only here. */
function outcomeAction(
  outcome: HITLConfirmationOutcome,
  toolName: string,
  subject: string,
): HITLOutcomeAction {
  switch (outcome.decision) {
    case "approved":
    case "not-required":
      return { run: true, args: outcome.args };
    case "denied":
      return {
        run: false,
        error: new HITLUserRejectedError(
          `${subject} execution rejected by user: ${outcome.reason || "No reason provided"}`,
          toolName,
          outcome.reason,
        ),
      };
    case "timeout":
      return { run: false, error: outcome.error };
    case "cancelled":
      return {
        run: false,
        error:
          outcome.error instanceof HITLError
            ? outcome.error
            : new Error(`HITL confirmation failed: ${outcome.error.message}`, {
                cause: outcome.error,
              }),
      };
  }
}

/**
 * The confirmation step for one tool call, shared by `NeuroLink.executeTool`'s
 * gate, the tool registry and the external server manager.
 *
 * - A state that already records a decision is not asked again: `approved`
 *   and `not-required` run with the arguments they were decided for, any
 *   refusal is refused. A state reused with other arguments is decided again.
 * - With HITL off, the call runs and nothing is recorded.
 * - Otherwise the human is asked (when the tool needs it) and the decision is
 *   written to `state` after the wait, never before it.
 *
 * `report` lets the caller log the ask and the decision with its own logger
 * and puts `tool.hitl_*` events and `tool.hitl.decision` on its span;
 * `subject` names the tool kind in the messages (default "Tool");
 * `pauseDeadline` pauses the caller's outer deadlines while the human decides;
 * `alwaysConfirm` asks even when the rule does not match the tool (see
 * `builtInToolAlwaysConfirmed`).
 */
export async function resolveToolCallConfirmation(
  hitl: HITLManager | undefined,
  toolName: string,
  args: unknown,
  state: HITLExecutionState | undefined,
  context: HITLConfirmationContext,
  report: {
    log?: (message: string) => void;
    span?: Span;
    subject?: string;
    pauseDeadline?: PauseDeadline;
    alwaysConfirm?: boolean;
  } = {},
): Promise<HITLOutcomeAction> {
  const subject = report.subject ?? "Tool";
  const recorded = state?.decision;
  if (recorded !== undefined) {
    if (!hitlDecisionAllowsExecution(recorded)) {
      return {
        run: false,
        error: new HITLCancelledError(
          `${subject} '${toolName}' was refused by its confirmation (${recorded})`,
        ),
      };
    }
    if (!state || !decidedArguments.has(state)) {
      return { run: true, args };
    }
    const decided = decidedArguments.get(state);
    if (
      decided?.toolName === toolName &&
      isDeepStrictEqual(decided.args, args)
    ) {
      return { run: true, args };
    }
    // Decided for another tool or other arguments: this call has not been,
    // so decide again.
  }
  if (!hitl?.isEnabled()) {
    return { run: true, args };
  }

  const outcome = await confirmWithHitl(
    hitl,
    toolName,
    args,
    context,
    () => {
      report.log?.(`${subject} '${toolName}' requires HITL confirmation`);
      report.span?.addEvent("tool.hitl_requested");
    },
    {
      pauseDeadline: report.pauseDeadline,
      alwaysConfirm: report.alwaysConfirm,
    },
  );
  if (state) {
    state.decision = outcome.decision;
    if (
      outcome.decision === "approved" ||
      outcome.decision === "not-required"
    ) {
      bindDecidedArguments(state, toolName, outcome.args);
    } else {
      decidedArguments.delete(state);
    }
  }
  report.span?.setAttribute("tool.hitl.decision", outcome.decision);
  if (outcome.decision === "approved") {
    report.span?.addEvent("tool.hitl_approved");
  } else if (outcome.decision === "denied") {
    report.span?.addEvent("tool.hitl_rejected");
  }
  if (outcome.decision !== "not-required") {
    report.log?.(`${subject} '${toolName}' HITL decision: ${outcome.decision}`);
  }
  return outcomeAction(outcome, toolName, subject);
}

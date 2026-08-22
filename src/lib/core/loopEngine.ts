import { createStreamChannel } from "./streamChannel.js";
import type {
  AgenticLoopAdapter,
  AgenticLoopChunk,
  AgenticLoopOptions,
  AgenticLoopResult,
  AgenticLoopStepResult,
  AgenticLoopToolCall,
  AgenticLoopToolCallResult,
  AgenticLoopUsage,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { withProviderRetry } from "../utils/providerRetry.js";

/**
 * Marks a step error that occurred AFTER at least one chunk had already
 * been streamed to the consumer for this step. Retrying at that point
 * would duplicate or interleave already-emitted output, so this wrapper
 * deliberately carries none of the original error's status/retry
 * metadata (`.statusCode`/`.status`, no APICallError/NeuroLinkError
 * branding) — that makes `withProviderRetry`'s internal
 * `isRetryableProviderError()` check return false via its duck-typed
 * fallback, which ends the retry loop on the very next classification
 * instead of sleeping and re-invoking `adapter.executeStep`. The engine
 * unwraps back to the original `cause` before it ever reaches the
 * caller — see the try/catch around the `withProviderRetry` call below.
 */
class PostEmissionStepError extends Error {
  constructor(public readonly cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

function sumUsage(a: AgenticLoopUsage, b: AgenticLoopUsage): AgenticLoopUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens:
      (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0) || undefined,
    cacheWriteTokens:
      (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0) || undefined,
    reasoningTokens:
      (a.reasoningTokens ?? 0) + (b.reasoningTokens ?? 0) || undefined,
  };
}

/**
 * Dispatch one step's tool calls.
 *
 * Split out of `runAgenticLoop` because it is the one part of the turn with
 * its own decision tree — breaker, hydration, execution, failure
 * classification — and reading the loop should not mean reading all of it.
 * It owns no state: everything it needs arrives as arguments, and it reports
 * what happened by returning it, so the turn's accumulators stay in one place.
 */
async function dispatchStepTools(params: {
  calls: AgenticLoopToolCall[];
  adapter: Pick<
    AgenticLoopAdapter<unknown>,
    "toolFailureBreaker" | "resolveToolOnMiss"
  >;
  tools: AgenticLoopOptions["tools"];
  failedTools: Map<string, { count: number; lastError: string }>;
  abortSignal: AbortSignal;
}): Promise<{
  toolResults: AgenticLoopToolCallResult[];
  executions: AgenticLoopResult<unknown>["toolExecutions"];
  dispatched: AgenticLoopToolCall[];
  /** True when an abort cut the batch short, so the caller must NOT append a
   *  partial tool-result turn. */
  abortedMidBatch: boolean;
}> {
  const { calls, adapter, tools, failedTools, abortSignal } = params;
  const toolResults: AgenticLoopToolCallResult[] = [];
  const executions: AgenticLoopResult<unknown>["toolExecutions"] = [];
  const dispatched: AgenticLoopToolCall[] = [];
  let abortedMidBatch = false;
  for (const call of calls) {
    // Honour an abort BETWEEN tool executions. A step can carry several calls,
    // and each one costs up to a full tool timeout, so without this a wide
    // batch keeps running long past the moment the turn was cancelled — the
    // step-top check only fires once the whole batch has drained. Passing the
    // signal into execute() is not enough on its own: a tool that ignores it
    // runs to completion, and every remaining call still gets STARTED.
    if (abortSignal.aborted) {
      abortedMidBatch = true;
      break;
    }
    dispatched.push(call);
    const breaker = adapter.toolFailureBreaker;
    const failInfo = breaker ? failedTools.get(call.name) : undefined;
    if (breaker && failInfo && failInfo.count >= breaker.maxRetries) {
      const output = {
        error: `TOOL_PERMANENTLY_FAILED: "${call.name}" has failed ${failInfo.count} times. Last error: ${failInfo.lastError}.`,
        status: "permanently_failed",
        do_not_retry: true,
      };
      toolResults.push({
        ...call,
        output,
        error: output.error,
        permanentlyFailed: true,
      });
      executions.push({
        id: call.id,
        name: call.name,
        input: call.args,
        output,
        error: output.error,
      });
      continue;
    }
    // Second lookup path for adapters that discover tools mid-turn.
    // The miss is defined as "nothing executable under this name"
    // rather than "no key under this name", because the guard directly
    // below already treats a present-but-unexecutable entry as absent —
    // a deferred-catalog placeholder is exactly that shape, and it is
    // precisely what hydration exists to resolve.
    const declaredTool = tools?.[call.name];
    const tool = declaredTool?.execute
      ? declaredTool
      : (adapter.resolveToolOnMiss?.(call.name) ?? declaredTool);
    if (!tool?.execute) {
      const output = breaker
        ? {
            error: `TOOL_NOT_FOUND: "${call.name}" does not exist.`,
            status: "permanently_failed",
            do_not_retry: true,
          }
        : { error: `Tool not found: ${call.name}` };
      toolResults.push({
        ...call,
        output,
        error: output.error,
        permanentlyFailed: !!breaker,
      });
      executions.push({
        id: call.id,
        name: call.name,
        input: call.args,
        output,
        error: output.error,
      });
      continue;
    }
    try {
      const output = await tool.execute(call.args, {
        toolCallId: call.id,
        abortSignal: abortSignal,
      });
      // A result can report failure without throwing — an MCP isError
      // payload, a proxy-blocked call resolving with `{ error }`. When
      // the breaker is told how to recognise those, they strike it
      // exactly as a throw does; otherwise the model can grind on a
      // blocked tool for the whole step budget.
      const resultFailure = breaker?.classifyResultFailure?.(output);
      if (breaker) {
        if (resultFailure) {
          const current = failedTools.get(call.name) ?? {
            count: 0,
            lastError: "",
          };
          current.count++;
          current.lastError = resultFailure;
          failedTools.set(call.name, current);
        } else if (breaker.consecutive) {
          // Genuinely consecutive: a clean result clears the count, so
          // an argument-dependent soft error cannot accumulate its way
          // to disabling a tool that works.
          failedTools.delete(call.name);
        }
      }
      toolResults.push({ ...call, output });
      executions.push({
        id: call.id,
        name: call.name,
        input: call.args,
        output,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (breaker) {
        const current = failedTools.get(call.name) ?? {
          count: 0,
          lastError: "",
        };
        current.count++;
        current.lastError = message;
        failedTools.set(call.name, current);
      }
      const output = { error: message, status: "failed" };
      toolResults.push({ ...call, output, error: message });
      executions.push({
        id: call.id,
        name: call.name,
        input: call.args,
        output,
        error: message,
      });
    }
  }
  return { toolResults, executions, dispatched, abortedMidBatch };
}

/**
 * Run one adapter-parameterized agentic tool-calling turn. Owns the
 * maxSteps-bounded loop, generic tool dispatch (with an opt-in
 * TOOL_NOT_FOUND/failure-strike breaker — see AgenticLoopAdapter.toolFailureBreaker),
 * per-step usage accumulation, a single optional malformed-call retry,
 * chunk emission through streamChannel, and a pre-first-chunk 429/5xx
 * retry (via withProviderRetry) around every adapter.executeStep() call.
 * The retry wrap is unconditional and adapter-agnostic — every migrated
 * provider gets it for free, not just the ones that had a hand-rolled
 * version before migration (see Verified Fact 4-adjacent note in Task 4
 * Step 1 and the Risks & Rollback "Deliberate behavior changes" list for
 * which families are gaining this for the first time). Everything
 * wire-format-specific (building the request, parsing the SDK response,
 * serializing tool results back into the conversation, mapping the raw
 * stop reason) is delegated to `adapter`.
 */
export function runAgenticLoop<TConversation>(
  adapter: AgenticLoopAdapter<TConversation>,
  initialConversation: TConversation,
  options: AgenticLoopOptions,
): {
  stream: AsyncIterable<AgenticLoopChunk>;
  resultPromise: Promise<AgenticLoopResult<TConversation>>;
} {
  const channel = createStreamChannel<AgenticLoopChunk>();
  const internalAbort = new AbortController();
  const onCallerAbort = () => internalAbort.abort();
  options.abortSignal?.addEventListener("abort", onCallerAbort);
  if (options.abortSignal?.aborted) {
    internalAbort.abort();
  }

  const failedTools = new Map<string, { count: number; lastError: string }>();
  let malformedRetryUsed = false;

  const resultPromise = (async (): Promise<
    AgenticLoopResult<TConversation>
  > => {
    let conversation = initialConversation;
    let usage: AgenticLoopUsage = { inputTokens: 0, outputTokens: 0 };
    let finalText = "";
    // The most recent step's text, kept only for the step-cap case below.
    let lastStepText = "";
    let rawStopReason: string | undefined;
    const allToolCalls: AgenticLoopResult<TConversation>["toolCalls"] = [];
    const allToolExecutions: AgenticLoopResult<TConversation>["toolExecutions"] =
      [];
    let hadToolCallsAtCap = false;

    try {
      for (let step = 0; step < adapter.maxSteps; step++) {
        if (internalAbort.signal.aborted) {
          break;
        }

        if (adapter.planReclaim) {
          const reclaimed = adapter.planReclaim(conversation, step);
          if (reclaimed?.conversation !== undefined) {
            conversation = reclaimed.conversation;
          }
          // A guard that could not reclaim enough room ends the turn HERE,
          // before the request goes out — stepping into a provider rejection
          // would lose every completed step of the turn.
          if (reclaimed?.stop) {
            break;
          }
        }

        const request = adapter.buildStepRequest(conversation, step);

        // A tool that just became callable starts clean. Its TOOL_NOT_FOUND
        // strikes were recorded against a name that genuinely did not resolve
        // yet, and the breaker is consulted before the lookup, so without this
        // a deferred tool the model named twice is refused for the rest of the
        // turn at the exact moment it becomes usable.
        for (const name of request.hydratedToolNames ?? []) {
          failedTools.delete(name);
        }

        // Pre-first-chunk 429/5xx retry: watch whether THIS attempt of
        // THIS step pushes anything to the shared channel before it
        // throws. `hasEmitted` resets at the top of every attempt
        // withProviderRetry makes; the instant an attempt emits and then
        // throws, the thrown error is rewrapped as a PostEmissionStepError
        // (no status/branding info survives the rewrap), which
        // isRetryableProviderError() duck-types as non-retryable — so
        // withProviderRetry gives up immediately instead of sleeping and
        // re-invoking executeStep, which would duplicate/interleave
        // output already sent to the consumer. The original error (not
        // the wrapper) is what the caller of runAgenticLoop ultimately
        // sees, via the unwrap in the catch below.
        let hasEmitted = false;
        const watchedChannel = {
          push: (chunk: AgenticLoopChunk) => {
            hasEmitted = true;
            channel.push(chunk);
          },
        };
        let stepResult: AgenticLoopStepResult;
        try {
          stepResult = await withProviderRetry(
            async () => {
              hasEmitted = false;
              try {
                return await adapter.executeStep(
                  request,
                  watchedChannel,
                  internalAbort.signal,
                );
              } catch (err) {
                throw hasEmitted ? new PostEmissionStepError(err) : err;
              }
            },
            // The caller's span, when it passes one. withProviderRetry writes
            // gen_ai.provider.total_attempts here, so a loop that threaded a
            // span before it moved onto this engine keeps emitting it.
            options.span,
            `${adapter.providerLabel}.step`,
          );
        } catch (err) {
          throw err instanceof PostEmissionStepError ? err.cause : err;
        }

        usage = sumUsage(usage, stepResult.usage);
        rawStopReason = stepResult.rawStopReason;
        lastStepText = stepResult.text || lastStepText;

        if (
          adapter.isMalformedStep?.(stepResult) &&
          !malformedRetryUsed &&
          !internalAbort.signal.aborted
        ) {
          malformedRetryUsed = true;
          logger.warn(
            `[${adapter.providerLabel}] Malformed function call at step ${step + 1}/${adapter.maxSteps}; retrying once.`,
          );
          conversation =
            adapter.buildMalformedRetryNote?.(conversation, step) ??
            conversation;
          continue;
        }

        if (stepResult.toolCalls.length === 0) {
          finalText = stepResult.text || finalText;
          break;
        }

        if (step === adapter.maxSteps - 1) {
          hadToolCallsAtCap = true;
        }

        const dispatch = await dispatchStepTools({
          calls: stepResult.toolCalls,
          adapter,
          tools: options.tools,
          failedTools,
          abortSignal: internalAbort.signal,
        });
        const toolResults = dispatch.toolResults;
        allToolCalls.push(...dispatch.dispatched);
        allToolExecutions.push(...dispatch.executions);
        const abortedMidBatch = dispatch.abortedMidBatch;

        // A batch cut short leaves some calls without results, and the
        // tool-result turn is appended as one message: writing it here would
        // put an unanswered tool call into history. Anthropic rejects exactly
        // that on the next request, and Gemini carries a dangling call
        // forward. Break instead, leaving history ending on the model turn —
        // which is a valid place to stop.
        if (abortedMidBatch) {
          break;
        }

        conversation = adapter.buildToolResultMessages(
          conversation,
          stepResult,
          toolResults,
          step,
        );
      }

      const finishReason = adapter.mapFinishReason(
        rawStopReason,
        hadToolCallsAtCap,
      );
      return {
        // `finalText` is only set by a step that asked for no tools, so a turn
        // that runs out of steps mid-tool-call would otherwise return "" and
        // throw away everything the model actually said. An empty result also
        // reads as a failed generation to callers that retry on empty content,
        // turning one capped turn into several. Fall back to the last step's
        // text in that case only — when the loop ended normally, an empty
        // final step genuinely means the model said nothing.
        text: finalText || (hadToolCallsAtCap ? lastStepText : ""),
        toolCalls: allToolCalls,
        toolExecutions: allToolExecutions,
        usage,
        finishReason,
        rawStopReason,
        conversation,
      };
    } catch (err) {
      // Must run before the finally block's channel.close(): a consumer
      // parked in the channel's iterable is woken by whichever of
      // error()/close() runs first, and close() alone would let a
      // stream-only consumer observe a clean end of stream for a turn that
      // actually failed. Calling error() here — synchronously, inside this
      // catch — guarantees it lands before close(), with no dependence on
      // microtask scheduling (unlike an outer promise-chained catch handler
      // on this IIFE, which would run in a later microtask after `finally`
      // already closed the channel).
      channel.error(err);
      throw err;
    } finally {
      // close() after error() is harmless: it only flips `done`, and
      // streamChannel.error() keeps its error state intact regardless of a
      // later close() call.
      channel.close();
      options.abortSignal?.removeEventListener("abort", onCallerAbort);
    }
  })();

  return { stream: channel.iterable, resultPromise };
}

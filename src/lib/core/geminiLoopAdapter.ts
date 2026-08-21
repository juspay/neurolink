/**
 * Shared Gemini adapter onto the agentic loop engine.
 *
 * Lives in `core/` rather than inside either provider's folder because two
 * providers use it: Google AI Studio (Task 9) and Vertex Gemini (Task 10).
 * Both issue the same wire call — `models.generateContentStream` — and consume
 * the same response shape, so one `executeStep` serves four hand-rolled loops
 * (each provider has a streaming one and a near-duplicate inside `generate()`).
 *
 * Function-name sanitization stays entirely on this side of the engine
 * boundary, which is the design decision Task 7 recorded rather than a
 * shortcut. Google requires function names to match a restricted pattern, so
 * declarations are built with sanitized names and the model calls back with
 * those same sanitized names. The engine only ever sees plain string names, so
 * this adapter translates sanitized -> original before returning `toolCalls`,
 * and original -> sanitized when writing `functionResponse` parts. Neither the
 * engine nor any other adapter needs to know sanitization happened.
 */

import type {
  AgenticLoopAdapter,
  AgenticLoopChunk,
  AgenticLoopStepRequest,
  AgenticLoopStepResult,
  AgenticLoopToolCallResult,
  GeminiLoopAdapterConfig,
  GeminiStepRaw,
  GeminiTurnContent,
} from "../types/index.js";
import {
  collectStreamChunksIncremental,
  extractTextFromParts,
  mapGeminiFinishReason,
  pushModelResponseToHistory,
  refreshNativeToolDeclarations,
} from "../providers/googleNativeGemini3/utils.js";

export function createGeminiLoopAdapter(
  config: GeminiLoopAdapterConfig,
): AgenticLoopAdapter<GeminiTurnContent[], GeminiStepRaw> {
  /**
   * Sanitized wire name -> the name the caller registered. Rebuilt per step
   * because mid-turn discovery can add entries between steps.
   */
  const originalNameFor = (sanitized: string): string =>
    config.declarations?.originalNameMap?.get(sanitized) ?? sanitized;

  const sanitizedNameFor = (original: string): string => {
    const map = config.declarations?.originalNameMap;
    if (!map) {
      return original;
    }
    for (const [sanitized, name] of map) {
      if (name === original) {
        return sanitized;
      }
    }
    return original;
  };

  return {
    providerLabel: config.providerLabel,
    maxSteps: config.maxSteps,
    ...(config.toolFailureBreaker
      ? { toolFailureBreaker: config.toolFailureBreaker }
      : {}),

    /**
     * Mid-turn discovery: `search_tools` hydrates new tools into the live
     * record between steps, and Gemini only calls what the request declared,
     * so the declarations are refreshed before each step is built. This is
     * why `resolveToolOnMiss` exists as well — a tool discovered during a
     * step is callable in the same step, before the next refresh.
     */
    buildStepRequest(
      conversation: GeminiTurnContent[],
      step: number,
    ): AgenticLoopStepRequest {
      if (config.declarations) {
        refreshNativeToolDeclarations(config.liveTools, config.declarations);
      }
      return { raw: config.buildRequest(conversation, step) };
    },

    /**
     * The engine decides WHEN to reclaim; the provider decides HOW. Wiring
     * this is not optional dressing: both loops append a model turn and a
     * tool turn every step, so without it a long agentic run overflows the
     * context window mid-turn and loses the work already done.
     */
    ...(config.planReclaim
      ? {
          planReclaim: (conversation: GeminiTurnContent[], step: number) => {
            const reclaimed = config.planReclaim?.(conversation, step);
            return reclaimed ? { conversation: reclaimed } : undefined;
          },
        }
      : {}),

    /**
     * A step that produced no text, no function calls, and a
     * MALFORMED_FUNCTION_CALL finish reason is a transient formatting
     * failure, not a finished turn. Vertex retries it once with a corrective
     * note rather than hard-ending on empty content — automated RCA turns
     * were dying at step 2-4 on this and being mislabelled as step-cap exits.
     *
     * Opt-in: AI Studio has no such retry today and gaining one silently
     * would be a behaviour change, not a migration.
     */
    ...(config.enableMalformedRetry && config.buildMalformedRetryNote
      ? {
          isMalformedStep: (
            stepResult: AgenticLoopStepResult<GeminiStepRaw>,
          ): boolean =>
            stepResult.toolCalls.length === 0 &&
            !stepResult.text &&
            stepResult.rawStopReason === "MALFORMED_FUNCTION_CALL",
          buildMalformedRetryNote: config.buildMalformedRetryNote,
        }
      : {}),

    resolveToolOnMiss: (name: string) => {
      const tool = config.liveTools?.[name];
      const execute = tool?.execute;
      if (!execute) {
        return undefined;
      }
      // Wrapped because the hook types `opts` as `unknown`, and a function
      // declaring a narrower options type is not assignable to one accepting
      // `unknown`. One assertion at the boundary, never a double assertion.
      return {
        execute: async (args: Record<string, unknown>, opts: unknown) =>
          execute(args, opts as Parameters<typeof execute>[1]),
      };
    },

    async executeStep(
      request: AgenticLoopStepRequest,
      channel: { push(chunk: AgenticLoopChunk): void },
      signal: AbortSignal,
    ): Promise<AgenticLoopStepResult<GeminiStepRaw>> {
      const rawStream = await config.sendStep(request.raw, signal);

      // The shared helper by default: it owns usage extraction and
      // thought-signature preservation, and it wants a StreamChannel but only
      // ever calls `.push`, so the engine's push-only channel satisfies it.
      //
      // A provider whose drain genuinely differs supplies `collectStep`
      // instead. Vertex does: it folds cumulative usage counts as deltas in
      // its own loop, and that behaviour is characterized, so it keeps its
      // collector rather than being quietly switched to this one.
      const collected = config.collectStep
        ? await config.collectStep(rawStream, channel)
        : await collectStreamChunksIncremental(rawStream, {
            push: (chunk: { content: string }) => channel.push(chunk),
          } as Parameters<typeof collectStreamChunksIncremental>[1]);

      // The provider's context guard calibrates from real per-step counts;
      // `inputTokens` is this step's full prompt size, which is what it
      // projects the next request from.
      config.noteUsage?.(collected.inputTokens, collected.outputTokens);

      const text = extractTextFromParts(collected.rawResponseParts);

      // Names cross the engine boundary in their ORIGINAL form.
      const toolCalls = collected.stepFunctionCalls.map((call, index) => ({
        id: `${config.providerLabel}_${index}_${call.name}`,
        name: originalNameFor(call.name),
        args: call.args,
      }));

      return {
        text,
        toolCalls,
        usage: {
          inputTokens: collected.inputTokens,
          outputTokens: collected.outputTokens,
          ...(collected.cacheReadTokens
            ? { cacheReadTokens: collected.cacheReadTokens }
            : {}),
          ...(collected.reasoningTokens
            ? { reasoningTokens: collected.reasoningTokens }
            : {}),
        },
        rawStopReason: collected.finishReason,
        raw: {
          rawResponseParts: collected.rawResponseParts,
          stepFunctionCalls: collected.stepFunctionCalls,
        },
      };
    },

    buildToolResultMessages(
      conversation: GeminiTurnContent[],
      stepResult: AgenticLoopStepResult<GeminiStepRaw>,
      toolResults: AgenticLoopToolCallResult[],
    ): GeminiTurnContent[] {
      // Copied before `pushModelResponseToHistory` mutates it: the engine
      // treats the conversation as a value it hands in and gets back, so
      // mutating the caller's array in place would make a retried or
      // reclaimed step see history it should not.
      const next = [...conversation];
      pushModelResponseToHistory(
        next,
        stepResult.raw.rawResponseParts,
        stepResult.raw.stepFunctionCalls,
      );
      next.push({
        role: "user",
        parts: toolResults.map((result) => ({
          functionResponse: {
            // Back to the sanitized wire name the model actually called.
            name: sanitizedNameFor(result.name),
            response: result.error
              ? { error: result.error }
              : { result: result.output },
          },
        })),
      });
      return next;
    },

    mapFinishReason(
      rawStopReason: string | undefined,
      hadToolCallsAtCap: boolean,
    ): string {
      const mapped = mapGeminiFinishReason(rawStopReason);
      // A turn cut off at the step cap ended because of the cap, not because
      // the last response said "STOP".
      return hadToolCallsAtCap && mapped === "stop" ? "tool-calls" : mapped;
    },
  };
}

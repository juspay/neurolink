import type {
  LoopGuardEntry,
  NativeGenerateGuardConfig,
} from "../types/index.js";
import {
  estimateTokens,
  TOKENS_PER_MESSAGE,
} from "../utils/tokenEstimation.js";
import { logger } from "../utils/logger.js";
import { planLoopGuardReclaim } from "./loopGuardCore.js";
import { DEFAULT_CONTEXT_GUARD_RATIO } from "../core/constants.js";
import { generateToolOutputPreview } from "./toolOutputLimits.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const partsOf = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const textOf = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "x".repeat(200_000);
  }
};

const previewMessage = (
  message: Record<string, unknown>,
): Record<string, unknown> => ({
  ...message,
  // Do not stringify the whole message: call IDs, result types and metadata
  // must survive the wire conversion. Only the result payload is shortened.
  content: partsOf(message.content).map((part) => {
    if (part.type !== "tool-result") {
      return part;
    }
    const output = part.output;
    const wrapped =
      isRecord(output) &&
      ["text", "json", "error-text", "error-json"].includes(
        String(output.type),
      ) &&
      "value" in output;
    const { preview, truncated } = generateToolOutputPreview(
      textOf(wrapped ? output.value : output),
      { maxBytes: 2048, maxLines: 60 },
    );
    if (!truncated) {
      return part;
    }
    return {
      ...part,
      output: wrapped
        ? {
            ...output,
            type: String(output.type).startsWith("error")
              ? "error-text"
              : "text",
            value: preview,
          }
        : preview,
    };
  }),
});

/** V3-shape adapter for the reclaim policy shared with streaming guards. */
export function createNativeGenerateGuard(config: NativeGenerateGuardConfig) {
  let previousSentEstimate: number | undefined;
  let observedPromptTokens: number | undefined;
  const cost = (message: Record<string, unknown>): number =>
    estimateTokens(textOf(message), config.provider) + TOKENS_PER_MESSAGE;

  return {
    observeUsage(usage: unknown): void {
      const input = isRecord(usage) ? usage.inputTokens : undefined;
      const total = isRecord(input) ? input.total : input;
      observedPromptTokens =
        typeof total === "number" && Number.isFinite(total) && total > 0
          ? total
          : undefined;
    },
    guardConversation(
      conversation: Array<Record<string, unknown>>,
    ): Array<Record<string, unknown>> | undefined {
      // Policy entry zero is protected. Fold the entire initial task prefix
      // into it so leading system messages cannot displace task protection.
      const taskIndex = conversation.findIndex(
        (message) => message.role === "user",
      );
      const prefixLength = Math.max(1, taskIndex + 1);
      const tail = conversation.slice(prefixLength);
      const previews = tail.map(previewMessage);
      const entries: LoopGuardEntry[] = [
        {
          kind: "other",
          tokens: conversation
            .slice(0, prefixLength)
            .reduce((sum, message) => sum + cost(message), 0),
        },
        ...tail.map((message, index): LoopGuardEntry => {
          const parts = partsOf(message.content);
          if (
            message.role === "assistant" &&
            parts.some((part) => part.type === "tool-call")
          ) {
            return { kind: "toolCall", tokens: cost(message) };
          }
          if (
            message.role === "tool" &&
            parts.some((part) => part.type === "tool-result")
          ) {
            return {
              kind: "toolResult",
              tokens: cost(message),
              previewTokens: cost(previews[index]),
            };
          }
          return { kind: "other", tokens: cost(message) };
        }),
      ];
      const overhead = config.getFixedOverheadTokens();
      const calibration =
        observedPromptTokens && previousSentEstimate
          ? Math.min(
              3,
              Math.max(1, observedPromptTokens / previousSentEstimate),
            )
          : 1;
      const plan = planLoopGuardReclaim(entries, {
        availableInputTokens: config.availableInputTokens,
        fixedOverheadTokens: overhead,
        calibration,
      });
      // The policy fires at a RATIO of the window, not at the window itself, so
      // every number below is measured against that same threshold. Comparing
      // against the raw budget leaves a ~15% band in which the guard has
      // already crossed its reclaim point while the log still reads "under
      // budget" with positive headroom — defeating the purpose of making the
      // threshold measurable, since a probe sizing a payload from that headroom
      // would aim past the point it meant to cross.
      const reclaimThresholdTokens = Math.floor(
        (config.availableInputTokens * DEFAULT_CONTEXT_GUARD_RATIO) /
          (calibration > 0 ? calibration : 1),
      );
      const estimatedBeforeTokens =
        overhead + entries.reduce((sum, entry) => sum + entry.tokens, 0);
      if (!plan.fire) {
        previousSentEstimate = estimatedBeforeTokens;
        // Staying under budget is the common case and must not be noisy, but
        // silence here is unfalsifiable: no line at all reads the same whether
        // the conversation fit, the guard was never installed, or this hook was
        // never called. Two live attempts to demonstrate the reclaim against a
        // real vendor produced nothing and could not distinguish those, because
        // the budget is not observable from outside the process. Emitting the
        // budget and the headroom at debug makes the threshold measurable, so a
        // probe can size a payload to cross it instead of guessing.
        // Two very different situations reach this branch and must not share a
        // message. Fitting is routine and belongs at debug. Being over budget
        // with nothing reclaimable is neither: the planner only touches entries
        // strictly between the task and the newest
        // DEFAULT_LOOP_GUARD_PROTECTED_TAIL, so a conversation whose oversize
        // content sits inside that protected tail — one large tool result, the
        // common case — yields an empty plan, and the request is sent over the
        // window anyway to be rejected or silently truncated by the vendor.
        // Observed live against deepseek: 186,847 estimated against a 62,500
        // budget, empty plan, no signal of any kind before this warning.
        if (estimatedBeforeTokens > reclaimThresholdTokens) {
          logger.warn(
            "[NativeGenerateGuard] Over threshold, nothing reclaimable",
            {
              provider: config.provider,
              availableInputTokens: config.availableInputTokens,
              reclaimThresholdTokens,
              estimatedPromptTokens: estimatedBeforeTokens,
              overThresholdByTokens:
                estimatedBeforeTokens - reclaimThresholdTokens,
              calibration,
            },
          );
        } else {
          logger.debug("[NativeGenerateGuard] Under threshold", {
            provider: config.provider,
            availableInputTokens: config.availableInputTokens,
            reclaimThresholdTokens,
            estimatedPromptTokens: estimatedBeforeTokens,
            headroomToThresholdTokens:
              reclaimThresholdTokens - estimatedBeforeTokens,
            calibration,
          });
        }
        return undefined;
      }
      const drop = new Set(plan.drop);
      const truncate = new Set(plan.truncate);
      const result = [...conversation.slice(0, prefixLength)];
      let noted = false;
      tail.forEach((message, index) => {
        const entry = index + 1;
        if (drop.has(entry)) {
          if (!noted) {
            result.push({
              role: "user",
              content:
                "[Earlier tool exchanges were removed to fit the context window.]",
            });
          }
          noted = true;
        } else {
          result.push(truncate.has(entry) ? previews[index] : message);
        }
      });
      previousSentEstimate =
        overhead + result.reduce((sum, message) => sum + cost(message), 0);
      logger.info("[NativeGenerateGuard] Reclaimed context", {
        provider: config.provider,
        // The budget and both estimates travel with the event so a reader can
        // see WHY it fired and by how much it overshot, rather than only that
        // it did.
        availableInputTokens: config.availableInputTokens,
        reclaimThresholdTokens,
        estimatedBeforeTokens,
        estimatedAfterTokens: previousSentEstimate,
        truncated: plan.truncate.length,
        dropped: plan.drop.length,
        calibration,
      });
      return result;
    },
  };
}

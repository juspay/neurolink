import type { StreamTextResult, LanguageModelObject } from "../types/index.js";
import type { LanguageModel } from "../types/index.js";
import type { streamText } from "../utils/generation.js";

/**
 * Type guard: checks whether a LanguageModel value is an object with `modelId`
 * (i.e. LanguageModelV2 or LanguageModelV3) rather than a bare string ID.
 */
function isLanguageModelObject(
  model: LanguageModel,
): model is LanguageModel & LanguageModelObject {
  return typeof model === "object" && model !== null && "modelId" in model;
}

/**
 * Extract the model identifier from a LanguageModel value.
 *
 * `LanguageModel` in AI SDK v6 is `string | LanguageModelV2 | LanguageModelV3`.
 * When it's a string it IS the model ID; when it's an object, `.modelId` holds it.
 *
 * @param model  - The LanguageModel value (string or object).
 * @param fallback - Value returned when the model ID cannot be determined.
 */
export function getModelId(model: LanguageModel, fallback = "unknown"): string {
  if (typeof model === "string") {
    return model;
  }
  if (isLanguageModelObject(model)) {
    return model.modelId;
  }
  return fallback;
}

/**
 * Adapt an AI SDK `StreamTextResult` (generic, parameterised by TOOLS & OUTPUT)
 * to the simpler NeuroLink `StreamTextResult` expected by the analytics collector.
 *
 * The AI SDK result is a structural superset of our local type — every field our
 * analytics code reads (`textStream`, `text`, `usage`, `response`, `finishReason`,
 * `toolResults`, `toolCalls`) exists on the SDK result with compatible types.
 * This function performs the structural down-cast without `as any`.
 */
export function toAnalyticsStreamResult(
  result: ReturnType<typeof streamText>,
): StreamTextResult {
  // The AI SDK v6 result is a structural superset of our StreamTextResult.
  // Both use PromiseLike for async fields and compatible usage shapes
  // (extractTokenUsage handles both v4 and v6 field names).
  return result as StreamTextResult;
}

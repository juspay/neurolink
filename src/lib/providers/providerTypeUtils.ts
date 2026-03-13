/**
 * Shared type utilities for AI SDK provider integration.
 *
 * Provides type-safe helpers to bridge between the AI SDK's generic types
 * and NeuroLink's internal type system without resorting to `as any` casts.
 */

import type { LanguageModel, streamText } from "ai";
import type { StreamTextResult } from "../types/streamTypes.js";

/**
 * A language model object (as opposed to a plain string model identifier).
 * Both LanguageModelV2 and LanguageModelV3 share this shape.
 */
interface LanguageModelObject {
  readonly modelId: string;
  readonly provider: string;
}

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

/**
 * Shape of the event passed to `onStepFinish` callbacks by the AI SDK's `streamText`.
 *
 * We define only the fields our providers actually use (`toolCalls`, `toolResults`)
 * so the destructuring in each callback is type-safe without importing the full
 * generic `StepResult<TOOLS>` (which would require threading TOOLS everywhere).
 */
export interface StepFinishEvent {
  readonly toolCalls: ReadonlyArray<unknown>;
  readonly toolResults: ReadonlyArray<unknown>;
  readonly text: string;
  readonly finishReason: string;
  readonly usage: { inputTokens?: number; outputTokens?: number };
  [key: string]: unknown;
}

/**
 * Represents an AI SDK Tool that may carry a legacy `parameters` field
 * (from AI SDK v3/v4) in addition to the current `inputSchema`.
 *
 * In AI SDK v6 the canonical field is `inputSchema`, but tools created with
 * older SDK versions or third-party wrappers may still carry `parameters`.
 * This interface lets us access either field without `as any`.
 */
export interface ToolWithLegacyParams {
  description?: string;
  inputSchema?: unknown;
  execute?: (...args: unknown[]) => unknown;
  /** Legacy field from AI SDK v3/v4 */
  parameters?: unknown;
}

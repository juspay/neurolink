import type { Tool, ToolChoice } from "../types/index.js";

export function resolveToolChoice(
  options: {
    toolChoice?: ToolChoice<Record<string, Tool>>;
  },
  tools: Record<string, Tool> | undefined,
  shouldUseTools: boolean,
): ToolChoice<Record<string, Tool>> | "none" {
  if (!shouldUseTools || !tools || Object.keys(tools).length === 0) {
    return "none";
  }

  return options.toolChoice ?? "auto";
}

/**
 * Normalise an already-resolved tool choice into the shape
 * `toolChoiceToAnthropic` (and its peers) accept.
 *
 * A provider's model handle sees a value that has *already* been through
 * `resolveToolChoice` upstream, so it must translate rather than re-resolve —
 * re-resolving there would apply the `auto`/`none` defaulting twice, and the
 * `tools`/`shouldUseTools` inputs it needs are not in scope at that layer
 * anyway.
 *
 * What does vary is the shape. The value arrives either as a bare string
 * (`"auto"` / `"none"` / `"required"`), as `{ type: "tool", toolName }`, or —
 * on the native loop's tool-free re-ask — as an injected `{ type: "none" }`
 * object. Reading `.type` off the string forms yields `undefined`, which is
 * how string choices were silently dropped from the Anthropic generate
 * request. This exists so that normalisation lives in one place instead of
 * being re-derived at each call site.
 */
export function normalizeResolvedToolChoice(
  value: unknown,
): ToolChoice<Record<string, Tool>> | undefined {
  if (typeof value === "string") {
    return value as ToolChoice<Record<string, Tool>>;
  }
  if (value && typeof value === "object") {
    const candidate = value as { type?: string; toolName?: string };
    if (candidate.type === "tool") {
      // A tool choice that names no tool cannot be honoured. Fall through to
      // the provider default rather than emitting the bare string "tool",
      // which is not one of the valid auto/none/required forms and would be
      // rejected downstream.
      return candidate.toolName
        ? { type: "tool", toolName: candidate.toolName }
        : undefined;
    }
    if (candidate.type) {
      return candidate.type as ToolChoice<Record<string, Tool>>;
    }
  }
  return undefined;
}

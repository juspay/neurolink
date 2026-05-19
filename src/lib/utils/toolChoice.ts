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

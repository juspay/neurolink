/**
 * The internal structured-output tool (`final_result`) and the system-prompt
 * texts that steer a model to it, from `structured-output.json`.
 */
import type { ProviderFinalResultTool } from "../../types/index.js";
import { getProviderRules } from "./registry.js";

function loadFinalResultTool(): ProviderFinalResultTool {
  const tool = getProviderRules("structured-output").finalResultTool;
  if (!tool) {
    throw new Error(
      'Provider rules file "structured-output.json" has no finalResultTool',
    );
  }
  return tool;
}

const TOOL = loadFinalResultTool();

/** Internal tool name, filtered out of every returned tool call and execution. */
export const FINAL_RESULT_TOOL_NAME = TOOL.name;

/** The tool's description, as sent to the model. */
export const FINAL_RESULT_TOOL_DESCRIPTION = TOOL.description;

/** A system-prompt instruction naming the tool (the final-result tool by default). */
export function finalResultToolInstruction(
  kind: keyof ProviderFinalResultTool["instructions"],
  toolName: string = FINAL_RESULT_TOOL_NAME,
): string {
  return TOOL.instructions[kind].replaceAll("{tool}", toolName);
}

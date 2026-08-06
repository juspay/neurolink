import type Anthropic from "@anthropic-ai/sdk";
import { logger } from "../../utils/logger.js";
import { inlineJsonSchema } from "../../utils/schemaConversion.js";

/**
 * Additive structured output for the native Anthropic Messages API.
 *
 * Anthropic has no `response_format`, so a schema has to be expressed as a
 * tool. The provider's pre-existing `responseFormat` path does that by
 * REPLACING the tools array with a single json tool and pinning `tool_choice`
 * to it — correct for a schema-only call, but mutually exclusive with real
 * tools, so agent/MCP turns that pass both silently lost the schema.
 *
 * The additive pattern here APPENDS a `final_result` tool to the caller's
 * tools and leaves `tool_choice` on auto: the model keeps calling real tools
 * for as long as it needs, then emits its answer as `final_result` arguments
 * that already conform to the schema. This mirrors the native
 * Claude-on-Vertex loop in `googleVertex/client.ts`, which has used the same
 * tool name, description, and instruction wording since it shipped.
 */

/** Internal tool name — filtered out of every returned tool call / execution. */
export const FINAL_RESULT_TOOL_NAME = "final_result";

const FINAL_RESULT_TOOL_DESCRIPTION =
  "Return the final structured result. You MUST call this tool when you have gathered all information and are ready to provide the final answer. The arguments should contain the structured data matching the expected schema.";

/** Appended to the system prompt whenever the final_result tool is in play. */
export const FINAL_RESULT_INSTRUCTION =
  "\n\nIMPORTANT: You MUST call the 'final_result' tool to return your response in the required structured format. Do not respond with plain text - always use the final_result tool.";

/**
 * Build the `final_result` tool definition from a JSON Schema.
 *
 * `$ref`s are inlined and `$schema` dropped — Anthropic's `input_schema` must
 * be a self-contained object schema. Schemas that are not object-rooted (a
 * bare array/string schema) are wrapped so `input_schema.type` is always
 * "object", which the Messages API requires.
 */
export function buildFinalResultTool(
  jsonSchema: Record<string, unknown>,
): Anthropic.Messages.Tool {
  const inlined = inlineJsonSchema({ ...jsonSchema });
  delete inlined.$schema;

  const properties = inlined.properties as Record<string, unknown> | undefined;
  const input_schema = {
    type: "object",
    properties: properties ?? inlined,
    required: Array.isArray(inlined.required) ? inlined.required : [],
  } as Anthropic.Messages.Tool.InputSchema;

  return {
    name: FINAL_RESULT_TOOL_NAME,
    description: FINAL_RESULT_TOOL_DESCRIPTION,
    input_schema,
  };
}

/**
 * Append `final_result` to an Anthropic tool list.
 *
 * Returns a NEW array so the caller's tool list is never mutated, and reports
 * `applied: false` (with the list unchanged) when the pattern must not run:
 * there are no real tools to preserve, or the caller already exposes a tool of
 * that name — shadowing a caller's tool would break their turn.
 */
export function appendFinalResultTool(
  tools: Anthropic.Messages.Tool[] | undefined,
  jsonSchema: Record<string, unknown>,
): { tools: Anthropic.Messages.Tool[] | undefined; applied: boolean } {
  if (!tools || tools.length === 0) {
    return { tools, applied: false };
  }
  if (tools.some((tool) => tool.name === FINAL_RESULT_TOOL_NAME)) {
    logger.warn(
      "[Anthropic] A caller tool is already named 'final_result'; skipping the additive structured-output tool",
    );
    return { tools, applied: false };
  }
  // Appended LAST so any cache_control breakpoint an upstream layer placed on
  // the previously-last tool keeps marking the same prefix boundary.
  return { tools: [...tools, buildFinalResultTool(jsonSchema)], applied: true };
}

/**
 * Append the final_result instruction to an Anthropic `system` value.
 *
 * The block-array form gets a NEW trailing block rather than an edit to the
 * existing one: rewriting a block that carries a `cache_control` marker would
 * change the cached prefix and invalidate the prompt cache on every turn.
 */
export function appendFinalResultInstruction(
  system: string | Anthropic.Messages.TextBlockParam[] | undefined,
): string | Anthropic.Messages.TextBlockParam[] {
  if (system === undefined) {
    return FINAL_RESULT_INSTRUCTION.trim();
  }
  if (typeof system === "string") {
    return system + FINAL_RESULT_INSTRUCTION;
  }
  return [...system, { type: "text", text: FINAL_RESULT_INSTRUCTION.trim() }];
}

/**
 * Canonical JSON text for a `final_result` payload.
 *
 * Accepts the raw accumulated `input_json` from a stream so a payload
 * truncated by the token cap is still returned verbatim — the caller's
 * coercion layer can repair it, whereas dropping it loses the whole answer.
 */
export function stringifyFinalResultInput(inputJson: string): string {
  try {
    return JSON.stringify(JSON.parse(inputJson || "{}"));
  } catch {
    return inputJson;
  }
}

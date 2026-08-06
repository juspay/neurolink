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
 * Synthetic property a non-object root schema is carried under.
 *
 * Anthropic's `input_schema` must be object-rooted, but a caller's schema is
 * free not to be (`z.array(...)`, `z.string()`, a top-level `z.union(...)`
 * that converts to a bare `anyOf`). Those roots are nested under this key and
 * unwrapped again on the way out, so the caller still receives exactly the
 * shape their schema describes.
 */
const WRAPPED_ROOT_PROPERTY = "value";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * True when a JSON Schema describes an object at its root — the only shape
 * whose keys can be lifted straight into `input_schema.properties`.
 *
 * A composite root (`anyOf` / `oneOf` / `allOf`, which is what a top-level Zod
 * union converts to) is deliberately NOT object-rooted: splatting it would
 * produce an object with a property literally named "anyOf".
 */
function isObjectRootSchema(schema: Record<string, unknown>): boolean {
  if (typeof schema.type === "string") {
    return schema.type === "object";
  }
  return isPlainObject(schema.properties);
}

/**
 * Build the `final_result` tool definition from a JSON Schema.
 *
 * `$ref`s are inlined and `$schema` dropped — Anthropic's `input_schema` must
 * be a self-contained object schema. An object-rooted schema has its
 * properties lifted directly; anything else is nested under
 * `WRAPPED_ROOT_PROPERTY`, reported back via `wrapped` so the extraction side
 * can unwrap it.
 */
export function buildFinalResultTool(jsonSchema: Record<string, unknown>): {
  tool: Anthropic.Messages.Tool;
  wrapped: boolean;
} {
  const inlined = inlineJsonSchema({ ...jsonSchema });
  delete inlined.$schema;

  const wrapped = !isObjectRootSchema(inlined);
  const input_schema = (
    wrapped
      ? {
          type: "object",
          properties: { [WRAPPED_ROOT_PROPERTY]: inlined },
          required: [WRAPPED_ROOT_PROPERTY],
        }
      : {
          type: "object",
          properties: inlined.properties ?? {},
          required: Array.isArray(inlined.required) ? inlined.required : [],
        }
  ) as Anthropic.Messages.Tool.InputSchema;

  return {
    tool: {
      name: FINAL_RESULT_TOOL_NAME,
      description: FINAL_RESULT_TOOL_DESCRIPTION,
      input_schema,
    },
    wrapped,
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
): {
  tools: Anthropic.Messages.Tool[] | undefined;
  applied: boolean;
  wrapped: boolean;
} {
  if (!tools || tools.length === 0) {
    return { tools, applied: false, wrapped: false };
  }
  if (tools.some((tool) => tool.name === FINAL_RESULT_TOOL_NAME)) {
    logger.warn(
      "[Anthropic] A caller tool is already named 'final_result'; skipping the additive structured-output tool",
    );
    return { tools, applied: false, wrapped: false };
  }
  // Appended LAST so any cache_control breakpoint an upstream layer placed on
  // the previously-last tool keeps marking the same prefix boundary.
  const built = buildFinalResultTool(jsonSchema);
  return {
    tools: [...tools, built.tool],
    applied: true,
    wrapped: built.wrapped,
  };
}

/**
 * Splice tools in ahead of `final_result`, keeping it last.
 *
 * Mid-turn `tools.discovery` hydration appends to the live declaration list on
 * every step; appending past `final_result` would leave it stranded mid-array
 * and quietly break the ordering invariant the rest of this module relies on.
 * Falls back to a plain append when the tool is not present.
 */
export function insertBeforeFinalResult(
  tools: Anthropic.Messages.Tool[],
  extra: Anthropic.Messages.Tool[],
): Anthropic.Messages.Tool[] {
  if (extra.length === 0) {
    return tools;
  }
  const finalIndex = tools.findIndex(
    (tool) => tool.name === FINAL_RESULT_TOOL_NAME,
  );
  if (finalIndex === -1) {
    return [...tools, ...extra];
  }
  return [...tools.slice(0, finalIndex), ...extra, ...tools.slice(finalIndex)];
}

/**
 * Read the JSON Schema `GenerationHandler` forwards on
 * `providerOptions.anthropic.finalResultSchema`.
 *
 * `providerOptions` is an untyped passthrough bag, so this narrows at runtime
 * rather than asserting: a malformed value is ignored (the turn simply runs
 * without the additive pattern) instead of being trusted as a schema and
 * producing a request Anthropic would reject.
 */
export function readFinalResultSchema(
  providerOptions: Record<string, Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  const value = providerOptions?.anthropic?.finalResultSchema;
  return isPlainObject(value) ? value : undefined;
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
 * Matches the opening of a wrapper object this module built, so a truncated
 * payload can be unwrapped textually when it is too damaged to parse.
 */
const WRAPPED_ROOT_PREFIX = new RegExp(
  `^\\s*\\{\\s*"${WRAPPED_ROOT_PROPERTY}"\\s*:\\s*`,
);

/**
 * Canonical JSON text for a `final_result` payload.
 *
 * `input` is the tool's arguments: an already-parsed object on the
 * non-streaming path, or the raw accumulated `input_json` on the streaming
 * one. A payload truncated by the token cap is returned verbatim rather than
 * dropped — the caller's coercion layer can repair it, whereas discarding it
 * loses the entire answer.
 *
 * `wrapped` unwraps the synthetic root added by `buildFinalResultTool` for
 * non-object schemas, including textually when the payload was cut off before
 * it could be parsed.
 */
export function stringifyFinalResultInput(
  input: unknown,
  wrapped = false,
): string {
  let parsed: unknown;
  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input || "{}");
    } catch {
      // Truncated. Strip the wrapper this module added so the repair layer
      // sees the caller's own shape; the prefix is ours, not model output,
      // so matching it is deterministic.
      return wrapped ? input.replace(WRAPPED_ROOT_PREFIX, "") : input;
    }
  } else {
    parsed = input ?? {};
  }

  const value =
    wrapped && isPlainObject(parsed) && WRAPPED_ROOT_PROPERTY in parsed
      ? parsed[WRAPPED_ROOT_PROPERTY]
      : parsed;

  try {
    return JSON.stringify(value ?? {});
  } catch {
    return "{}";
  }
}

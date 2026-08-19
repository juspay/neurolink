import { buildNativeToolDeclarations } from "../providers/googleNativeGemini3/utils.js";
import { cacheControlOf } from "../providers/anthropic/cacheControl.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
import type {
  NativeAnthropicToolDeclaration,
  NativeToolDeclarationsResult,
  NativeToolFormat,
  Tool,
} from "../types/index.js";

/**
 * Convert a NeuroLink tool record into the wire-format a native
 * (non-AI-SDK) provider SDK expects. Absorbs the direct-Anthropic
 * provider's `toolsToAnthropic` — previously duplicated between the
 * streaming loop's pre-loop snapshot and its mid-turn discovery-hydration
 * call site (both in anthropic/client.ts). Gemini's `functionDeclarations`
 * shape was already centralized in `buildNativeToolDeclarations`; this
 * function is a thin facade over it so every native provider calls one
 * entry point.
 *
 * Scope note: Vertex's Claude-on-Vertex `input_schema` builder
 * (`buildAnthropicToolDeclaration` in googleVertex/client.ts) is
 * deliberately NOT routed through this function. Despite the superficial
 * similarity, it is not a byte-for-byte duplicate of `toolsToAnthropic`: it
 * strips the converted schema down to `{type, properties, required}` only
 * (dropping any other JSON-Schema keywords `convertZodToJsonSchema` may
 * produce), it always runs `inlineJsonSchema` (Anthropic-direct never has),
 * it prefers `parameters` over `inputSchema` (the opposite fallback order
 * from Anthropic-direct), and it has no `cache_control` support of its own
 * because Vertex applies cache breakpoints later via the separate
 * `applyVertexAnthropicCacheBreakpoints` pass. Collapsing these into one
 * shared implementation would risk a live tool-calling regression on one
 * provider or the other; see the Task 2 report for the full comparison.
 *
 * These are genuine TS overload declarations, not redeclarations: the base
 * `no-redeclare` ESLint rule doesn't understand the overload-signatures +
 * implementation pattern (the TS-aware `@typescript-eslint/no-redeclare`
 * variant would, but isn't enabled project-wide), so each signature below
 * is individually exempted.
 */
export function toNativeToolDeclarations(
  tools: Record<string, Tool>,
  format: "input_schema",
): NativeAnthropicToolDeclaration[] | undefined;
// eslint-disable-next-line no-redeclare -- TS overload signature, not a redeclaration
export function toNativeToolDeclarations(
  tools: Record<string, Tool>,
  format: "functionDeclarations",
): NativeToolDeclarationsResult;
// eslint-disable-next-line no-redeclare -- TS overload implementation signature, not a redeclaration
export function toNativeToolDeclarations(
  tools: Record<string, Tool>,
  format: NativeToolFormat,
): NativeAnthropicToolDeclaration[] | NativeToolDeclarationsResult | undefined {
  if (format === "functionDeclarations") {
    return buildNativeToolDeclarations(tools);
  }
  const entries = Object.entries(tools ?? {});
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(([name, tool]) => {
    const t = tool as {
      description?: string;
      inputSchema?: unknown;
      parameters?: unknown;
    };
    const rawSchema = t.inputSchema ?? t.parameters;
    const input_schema = (
      rawSchema
        ? convertZodToJsonSchema(rawSchema as never)
        : { type: "object", properties: {} }
    ) as Record<string, unknown>;
    // GenerationHandler marks the last tool definition with a cache
    // breakpoint when prompt caching is active — keep honoring it.
    const cc = cacheControlOf(tool);
    const declaration: NativeAnthropicToolDeclaration = {
      name,
      ...(t.description ? { description: t.description } : {}),
      input_schema,
      ...(cc ? { cache_control: cc } : {}),
    };
    return declaration;
  });
}

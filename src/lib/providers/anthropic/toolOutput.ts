/**
 * Tool-result serialization shared by Anthropic's client and its loop adapter.
 *
 * Extracted rather than exported from `client.ts` because the adapter is
 * imported BY the client: importing back the other way would close a cycle.
 * The behaviour is unchanged from the module-private version it replaces.
 */

/** Serialize a tool-result `output` into text for a tool_result block. */
export const stringifyAnthropicToolOutput = (output: unknown): string => {
  if (output === null || output === undefined) {
    return "";
  }
  if (typeof output === "string") {
    return output;
  }
  const o = output as { type?: string; value?: unknown };
  if (o.type === "text" && typeof o.value === "string") {
    return o.value;
  }
  if (o.type === "json" || o.type === "error-json") {
    try {
      // `?? String(...)`: JSON.stringify returns undefined for an undefined
      // value, which would break this function's string contract and emit an
      // invalid tool_result.content.
      return JSON.stringify(o.value) ?? String(o.value);
    } catch {
      return String(o.value);
    }
  }
  try {
    // Same guard: a function or symbol stringifies to undefined.
    return JSON.stringify(output) ?? String(output);
  } catch {
    return String(output);
  }
};

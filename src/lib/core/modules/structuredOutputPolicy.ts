/**
 * Policy for when AI-SDK structured output (experimental_output) must be
 * disabled because the provider cannot combine tool calls with JSON-schema
 * enforcement.
 *
 * This is a GEMINI-ONLY API limitation. Anthropic Claude — including when
 * hosted on Vertex (modelName starts with "claude-") — supports tools and
 * structured output simultaneously, so it must NOT be excluded. A gate keyed on
 * "any Vertex model" wrongly disables structured output for Vertex+Claude (the
 * primary production config) and forces fragile hand-parsed JSON.
 */

/** True when the provider+model is a Gemini model (the only family with the tools↔schema conflict). */
export function isGeminiProvider(
  providerName: string,
  modelName: string | undefined,
): boolean {
  if (providerName === "google-ai") {
    return true;
  }
  if (providerName === "vertex") {
    // Vertex hosts both Gemini and Claude. Only non-Claude (Gemini) models
    // have the tools↔schema conflict.
    return !(modelName?.startsWith("claude-") ?? false);
  }
  return false;
}

/**
 * True when structured output must be disabled for this call because tools are
 * active on a Gemini provider. Mirrors the AI-SDK constraint exactly.
 */
export function isToolsSchemaExclusionInForce(
  providerName: string,
  modelName: string | undefined,
  shouldUseTools: boolean,
  toolCount: number,
): boolean {
  return (
    isGeminiProvider(providerName, modelName) && shouldUseTools && toolCount > 0
  );
}

/**
 * True when a provider error indicates the request was rejected because JSON /
 * structured output and tool-calling cannot be combined for that provider
 * (e.g. Groq: "json mode cannot be combined with tool/function calling").
 *
 * This is the runtime, provider-agnostic complement to the static Gemini gate:
 * any provider with the same limitation can be detected from its error message
 * and retried without structured output instead of failing the call.
 */
export function isToolsSchemaConflictError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return (
    /cannot be combined with (a )?(tool|function)/i.test(message) ||
    /json[\s_-]?(mode|schema|object|output)[^.]{0,60}(tool|function)/i.test(
      message,
    ) ||
    /(tool|function)[\s-]?call[^.]{0,60}json[\s_-]?(mode|schema)/i.test(
      message,
    ) ||
    /response_format[^.]{0,60}(tool|function)/i.test(message)
  );
}

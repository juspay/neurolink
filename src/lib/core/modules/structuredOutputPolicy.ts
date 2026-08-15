/**
 * Policy for when AI-SDK structured output (experimental_output) must be
 * disabled because the provider cannot combine tool calls with JSON-schema
 * enforcement.
 *
 * Two provider surfaces have this conflict:
 *   - Gemini (google-ai, or Vertex with a non-Claude model).
 *   - The native Anthropic Messages API surface (provider "anthropic"/"bedrock",
 *     including via a proxy/base-URL override). experimental_output silently
 *     drops tool_use blocks when tools are also present (finishReason=tool-calls
 *     but zero parsed tool calls), so structured output must be disabled there too.
 *
 * Vertex+Claude (provider "vertex", modelName starts with "claude-") uses a
 * different transport that supports both simultaneously and must NOT be excluded —
 * a gate keyed on "any Vertex model" wrongly disables it for the primary
 * production config and forces fragile hand-parsed JSON.
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
 * True when the provider is the native Anthropic Messages API surface
 * (provider "anthropic" — including via a proxy/base-URL override — or "bedrock").
 * experimental_output + tools silently drops tool_use blocks on this surface, so
 * structured output must be disabled when tools are active. Vertex+Claude is NOT
 * matched here (different transport, no conflict).
 *
 * Being excluded here no longer means the schema is LOST for provider
 * "anthropic": GenerationHandler forwards the JSON Schema to the provider via
 * `providerOptions.anthropic.finalResultSchema`, and the provider appends an
 * additive `final_result` tool (see providers/anthropic/structuredOutput.ts) —
 * schema enforcement without giving up tool calling. "bedrock" has no such
 * handling (it talks to the raw AWS SDK directly, not an ai-sdk provider
 * package) and still falls back to text-mode coercion.
 */
export function isNativeAnthropicProvider(providerName: string): boolean {
  return providerName === "anthropic" || providerName === "bedrock";
}

/**
 * True when structured output must be disabled for this call because tools are
 * active on a provider that cannot combine them (Gemini, or the native Anthropic
 * Messages API surface). Mirrors the AI-SDK constraint exactly.
 */
export function isToolsSchemaExclusionInForce(
  providerName: string,
  modelName: string | undefined,
  shouldUseTools: boolean,
  toolCount: number,
): boolean {
  return (
    (isGeminiProvider(providerName, modelName) ||
      isNativeAnthropicProvider(providerName)) &&
    shouldUseTools &&
    toolCount > 0
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

/**
 * True when a provider error indicates the request was rejected because the
 * JSON schema is too complex for the provider's constrained decoding. Vertex
 * Gemini enforces response schemas as a state machine and rejects
 * "complex" schemas (regex patterns, string min/max lengths, nested array
 * caps, long enums) with a deterministic 400 INVALID_ARGUMENT:
 *
 *   "The specified schema produces a constraint that has too many states
 *    for serving. Typical causes of this error are schemas with lots of
 *    text …, schemas with long array length limits …, or schemas using
 *    complex value matchers …"
 *
 * The error arrives wrapped (provider error formatter + upstream JSON
 * envelope), so match on the distinctive substring. Retrying with the same
 * schema can never succeed — the correct recovery is to drop native schema
 * enforcement and coerce the text response into the schema instead
 * (same flow as isToolsSchemaConflictError).
 */
export function isSchemaComplexityError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /too many states/i.test(message);
}

/**
 * True when a provider error indicates the request was rejected because the
 * `temperature` parameter is deprecated / unsupported for the model. The newest
 * Anthropic models (e.g. claude-opus-4-8, with tools + advanced beta features)
 * reject `temperature` — "`temperature` is deprecated for this model." — in
 * favour of reasoning-effort controls. Detect this so the call can be retried
 * once without `temperature` instead of failing the turn.
 */
export function isTemperatureDeprecatedError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /\btemperature\b[^.]{0,40}\b(deprecated|unsupported|not[\s_-]?(supported|allowed))\b/i.test(
    message,
  );
}

/**
 * True when the model is known to reject the `temperature` parameter (the
 * reasoning-effort Anthropic models — claude-opus-4-8 and newer — deprecate it
 * in favour of effort controls). Used to omit `temperature` proactively so the
 * request does not fail-then-retry on every turn: the reactive
 * isTemperatureDeprecatedError() retry remains the safety net for any model not
 * matched here, but a guaranteed-to-fail first request is pure wasted latency.
 *
 * Matches opus 4.8+ (4-8, 4-9, 4-10, …) while leaving 4.1/4.5/4.6 and Sonnet/
 * Haiku — which still accept `temperature` — untouched.
 */
export function modelDeprecatesTemperature(
  modelName: string | undefined,
): boolean {
  const m = (modelName ?? "").toLowerCase();
  return /opus[-_.]?4[-_.]?(?:[89]|\d{2,})\b/.test(m);
}

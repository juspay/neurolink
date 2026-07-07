/**
 * Extract a human-readable error string from an MCP isError result object.
 *
 * Shared utility — no side effects, no dependencies on other SDK modules —
 * so it can be imported from the neurolink.ts event loop, the telemetry
 * instrumentation (which loads earlier), and the MCP discovery layer without
 * creating circular imports. Any change to truncation or content-type parsing
 * must happen here and propagate to all three surfaces.
 */
export function extractMcpErrorText(raw: unknown): string {
  let resultObj: unknown;
  try {
    resultObj = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return "";
  }
  if (!resultObj || typeof resultObj !== "object") {
    return "";
  }
  const content = (resultObj as Record<string, unknown>).content;
  if (!Array.isArray(content)) {
    return "";
  }
  // Fail closed on malformed entries (e.g. `content: [null]`) rather than
  // throwing — the caller expects an empty string for unparseable input.
  const texts = content
    .filter(
      (c): c is { type: string; text: string } =>
        c !== null &&
        typeof c === "object" &&
        (c as { type?: unknown }).type === "text" &&
        typeof (c as { text?: unknown }).text === "string" &&
        (c as { text: string }).text.length > 0,
    )
    .map((c) => c.text);
  return texts.join(" ").substring(0, 500);
}

/**
 * MCP tools signal failure by RETURNING `{ isError: true, ... }`, not throwing,
 * so execute()'s try/catch never sees it. Returns a capped status message for
 * failures (undefined for success) for the caller to set the span error level.
 *
 * Generic over input shape: accepts either a result object or a JSON-stringified
 * envelope (different providers hand back different shapes), mirroring
 * `extractMcpErrorText`. A non-JSON string has no `isError` field, so it is
 * correctly treated as "not an error" (→ undefined).
 *
 * Layered on `extractMcpErrorText`: this adds the `isError === true` gate and
 * the human-readable "MCP tool returned isError: …" prefix, while the shared
 * helper owns the content parsing and the 500-char cap. When `isError` is set
 * but no readable text is present, falls back to a generic message.
 */
export function extractMcpToolErrorMessage(
  result: unknown,
): string | undefined {
  let resultObj: unknown = result;
  if (typeof resultObj === "string") {
    try {
      resultObj = JSON.parse(resultObj);
    } catch {
      return undefined;
    }
  }
  if (!resultObj || typeof resultObj !== "object") {
    return undefined;
  }
  if ((resultObj as { isError?: unknown }).isError !== true) {
    return undefined;
  }
  const text = extractMcpErrorText(resultObj);
  return text
    ? `MCP tool returned isError: ${text}`
    : "MCP tool returned isError: true";
}

/**
 * Detect a tool result that REPORTS failure without throwing, for the native
 * loops' consecutive-failure breaker. Covers the two shapes NeuroLink itself
 * produces or forwards:
 * - MCP CallToolResult with `isError: true` (e.g. proxy-blocked tools) —
 *   delegated to {@link extractMcpToolErrorMessage}
 * - our own `{ error: "..." }` payloads
 * Plain strings are never classified (too false-positive-prone).
 * Returns the error text, or null when the result looks like a success.
 */
export function extractToolFailureText(result: unknown): string | null {
  const mcpError = extractMcpToolErrorMessage(result);
  if (mcpError) {
    return mcpError;
  }
  if (
    result !== null &&
    typeof result === "object" &&
    typeof (result as { error?: unknown }).error === "string" &&
    (result as { error: string }).error.length > 0
  ) {
    return (result as { error: string }).error;
  }
  return null;
}

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

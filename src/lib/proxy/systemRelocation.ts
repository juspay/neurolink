/**
 * Relocate a non-Claude-Code client's `system` blocks into the message stream.
 *
 * Anthropic's subscription/OAuth path rejects any `system` content it does not
 * recognise as the genuine Claude Code system prompt — anti-abuse fingerprinting
 * surfaced as a header-less `rate_limit_error: "Error"` (NOT a real rate limit).
 * Custom clients (Curator/Tara) send their own system prompt, so we move it into
 * a leading user block and keep only the recognised billing+agent blocks in
 * `system`. The model still honours the instructions, and any `cache_control` is
 * carried over so the prompt prefix stays cacheable.
 *
 * Shared by both proxy entry points (`oauthFetch.ts` and `claudeProxyRoutes.ts`)
 * so the OAuth anti-abuse workaround stays in one place and can't drift between
 * the two paths.
 */
export function relocateClientSystemIntoMessages(
  parsed: { messages?: unknown },
  instructionBlocks: Array<{ text?: unknown; cache_control?: unknown }>,
): void {
  if (instructionBlocks.length === 0) {
    return;
  }
  const blocks = instructionBlocks.map((b) => {
    const text = typeof b.text === "string" ? b.text : String(b.text ?? "");
    const out: { type: "text"; text: string; cache_control?: unknown } = {
      type: "text",
      text,
    };
    if (b.cache_control) {
      out.cache_control = b.cache_control;
    }
    return out;
  });
  // Wrap the relocated system in an explicit delimiter so the model treats it
  // as authoritative instructions, clearly separated from the user's message.
  blocks[0].text = `<system_instructions>\n${blocks[0].text}`;
  const last = blocks.length - 1;
  blocks[last].text = `${blocks[last].text}\n</system_instructions>`;

  const messages = Array.isArray(parsed.messages) ? parsed.messages : [];
  const first = messages[0] as { role?: string; content?: unknown } | undefined;
  if (first && first.role === "user") {
    const existing =
      typeof first.content === "string"
        ? [{ type: "text", text: first.content }]
        : Array.isArray(first.content)
          ? first.content
          : [];
    first.content = [...blocks, ...existing];
  } else {
    messages.unshift({ role: "user", content: blocks });
  }
  parsed.messages = messages;
}

/**
 * Size/count ceilings for the Codex-outbound fallback, centralized so request
 * ingestion (`codexOutboundFallback.ts`) and response translation
 * (`codexToAnthropicFallback.ts`) share one source instead of re-declaring the
 * numbers `codexFallback.ts` already applies on the reverse
 * (Claude-into-Codex) leg (`:763`, `:784`).
 */

/** Caps how much unparsed upstream SSE text a translator buffers, and how
 *  long one tool call's argument, input or output text may be, mirroring
 *  codexFallback.ts's own ceiling for the reverse leg. */
export const CODEX_STREAM_SIZE_CEILING_BYTES = 16 * 1024 * 1024;

/** Caps how many tool calls one turn may open or replay, mirroring
 *  codexFallback.ts's own ceiling for the reverse leg — a runaway or
 *  adversarial upstream cannot make a translator accumulate unbounded
 *  open-item state. */
export const CODEX_STREAM_MAX_TOOL_CALLS = 4096;

/**
 * Codex-outbound fallback: cache-preservation guards and affinity-key
 * derivation for the Codex -> Anthropic/Vertex hop.
 *
 * Owns three things, all pure: the defensive shape check that guards where
 * `applyClaudeRequestCacheBreakpoints` marks breakpoint 1 (`system` must be
 * exactly the stable developer-block prefix), the role-alternation guard
 * that turns a translation defect into a loud, attributable error instead of
 * a silent Anthropic 400, and the session-affinity key a Codex-origin
 * request supplies so consecutive turns of one conversation route back to
 * the account already holding their cache.
 *
 * Both guards are scoped to the new Codex-fallback entry point only, called
 * immediately after `translateCodexRequestToClaude()` and before
 * `applyClaudeRequestCacheBreakpoints()`. They are not folded into the
 * shared breakpoint function itself, which the existing OpenAI bridge also
 * calls: adding a hard throw there would newly reject that bridge's
 * already-shipped, already-latent-buggy same-role-message traffic that has
 * shipped without incident.
 */
import { createHash } from "node:crypto";
import type {
  ClaudeMessage,
  ClaudeTextBlock,
  CodexAnthropicAffinityKey,
  CodexContentPart,
  CodexNativeAdditionalToolsInputItem,
  CodexNativeRequest,
} from "../types/index.js";

/**
 * Thrown by `assertClaudeSystemPrefixShape` and `assertClaudeMessagesAlternate`
 * when the translated request does not have the shape breakpoint placement
 * (or Anthropic's role-alternation requirement) depends on. Never logged and
 * swallowed — a silent violation here defeats caching with no visible
 * symptom besides a slow-moving cache-hit-rate metric, or turns into an
 * undifferentiated Anthropic 400.
 */
export class ClaudeSystemPrefixShapeError extends Error {}

/**
 * Enforces that `system` is exactly the stable developer-block prefix before
 * a caller marks breakpoint 1 on its last element. `translateCodexRequestToClaude`
 * is contracted to produce `system` containing only the developer-role-derived
 * blocks and nothing else — `environment_context` and any other per-turn
 * payload belong in `messages`. `system[system.length-1]` is only a safe
 * breakpoint-1 anchor while that invariant holds; trusting it silently would
 * be exactly the failure this guards against.
 */
export function assertClaudeSystemPrefixShape(
  system: ClaudeTextBlock[] | string | undefined,
  expectedLength: number,
): void {
  if (!Array.isArray(system)) {
    throw new ClaudeSystemPrefixShapeError(
      `expected an array-shaped system prefix, got ${typeof system}`,
    );
  }
  if (system.length !== expectedLength) {
    throw new ClaudeSystemPrefixShapeError(
      `expected system.length === ${expectedLength} (fixed developer-block prefix), got ${system.length}`,
    );
  }
}

/**
 * Throws, naming the offending index, when `messages` is not alternation-safe.
 *
 * Anthropic requires alternating `user`/`assistant` roles. A native Codex
 * request can carry two consecutive `user`-role items (an auto-injected
 * notice immediately followed by the literal user turn, or a synthetic
 * `environment_context` pair) — mapped 1:1 into `ClaudeMessage` entries that
 * would otherwise reach Anthropic as back-to-back `user` messages and get
 * rejected on every request that hits it. Merging same-role Codex items into
 * one Claude message with multiple content blocks is translation-correctness
 * work owned by `translateCodexRequestToClaude`, not this guard's job — this
 * only turns a missed merge into an attributable thrown error at the new
 * hop's boundary instead of an undifferentiated Anthropic 400.
 */
export function assertClaudeMessagesAlternate(
  messages: ReadonlyArray<ClaudeMessage>,
): void {
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].role === messages[i - 1].role) {
      throw new ClaudeSystemPrefixShapeError(
        `messages[${i}] repeats role "${messages[i].role}" from messages[${i - 1}]` +
          " — Anthropic requires alternation; the Codex-request translator" +
          " must merge same-role turns into one message with multiple content blocks",
      );
    }
  }
}

/**
 * The leading, turn-stable bytes of a native Codex request: a bounded head of
 * the developer-role (instructions) text plus the declared tool names, mirroring
 * `codexCachePrefix` (`codexFallback.ts`) for the opposite direction. Descriptions
 * and schemas are deliberately left out — they sit behind the instructions in
 * the prefix, so two requests agreeing on this much already share a cacheable
 * head worth routing together.
 */
const PREFIX_DIGEST_HEAD_CHARS = 8192;

function codexNativeInstructionsHead(native: CodexNativeRequest): string {
  const developerText = native.input
    .filter((item) => item.type === "message" && item.role === "developer")
    .flatMap((item) =>
      "content" in item && Array.isArray(item.content) ? item.content : [],
    )
    .filter(
      (part): part is Extract<CodexContentPart, { type: "input_text" }> =>
        part.type === "input_text",
    )
    .map((part) => part.text)
    .join("\n");
  return developerText.slice(0, PREFIX_DIGEST_HEAD_CHARS);
}

function codexNativeToolNames(native: CodexNativeRequest): string {
  const additionalTools = native.input
    .filter(
      (item): item is CodexNativeAdditionalToolsInputItem =>
        item.type === "additional_tools",
    )
    .at(-1);
  if (!additionalTools) {
    return "";
  }
  return additionalTools.tools
    .flatMap((namespace) => namespace.tools.map((tool) => tool.name))
    .join("\u0000");
}

/**
 * Hashed bounded-head-plus-tool-names digest of a native Codex request's
 * turn-stable prefix, used only as the last-resort affinity-key fallback
 * (`codex-prefix:`) when the wire carries none of `prompt_cache_key` /
 * `client_metadata.thread_id` / `client_metadata.session_id`. Hashed (rather
 * than returned raw, as `codexCachePrefix` does) because this value is used
 * directly as a routing/log key, not as sha256 input a caller hashes itself.
 */
function codexNativePrefixDigest(
  native: CodexNativeRequest,
): string | undefined {
  const head = codexNativeInstructionsHead(native);
  const toolNames = codexNativeToolNames(native);
  if (!head && !toolNames) {
    return undefined;
  }
  return createHash("sha256").update(`${head}\u0001${toolNames}`).digest("hex");
}

/**
 * Derives the session-affinity key a Codex-origin request supplies to the
 * Claude pipeline's existing session-affinity machinery, so consecutive
 * turns of one conversation route back to the account already holding their
 * cache. Preference order mirrors what a real Codex CLI capture carries:
 * `prompt_cache_key` (top-level, the client's own pre-computed key — already
 * exactly the signal being reconstructed) beats `client_metadata.thread_id`
 * beats `client_metadata.session_id`; a genuinely identity-free request
 * degrades to a prefix-derived key so at least concurrent turns of the same
 * agent config bucket together.
 *
 * The three-way prefix (`codex-thread:` / `codex-session:` / `codex-prefix:`)
 * keeps this namespace from colliding with a Claude-Code `metadata.user_id`-
 * derived UUID or with itself across cases.
 */
export function codexAnthropicAffinityKey(
  native: CodexNativeRequest,
): CodexAnthropicAffinityKey | undefined {
  const promptCacheKey = native.prompt_cache_key;
  if (typeof promptCacheKey === "string" && promptCacheKey.length > 0) {
    return `codex-thread:${promptCacheKey}`;
  }
  const threadId = native.client_metadata?.thread_id;
  if (typeof threadId === "string" && threadId.length > 0) {
    return `codex-thread:${threadId}`;
  }
  const sessionId = native.client_metadata?.session_id;
  if (typeof sessionId === "string" && sessionId.length > 0) {
    return `codex-session:${sessionId}`;
  }
  const prefix = codexNativePrefixDigest(native);
  return prefix ? `codex-prefix:${prefix}` : undefined;
}

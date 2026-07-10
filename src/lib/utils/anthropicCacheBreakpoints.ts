import type {
  VertexAnthropicCacheControl,
  VertexAnthropicCacheInput,
  VertexAnthropicCacheOutput,
  VertexAnthropicMessage,
  VertexAnthropicSystemBlock,
} from "../types/index.js";

/**
 * Anthropic prompt-cache breakpoint placement for the native Vertex+Claude
 * request path.
 *
 * Vertex does NOT support automatic prompt caching — the only way the
 * conversation prefix gets cached across turns is explicit `cache_control`
 * markers in the request. Anthropic renders a request as `tools → system →
 * messages` and caches the prefix up to each marker, with a hard ceiling of
 * four markers.
 *
 * Without a marker on the message history, the entire (growing, often
 * tool-result-heavy) conversation falls *after* the last breakpoint and is
 * re-billed at full input price on every turn. That is the regression this
 * fixes: it gives the history a rolling breakpoint so the stable prefix is
 * cached at ~0.1x and only the newest turn is fresh.
 */

const EPHEMERAL: VertexAnthropicCacheControl = { type: "ephemeral" };

/** Anthropic allows at most four `cache_control` breakpoints per request. */
export const ANTHROPIC_MAX_CACHE_BREAKPOINTS = 4;
const MAX_BREAKPOINTS = ANTHROPIC_MAX_CACHE_BREAKPOINTS;

/**
 * Annotate a native Vertex+Claude request with prompt-cache breakpoints.
 *
 * Budget allocation (max 4 markers):
 *   1. The stable prefix — the last system block when a system prompt is
 *      present (this single marker caches `tools + system`, since system
 *      renders after tools); otherwise the last tool definition.
 *   2-4. A rolling breakpoint on the last few messages, so the
 *      growing-but-now-stable conversation history is cached and only the
 *      newest turn is billed as fresh input.
 *
 * Pure: the inputs are cloned, never mutated.
 */
export function applyVertexAnthropicCacheBreakpoints(
  input: VertexAnthropicCacheInput,
): VertexAnthropicCacheOutput {
  let budget = MAX_BREAKPOINTS;

  // 1. Stable prefix. A bare string `system` cannot carry cache_control, so
  // convert it to block form. Marking the last system block caches the whole
  // tools + system prefix; only fall back to marking the last tool when there
  // is no system prompt to mark.
  let system: string | VertexAnthropicSystemBlock[] | undefined = input.system;
  let tools = input.tools;
  const hasSystem = !!input.system && input.system.trim().length > 0;

  if (hasSystem) {
    system = [
      { type: "text", text: input.system as string, cache_control: EPHEMERAL },
    ];
    budget--;
  } else if (input.tools && input.tools.length > 0) {
    const lastIndex = input.tools.length - 1;
    tools = input.tools.map((tool, i) =>
      i === lastIndex ? { ...tool, cache_control: EPHEMERAL } : tool,
    );
    budget--;
  }

  // 2. Rolling history breakpoints over the tail of the conversation.
  const messages = input.messages.map((m) => ({ ...m }));
  let remaining = Math.min(
    budget,
    input.maxHistoryBreakpoints ?? MAX_BREAKPOINTS,
  );
  for (let i = messages.length - 1; i >= 0 && remaining > 0; i--) {
    if (markLastContentBlock(messages, i)) {
      remaining--;
    }
  }

  return { system, tools, messages };
}

/**
 * Count the `cache_control` markers already present on a request. The direct
 * Anthropic path (AI-SDK pipeline) arrives with markers the upstream layers
 * placed — MessageBuilder tags the system prompt, GenerationHandler tags the
 * last tool definition, and message content blocks may carry translated
 * AI-SDK markers. Anthropic rejects requests with more than four markers, so
 * any additional history breakpoints must fit in the remaining budget.
 */
export function countAnthropicCacheMarkers(input: {
  system?: string | ReadonlyArray<{ cache_control?: unknown }> | undefined;
  tools?: ReadonlyArray<{ cache_control?: unknown }> | undefined;
  messages: ReadonlyArray<VertexAnthropicMessage>;
}): number {
  let count = 0;
  if (Array.isArray(input.system)) {
    count += input.system.filter((b) => b.cache_control).length;
  }
  if (input.tools) {
    count += input.tools.filter((t) => t.cache_control).length;
  }
  for (const message of input.messages) {
    if (Array.isArray(message.content)) {
      count += message.content.filter(
        (b) => (b as { cache_control?: unknown }).cache_control,
      ).length;
    }
  }
  return count;
}

/**
 * Rolling history breakpoints for request paths whose stable-prefix markers
 * are managed upstream (direct Anthropic: system via MessageBuilder, last
 * tool via GenerationHandler). Marks the last content block of up to `budget`
 * tail messages; a tail block that already carries a marker is left as-is
 * without consuming budget (it already serves as that breakpoint). Pure —
 * the input array is cloned, never mutated.
 */
export function applyAnthropicHistoryCacheBreakpoints(
  input: ReadonlyArray<VertexAnthropicMessage>,
  budget: number,
): VertexAnthropicMessage[] {
  const messages = input.map((m) => ({ ...m }));
  let remaining = Math.max(0, Math.min(budget, MAX_BREAKPOINTS));
  for (let i = messages.length - 1; i >= 0 && remaining > 0; i--) {
    if (lastContentBlockHasMarker(messages[i])) {
      continue;
    }
    if (markLastContentBlock(messages, i)) {
      remaining--;
    }
  }
  return messages;
}

/** True when the last content block of a message already carries `cache_control`. */
function lastContentBlockHasMarker(message: VertexAnthropicMessage): boolean {
  if (!Array.isArray(message.content) || message.content.length === 0) {
    return false;
  }
  const last = message.content[message.content.length - 1] as {
    cache_control?: unknown;
  };
  return !!last.cache_control;
}

/**
 * Place a cache breakpoint on the last content block of `messages[i]`.
 * Anthropic attaches `cache_control` to a content block, not the message
 * envelope, so a string content body is first converted to block form.
 * Returns false when the message has no markable block (caller then walks to
 * an earlier message), so an empty turn never silently consumes a breakpoint.
 */
function markLastContentBlock(
  messages: VertexAnthropicMessage[],
  i: number,
): boolean {
  const message = messages[i];

  if (typeof message.content === "string") {
    if (message.content.length === 0) {
      return false;
    }
    messages[i] = {
      ...message,
      content: [
        { type: "text", text: message.content, cache_control: EPHEMERAL },
      ],
    };
    return true;
  }

  if (!Array.isArray(message.content) || message.content.length === 0) {
    return false;
  }

  // Shallow clone is sufficient: we only ever add a top-level `cache_control`
  // field to the last block and never mutate nested members (e.g. an image's
  // `source`). Those nested objects stay shared with the input by reference,
  // which is safe because they are never written to. If a future block shape
  // requires mutating nested members, deep-clone that block instead.
  const content = message.content.map((block) => ({ ...block }));
  const lastIndex = content.length - 1;
  content[lastIndex] = { ...content[lastIndex], cache_control: EPHEMERAL };
  messages[i] = { ...message, content };
  return true;
}

/**
 * Wire-neutral intermediate representation for proxy protocol translation.
 *
 * Translation between provider wire formats was previously pairwise and ad hoc:
 * `codexFallback.ts` converts an Anthropic request into a Codex one and casts a
 * role to reach Claude Code's inline-system convention inside a converter that is
 * meant to be neutral. Adding the reverse direction pairwise would double that,
 * and a third provider would square it.
 *
 * So each format gets a codec to and from this IR, and adding a provider is a new
 * codec rather than new branching. The IR is deliberately not `ClaudeRequest`:
 * that type is simultaneously the literal Anthropic wire shape, so using it as
 * the hub makes every other provider's quirks leak into the Anthropic hot path.
 * `ClaudeRequest` and `ClaudeResponse` stay untouched.
 *
 * Every union here is discriminated on a literal `kind`, `status` or `source`, so
 * `assertProxyIRExhaustive` turns an unhandled variant into a compile error. That
 * is the point of the IR: a field that cannot be represented must be stated, via
 * `ProxyIRUnmappedPart`, rather than dropped silently.
 */

import type { CodexReasoningEffort } from "./codex.js";
import type { UsageContext } from "./proxy.js";

/**
 * A wire dialect a codec can speak.
 *
 * Distinct from `ProxyFormat` ("claude" | "openai" | "gemini"), which selects a
 * request-translation surface for a different subsystem. These must not be
 * conflated: this one names the two dialects the fallback codecs translate.
 */
export type ProxyIRWireFormat = "anthropic-messages" | "codex-responses";

/**
 * Message roles across both dialects.
 *
 * `developer` has no Anthropic equivalent and is native Codex's own role for
 * instruction blocks that sit inside the ordered input array rather than in a
 * leading system field. It is kept distinct from `system` so a codec targeting
 * Anthropic can decide where it belongs instead of inheriting a lossy merge.
 */
export type ProxyIRRole = "system" | "developer" | "user" | "assistant";

/**
 * A request to cache the prefix up to and including the annotated element.
 *
 * Only meaningful for Anthropic, whose caching is explicit and breakpoint-driven.
 * A codec targeting a dialect with automatic caching ignores it, which is correct
 * rather than lossy: nothing on that wire can carry it.
 */
export type ProxyIRCacheHint = { ttl?: "5m" | "1h" };

export type ProxyIRTextPart = {
  kind: "text";
  text: string;
  cacheHint?: ProxyIRCacheHint;
};

/** `signature` is reserved for Anthropic's signed thinking blocks and unused today. */
export type ProxyIRThinkingPart = {
  kind: "thinking";
  text: string;
  signature?: string;
};

export type ProxyIRImagePart = {
  kind: "image";
  encoding: "base64" | "url";
  mediaType?: string;
  data: string;
};

/**
 * A model-emitted call to a tool.
 *
 * `argumentsRaw` is authoritative and always present; `argumentsJson` is a
 * convenience for the common case where the raw text parses. Keeping the raw text
 * means a call whose arguments are streamed in fragments, or are not valid JSON,
 * survives translation instead of being normalised into something the next hop
 * never sent.
 */
export type ProxyIRToolCallPart = {
  kind: "tool_call";
  callId: string;
  toolName: string;
  argumentsRaw: string;
  argumentsJson?: Record<string, unknown>;
};

export type ProxyIRToolResultPart = {
  kind: "tool_result";
  callId: string;
  content: (ProxyIRTextPart | ProxyIRImagePart)[];
  isError?: boolean;
  cacheHint?: ProxyIRCacheHint;
};

/**
 * A wire element no codec could represent, carried forward verbatim.
 *
 * The alternative is dropping it, which is how a translation layer loses tool
 * calls: silently, and only visibly as a downstream rejection. `raw` keeps the
 * original so a renderer can pass it through or a test can assert on it, and
 * `reason` records why it could not be mapped.
 */
export type ProxyIRUnmappedPart = {
  kind: "unmapped";
  sourceKind: string;
  reason: string;
  raw: unknown;
};

export type ProxyIRContentPart =
  | ProxyIRTextPart
  | ProxyIRThinkingPart
  | ProxyIRImagePart
  | ProxyIRToolCallPart
  | ProxyIRToolResultPart
  | ProxyIRUnmappedPart;

/**
 * One message, with system and developer messages kept in sequence.
 *
 * There is no separate bucket for leading instructions: native Codex sends
 * instruction blocks as ordered `developer` items inside the input array, and
 * lifting them out would lose their position relative to the conversation. A
 * codec that needs a leading system field extracts it; the IR does not presume
 * one exists.
 */
export type ProxyIRMessage = {
  role: ProxyIRRole;
  content: ProxyIRContentPart[];
};

export type ProxyIRFunctionToolDeclaration = {
  kind: "function";
  name: string;
  description?: string;
  parametersSchema: Record<string, unknown>;
  cacheHint?: ProxyIRCacheHint;
};

/** A tool constrained by a grammar rather than a JSON schema; Codex-only today. */
export type ProxyIRCustomGrammarToolDeclaration = {
  kind: "custom_grammar";
  name: string;
  description?: string;
  grammar: string;
};

export type ProxyIRToolDeclaration =
  | ProxyIRFunctionToolDeclaration
  | ProxyIRCustomGrammarToolDeclaration;

export type ProxyIRToolChoice =
  | { kind: "auto" }
  | { kind: "none" }
  | { kind: "any" }
  | { kind: "named"; toolName: string };

/**
 * Reasoning configuration, tagged by the dialect that expressed it.
 *
 * Anthropic budgets thinking in tokens; Codex selects a named effort level. There
 * is no faithful numeric mapping between them, so the source is recorded and each
 * codec decides how to honour the other's form rather than a lossy conversion
 * happening once, invisibly, in the middle.
 */
export type ProxyIRReasoning =
  | { source: "none" }
  | { source: "anthropic_thinking"; type: string; budgetTokens?: number }
  | { source: "codex_effort"; effort: CodexReasoningEffort };

export type ProxyIRRequest = {
  sourceFormat: ProxyIRWireFormat;
  sourceModel: string;
  originSessionId?: string;
  originThreadId?: string;
  messages: ProxyIRMessage[];
  tools: ProxyIRToolDeclaration[];
  toolChoice?: ProxyIRToolChoice;
  reasoning: ProxyIRReasoning;
  stream: boolean;
  /** Prefix-derived routing hint. Never serialized onto any wire. */
  promptCachePrefixKey?: string;
};

export type ProxyIRRequestTargetOptions = {
  model: string;
  reasoningEffort?: CodexReasoningEffort;
};

export type ProxyIRProviderError = {
  code: string;
  httpStatus?: number;
  retryable?: boolean;
  message?: string;
};

/**
 * How a response ended.
 *
 * `finishReason: "other"` carries `rawFinishReason` because Anthropic's
 * `stop_reason` is typed `string | null` on the wire, deliberately open. A closed
 * union here would make any legitimate but unmodelled stop reason an
 * exhaustiveness throw at runtime, turning a successful upstream response into a
 * proxy failure.
 */
export type ProxyIRTerminalOutcome =
  | {
      status: "completed";
      finishReason: "end_turn" | "tool_use" | "max_tokens" | "stop_sequence";
    }
  | { status: "completed"; finishReason: "other"; rawFinishReason: string }
  | { status: "failed"; error: ProxyIRProviderError }
  | { status: "incomplete"; reason: string };

export type ProxyIRResponseEvent =
  | { kind: "text_delta"; text: string }
  | { kind: "thinking_delta"; text: string }
  | { kind: "tool_call_start"; callId: string; toolName: string }
  | {
      kind: "tool_call_arguments_delta";
      callId: string;
      partialArguments: string;
    }
  | { kind: "tool_call_done"; callId: string }
  | { kind: "item_done" }
  | { kind: "usage"; usage: UsageContext }
  | { kind: "terminal"; outcome: ProxyIRTerminalOutcome };

export type ProxyIROutputItem =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | {
      kind: "tool_call";
      callId: string;
      toolName: string;
      argumentsRaw: string;
      argumentsJson?: Record<string, unknown>;
    };

export type ProxyIRResponse = {
  items: ProxyIROutputItem[];
  usage?: UsageContext;
  outcome: ProxyIRTerminalOutcome;
};

/**
 * Codec capabilities, kept separate rather than bundled into one interface.
 *
 * No dialect needs all four in every direction: for outbound Codex fallback, the
 * Codex side is only ever parsed from and rendered to, never dispatched to, so a
 * single monolithic codec type would force stub implementations whose only
 * possible body is a throw.
 */
export type ProxyIRRequestParser<TWireRequest> = {
  format: ProxyIRWireFormat;
  parseRequest(wire: TWireRequest): ProxyIRRequest;
};

export type ProxyIRRequestBuilder<TWireRequest> = {
  format: ProxyIRWireFormat;
  buildRequest(
    ir: ProxyIRRequest,
    target: ProxyIRRequestTargetOptions,
  ): TWireRequest;
};

export type ProxyIRResponseParser = {
  format: ProxyIRWireFormat;
  parseBufferedResponse(wireText: string): ProxyIRResponse;
  parseResponseStream(
    upstream: Response,
  ): AsyncGenerator<ProxyIRResponseEvent, ProxyIRResponse>;
};

export type ProxyIRResponseRenderer = {
  format: ProxyIRWireFormat;
  renderResponseEvent(event: ProxyIRResponseEvent): string[];
  renderTerminalOutcome(
    outcome: ProxyIRTerminalOutcome,
    usage?: UsageContext,
  ): string[];
};

/** Marks a value a codec refused to map, for callers that collect rather than throw. */
export type ProxyIRUnmappableValue = {
  proxyIRUnmappable: true;
  sourceKind: string;
  reason: string;
  raw: unknown;
};

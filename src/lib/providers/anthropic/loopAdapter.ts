/**
 * Direct Anthropic's adapter onto the shared agentic loop engine.
 *
 * Everything here is the wire-format half of the turn: building one Messages
 * request, folding an SSE event sequence into content blocks, serializing tool
 * results back into the conversation, and mapping the stop reason. The turn
 * loop, the step cap, tool dispatch, retry and usage accumulation belong to
 * `runAgenticLoop`.
 *
 * Two behaviours here are easy to lose in a migration and are called out
 * because losing either is silent:
 *
 *  - Thinking deltas ride the channel as `{ content: "", reasoning }`. The
 *    engine's chunk type carries `reasoning` for exactly this reason; a
 *    channel that only understood `content` would drop every thinking delta
 *    while the text path kept working.
 *  - `resolveToolOnMiss` is wired to real deferred-catalog hydration, not as
 *    interface decoration. The pre-migration loop resolves every tool call as
 *    `toolsRecord[name] ?? resolveDeferredTool(toolsRecord, name)`, which is
 *    how a cataloged tool the model calls without having loaded it via
 *    `search_tools` gets found. Dropping it would break those tools with a
 *    "Tool not found" that looks like a hallucination.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type {
  AgenticLoopAdapter,
  AgenticLoopChunk,
  AgenticLoopStepRequest,
  AgenticLoopStepResult,
  AgenticLoopToolCallResult,
  AnthropicLoopAdapterConfig,
  AnthropicPendingToolUse,
} from "../../types/index.js";
import { resolveDeferredTool } from "../../tools/toolDiscovery.js";
import { stringifyAnthropicToolOutput } from "./toolOutput.js";
import { stringifyFinalResultInput } from "./structuredOutput.js";
import {
  composeAbortSignalsScoped,
  createTimeoutController,
} from "../../utils/timeout.js";
import { NeuroLinkError } from "../../utils/errorHandling.js";
import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";

/** Map Anthropic's stop_reason onto the unified finish reason. */
function mapAnthropicFinishReason(
  rawStopReason: string | undefined,
  hadToolCallsAtCap: boolean,
): string {
  switch (rawStopReason) {
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool-calls";
    case "refusal":
      return "content-filter";
    default:
      return hadToolCallsAtCap ? "tool-calls" : "stop";
  }
}

/**
 * Read one streamed Anthropic step off the wire.
 *
 * Module-level rather than nested inside `executeStep` because it IS the step:
 * folding an SSE event sequence into content blocks, usage and a stop reason.
 * `executeStep` above it is now only the per-request deadline wiring, which is
 * the part a reader looking for "what bounds this request" needs to find.
 */
async function readAnthropicStep({
  params,
  client,
  channel,
  stepSignal,
  requestTimeoutSignal,
  noteObservedPromptTokens,
  finalResultToolName,
  onTerminalResult,
  requireTerminalEvent,
}: {
  params: Anthropic.Messages.MessageCreateParams;
  client: AnthropicLoopAdapterConfig["client"];
  channel: { push(chunk: AgenticLoopChunk): void };
  /** The engine's signal composed with this step's own deadline. */
  stepSignal: AbortSignal;
  /**
   * This step's deadline alone. Separate from `stepSignal` because "the turn
   * was cancelled" and "this request ran out of time" are different outcomes
   * and only the second one is an error.
   */
  requestTimeoutSignal: AbortSignal | undefined;
  noteObservedPromptTokens?: (tokens: number) => void;
  finalResultToolName?: string;
  onTerminalResult?: (text: string) => void;
  requireTerminalEvent?: boolean;
}): Promise<AgenticLoopStepResult<Anthropic.Messages.ContentBlockParam[]>> {
  // Single assertion, not a double: `messages.create` returns a union of
  // Message and Stream, and Stream<RawMessageStreamEvent> already IS an
  // AsyncIterable of that event, so the two types overlap and the
  // compiler still checks the narrowing.
  const events = (await client.messages.create(
    { ...params, stream: true },
    // The engine's signal composed with this step's own deadline.
    // runAgenticLoop already derives the engine signal from the caller's
    // abortSignal, so preferring config's would ignore engine-initiated
    // cancellation entirely.
    { signal: stepSignal },
  )) as AsyncIterable<Anthropic.Messages.RawMessageStreamEvent>;

  const textByIndex = new Map<number, string>();
  const toolByIndex = new Map<number, AnthropicPendingToolUse>();
  const thinkingByIndex = new Map<
    number,
    { text: string; signature: string }
  >();
  const redactedByIndex = new Map<number, string>();
  let text = "";
  let reasoning = "";
  let rawStopReason: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  // Reported alongside the total, not derivable from it: the two TTL
  // tiers are priced differently, so a caller that reports them (the
  // Claude-on-Vertex turn span does) cannot reconstruct the split from
  // cacheWriteTokens alone.
  let cacheWrite5mTokens = 0;
  let cacheWrite1hTokens = 0;
  let stepOutputTokens = 0;
  // Thinking tokens are a SUBSET of output_tokens (Anthropic bills them as
  // part of the same total), so this is tracked separately for
  // observability and never added into outputTokens above.
  let reasoningTokens = 0;
  let stepReasoningTokens = 0;
  // Anthropic closes every complete message with `message_stop`. Its
  // absence is the only signal that the response ended early, because the
  // content blocks that DID arrive are syntactically complete.
  let sawTerminalEvent = false;

  for await (const rawEvent of events) {
    if (stepSignal.aborted) {
      break;
    }
    // Narrowed through the SDK's own discriminated union rather than
    // re-declared: `RawMessageStreamEvent` already describes every event
    // shape, so `event.type` checks below are compiler-checked instead of
    // asserted.
    const event = rawEvent;

    if (event.type === "message_start") {
      const usage = event.message?.usage;
      inputTokens += usage?.input_tokens ?? 0;
      const startOutput = usage?.output_tokens ?? 0;
      outputTokens += startOutput - stepOutputTokens;
      stepOutputTokens = startOutput;
      const startReasoning = usage?.output_tokens_details?.thinking_tokens ?? 0;
      reasoningTokens += startReasoning - stepReasoningTokens;
      stepReasoningTokens = startReasoning;
      // Anthropic reports cache reads/writes separately from input_tokens
      // on this same event; without these the stream drops all cache
      // accounting.
      cacheReadTokens += usage?.cache_read_input_tokens ?? 0;
      cacheWriteTokens += usage?.cache_creation_input_tokens ?? 0;
      // BEST EFFORT, and the limit is worth stating. The nested TTL
      // breakdown exists only on `Usage` (this event); `MessageDeltaUsage`
      // carries the cache TOTALS but not the split, so message_start is
      // the only place in the raw event stream it can come from. The
      // pre-migration loop read it off `stream.finalMessage()` — the SDK's
      // ACCUMULATED message — so if the API leaves `cache_creation` null
      // here and fills it only on the assembled message, these two stay
      // zero and the totals above remain correct regardless.
      // Reported as undefined rather than a false zero when absent.
      cacheWrite5mTokens +=
        usage?.cache_creation?.ephemeral_5m_input_tokens ?? 0;
      cacheWrite1hTokens +=
        usage?.cache_creation?.ephemeral_1h_input_tokens ?? 0;
      // The guard calibrates from the FULL prompt size, not input_tokens
      // alone: on a cache hit the uncached remainder is tiny and using it
      // would let the guard drift far under the real cost.
      noteObservedPromptTokens?.(
        (usage?.input_tokens ?? 0) +
          (usage?.cache_read_input_tokens ?? 0) +
          (usage?.cache_creation_input_tokens ?? 0),
      );
      continue;
    }

    if (event.type === "content_block_start") {
      const index = event.index ?? 0;
      // A redacted_thinking block carries its whole payload here and
      // produces no deltas, so if it is not captured on this event it is
      // never seen again. Anthropic validates the thinking chain when
      // extended thinking continues across a tool-use turn, so a missing
      // one fails the NEXT request — and only for accounts where safety
      // redaction actually triggers, which is why it survives testing.
      if (event.content_block?.type === "redacted_thinking") {
        const data = (event.content_block as { data?: unknown }).data;
        if (typeof data === "string") {
          redactedByIndex.set(index, data);
        }
      }
      if (event.content_block?.type === "tool_use") {
        toolByIndex.set(index, {
          id: event.content_block.id ?? "",
          name: event.content_block.name ?? "",
          inputJson: "",
        });
      }
      continue;
    }

    if (event.type === "content_block_delta") {
      const index = event.index ?? 0;
      const delta = event.delta;
      if (delta?.type === "text_delta" && delta.text) {
        text += delta.text;
        textByIndex.set(index, (textByIndex.get(index) ?? "") + delta.text);
        channel.push({ content: delta.text });
      } else if (delta?.type === "thinking_delta" && delta.thinking) {
        const acc = thinkingByIndex.get(index) ?? {
          text: "",
          signature: "",
        };
        acc.text += delta.thinking;
        thinkingByIndex.set(index, acc);
        reasoning += delta.thinking;
        // Reasoning rides its own field; `content` stays a present string
        // so plain-text consumers are unaffected.
        channel.push({ content: "", reasoning: delta.thinking });
      } else if (delta?.type === "signature_delta" && delta.signature) {
        const acc = thinkingByIndex.get(index) ?? {
          text: "",
          signature: "",
        };
        acc.signature += delta.signature;
        thinkingByIndex.set(index, acc);
      } else if (delta?.type === "input_json_delta" && delta.partial_json) {
        const pending = toolByIndex.get(index);
        if (pending) {
          pending.inputJson += delta.partial_json;
        }
      }
      continue;
    }

    if (event.type === "message_delta") {
      rawStopReason = event.delta?.stop_reason ?? rawStopReason;
      const cumulative = event.usage?.output_tokens ?? stepOutputTokens;
      outputTokens += cumulative - stepOutputTokens;
      stepOutputTokens = cumulative;
      const cumulativeReasoning =
        event.usage?.output_tokens_details?.thinking_tokens ??
        stepReasoningTokens;
      reasoningTokens += cumulativeReasoning - stepReasoningTokens;
      stepReasoningTokens = cumulativeReasoning;
      continue;
    }

    if (event.type === "message_stop") {
      sawTerminalEvent = true;
    }
  }

  // Ordered ahead of the terminal-event check because a deadline that
  // fired IS why the terminal event is missing, and the timer's identity
  // is the more useful of the two answers. The SDK's stream iterator exits
  // without throwing on an aborted read, so nothing else would report it:
  // the step would return the partial content as though the model had
  // simply said less.
  if (requestTimeoutSignal?.aborted) {
    throw requestTimeoutSignal.reason;
  }

  // A response that ended before its terminal event is not a turn. Its
  // tool_use blocks parse perfectly, so returning them here would dispatch
  // tools the model never finished asking for, and the turn would go on to
  // report itself as a normal stop. Not retriable: the request was already
  // answered, and re-sending it would double any side effect the truncated
  // half already caused upstream.
  if (requireTerminalEvent && !sawTerminalEvent && !stepSignal.aborted) {
    throw new NeuroLinkError({
      code: "ANTHROPIC_STREAM_TRUNCATED",
      message:
        "Anthropic stream ended before its terminal message_stop event; the turn is incomplete and its content blocks were not dispatched.",
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider: "anthropic", rawStopReason },
    });
  }

  // JSON.parse happily yields null, an array or a primitive, and an
  // assertion converts none of them. Both `tool_use.input` and
  // AgenticLoopToolCall.args require an object, so anything else becomes
  // {} rather than being passed through as invalid wire content.
  const parseArgs = (json: string): Record<string, unknown> => {
    if (!json) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(json);
      return typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };

  // Rebuild the assistant turn in wire order so it can be replayed as the
  // assistant message on the next step. Text that arrived before a tool
  // call has to survive here, or the model stops seeing its own reasoning
  // mid-turn.
  const blocks: Anthropic.Messages.ContentBlockParam[] = [];
  const indices = new Set<number>([
    ...textByIndex.keys(),
    ...toolByIndex.keys(),
    ...thinkingByIndex.keys(),
    ...redactedByIndex.keys(),
  ]);
  for (const index of [...indices].sort((a, b) => a - b)) {
    // Thinking blocks are replayed with their signature. Anthropic
    // validates that signature when extended thinking continues across
    // turns, so dropping the block — or keeping the text without the
    // signature — breaks the next step of a thinking turn.
    const redacted = redactedByIndex.get(index);
    if (redacted) {
      blocks.push({ type: "redacted_thinking", data: redacted });
    }
    const thinking = thinkingByIndex.get(index);
    // Both halves required: Anthropic's thinking block carries a
    // mandatory signature, and replaying one with an empty string is
    // rejected outright. A thinking block that never received a
    // signature_delta is dropped rather than sent unsigned.
    if (thinking?.text && thinking.signature) {
      blocks.push({
        type: "thinking",
        thinking: thinking.text,
        signature: thinking.signature,
      });
    }
    const blockText = textByIndex.get(index);
    if (blockText) {
      blocks.push({
        type: "text",
        text: blockText,
      });
    }
    const pending = toolByIndex.get(index);
    if (pending) {
      blocks.push({
        type: "tool_use",
        id: pending.id,
        name: pending.name,
        input: parseArgs(pending.inputJson),
      });
    }
  }

  const allCalls = [...toolByIndex.values()].map((pending) => ({
    id: pending.id,
    name: pending.name,
    args: parseArgs(pending.inputJson),
  }));

  // A terminal structured-output call ends the turn: its arguments are the
  // answer. Reporting it as text and leaving it out of `toolCalls` is what
  // routes it through the engine's ordinary zero-tool-calls exit, so it is
  // never dispatched, never counted against the breaker, and never shows
  // up as a tool execution.
  const terminal = finalResultToolName
    ? [...toolByIndex.values()].find(
        (pending) => pending.name === finalResultToolName,
      )
    : undefined;
  const toolCalls = terminal ? [] : allCalls;
  // The RAW accumulated input_json, never the parsed-then-restringified
  // args. `parseArgs` yields {} for a payload the token cap cut off
  // mid-string, so re-stringifying would turn a truncated answer into
  // "{}" and lose it outright. `stringifyFinalResultInput` canonicalizes
  // when the JSON parses and returns it verbatim when it does not, which
  // is what lets the caller's coercion layer repair a partial payload
  // into a partial object instead of nothing.
  const finalText = terminal
    ? stringifyFinalResultInput(terminal.inputJson)
    : text;
  if (terminal) {
    onTerminalResult?.(finalText);
  }

  return {
    text: finalText,
    ...(reasoning ? { reasoning } : {}),
    toolCalls,
    usage: {
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      // Omitted entirely when the stream never reported a split, so a
      // consumer can tell "no TTL breakdown available" from "zero tokens
      // in that tier".
      ...(cacheWrite5mTokens ? { cacheWrite5mTokens } : {}),
      ...(cacheWrite1hTokens ? { cacheWrite1hTokens } : {}),
      ...(reasoningTokens ? { reasoningTokens } : {}),
    },
    rawStopReason,
    raw: blocks,
  };
}

export function createAnthropicLoopAdapter<
  TMessage = Anthropic.Messages.MessageParam,
>(
  config: AnthropicLoopAdapterConfig<TMessage>,
): AgenticLoopAdapter<TMessage[], Anthropic.Messages.ContentBlockParam[]> {
  return {
    providerLabel: "anthropic",
    maxSteps: config.maxSteps,
    ...(config.toolFailureBreaker
      ? { toolFailureBreaker: config.toolFailureBreaker }
      : {}),

    /**
     * The engine decides WHEN to reclaim; the provider decides HOW, in its own
     * concrete message types. Not optional dressing: this loop appends an
     * assistant tool_use message and a user tool_result message every step,
     * and nothing else bounds that growth.
     */
    ...(config.planReclaim
      ? {
          // Passed straight through, INCLUDING `{ stop: true }`. Wrapping the
          // return as `{ conversation }` swallowed the stop signal, so a guard
          // that could not reclaim enough room had no way to end the turn and
          // the loop kept sending oversized requests until the provider
          // rejected one.
          planReclaim: (conversation: TMessage[], step: number) =>
            config.planReclaim?.(conversation, step),
        }
      : {}),

    resolveToolOnMiss: (name: string) => {
      const hydrated = resolveDeferredTool(config.toolsRecord, name);
      const execute = hydrated?.execute;
      if (!execute) {
        return undefined;
      }
      // Wrapped rather than handed over directly: the engine's hook types
      // `opts` as `unknown`, and a function declaring a narrower options type
      // is not assignable to one accepting `unknown`. One assertion at the
      // boundary, never a double assertion through `unknown`.
      return {
        execute: async (args: Record<string, unknown>, opts: unknown) =>
          execute(args, opts as Parameters<typeof execute>[1]),
      };
    },

    buildStepRequest(
      conversation: TMessage[],
      step: number,
    ): AgenticLoopStepRequest {
      return { raw: config.buildParams(conversation, step) };
    },

    async executeStep(
      request: AgenticLoopStepRequest,
      channel: { push(chunk: AgenticLoopChunk): void },
      signal: AbortSignal,
    ): Promise<AgenticLoopStepResult<Anthropic.Messages.ContentBlockParam[]>> {
      const params = request.raw as Anthropic.Messages.MessageCreateParams;
      // Per-REQUEST deadline, armed fresh for this step and disposed the moment
      // it settles. Being armed per step is what makes it unresettable from a
      // step boundary: the boundary runs between two steps, when no request
      // deadline is running at all.
      //
      // Scoped composition rather than AbortSignal.any: the engine signal lives
      // for the whole turn, and `any` keeps its registration on that signal
      // until the derived one is collected, so composing per step accumulates
      // listeners for the turn's whole length.
      const requestTimeout = config.requestTimeoutMs
        ? createTimeoutController(
            config.requestTimeoutMs,
            "anthropic",
            "stream",
          )
        : null;
      const composed = composeAbortSignalsScoped(
        signal,
        requestTimeout?.controller.signal,
      );
      try {
        return await readAnthropicStep({
          params,
          client: config.client,
          channel,
          // The engine's signal, not config's: runAgenticLoop already derives
          // it from the caller's abortSignal, so preferring config's would
          // ignore engine-initiated cancellation entirely.
          stepSignal: composed.signal ?? signal,
          requestTimeoutSignal: requestTimeout?.controller.signal,
          ...(config.noteObservedPromptTokens
            ? { noteObservedPromptTokens: config.noteObservedPromptTokens }
            : {}),
          ...(config.finalResultToolName
            ? { finalResultToolName: config.finalResultToolName }
            : {}),
          ...(config.onTerminalResult
            ? { onTerminalResult: config.onTerminalResult }
            : {}),
          ...(config.requireTerminalEvent
            ? { requireTerminalEvent: config.requireTerminalEvent }
            : {}),
        });
      } finally {
        composed.dispose();
        requestTimeout?.cleanup();
      }
    },

    appendPlanningNudge(conversation: TMessage[], text: string): TMessage[] {
      // Merged into the trailing user turn when there is one. The step boundary
      // runs immediately after `buildToolResultMessages`, so history ends on a
      // user tool_result message; opening a second consecutive user message
      // there is a shape the wire format does not require anyone to accept.
      const nudgeBlock = { type: "text" as const, text };
      const last = conversation[conversation.length - 1] as
        | Anthropic.Messages.MessageParam
        | undefined;
      if (last?.role === "user" && Array.isArray(last.content)) {
        const merged: Anthropic.Messages.MessageParam = {
          ...last,
          content: [...last.content, nudgeBlock],
        };
        return [...conversation.slice(0, -1), merged as TMessage];
      }
      const message: Anthropic.Messages.MessageParam = {
        role: "user",
        content: [nudgeBlock],
      };
      return [...conversation, message as TMessage];
    },

    buildToolResultMessages(
      conversation: TMessage[],
      stepResult: AgenticLoopStepResult<Anthropic.Messages.ContentBlockParam[]>,
      toolResults: AgenticLoopToolCallResult[],
    ): TMessage[] {
      const assistantMessage: Anthropic.Messages.MessageParam = {
        role: "assistant",
        // server_tool_use blocks are stripped before the turn is replayed:
        // the API emits them on the way out but REJECTS them on the way back
        // in, so echoing one fails the next request outright rather than
        // degrading. Both Claude-on-Vertex loops filtered these by hand; doing
        // it here means a caller cannot forget to. A provider that never emits
        // them sees no change.
        content: stepResult.raw.filter(
          (block) => (block as { type?: string }).type !== "server_tool_use",
        ),
      };
      const resultMessage: Anthropic.Messages.MessageParam = {
        role: "user",
        content: toolResults.map((result) => ({
          type: "tool_result" as const,
          tool_use_id: result.id,
          content: result.error
            ? `Error executing tool ${result.name}: ${result.error}`
            : stringifyAnthropicToolOutput(result.output),
          ...(result.error ? { is_error: true } : {}),
        })),
      };
      // The two messages are built in the SDK's own shape and handed back as
      // TMessage. Every Anthropic-compatible message type accepts a plain
      // assistant turn and a tool_result user turn — that is the wire format,
      // not a dialect — and a caller's narrower type differs only in fields
      // neither of these sets. One assertion, at the single point where the
      // adapter authors content rather than passing it through.
      return [
        ...conversation,
        assistantMessage as TMessage,
        resultMessage as TMessage,
      ];
    },

    mapFinishReason: mapAnthropicFinishReason,
  };
}

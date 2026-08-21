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

export function createAnthropicLoopAdapter(
  config: AnthropicLoopAdapterConfig,
): AgenticLoopAdapter<
  Anthropic.Messages.MessageParam[],
  Anthropic.Messages.ContentBlockParam[]
> {
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
          planReclaim: (
            conversation: Anthropic.Messages.MessageParam[],
            step: number,
          ) => {
            const reclaimed = config.planReclaim?.(conversation, step);
            return reclaimed ? { conversation: reclaimed } : undefined;
          },
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
      conversation: Anthropic.Messages.MessageParam[],
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
      // Single assertion, not a double: `messages.create` returns a union of
      // Message and Stream, and Stream<RawMessageStreamEvent> already IS an
      // AsyncIterable of that event, so the two types overlap and the
      // compiler still checks the narrowing.
      const events = (await config.client.messages.create(
        { ...params, stream: true },
        // The engine's signal, not config's: runAgenticLoop already derives
        // it from the caller's abortSignal, so preferring config's would
        // ignore engine-initiated cancellation entirely.
        { signal },
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
      let stepOutputTokens = 0;

      for await (const rawEvent of events) {
        if (signal.aborted) {
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
          // Anthropic reports cache reads/writes separately from input_tokens
          // on this same event; without these the stream drops all cache
          // accounting.
          cacheReadTokens += usage?.cache_read_input_tokens ?? 0;
          cacheWriteTokens += usage?.cache_creation_input_tokens ?? 0;
          // The guard calibrates from the FULL prompt size, not input_tokens
          // alone: on a cache hit the uncached remainder is tiny and using it
          // would let the guard drift far under the real cost.
          config.noteObservedPromptTokens?.(
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
        }
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
      const terminal = config.finalResultToolName
        ? [...toolByIndex.values()].find(
            (pending) => pending.name === config.finalResultToolName,
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

      return {
        text: finalText,
        ...(reasoning ? { reasoning } : {}),
        toolCalls,
        usage: {
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
        },
        rawStopReason,
        raw: blocks,
      };
    },

    buildToolResultMessages(
      conversation: Anthropic.Messages.MessageParam[],
      stepResult: AgenticLoopStepResult<Anthropic.Messages.ContentBlockParam[]>,
      toolResults: AgenticLoopToolCallResult[],
    ): Anthropic.Messages.MessageParam[] {
      const assistantMessage: Anthropic.Messages.MessageParam = {
        role: "assistant",
        content: stepResult.raw,
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
      return [...conversation, assistantMessage, resultMessage];
    },

    mapFinishReason: mapAnthropicFinishReason,
  };
}

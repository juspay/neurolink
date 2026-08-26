/**
 * Bedrock's adapter onto the shared agentic loop engine.
 *
 * Bedrock had two hand-rolled turn loops — one for `Converse`, one for
 * `ConverseStream` — that between them duplicated the same content-block
 * accumulation three times. Everything here is the wire-format half of that:
 * issuing the right command, folding a response into blocks, serializing tool
 * results back into the conversation, and mapping the stop reason. The turn
 * loop itself, the step cap, tool dispatch and usage accumulation belong to
 * `runAgenticLoop`.
 *
 * One adapter covers both operations because the two differ only in how a
 * step's content blocks arrive: `ConverseStream` delivers them as events that
 * are pushed to the consumer as they land, `Converse` returns them whole.
 * Block accumulation, tool-call extraction and the conversation shape are
 * identical, and were identical in the hand-rolled loops too — which is why
 * they drifted apart in the details.
 */

import type {
  ContentBlock,
  ConverseCommandInput,
  ConverseStreamCommandInput,
} from "@aws-sdk/client-bedrock-runtime";
import {
  ConverseCommand,
  ConverseStreamCommand,
  type BedrockRuntimeClient,
} from "@aws-sdk/client-bedrock-runtime";
import type {
  AgenticLoopAdapter,
  AgenticLoopStepRequest,
  AgenticLoopStepResult,
  AgenticLoopToolCallResult,
  BedrockContentBlock,
  BedrockMessage,
  BedrockPendingContentBlock,
} from "../../types/index.js";
import { withTimeout } from "../../utils/errorHandling.js";
import { withInferenceProfileFallback } from "./inferenceProfile.js";

const STEP_TIMEOUT_MS = 120_000;

function newToolUseId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Finalize a block once its `contentBlockStop` arrives: parse whatever tool
 * input accumulated, and attach the text a plain block collected.
 *
 * Attaching the text matters beyond this step. `buildToolResultMessages`
 * replays these blocks back to the model as the assistant turn, so a text
 * block left empty here silently drops the assistant's own words from the
 * conversation on every subsequent step of the turn.
 */
function finalizeBlock(
  block: BedrockPendingContentBlock | undefined,
  text: string,
): void {
  if (!block) {
    return;
  }
  if (block.toolUse && block._inputBuffer) {
    try {
      block.toolUse.input = JSON.parse(block._inputBuffer) as Record<
        string,
        unknown
      >;
    } catch {
      block.toolUse.input = {};
    }
    delete block._inputBuffer;
  }
  if (text && !block.toolUse) {
    block.text = text;
  }
}

function toolCallsFrom(
  blocks: BedrockPendingContentBlock[],
): AgenticLoopStepResult<BedrockContentBlock[]>["toolCalls"] {
  return blocks
    .filter((b) => b.toolUse)
    .map((b) => ({
      id: b.toolUse?.toolUseId ?? newToolUseId(),
      name: b.toolUse?.name ?? "",
      args: (b.toolUse?.input as Record<string, unknown>) ?? {},
    }));
}

/** Fold a `ConverseStream` event sequence into finished content blocks. */
async function readStreamedStep(
  response: { stream?: AsyncIterable<Record<string, never>> },
  channel: { push(chunk: { content: string }): void },
  signal: AbortSignal,
): Promise<AgenticLoopStepResult<BedrockContentBlock[]>> {
  const blocks: BedrockPendingContentBlock[] = [];
  // Blocks are keyed by the index Bedrock stamps on every event rather than
  // by arrival order, because a text block does not necessarily announce
  // itself with `contentBlockStart` — the first thing seen for it can be a
  // delta. Creating the block on whichever event arrives first is what keeps
  // assistant text that precedes a tool call from being dropped: `raw` is
  // replayed as the assistant turn on the next step, so a lost text block
  // means the model stops seeing its own reasoning mid-turn.
  const blocksByIndex = new Map<number, BedrockPendingContentBlock>();
  const textByIndex = new Map<number, string>();
  const blockFor = (index: number): BedrockPendingContentBlock => {
    let block = blocksByIndex.get(index);
    if (!block) {
      block = {};
      blocksByIndex.set(index, block);
      blocks.push(block);
    }
    return block;
  };
  let text = "";
  let rawStopReason: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;

  if (response.stream) {
    for await (const rawChunk of response.stream) {
      if (signal.aborted) {
        break;
      }
      const chunk = rawChunk as {
        contentBlockStart?: {
          contentBlockIndex?: number;
          start?: { toolUse?: { name?: string; toolUseId?: string } };
        };
        contentBlockDelta?: {
          contentBlockIndex?: number;
          delta?: { text?: string; toolUse?: { input?: unknown } };
        };
        contentBlockStop?: { contentBlockIndex?: number };
        messageStop?: { stopReason?: string };
        metadata?: {
          usage?: {
            inputTokens?: number;
            outputTokens?: number;
            cacheReadInputTokens?: number;
            cacheWriteInputTokens?: number;
          };
        };
      };

      if (chunk.contentBlockStart) {
        blockFor(chunk.contentBlockStart.contentBlockIndex ?? 0);
      }

      if (chunk.contentBlockDelta?.delta?.text) {
        const index = chunk.contentBlockDelta.contentBlockIndex ?? 0;
        const delta = chunk.contentBlockDelta.delta.text;
        blockFor(index);
        text += delta;
        textByIndex.set(index, (textByIndex.get(index) ?? "") + delta);
        channel.push({ content: delta });
      }

      if (chunk.contentBlockStart?.start?.toolUse) {
        const block = blockFor(chunk.contentBlockStart.contentBlockIndex ?? 0);
        block.toolUse = {
          name: chunk.contentBlockStart.start.toolUse.name ?? "",
          input: {},
          toolUseId:
            chunk.contentBlockStart.start.toolUse.toolUseId ?? newToolUseId(),
        };
      }

      if (chunk.contentBlockDelta?.delta?.toolUse) {
        const block = blockFor(chunk.contentBlockDelta.contentBlockIndex ?? 0);
        block.toolUse ??= {
          name: "",
          input: {},
          toolUseId: newToolUseId(),
        };
        const deltaInput = chunk.contentBlockDelta.delta.toolUse.input;
        if (typeof deltaInput === "string") {
          block._inputBuffer = (block._inputBuffer ?? "") + deltaInput;
        } else if (
          typeof deltaInput === "object" &&
          deltaInput !== null &&
          !Array.isArray(deltaInput)
        ) {
          block.toolUse.input = {
            ...(block.toolUse.input ?? {}),
            ...(deltaInput as Record<string, unknown>),
          };
        }
      }

      if (chunk.contentBlockStop) {
        const index = chunk.contentBlockStop.contentBlockIndex ?? 0;
        finalizeBlock(blocksByIndex.get(index), textByIndex.get(index) ?? "");
      }

      if (chunk.messageStop) {
        rawStopReason = chunk.messageStop.stopReason ?? "end_turn";
        // Not a break: the metadata event carrying usage arrives after this.
        continue;
      }

      if (chunk.metadata?.usage) {
        inputTokens += chunk.metadata.usage.inputTokens ?? 0;
        outputTokens += chunk.metadata.usage.outputTokens ?? 0;
        // Converse follows the Anthropic additive convention — inputTokens is
        // the uncached remainder, so cache reads/writes are counted apart.
        cacheReadTokens += chunk.metadata.usage.cacheReadInputTokens ?? 0;
        cacheWriteTokens += chunk.metadata.usage.cacheWriteInputTokens ?? 0;
        break;
      }
    }
  }

  // Finalize anything the stream never closed. `contentBlockStop` is not
  // guaranteed to arrive for every block: an abort breaks the loop, the
  // metadata event breaks it, and a truncated stream simply ends. A block
  // left unfinalized keeps `text` undefined and its tool input unparsed, and
  // since `raw` is replayed as the assistant message — where an unrecognized
  // block maps to `{ text: "" }`, which Bedrock rejects — that would fail the
  // NEXT step of the turn rather than this one.
  for (const [index, block] of blocksByIndex) {
    finalizeBlock(block, textByIndex.get(index) ?? "");
  }

  // A block that opened and then received nothing carries no content at all,
  // and `convertToAWSMessages` maps an unrecognized block to `{ text: "" }`,
  // which Bedrock rejects. Drop them rather than replay them.
  const usableBlocks = blocks.filter(
    (block) => block.text || block.toolUse || block.image || block.document,
  );

  return {
    text,
    toolCalls: toolCallsFrom(usableBlocks),
    usage: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens },
    rawStopReason,
    raw: usableBlocks as BedrockContentBlock[],
  };
}

/** Fold a non-streaming `Converse` response into the same block shape. */
function readGeneratedStep(response: {
  output?: { message?: { content?: ContentBlock[] } };
  stopReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cacheReadInputTokens?: number;
    cacheWriteInputTokens?: number;
  };
}): AgenticLoopStepResult<BedrockContentBlock[]> {
  const blocks: BedrockContentBlock[] = [];
  let text = "";

  for (const item of response.output?.message?.content ?? []) {
    const block: BedrockContentBlock = {};
    if ("text" in item && item.text) {
      block.text = item.text;
      text += text ? ` ${item.text}` : item.text;
    }
    if ("toolUse" in item && item.toolUse) {
      block.toolUse = {
        toolUseId: item.toolUse.toolUseId ?? newToolUseId(),
        name: item.toolUse.name ?? "",
        input: (item.toolUse.input as Record<string, unknown>) ?? {},
      };
    }
    blocks.push(block);
  }

  return {
    text,
    toolCalls: toolCallsFrom(blocks),
    usage: {
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
      cacheReadTokens: response.usage?.cacheReadInputTokens ?? 0,
      cacheWriteTokens: response.usage?.cacheWriteInputTokens ?? 0,
    },
    rawStopReason: response.stopReason,
    raw: blocks,
  };
}

export function createBedrockLoopAdapter(config: {
  client: BedrockRuntimeClient;
  /** `ConverseStream` when true, `Converse` when false. */
  streaming: boolean;
  /** The region the client was constructed with, for profile resolution. */
  region: string;
  maxSteps: number;
  /**
   * Build the request for one step. Synchronous by contract, so anything
   * async (tool declarations in particular) is resolved once before the turn
   * starts rather than per step. Bedrock has no mid-turn tool discovery, so
   * there is nothing that would need re-resolving.
   */
  buildCommandInput: (
    conversation: BedrockMessage[],
    step: number,
  ) => ConverseCommandInput & ConverseStreamCommandInput;
}): AgenticLoopAdapter<BedrockMessage[], BedrockContentBlock[]> {
  return {
    providerLabel: "bedrock",
    maxSteps: config.maxSteps,
    // No toolFailureBreaker: Bedrock has never had strike counting — a failing
    // tool becomes one error tool-result with no cross-step memory. Preserved.

    buildStepRequest(
      conversation: BedrockMessage[],
      step: number,
    ): AgenticLoopStepRequest {
      return { raw: config.buildCommandInput(conversation, step) };
    },

    async executeStep(
      request: AgenticLoopStepRequest,
      channel: { push(chunk: { content: string }): void },
      signal: AbortSignal,
    ): Promise<AgenticLoopStepResult<BedrockContentBlock[]>> {
      const commandInput = request.raw as ConverseCommandInput &
        ConverseStreamCommandInput;

      // Both sends go through the inference-profile fallback: most current
      // Bedrock models are not invocable by their bare id in a given region
      // and need a geography- or global-prefixed profile id instead. This is
      // where the provider's two Converse call sites now live.
      if (!config.streaming) {
        const response = await withInferenceProfileFallback(
          commandInput.modelId ?? "",
          config.region,
          (effectiveModelId) =>
            withTimeout(
              config.client.send(
                new ConverseCommand({
                  ...commandInput,
                  modelId: effectiveModelId,
                }),
                // Hand the signal to the transport, not just to the loop.
                // `abortSignal` is documented public API, and loopEngine
                // already honours it — but only *between* steps. Without this
                // the HTTP request stays in flight after an abort until it
                // answers or STEP_TIMEOUT_MS (120s) elapses, because nothing
                // ever told the socket. `@smithy/types` HttpHandlerOptions
                // takes the same AbortSignal the adapter is already given.
                { abortSignal: signal },
              ),
              STEP_TIMEOUT_MS,
              new Error("Bedrock API call timed out"),
            ),
        );
        if (!response.output?.message) {
          throw new Error("Invalid response structure from Bedrock API");
        }
        return readGeneratedStep(response);
      }

      const response = await withInferenceProfileFallback(
        commandInput.modelId ?? "",
        config.region,
        (effectiveModelId) =>
          withTimeout(
            config.client.send(
              new ConverseStreamCommand({
                ...commandInput,
                modelId: effectiveModelId,
              }),
              // As above: the streaming send needs the signal too, so an
              // abort tears down the eventstream connection rather than
              // leaving it open for the rest of the step budget.
              { abortSignal: signal },
            ),
            STEP_TIMEOUT_MS,
            new Error("Bedrock streaming API call timed out"),
          ),
      );
      return readStreamedStep(
        response as { stream?: AsyncIterable<Record<string, never>> },
        channel,
        signal,
      );
    },

    buildToolResultMessages(
      conversation: BedrockMessage[],
      stepResult: AgenticLoopStepResult<BedrockContentBlock[]>,
      toolResults: AgenticLoopToolCallResult[],
    ): BedrockMessage[] {
      const assistantMessage: BedrockMessage = {
        role: "assistant",
        content: stepResult.raw,
      };
      const toolResultMessage: BedrockMessage = {
        role: "user",
        content: toolResults.map((result) => ({
          toolResult: {
            toolUseId: result.id,
            content: [
              {
                text: result.error
                  ? `Error executing tool ${result.name}: ${result.error}`
                  : String(
                      typeof result.output === "string"
                        ? result.output
                        : JSON.stringify(result.output),
                    ),
              },
            ],
            status: result.error ? "error" : "success",
          },
        })),
      };
      return [...conversation, assistantMessage, toolResultMessage];
    },

    mapFinishReason(
      rawStopReason: string | undefined,
      hadToolCallsAtCap: boolean,
    ): string {
      switch (rawStopReason) {
        case "end_turn":
        case "stop_sequence":
          return "stop";
        case "max_tokens":
          return "length";
        case "tool_use":
          return "tool-calls";
        default:
          return hadToolCallsAtCap ? "tool-calls" : "stop";
      }
    },
  };
}

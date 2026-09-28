/**
 * Bridges Bedrock's native `BedrockMessage[]` conversation shape and
 * `AgenticLoopChunk` stream to the AI SDK V3 model-middleware protocol
 * (`LanguageModelV3`), so `BaseProvider.applyMiddlewareToModel()` can wrap a
 * turn built entirely out of `runAgenticLoop` — the same engine Bedrock's
 * `generate()` and `executeStream()` already run on.
 *
 * Scope: only the conversation `generate()`/`executeStream()` hand to the
 * loop as its STARTING point ever crosses this boundary. Both reset
 * `conversationHistory` to a single fresh message before calling the loop
 * (see `client.ts`), so that starting point is always `system + one user
 * message` — never prior assistant/tool-result turns, which are constructed
 * entirely inside the loop's own steps and stay in native
 * `BedrockMessage[]`/`ConverseCommand` shape. A general, lossless
 * `BedrockMessage` <-> `ModelMessage` converter is not attempted here, and
 * would not be possible anyway: `BedrockToolResult` carries no `toolName`,
 * which a faithful `ToolModelMessage` requires.
 *
 * Further scoped to TEXT-ONLY turns. A multimodal starting message (image,
 * document, or — pathologically — a tool-use/tool-result block) skips
 * wrapping entirely; the caller checks `isTextOnlyBedrockConversation` and
 * falls back to calling the loop directly, logging that the turn was
 * excluded. This mirrors the plan's AI Studio precedent: an excluded shape
 * must be explicit in code, not implied by no test ever sending one.
 *
 * Who owns the outcome. When the wrapped `doGenerate`/`doStream` ran the loop,
 * the loop's own result is authoritative for `finishReason`, `usage`,
 * `toolExecutions` and the final conversation: a middleware may replace the
 * content or the stream parts a caller sees, but it cannot rewrite the
 * metadata of a turn that already reached the wire. When a middleware never
 * calls through (a cache hit, a refusal, a synthetic answer) no loop ran, and
 * its own V3 result is what gets reported.
 */

import type { ToolInputSchema } from "@aws-sdk/client-bedrock-runtime";
import type {
  AgenticLoopChunk,
  BedrockMessage,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
  ModelMessage,
  TextPart,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Sampling and output-shaping options of a V3 call that Converse is never
 * sent: both turn builders fill `inferenceConfig` with `maxTokens` and
 * `temperature` alone. The bridge seeds none of these, so a value present
 * when `doGenerate`/`doStream` runs was put there by a middleware, and would
 * otherwise be dropped without a trace.
 */
const UNSENT_V3_OPTIONS = [
  "topP",
  "topK",
  "presencePenalty",
  "frequencyPenalty",
  "stopSequences",
  "seed",
  "toolChoice",
  "responseFormat",
] as const;

/** Names of the unsent options `params` carries; an empty list counts as unset. */
export function unsentBedrockMiddlewareOptions(
  params: LanguageModelV3CallOptions,
): string[] {
  return UNSENT_V3_OPTIONS.filter((key) => {
    const value = params[key];
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  });
}

/**
 * Unwrap Bedrock's `ToolSpecification.inputSchema` — always `{ json:
 * DocumentType }` on the wire (see `ToolInputSchema.JsonMember` in the AWS
 * SDK), never the bare schema — to the plain JSON schema object the V3 tool
 * shape's `inputSchema` field expects. `client.ts`'s own tool-formatting path
 * (`formatToolsForBedrock`) always sends `{ json: schema }` to AWS for this
 * exact reason; handing a middleware the wrapper itself instead of the
 * schema breaks any schema-inspecting middleware (e.g. a guardrail
 * validating tool arguments against the declared shape).
 */
export function unwrapBedrockToolInputSchema(
  inputSchema: ToolInputSchema | undefined,
): unknown {
  return inputSchema && "json" in inputSchema ? inputSchema.json : undefined;
}

/** True when every content block of every message is plain text. */
export function isTextOnlyBedrockConversation(
  conversation: BedrockMessage[],
): boolean {
  return conversation.every((message) =>
    message.content.every(
      (block) =>
        block.text !== undefined &&
        block.image === undefined &&
        block.document === undefined &&
        block.toolUse === undefined &&
        block.toolResult === undefined,
    ),
  );
}

/**
 * `system` + the (already text-only) starting conversation, as a V3 prompt.
 * The system prompt is always sent as its own leading message — Bedrock
 * carries it out-of-band (`ConverseCommandInput.system`), but the V3 prompt
 * shape has no separate slot, so `bedrockConversationFromV3Prompt` is the
 * inverse that pulls it back out.
 */
export function buildV3PromptFromBedrock(
  systemPrompt: string,
  conversation: BedrockMessage[],
): ModelMessage[] {
  const prompt: ModelMessage[] = [{ role: "system", content: systemPrompt }];
  for (const message of conversation) {
    const text = message.content.map((block) => block.text ?? "").join("");
    if (message.role === "user") {
      prompt.push({ role: "user", content: text });
    } else {
      prompt.push({ role: "assistant", content: text });
    }
  }
  return prompt;
}

function contentToText(content: ModelMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter(
      (part): part is TextPart =>
        typeof part === "object" && part !== null && part.type === "text",
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Inverse of `buildV3PromptFromBedrock`, read AFTER `transformParams` has
 * run — this is what makes a middleware's prompt rewrite (correction 1)
 * reach the wire: the caller passes the ORIGINAL prompt into `doGenerate`/
 * `doStream`, and by AI SDK contract `transformParams` has already produced
 * the version handed to the closure by the time this runs.
 *
 * A `tool` role message has no faithful Bedrock shape at this boundary (no
 * toolUseId/toolName pairing survives `ToolModelMessage`), so one is
 * dropped with a WARN rather than guessed at. The starting turn Bedrock
 * ever hands across this boundary never contains one; seeing one here means
 * middleware injected it.
 */
export function bedrockConversationFromV3Prompt(prompt: ModelMessage[]): {
  system: string;
  conversation: BedrockMessage[];
} {
  const systemParts: string[] = [];
  const conversation: BedrockMessage[] = [];
  for (const message of prompt) {
    if (message.role === "system") {
      systemParts.push(message.content);
      continue;
    }
    if (message.role === "tool") {
      logger.warn(
        "[AmazonBedrockProvider] middleware transformParams introduced a 'tool' role message; it has no Bedrock wire shape at this boundary and was dropped",
      );
      continue;
    }
    conversation.push({
      role: message.role,
      content: [{ text: contentToText(message.content) }],
    });
  }
  return { system: systemParts.join("\n\n"), conversation };
}

/**
 * Wrap a native `AgenticLoopChunk` source into the V3 stream contract, one
 * chunk at a time, forwarding cancellation to both the source iterator and
 * `cancel` (which the caller wires to the turn's own `AbortController`, so
 * breaking out of a wrapped stream tears down the underlying AWS SDK
 * request — correction 4). `finish` resolves the terminal `finish` part
 * once the loop settles; middleware inspecting the returned stream sees a
 * genuine usage-bearing finish part even when nothing downstream reads it
 * back out (a guardrail that blocks before calling `doStream` never
 * produces this stream at all, which is the `!loopPromise` case its own
 * caller handles).
 */
export function bedrockChunksToV3Stream(
  source: AsyncIterable<AgenticLoopChunk>,
  finish: Promise<LanguageModelV3StreamPart>,
  cancel: () => void,
): ReadableStream<LanguageModelV3StreamPart> {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<LanguageModelV3StreamPart>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) {
          controller.enqueue(await finish);
          controller.close();
        } else if (next.value.reasoning) {
          controller.enqueue({
            type: "reasoning-delta",
            delta: next.value.reasoning,
          });
        } else {
          controller.enqueue({ type: "text-delta", delta: next.value.content });
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      cancel();
      await iterator.return?.();
    },
  });
}

/**
 * Inverse of `bedrockChunksToV3Stream`: drains a (possibly
 * middleware-wrapped) V3 stream back into Bedrock's native chunk shape.
 * `finish`/`error` parts are consumed here but not surfaced as chunks —
 * `streamingConversationLoop` reads the turn's outcome from the loop's own
 * `resultPromise`, which already carries richer usage/finishReason/
 * toolExecutions than a V3 finish part does; this function exists only to
 * satisfy the wrapped stream's own contract (a middleware may expect its
 * returned stream to be drained to completion) and to `throw` a middleware
 * `error` part into the consumer.
 */
export async function* bedrockV3StreamToChunks(
  stream: ReadableStream<LanguageModelV3StreamPart>,
): AsyncIterable<AgenticLoopChunk> {
  const reader = stream.getReader();
  let done = false;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) {
        done = true;
        return;
      }
      const part = next.value;
      if (part.type === "text-delta") {
        yield { content: part.delta };
      } else if (part.type === "reasoning-delta") {
        yield { content: "", reasoning: part.delta };
      } else if (part.type === "error") {
        throw part.error;
      }
    }
  } finally {
    try {
      if (!done) {
        await reader.cancel();
      }
    } finally {
      reader.releaseLock();
    }
  }
}

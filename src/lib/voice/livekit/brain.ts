/**
 * Transport-agnostic voice brain.
 *
 * Given a user transcript and a stable conversation id, it streams the
 * assistant's reply as text deltas by calling `neurolink.stream()`. NeuroLink
 * owns history (via the conversation id and its memory layer) and tools (the
 * tool-calling loop runs inside `stream()`); this module never touches a
 * transport. The LiveKit worker (or any other transport) consumes the text
 * deltas and converts them to audio.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import { logger } from "../../utils/logger.js";
import type {
  LiveKitBrainConfig,
  LiveKitBrainTurn,
  LiveKitVoiceBrain,
} from "../../types/index.js";

/**
 * Extract spoken text from a stream chunk without type assertions.
 *
 * `StreamResult.stream` yields a union: text chunks (`{ content: string }`),
 * a no-output sentinel, and audio/image events. Only text chunks carry a
 * string `content`; everything else yields `undefined` and is skipped.
 */
function extractTextDelta(chunk: unknown): string | undefined {
  if (typeof chunk === "object" && chunk !== null && "content" in chunk) {
    const value = chunk.content;
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Create a voice brain bound to a configured NeuroLink instance.
 *
 * The returned `streamReply` is an async generator of text deltas for a single
 * turn. Aborting `turn.signal` stops the in-flight LLM and tool calls and ends
 * the generator promptly (barge-in support).
 */
export function createVoiceBrain(
  config: LiveKitBrainConfig,
): LiveKitVoiceBrain {
  const {
    neurolink,
    provider,
    model,
    systemPrompt,
    temperature,
    maxTokens,
    userId,
  } = config;

  async function* streamReply(
    turn: LiveKitBrainTurn,
  ): AsyncGenerator<string, void, unknown> {
    const { transcript, conversationId, signal } = turn;

    if (signal?.aborted) {
      return;
    }

    const context: Record<string, string> = {
      sessionId: conversationId,
      conversationId,
    };
    if (userId !== undefined) {
      context.userId = userId;
    }

    const result = await neurolink.stream({
      input: { text: transcript },
      provider,
      model,
      systemPrompt,
      temperature,
      maxTokens,
      context,
      abortSignal: signal,
      disableTools: false,
    });

    for await (const chunk of result.stream) {
      if (signal?.aborted) {
        logger.debug("[LiveKitBrain] Turn aborted mid-stream; stopping");
        return;
      }
      const delta = extractTextDelta(chunk);
      if (delta !== undefined) {
        yield delta;
      }
    }
  }

  return { streamReply };
}

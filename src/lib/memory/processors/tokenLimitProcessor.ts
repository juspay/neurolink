/**
 * Token Limit Processor
 *
 * Memory processor that trims messages to fit within a token budget.
 * Preserves the most recent messages while staying under the limit.
 *
 * @module memory/processors/tokenLimitProcessor
 * @since 9.0.0
 */

import type {
  ChatMessage,
  MemoryProcessor,
  ProcessorContext,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Estimate tokens for a message
 * Uses a rough approximation of ~4 characters per token
 */
function estimateMessageTokens(message: ChatMessage): number {
  let tokenCount = 0;

  // Message content
  tokenCount += Math.ceil(message.content.length / 4);

  // Role overhead (~10 tokens per message for role/structure)
  tokenCount += 10;

  return tokenCount;
}

/**
 * Token Limit Processor
 *
 * Trims messages to fit within a specified token budget.
 * Strategy: Keep the most recent messages, removing older ones first.
 */
export class TokenLimitProcessor implements MemoryProcessor {
  readonly name = "tokenLimit";

  /**
   * Process messages to fit within token limit
   *
   * @param messages - Input messages
   * @param context - Processor context with token limits
   * @returns Trimmed messages that fit within the limit
   */
  process(messages: ChatMessage[], context: ProcessorContext): ChatMessage[] {
    const maxTokens = context.config.maxTokens ?? context.maxTokens ?? 100000;

    if (!maxTokens || maxTokens <= 0) {
      return messages;
    }

    // Calculate tokens for all messages
    const messageTokens = messages.map((msg) => ({
      message: msg,
      tokens: estimateMessageTokens(msg),
    }));

    const totalTokens = messageTokens.reduce((sum, m) => sum + m.tokens, 0);

    // If within limit, return all messages
    if (totalTokens <= maxTokens) {
      logger.debug("[TokenLimitProcessor] Messages within token limit", {
        totalTokens,
        maxTokens,
        messageCount: messages.length,
      });
      return messages;
    }

    // Need to trim - remove oldest messages first
    const result: ChatMessage[] = [];
    let currentTokens = 0;

    // Process from newest to oldest (reverse order)
    for (let i = messageTokens.length - 1; i >= 0; i--) {
      const { message, tokens } = messageTokens[i];

      if (currentTokens + tokens <= maxTokens) {
        result.unshift(message); // Add to front to maintain order
        currentTokens += tokens;
      } else {
        // Can't fit any more messages
        break;
      }
    }

    logger.debug("[TokenLimitProcessor] Trimmed messages to token limit", {
      originalCount: messages.length,
      trimmedCount: result.length,
      originalTokens: totalTokens,
      finalTokens: currentTokens,
      maxTokens,
    });

    return result;
  }
}

/**
 * Create a token limit processor
 */
export function createTokenLimitProcessor(): TokenLimitProcessor {
  return new TokenLimitProcessor();
}

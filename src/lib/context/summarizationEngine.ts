/**
 * Shared Summarization Engine
 *
 * Extracted from ConversationMemoryManager and RedisConversationMemoryManager
 * to eliminate code duplication. Both managers delegate to this engine.
 */

import type {
  ChatMessage,
  ConversationMemoryConfig,
  SessionMemory,
} from "../types/conversation.js";
import { TokenUtils } from "../constants/tokens.js";
import {
  buildContextFromPointer,
  generateSummary,
} from "../utils/conversationMemory.js";
import { RECENT_MESSAGES_RATIO } from "../config/conversationMemory.js";
import { logger } from "../utils/logger.js";

/**
 * Centralized summarization engine for conversation memory.
 * Handles token counting, threshold checking, and summary generation.
 */
export class SummarizationEngine {
  /**
   * Check if a session needs summarization and perform it if so.
   * @param session - Session memory to check and potentially summarize
   * @param threshold - Token threshold that triggers summarization
   * @param config - Conversation memory configuration (partial allowed)
   * @param logPrefix - Prefix for log messages
   * @returns True if summarization was performed
   */
  async checkAndSummarize(
    session: SessionMemory,
    threshold: number,
    config: Partial<ConversationMemoryConfig>,
    logPrefix = "[SummarizationEngine]",
  ): Promise<boolean> {
    const contextMessages = buildContextFromPointer(session);
    const tokenCount = this.estimateTokens(contextMessages);

    session.lastTokenCount = tokenCount;
    session.lastCountedAt = Date.now();

    logger.debug(`${logPrefix} Token count check`, {
      sessionId: session.sessionId,
      tokenCount,
      threshold,
      needsSummarization: tokenCount >= threshold,
    });

    if (tokenCount >= threshold) {
      await this.summarizeSession(session, threshold, config, logPrefix);
      return true;
    }

    return false;
  }

  /**
   * Perform token-based summarization on a session.
   * Uses pointer-based, non-destructive approach.
   * @param session - Session memory to summarize
   * @param threshold - Token threshold for calculating split point
   * @param config - Conversation memory configuration (partial allowed)
   * @param logPrefix - Prefix for log messages
   */
  async summarizeSession(
    session: SessionMemory,
    threshold: number,
    config: Partial<ConversationMemoryConfig>,
    logPrefix = "[SummarizationEngine]",
  ): Promise<void> {
    const startIndex = session.summarizedUpToMessageId
      ? session.messages.findIndex(
          (m) => m.id === session.summarizedUpToMessageId,
        ) + 1
      : 0;

    const recentMessages = session.messages.slice(startIndex);
    if (recentMessages.length === 0) {
      return;
    }

    const targetRecentTokens = threshold * RECENT_MESSAGES_RATIO;
    const splitIndex = this.findSplitIndexByTokens(
      recentMessages,
      targetRecentTokens,
    );

    const messagesToSummarize = recentMessages.slice(0, splitIndex);
    if (messagesToSummarize.length === 0) {
      return;
    }

    const summary = await generateSummary(
      messagesToSummarize,
      config,
      logPrefix,
      session.summarizedMessage,
    );

    if (!summary) {
      logger.warn(`${logPrefix} Summary generation failed`, {
        sessionId: session.sessionId,
      });
      return;
    }

    const lastSummarized = messagesToSummarize[messagesToSummarize.length - 1];
    session.summarizedUpToMessageId = lastSummarized.id;
    session.summarizedMessage = summary;

    logger.info(`${logPrefix} Summarization complete`, {
      sessionId: session.sessionId,
      summarizedCount: messagesToSummarize.length,
      totalMessages: session.messages.length,
    });
  }

  /**
   * Estimate total tokens for a message array.
   * @param messages - Array of chat messages
   * @returns Estimated token count
   */
  estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      return total + TokenUtils.estimateTokenCount(msg.content);
    }, 0);
  }

  /**
   * Find split index to keep recent messages within target token count.
   * Works backwards from the most recent message to find the split point.
   * @param messages - Array of messages to analyze
   * @param targetRecentTokens - Target token count for recent messages
   * @returns Index at which to split (messages before this index will be summarized)
   */
  findSplitIndexByTokens(
    messages: ChatMessage[],
    targetRecentTokens: number,
  ): number {
    let recentTokens = 0;
    let splitIndex = messages.length;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = TokenUtils.estimateTokenCount(messages[i].content);
      if (recentTokens + msgTokens > targetRecentTokens) {
        splitIndex = i + 1;
        break;
      }
      recentTokens += msgTokens;
    }

    // Ensure at least one message is summarized
    return Math.max(1, splitIndex);
  }
}

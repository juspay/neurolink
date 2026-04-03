/**
 * Conversation Selector for Loop Mode
 * Handles discovery and selection of stored conversations from Redis
 */

import inquirer from "inquirer";
import chalk from "chalk";
import type {
  RedisConversationObject,
  ConversationSummary,
} from "../../lib/types/index.js";
import type { RedisStorageConfig } from "../../lib/types/index.js";
import type {
  ConversationChoice,
  MenuChoice,
  RedisClient,
} from "../../lib/types/index.js";
import {
  createRedisClient,
  scanKeys,
  deserializeConversation,
  getNormalizedConfig,
} from "../../lib/utils/redis.js";
import { logger } from "../../lib/utils/logger.js";
import {
  LOOP_CACHE_CONFIG,
  LOOP_DISPLAY_LIMITS,
  generateConversationTitle,
  truncateText,
  formatTimeAgo,
  getContentIcon,
} from "../../lib/utils/loopUtils.js";

export class ConversationSelector {
  private redisClient: RedisClient | null = null;
  private redisConfig: Required<RedisStorageConfig>;
  private conversationCache: ConversationSummary[] | null = null;
  private cacheTimestamp: number = 0;

  constructor(redisConfig: RedisStorageConfig = {}) {
    this.redisConfig = getNormalizedConfig(redisConfig);
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    if (!this.redisClient) {
      // Cast is necessary: createRedisClient returns the ioredis client type which
      // does not structurally match our RedisClient interface due to overloaded
      // method signatures. The runtime value is fully compatible.
      this.redisClient = (await createRedisClient(
        this.redisConfig,
      )) as unknown as RedisClient;
    }
  }

  /**
   * Get available conversations for a user
   */
  async getAvailableConversations(
    userId?: string,
  ): Promise<ConversationSummary[]> {
    // Check if cached conversations are still valid (within TTL)
    if (
      this.conversationCache &&
      Date.now() - this.cacheTimestamp < LOOP_CACHE_CONFIG.TTL_MS
    ) {
      logger.debug("Using cached conversation list");
      return this.filterConversationsByUser(this.conversationCache, userId);
    }

    try {
      await this.initializeRedis();
      if (!this.redisClient) {
        throw new Error("Redis client not available");
      }

      const keys = await this.scanConversationKeys();
      if (keys.length === 0) {
        logger.debug("No conversations found in Redis");
        return [];
      }

      const summaries = await this.processConversationKeys(keys);
      const sortedSummaries = this.sortConversationsByDate(summaries);

      this.updateCache(sortedSummaries);
      return this.filterConversationsByUser(sortedSummaries, userId);
    } catch (error) {
      return this.handleRetrievalError(error);
    }
  }

  /**
   * Display conversation menu and get user selection
   */
  async displayConversationMenu(
    userId?: string,
  ): Promise<string | "NEW_CONVERSATION"> {
    try {
      const conversations = await this.getAvailableConversations(userId);

      if (conversations.length === 0) {
        logger.debug("No conversations available for selection");
        return "NEW_CONVERSATION";
      }

      const choices = this.createMenuChoices(conversations);
      return await this.showSelectionPrompt(choices);
    } catch (error) {
      return this.handleMenuError(error);
    }
  }

  /**
   * Check if there are any stored conversations
   */
  async hasStoredConversations(userId?: string): Promise<boolean> {
    try {
      const conversations = await this.getAvailableConversations(userId);
      return conversations.length > 0;
    } catch (error) {
      logger.debug("Failed to check for stored conversations:", error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
  }

  private async scanConversationKeys(): Promise<string[]> {
    if (!this.redisClient) {
      throw new Error("Redis client not initialized");
    }

    const pattern = `${this.redisConfig.keyPrefix}*`;
    const keys = await scanKeys(
      this.redisClient as unknown as Parameters<typeof scanKeys>[0],
      pattern,
    );
    logger.debug(`Found ${keys.length} conversation keys in Redis`);
    return keys;
  }

  private async processConversationKeys(
    keys: string[],
  ): Promise<ConversationSummary[]> {
    const summaries: ConversationSummary[] = [];

    for (const key of keys) {
      const summary = await this.processSingleConversationKey(key);
      if (summary) {
        summaries.push(summary);
      }
    }

    return summaries;
  }

  private async processSingleConversationKey(
    key: string,
  ): Promise<ConversationSummary | null> {
    if (!this.redisClient) {
      logger.warn(`Redis client not available for key ${key}`);
      return null;
    }

    try {
      const conversationData = await this.redisClient.get(key);
      const conversation = deserializeConversation(conversationData);

      if (
        conversation &&
        conversation.messages &&
        conversation.messages.length > 0
      ) {
        // Only include conversations with session IDs prefixed with "NL_"
        if (!conversation.sessionId?.startsWith("NL_")) {
          return null;
        }
        return this.createConversationSummary(conversation);
      }
      return null;
    } catch (error) {
      logger.warn(`Failed to process conversation key ${key}:`, error);
      return null;
    }
  }

  private sortConversationsByDate(
    summaries: ConversationSummary[],
  ): ConversationSummary[] {
    return summaries.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  private updateCache(summaries: ConversationSummary[]): void {
    this.conversationCache = summaries;
    this.cacheTimestamp = Date.now();
    logger.debug(`Retrieved ${summaries.length} valid conversations`);
  }

  private filterConversationsByUser(
    summaries: ConversationSummary[],
    userId?: string,
  ): ConversationSummary[] {
    if (!userId) {
      return summaries;
    }
    return summaries.filter((summary) => summary.userId === userId);
  }

  /*
   * Create menu choices for inquirer prompt
   */
  private createMenuChoices(
    conversations: ConversationSummary[],
  ): MenuChoice[] {
    const choices: MenuChoice[] = [
      {
        name: chalk.green("🆕 Start New Conversation"),
        value: "NEW_CONVERSATION",
        short: "New Conversation",
      },
      // Cast is intentional: inquirer's Separator type is not exported cleanly
      // and does not overlap with MenuChoice, but inquirer accepts it at runtime.
      new inquirer.Separator() as unknown as MenuChoice,
    ];

    for (const conversation of conversations.slice(
      0,
      LOOP_DISPLAY_LIMITS.MAX_CONVERSATIONS,
    )) {
      const choice = this.formatConversationChoice(conversation);
      choices.push(choice);
    }

    return choices;
  }

  private async showSelectionPrompt(
    choices: MenuChoice[],
  ): Promise<string | "NEW_CONVERSATION"> {
    const answer = await inquirer.prompt([
      {
        type: "select",
        name: "selectedConversation",
        message: "Select a conversation to continue:",
        choices,
        pageSize: LOOP_DISPLAY_LIMITS.PAGE_SIZE,
      },
    ]);

    return answer.selectedConversation as string | "NEW_CONVERSATION";
  }

  private handleRetrievalError(error: unknown): ConversationSummary[] {
    logger.error("Failed to retrieve conversations:", error);
    return [];
  }

  private handleMenuError(error: unknown): "NEW_CONVERSATION" {
    logger.error("Failed to display conversation menu:", error);
    return "NEW_CONVERSATION";
  }

  private createConversationSummary(
    conversation: RedisConversationObject,
  ): ConversationSummary {
    const messages = conversation.messages;
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];

    return {
      sessionId: conversation.sessionId,
      id: conversation.id,
      title:
        conversation.title || generateConversationTitle(firstMessage.content),
      firstMessage: {
        content: truncateText(
          firstMessage.content,
          LOOP_DISPLAY_LIMITS.CONTENT_LENGTH,
        ),
        timestamp: firstMessage.timestamp || conversation.createdAt,
      },
      lastMessage: {
        content: truncateText(
          lastMessage.content,
          LOOP_DISPLAY_LIMITS.CONTENT_LENGTH,
        ),
        timestamp: lastMessage.timestamp || conversation.updatedAt,
      },
      messageCount: messages.length,
      userId: conversation.userId,
      duration: formatTimeAgo(conversation.updatedAt),
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private formatConversationChoice(
    summary: ConversationSummary,
  ): ConversationChoice {
    const icon = getContentIcon(summary.firstMessage.content);
    const title = chalk.white(summary.title || "Untitled Conversation");
    const duration = chalk.gray(`(${summary.duration})`);

    const details = chalk.gray(
      `     └ ${summary.messageCount} message${summary.messageCount !== 1 ? "s" : ""} | ` +
        `Session: ${summary.sessionId.slice(0, LOOP_DISPLAY_LIMITS.SESSION_ID_DISPLAY)}... | ` +
        `Updated: ${new Date(summary.updatedAt).toLocaleString()}`,
    );

    const name = `${icon} ${title} ${duration}\n${details}`;

    return {
      name,
      value: summary.sessionId,
      short: `${summary.title} (${summary.sessionId.slice(0, LOOP_DISPLAY_LIMITS.SESSION_ID_SHORT)}...)`,
    };
  }
}

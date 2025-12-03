/**
 * Redis Conversation Memory Manager for NeuroLink
 * Redis-based implementation of conversation storage with same interface as ConversationMemoryManager
 */

import { randomUUID } from "crypto";
import type {
  ConversationMemoryConfig,
  ConversationMemoryStats,
  ChatMessage,
  RedisStorageConfig,
  SessionMetadata,
  RedisConversationObject,
} from "../types/conversation.js";
import { ConversationMemoryError } from "../types/conversation.js";
import type { PendingToolExecution } from "../types/tools.js";
import { MESSAGES_PER_TURN } from "../config/conversationMemory.js";
import { logger } from "../utils/logger.js";
import { NeuroLink } from "../neurolink.js";
import {
  createRedisClient,
  getSessionKey,
  getUserSessionsKey,
  getNormalizedConfig,
  serializeConversation,
  deserializeConversation,
  scanKeys,
} from "../utils/redis.js";

/**
 * Redis-based implementation of the ConversationMemoryManager
 * Uses the same interface but stores data in Redis
 */

export class RedisConversationMemoryManager {
  public config: ConversationMemoryConfig;
  private isInitialized: boolean = false;
  private redisConfig: Required<RedisStorageConfig>;
  private redisClient: Awaited<ReturnType<typeof createRedisClient>> | null =
    null;

  /**
   * Temporary storage for tool execution data to prevent race conditions
   * Key format: "${sessionId}:${userId}"
   */
  private pendingToolExecutions: Map<string, PendingToolExecution> = new Map();

  /**
   * Track sessions currently generating titles to prevent race conditions
   * Key format: "${sessionId}:${userId}"
   */
  private titleGenerationInProgress: Set<string> = new Set();

  constructor(
    config: ConversationMemoryConfig,
    redisConfig: RedisStorageConfig = {},
  ) {
    this.config = config;
    this.redisConfig = getNormalizedConfig(redisConfig);
  }

  /**
   * Initialize the memory manager with Redis connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug(
        "[RedisConversationMemoryManager] Already initialized, skipping",
      );
      return;
    }

    try {
      logger.debug(
        "[RedisConversationMemoryManager] Initializing with config",
        {
          host: this.redisConfig.host,
          port: this.redisConfig.port,
          keyPrefix: this.redisConfig.keyPrefix,
          ttl: this.redisConfig.ttl,
        },
      );

      this.redisClient = await createRedisClient(this.redisConfig);
      this.isInitialized = true;

      logger.info("RedisConversationMemoryManager initialized", {
        storage: "redis",
        host: this.redisConfig.host,
        port: this.redisConfig.port,
        maxSessions: this.config.maxSessions,
        maxTurnsPerSession: this.config.maxTurnsPerSession,
      });

      logger.debug(
        "[RedisConversationMemoryManager] Redis client created successfully",
        {
          clientType: this.redisClient?.constructor?.name || "unknown",
          isConnected: !!this.redisClient,
        },
      );
    } catch (error) {
      logger.error("[RedisConversationMemoryManager] Failed to initialize", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          host: this.redisConfig.host,
          port: this.redisConfig.port,
        },
      });

      throw new ConversationMemoryError(
        "Failed to initialize Redis conversation memory",
        "CONFIG_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Get all sessions for a specific user
   */
  public async getUserSessions(userId: string): Promise<string[]> {
    // Ensure initialization
    await this.ensureInitialized();

    if (!this.redisClient) {
      logger.warn(
        "[RedisConversationMemoryManager] Redis client not available",
        { userId },
      );
      return [];
    }

    try {
      const userSessionsKey = getUserSessionsKey(this.redisConfig, userId);
      const sessions = await this.redisClient.sMembers(userSessionsKey);
      return sessions;
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to get user sessions",
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return [];
    }
  }

  /**
   * Add a session to user's session set (private method)
   */
  private async addUserSession(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    if (!this.redisClient || !userId) {
      return;
    }

    try {
      const userSessionsKey = getUserSessionsKey(this.redisConfig, userId);
      await this.redisClient.sAdd(userSessionsKey, sessionId);

      if (this.redisConfig.ttl > 0) {
        await this.redisClient.expire(userSessionsKey, this.redisConfig.ttl);
      }
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to add session to user set",
        {
          userId,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Remove a session from user's session set (private method)
   */
  private async removeUserSession(
    userId: string,
    sessionId: string,
  ): Promise<boolean> {
    if (!this.redisClient || !userId) {
      return false;
    }

    try {
      const userSessionsKey = getUserSessionsKey(this.redisConfig, userId);

      const result = await this.redisClient.sRem(userSessionsKey, sessionId);

      return result > 0;
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to remove session from user set",
        {
          userId,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return false;
    }
  }

  /**
   * Generate next message ID for a conversation
   */
  private generateMessageId(
    conversation: { messages?: ChatMessage[] } | null,
  ): string {
    const currentCount = conversation?.messages?.length || 0;
    return `msg_${currentCount + 1}`;
  }

  /**
   * Generate current timestamp in ISO format
   */
  private generateTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Generate a unique conversation ID using UUID v4
   */
  private generateUniqueId(): string {
    return randomUUID();
  }

  /**
   * Store tool execution data for a session (temporarily to avoid race conditions)
   */
  async storeToolExecution(
    sessionId: string,
    userId: string | undefined,
    toolCalls: Array<{
      toolCallId?: string;
      toolName?: string;
      args?: Record<string, unknown>;
      [key: string]: unknown;
    }>,
    toolResults: Array<{
      toolCallId?: string;
      result?: unknown;
      error?: string;
      [key: string]: unknown;
    }>,
    currentTime?: Date,
  ): Promise<void> {
    logger.debug(
      "[RedisConversationMemoryManager] Storing tool execution temporarily",
      {
        sessionId,
        userId,
        toolCallsCount: toolCalls?.length || 0,
        toolResultsCount: toolResults?.length || 0,
      },
    );

    try {
      const normalizedUserId = userId || "randomUser";
      const pendingKey = `${sessionId}:${normalizedUserId}`;

      // Store tool execution data temporarily to prevent race conditions
      const pendingData: PendingToolExecution = {
        toolCalls: (toolCalls || []).map((call) => ({
          ...call,
          timestamp: currentTime,
        })),
        toolResults: (toolResults || []).map((result) => ({
          ...result,
          timestamp: currentTime,
        })),
        timestamp: Date.now(),
      };

      // Check if there's existing pending data and merge
      const existingData = this.pendingToolExecutions.get(pendingKey);
      if (existingData) {
        logger.debug(
          "[RedisConversationMemoryManager] Merging with existing pending tool data",
          {
            sessionId,
            existingToolCalls: existingData.toolCalls.length,
            existingToolResults: existingData.toolResults.length,
            newToolCalls: toolCalls?.length || 0,
            newToolResults: toolResults?.length || 0,
          },
        );

        // Merge tool calls and results
        pendingData.toolCalls = [
          ...existingData.toolCalls,
          ...pendingData.toolCalls,
        ];
        pendingData.toolResults = [
          ...existingData.toolResults,
          ...pendingData.toolResults,
        ];
      }

      this.pendingToolExecutions.set(pendingKey, pendingData);

      logger.debug(
        "[RedisConversationMemoryManager] Tool execution stored temporarily",
        {
          sessionId,
          userId: normalizedUserId,
          pendingKey,
          totalToolCalls: pendingData.toolCalls.length,
          totalToolResults: pendingData.toolResults.length,
        },
      );

      // Clean up stale pending data (older than 5 minutes)
      this.cleanupStalePendingData();
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to store tool execution temporarily",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Don't throw - tool storage failures shouldn't break generation
    }
  }

  /**
   * Store a conversation turn for a session
   */
  async storeConversationTurn(
    sessionId: string,
    userId: string | undefined,
    userMessage: string,
    aiResponse: string,
    startTimeStamp: Date | undefined,
  ): Promise<void> {
    logger.debug("[RedisConversationMemoryManager] Storing conversation turn", {
      sessionId,
      userId,
      userMessageLength: userMessage.length,
      aiResponseLength: aiResponse.length,
    });

    await this.ensureInitialized();

    try {
      if (!this.redisClient) {
        throw new Error("Redis client not initialized");
      }

      // Generate Redis key
      const redisKey = getSessionKey(this.redisConfig, sessionId, userId);

      // Get existing conversation object
      const conversationData = await this.redisClient.get(redisKey);
      let conversation = deserializeConversation(conversationData);

      const currentTime = new Date().toISOString();
      const normalizedUserId = userId || "randomUser";

      // If no existing conversation, create a new one
      if (!conversation) {
        // Generate title asynchronously in the background (non-blocking)
        const titleGenerationKey = `${sessionId}:${normalizedUserId}`;

        setImmediate(async () => {
          // Check if title generation is already in progress for this session
          if (this.titleGenerationInProgress.has(titleGenerationKey)) {
            logger.debug(
              "[RedisConversationMemoryManager] Title generation already in progress, skipping",
              {
                sessionId,
                userId: normalizedUserId,
                titleGenerationKey,
              },
            );
            return;
          }

          // Mark title generation as in progress
          this.titleGenerationInProgress.add(titleGenerationKey);

          try {
            const title = await this.generateConversationTitle(userMessage);
            logger.info(
              "[RedisConversationMemoryManager] Successfully generated conversation title",
              {
                sessionId,
                userId: normalizedUserId,
                title,
              },
            );

            const updatedRedisKey = getSessionKey(
              this.redisConfig,
              sessionId,
              userId || undefined,
            );
            const updatedConversationData =
              await this.redisClient?.get(updatedRedisKey);
            const updatedConversation = deserializeConversation(
              updatedConversationData || null,
            );

            if (updatedConversation) {
              updatedConversation.title = title;
              updatedConversation.updatedAt = new Date().toISOString();

              const serializedData = serializeConversation(updatedConversation);
              await this.redisClient?.set(updatedRedisKey, serializedData);

              if (this.redisConfig.ttl > 0) {
                await this.redisClient?.expire(
                  updatedRedisKey,
                  this.redisConfig.ttl,
                );
              }
            }
          } catch (titleError) {
            logger.warn(
              "[RedisConversationMemoryManager] Failed to generate conversation title in background",
              {
                sessionId,
                userId: normalizedUserId,
                error:
                  titleError instanceof Error
                    ? titleError.message
                    : String(titleError),
              },
            );
          } finally {
            // Always remove from tracking set when done (success or failure)
            this.titleGenerationInProgress.delete(titleGenerationKey);

            logger.debug(
              "[RedisConversationMemoryManager] Title generation completed, removed from tracking",
              {
                sessionId,
                userId: normalizedUserId,
                titleGenerationKey,
                remainingInProgress: this.titleGenerationInProgress.size,
              },
            );
          }
        });

        conversation = {
          id: this.generateUniqueId(), // Generate unique UUID v4 for conversation
          title: "New Conversation", // Temporary title until generated
          sessionId,
          userId: normalizedUserId,
          createdAt: startTimeStamp?.toISOString() || currentTime,
          updatedAt: startTimeStamp?.toISOString() || currentTime,
          messages: [],
        };
      } else {
        // Update existing conversation timestamp
        conversation.updatedAt = currentTime;
      }

      logger.info("[RedisConversationMemoryManager] Processing conversation", {
        isNewConversation: !conversationData,
        messageCount: conversation.messages.length,
        sessionId: conversation.sessionId,
        userId: conversation.userId,
      });

      // Add new messages to conversation history with new format
      const userMsg: ChatMessage = {
        id: this.generateMessageId(conversation),
        timestamp: startTimeStamp?.toISOString() || this.generateTimestamp(),
        role: "user",
        content: userMessage,
      };
      conversation.messages.push(userMsg);

      await this.flushPendingToolData(
        conversation,
        sessionId,
        normalizedUserId,
      );

      const assistantMsg: ChatMessage = {
        id: this.generateMessageId(conversation),
        timestamp: this.generateTimestamp(),
        role: "assistant",
        content: aiResponse,
      };
      conversation.messages.push(assistantMsg);

      logger.info("[RedisConversationMemoryManager] Added new messages", {
        newMessageCount: conversation.messages.length,
        latestMessages: [
          {
            role: conversation.messages[conversation.messages.length - 2]?.role,
            contentLength:
              conversation.messages[conversation.messages.length - 2]?.content
                .length,
          },
          {
            role: conversation.messages[conversation.messages.length - 1]?.role,
            contentLength:
              conversation.messages[conversation.messages.length - 1]?.content
                .length,
          },
        ],
      });

      // Save updated conversation object
      const serializedData = serializeConversation(conversation);
      logger.debug(
        "[RedisConversationMemoryManager] Saving conversation to Redis",
        {
          redisKey,
          messageCount: conversation.messages.length,
          serializedDataLength: serializedData.length,
          title: conversation.title,
        },
      );
      logger.info("Storing conversation data to Redis", {
        sessionId,
        dataLength: serializedData.length,
        messageCount: conversation.messages.length,
      });

      await this.redisClient.set(redisKey, serializedData);

      // Set TTL if configured
      if (this.redisConfig.ttl > 0) {
        logger.debug("[RedisConversationMemoryManager] Setting Redis TTL", {
          redisKey,
          ttl: this.redisConfig.ttl,
        });
        await this.redisClient.expire(redisKey, this.redisConfig.ttl);
      }

      // Add session to user's session set
      if (userId) {
        await this.addUserSession(userId, sessionId);
      }

      logger.debug(
        "[RedisConversationMemoryManager] Successfully stored conversation turn",
        {
          sessionId,
          totalMessages: conversation.messages.length,
          title: conversation.title,
        },
      );
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to store conversation turn in Redis for session ${sessionId}`,
        "STORAGE_ERROR",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Build context messages for AI prompt injection
   */
  async buildContextMessages(
    sessionId: string,
    userId?: string,
  ): Promise<ChatMessage[]> {
    logger.info("[RedisConversationMemoryManager] Building context messages", {
      sessionId,
      userId,
      method: "buildContextMessages",
    });

    const messages = await this.getUserSessionHistory(
      userId || "randomUser",
      sessionId,
    );

    if (!messages) {
      logger.info(
        "[RedisConversationMemoryManager] No context messages found",
        {
          sessionId,
          userId,
        },
      );
      return [];
    }

    logger.info("[RedisConversationMemoryManager] Retrieved messages", {
      messageCount: messages.length,
      hasMessages: messages.length > 0,
    });

    logger.info("[RedisConversationMemoryManager] Retrieved context messages", {
      sessionId,
      userId,
      messageCount: messages.length,
      messageRoles: messages.map((m) => m.role),
      firstMessagePreview: messages[0]?.content?.substring(0, 50),
      lastMessagePreview: messages[messages.length - 1]?.content?.substring(
        0,
        50,
      ),
    });

    return messages;
  }

  /**
   * Get session metadata for a specific user session (optimized for listing)
   * Fetches only essential metadata without heavy message arrays
   *
   * @param userId The user identifier
   * @param sessionId The session identifier
   * @returns Session metadata or null if session doesn't exist
   */
  public async getUserSessionMetadata(
    userId: string,
    sessionId: string,
  ): Promise<SessionMetadata | null> {
    logger.debug(
      "[RedisConversationMemoryManager] Getting user session metadata",
      {
        userId,
        sessionId,
      },
    );

    await this.ensureInitialized();

    if (!this.redisClient) {
      logger.warn(
        "[RedisConversationMemoryManager] Redis client not available",
        { userId, sessionId },
      );
      return null;
    }

    try {
      const sessionKey = getSessionKey(this.redisConfig, sessionId, userId);
      const conversationData = await this.redisClient.get(sessionKey);

      if (!conversationData) {
        logger.debug("[RedisConversationMemoryManager] No session data found", {
          userId,
          sessionId,
          sessionKey,
        });
        return null;
      }

      // Deserialize conversation object but extract only metadata
      const conversation = deserializeConversation(conversationData);
      if (conversation) {
        return {
          id: conversation.sessionId,
          title: conversation.title,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        };
      }

      logger.debug(
        "[RedisConversationMemoryManager] No valid conversation data found",
        {
          userId,
          sessionId,
          sessionKey,
        },
      );
      return null;
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to get user session metadata",
        {
          userId,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return null;
    }
  }

  /**
   * Get conversation history for a specific user session
   *
   * @param userId The user identifier
   * @param sessionId The session identifier
   * @returns Array of chat messages or null if session doesn't exist
   */
  public async getUserSessionHistory(
    userId: string,
    sessionId: string,
  ): Promise<ChatMessage[] | null> {
    logger.debug(
      "[RedisConversationMemoryManager] Getting user session history via getUserSessionObject",
      {
        userId,
        sessionId,
      },
    );

    try {
      const sessionObject = await this.getUserSessionObject(userId, sessionId);

      if (!sessionObject) {
        logger.debug(
          "[RedisConversationMemoryManager] No session object found, returning null",
          {
            userId,
            sessionId,
          },
        );
        return null;
      }

      return sessionObject.messages;
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to get user session history via getUserSessionObject",
        {
          userId,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return null;
    }
  }

  /**
   * Get the complete conversation object for a specific user session
   *
   * This method returns the full conversation object including title, metadata,
   * timestamps, and all chat messages. Unlike getUserSessionHistory() which returns
   * only the messages array, this method provides the complete conversation context.
   *
   * @param userId The user identifier who owns the session
   * @param sessionId The unique session identifier
   * @returns Complete conversation object with all data, or null if session doesn't exist
   */
  public async getUserSessionObject(
    userId: string,
    sessionId: string,
  ): Promise<RedisConversationObject | null> {
    logger.debug(
      "[RedisConversationMemoryManager] Getting complete user session object",
      {
        userId,
        sessionId,
        method: "getUserSessionObject",
      },
    );

    // Validate input parameters
    if (!userId || typeof userId !== "string") {
      logger.warn("[RedisConversationMemoryManager] Invalid userId provided", {
        userId,
        sessionId,
      });
      return null;
    }

    if (!sessionId || typeof sessionId !== "string") {
      logger.warn(
        "[RedisConversationMemoryManager] Invalid sessionId provided",
        { userId, sessionId },
      );
      return null;
    }

    await this.ensureInitialized();

    if (!this.redisClient) {
      logger.warn(
        "[RedisConversationMemoryManager] Redis client not available for getUserSessionObject",
        { userId, sessionId },
      );
      return null;
    }

    try {
      const sessionKey = getSessionKey(this.redisConfig, sessionId, userId);
      const conversationData = await this.redisClient.get(sessionKey);

      if (!conversationData) {
        logger.debug(
          "[RedisConversationMemoryManager] No conversation data found in Redis",
          {
            userId,
            sessionId,
            sessionKey,
          },
        );
        return null;
      }

      // Deserialize the complete conversation object
      const conversation = deserializeConversation(conversationData);
      if (!conversation) {
        logger.debug(
          "[RedisConversationMemoryManager] Failed to deserialize conversation data",
          {
            userId,
            sessionId,
            sessionKey,
            dataLength: conversationData.length,
          },
        );
        return null;
      }

      // Validate conversation object structure
      if (!conversation.messages || !Array.isArray(conversation.messages)) {
        logger.warn(
          "[RedisConversationMemoryManager] Invalid conversation structure - missing messages array",
          {
            userId,
            sessionId,
            hasMessages: !!conversation.messages,
            messagesType: typeof conversation.messages,
          },
        );
        return null;
      }

      return conversation;
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to get complete user session object",
        {
          userId,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : "UnknownError",
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return null;
    }
  }

  /**
   * Generate a conversation title from the first user message
   * Uses AI to create a concise, descriptive title (5-8 words)
   */
  async generateConversationTitle(userMessage: string): Promise<string> {
    logger.debug(
      "[RedisConversationMemoryManager] Generating conversation title",
      {
        userMessageLength: userMessage.length,
        userMessagePreview: userMessage.substring(0, 100),
      },
    );

    try {
      // Create a NeuroLink instance for title generation
      const titleGenerator = new NeuroLink({
        conversationMemory: { enabled: false },
      });

      const titlePrompt = `Generate a clear, concise, and descriptive title (5–8 words maximum) for a conversation based on the following user message. 
The title must meaningfully reflect the topic or intent of the message. 
Do not output anything unrelated, vague, or generic. 
Do not say you cannot create a title. Always return a valid title.

User message: "${userMessage}`;

      const result = await titleGenerator.generate({
        input: { text: titlePrompt },
        provider: this.config.summarizationProvider || "vertex",
        model: this.config.summarizationModel || "gemini-2.5-flash",
        disableTools: false,
      });

      // Clean up the generated title
      let title = result.content?.trim() || "New Conversation";

      // Remove common prefixes/suffixes that might be added by the AI
      title = title.replace(/^(Title:|Here's a title:|The title is:)\s*/i, "");
      title = title.replace(/['"]/g, ""); // Remove quotes
      title = title.replace(/\.$/, ""); // Remove trailing period

      if (title.length > 60) {
        title = title.substring(0, 57) + "...";
      }

      if (title.length < 3) {
        title = "New Conversation";
      }

      logger.debug(
        "[RedisConversationMemoryManager] Generated conversation title",
        {
          originalLength: result.content?.length || 0,
          cleanedTitle: title,
          titleLength: title.length,
        },
      );

      return title;
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to generate conversation title",
        {
          error: error instanceof Error ? error.message : String(error),
          userMessagePreview: userMessage.substring(0, 100),
        },
      );

      // Fallback to a simple title based on the user message
      const fallbackTitle =
        userMessage.length > 30
          ? userMessage.substring(0, 30) + "..."
          : userMessage || "New Conversation";

      return fallbackTitle;
    }
  }

  /**
   * Create summary system message
   */
  public createSummarySystemMessage(content: string): ChatMessage {
    return {
      role: "system",
      content: `Summary of previous conversation turns:\n\n${content}`,
    };
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
      this.isInitialized = false;
      logger.info("Redis connection closed");
    }
  }

  /**
   * Get statistics about conversation storage
   */
  public async getStats(): Promise<ConversationMemoryStats> {
    await this.ensureInitialized();

    if (!this.redisClient) {
      return { totalSessions: 0, totalTurns: 0 };
    }

    // Get all session keys using SCAN instead of KEYS to avoid blocking
    const pattern = `${this.redisConfig.keyPrefix}*`;
    const keys = await scanKeys(this.redisClient, pattern);

    logger.debug(
      "[RedisConversationMemoryManager] Got session keys with SCAN",
      {
        pattern,
        keyCount: keys.length,
      },
    );

    // Count messages in each session
    let totalTurns = 0;

    for (const key of keys) {
      const conversationData = await this.redisClient.get(key);
      const conversation = deserializeConversation(conversationData);
      if (conversation?.messages) {
        totalTurns += conversation.messages.length / MESSAGES_PER_TURN;
      }
    }

    return {
      totalSessions: keys.length,
      totalTurns,
    };
  }

  /**
   * Clear a specific session
   */
  public async clearSession(
    sessionId: string,
    userId?: string,
  ): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.redisClient) {
      return false;
    }

    const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
    const result = await this.redisClient.del(redisKey);

    if (result > 0) {
      // Remove session from user's session set
      if (userId) {
        await this.removeUserSession(userId, sessionId);
      }

      logger.info("Redis session cleared", { sessionId });
      return true;
    }

    return false;
  }

  /**
   * Clear all sessions
   */
  public async clearAllSessions(): Promise<void> {
    await this.ensureInitialized();

    if (!this.redisClient) {
      return;
    }

    const conversationPattern = `${this.redisConfig.keyPrefix}*`;
    const userSessionsPattern = `${this.redisConfig.userSessionsKeyPrefix}*`;

    // Use SCAN instead of KEYS to avoid blocking the server
    const conversationKeys = await scanKeys(
      this.redisClient,
      conversationPattern,
    );
    const userSessionsKeys = await scanKeys(
      this.redisClient,
      userSessionsPattern,
    );

    const allKeys = [...conversationKeys, ...userSessionsKeys];

    logger.debug(
      "[RedisConversationMemoryManager] Got all keys with SCAN for clearing",
      {
        conversationPattern,
        userSessionsPattern,
        conversationKeyCount: conversationKeys.length,
        userSessionsKeyCount: userSessionsKeys.length,
        totalKeyCount: allKeys.length,
      },
    );

    if (allKeys.length > 0) {
      // Process keys in batches to avoid blocking Redis for too long
      const batchSize = 100;
      for (let i = 0; i < allKeys.length; i += batchSize) {
        const batch = allKeys.slice(i, i + batchSize);
        await this.redisClient.del(batch);
        logger.debug(
          "[RedisConversationMemoryManager] Cleared batch of sessions and user mappings",
          {
            batchIndex: Math.floor(i / batchSize) + 1,
            batchSize: batch.length,
            totalProcessed: i + batch.length,
            totalKeys: allKeys.length,
          },
        );
      }

      logger.info("All Redis sessions and user session mappings cleared", {
        clearedCount: allKeys.length,
        conversationSessions: conversationKeys.length,
        userSessionMappings: userSessionsKeys.length,
      });
    }
  }

  /**
   * Ensure Redis client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    logger.debug("[RedisConversationMemoryManager] Ensuring initialization");
    if (!this.isInitialized) {
      logger.debug(
        "[RedisConversationMemoryManager] Not initialized, initializing now",
      );
      await this.initialize();
    } else {
      logger.debug("[RedisConversationMemoryManager] Already initialized");
    }
  }

  /**
   * Get session metadata for all sessions of a user (optimized for listing)
   * Returns only essential metadata without heavy message arrays
   *
   * @param userId The user identifier
   * @returns Array of session metadata objects
   */
  public async getUserAllSessionsHistory(
    userId: string,
  ): Promise<SessionMetadata[]> {
    await this.ensureInitialized();

    if (!this.redisClient) {
      logger.warn(
        "[RedisConversationMemoryManager] Redis client not available",
        { userId },
      );
      return [];
    }

    const results: SessionMetadata[] = [];

    try {
      // Get all session IDs for the user using existing method
      const sessionIds = await this.getUserSessions(userId);

      if (sessionIds.length === 0) {
        return results;
      }

      // Fetch metadata for each session using our optimized helper method
      for (const sessionId of sessionIds) {
        try {
          const metadata = await this.getUserSessionMetadata(userId, sessionId);

          if (metadata) {
            results.push(metadata);
          } else {
            logger.debug(
              "[RedisConversationMemoryManager] Empty or missing session metadata - removing from user history",
              {
                userId,
                sessionId,
              },
            );
            await this.removeUserSession(userId, sessionId);
          }
        } catch (sessionError) {
          logger.error(
            "[RedisConversationMemoryManager] Failed to get session metadata",
            {
              userId,
              sessionId,
              error:
                sessionError instanceof Error
                  ? sessionError.message
                  : String(sessionError),
            },
          );
          // Continue with other sessions even if one fails
          continue;
        }
      }

      return results;
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to get user all sessions metadata",
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      return results;
    }
  }

  /**
   * Clean up stale pending tool execution data
   * Removes data older than 5 minutes to prevent memory leaks
   */
  private cleanupStalePendingData(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const keysToDelete: string[] = [];

    for (const [key, data] of this.pendingToolExecutions) {
      if (data.timestamp < fiveMinutesAgo) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length > 0) {
      logger.debug(
        "[RedisConversationMemoryManager] Cleaning up stale pending tool data",
        {
          stalePendingKeys: keysToDelete.length,
          totalPendingKeys: this.pendingToolExecutions.size,
        },
      );

      keysToDelete.forEach((key) => this.pendingToolExecutions.delete(key));
    }
  }

  /**
   * Flush pending tool execution data for a session and merge into conversation
   */
  private async flushPendingToolData(
    conversation: { messages: ChatMessage[] },
    sessionId: string,
    userId: string,
  ): Promise<void> {
    const pendingKey = `${sessionId}:${userId}`;
    const pendingData = this.pendingToolExecutions.get(pendingKey);

    if (!pendingData) {
      logger.debug(
        "[RedisConversationMemoryManager] No pending tool data to flush",
        {
          sessionId,
          userId,
          pendingKey,
        },
      );
      return;
    }

    logger.debug(
      "[RedisConversationMemoryManager] Flushing pending tool data",
      {
        sessionId,
        userId,
        toolCallsCount: pendingData.toolCalls.length,
        toolResultsCount: pendingData.toolResults.length,
      },
    );

    // Create a mapping from toolCallId to toolName for matching tool results
    const toolCallMap = new Map<string, string>();

    // Create separate messages for tool calls and build the mapping
    for (const toolCall of pendingData.toolCalls) {
      const toolCallId = String(toolCall.toolCallId);
      const toolName = String(toolCall.toolName);

      // Store in mapping for tool results
      toolCallMap.set(toolCallId, toolName);

      const toolCallMessage: ChatMessage = {
        id: this.generateMessageId(conversation),
        timestamp:
          toolCall.timestamp?.toISOString() || this.generateTimestamp(),
        role: "tool_call",
        content: "", // Can be empty for tool calls
        tool: toolName,
        args: (toolCall.args ||
          toolCall.arguments ||
          toolCall.parameters ||
          {}) as Record<string, unknown>,
      };
      conversation.messages.push(toolCallMessage);
    }

    // Create separate messages for tool results using the mapping
    for (const toolResult of pendingData.toolResults) {
      const toolCallId = String(
        toolResult.toolCallId || toolResult.id || "unknown",
      );
      const toolName = toolCallMap.get(toolCallId) || "unknown";

      const toolResultMessage: ChatMessage = {
        id: this.generateMessageId(conversation),
        timestamp:
          toolResult.timestamp?.toISOString() || this.generateTimestamp(),
        role: "tool_result",
        content: "", // Can be empty for tool results
        tool: toolName, // Now correctly extracted from tool call mapping
        result: {
          success: !toolResult.error,
          result: toolResult.result,
          error: toolResult.error ? String(toolResult.error) : undefined,
        },
      };

      conversation.messages.push(toolResultMessage);
    }

    // Remove the pending data now that it's been flushed
    this.pendingToolExecutions.delete(pendingKey);

    logger.debug(
      "[RedisConversationMemoryManager] Successfully flushed pending tool data",
      {
        sessionId,
        userId,
        toolMessagesAdded:
          pendingData.toolCalls.length + pendingData.toolResults.length,
        totalMessages: conversation.messages.length,
      },
    );
  }
}

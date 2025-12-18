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
  SessionMemory,
} from "../types/conversation.js";
import type { ProviderDetails } from "../types/conversation.js";
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
import { TokenUtils } from "../constants/tokens.js";
import {
  buildContextFromPointer,
  createSummarizationPrompt,
  getEffectiveTokenThreshold,
} from "../utils/conversationMemory.js";

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
   * Generate current timestamp in ISO format
   */
  private generateTimestamp(): string {
    return new Date().toISOString();
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
    providerDetails?: ProviderDetails,
  ): Promise<void> {
    logger.debug("[RedisConversationMemoryManager] Storing conversation turn", {
      sessionId,
      userId,
    });

    await this.ensureInitialized();

    try {
      if (!this.redisClient) {
        throw new Error("Redis client not initialized");
      }

      const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
      const conversationData = await this.redisClient.get(redisKey);
      let conversation = deserializeConversation(conversationData);

      const currentTime = new Date().toISOString();
      const normalizedUserId = userId || "randomUser";

      if (!conversation) {
        const titleGenerationKey = `${sessionId}:${normalizedUserId}`;

        setImmediate(async () => {
          if (this.titleGenerationInProgress.has(titleGenerationKey)) {
            return;
          }
          this.titleGenerationInProgress.add(titleGenerationKey);

          try {
            const title = await this.generateConversationTitle(userMessage);

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
            this.titleGenerationInProgress.delete(titleGenerationKey);
          }
        });

        conversation = {
          id: randomUUID(),
          title: "New Conversation", // Temporary title until generated
          sessionId,
          userId: normalizedUserId,
          createdAt: startTimeStamp?.toISOString() || currentTime,
          updatedAt: startTimeStamp?.toISOString() || currentTime,
          messages: [],
        };
      } else {
        conversation.updatedAt = currentTime;
      }

      const tokenThreshold = providerDetails
        ? getEffectiveTokenThreshold(
            providerDetails.provider,
            providerDetails.model,
            this.config.tokenThreshold,
            conversation.tokenThreshold,
          )
        : this.config.tokenThreshold || 50000;

      const userMsg: ChatMessage = {
        id: randomUUID(),
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
        id: randomUUID(),
        timestamp: this.generateTimestamp(),
        role: "assistant",
        content: aiResponse,
      };
      conversation.messages.push(assistantMsg);

      logger.info("[RedisConversationMemoryManager] Added new messages", {
        sessionId: conversation.sessionId,
        userId: conversation.userId,
      });

      // console.log(">>> storeConversationTurn - checking summarization");
      // console.log(this.config.enableSummarization, providerDetails);

      if (this.config.enableSummarization && providerDetails) {
        setImmediate(async () => {
          try {
            await this.checkAndSummarize(
              conversation,
              tokenThreshold,
              sessionId,
              userId,
            );
          } catch (error) {
            logger.error("Background summarization failed", {
              sessionId: conversation.sessionId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      }

      const serializedData = serializeConversation(conversation);
      await this.redisClient.set(redisKey, serializedData);

      if (this.redisConfig.ttl > 0) {
        await this.redisClient.expire(redisKey, this.redisConfig.ttl);
      }

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
   * Check if summarization is needed based on token count
   */
  private async checkAndSummarize(
    conversation: RedisConversationObject,
    threshold: number,
    sessionId: string,
    userId?: string,
  ): Promise<void> {
    try {
      const session: SessionMemory = {
        sessionId: conversation.sessionId,
        userId: conversation.userId,
        messages: conversation.messages,
        summarizedUpToMessageId: conversation.summarizedUpToMessageId,
        tokenThreshold: conversation.tokenThreshold,
        lastTokenCount: conversation.lastTokenCount,
        lastCountedAt: conversation.lastCountedAt,
        createdAt: new Date(conversation.createdAt).getTime(),
        lastActivity: new Date(conversation.updatedAt).getTime(),
      };

      const contextMessages = buildContextFromPointer(session);
      const tokenCount = this.estimateTokens(contextMessages);

      conversation.lastTokenCount = tokenCount;
      conversation.lastCountedAt = Date.now();
      // console.log(">>> called check and summarize", { tokenCount, threshold });

      if (tokenCount >= threshold) {
        // console.log(">>> summarization triggered");
        await this.summarizeSessionTokenBased(
          conversation,
          threshold,
          sessionId,
          userId,
        );
      }
    } catch (error) {
      logger.error("Token counting or summarization failed", {
        sessionId: conversation.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Estimate total tokens for a list of messages
   */
  private estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      return total + TokenUtils.estimateTokenCount(msg.content);
    }, 0);
  }

  /**
   * Token-based summarization (pointer-based, non-destructive)
   */
  private async summarizeSessionTokenBased(
    conversation: RedisConversationObject,
    threshold: number,
    sessionId: string,
    userId?: string,
  ): Promise<void> {
    const startIndex = conversation.summarizedUpToMessageId
      ? conversation.messages.findIndex(
          (m) => m.id === conversation.summarizedUpToMessageId,
        ) + 1
      : 0;

    const recentMessages = conversation.messages.slice(startIndex);

    if (recentMessages.length === 0) {
      return;
    }

    // We only want to include user, assistant, and system messages in summarization
    const filteredRecentMessages = recentMessages.filter(
      (msg) => msg.role !== "tool_call" && msg.role !== "tool_result",
    );

    const targetRecentTokens = threshold * 0.3;
    const splitIndex = await this.findSplitIndexByTokens(
      filteredRecentMessages,
      targetRecentTokens,
    );

    const messagesToSummarize = filteredRecentMessages.slice(0, splitIndex);

    if (messagesToSummarize.length === 0) {
      return;
    }

    const summary = await this.generateSummary(messagesToSummarize);

    if (!summary) {
      logger.warn(
        `[RedisConversationMemoryManager] Summary generation failed for session ${conversation.sessionId}`,
      );
      return;
    }

    const lastSummarized = messagesToSummarize[messagesToSummarize.length - 1];
    const summaryMessage = this.createSummarySystemMessage(
      summary,
      messagesToSummarize[0].id,
      lastSummarized.id,
    );

    const insertIndex = startIndex + splitIndex;
    conversation.messages.splice(insertIndex, 0, summaryMessage);

    conversation.summarizedUpToMessageId = lastSummarized.id;
    conversation.summarizedUpToMessageIndex = startIndex + splitIndex - 1;

    if (this.redisClient) {
      const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
      const serializedData = serializeConversation(conversation);
      await this.redisClient.set(redisKey, serializedData);

      if (this.redisConfig.ttl > 0) {
        await this.redisClient.expire(redisKey, this.redisConfig.ttl);
      }
    }
  }

  /**
   * Find split index to keep recent messages within target token count
   */
  private async findSplitIndexByTokens(
    messages: ChatMessage[],
    targetRecentTokens: number,
  ): Promise<number> {
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

    // Ensure we're summarizing at least something
    return Math.max(1, splitIndex);
  }

  /**
   * Generate summary using configured provider and model
   */
  private async generateSummary(
    messages: ChatMessage[],
  ): Promise<string | null> {
    const summarizationPrompt = createSummarizationPrompt(messages);
    const summarizer = new NeuroLink({
      conversationMemory: { enabled: false },
    });

    try {
      const providerName = this.config.summarizationProvider;

      // Map provider names to correct format
      let mappedProvider = providerName;
      if (providerName === "vertex") {
        mappedProvider = "googlevertex";
      }

      if (!mappedProvider) {
        logger.error(
          `[RedisConversationMemoryManager] Missing summarization provider`,
        );
        return null;
      }

      logger.debug(
        `[RedisConversationMemoryManager] Using provider: ${mappedProvider} for summarization`,
      );

      const summaryResult = await summarizer.generate({
        input: { text: summarizationPrompt },
        provider: mappedProvider,
        model: this.config.summarizationModel,
        disableTools: true,
      });

      return summaryResult.content || null;
    } catch (error) {
      logger.error(
        `[RedisConversationMemoryManager] Error generating summary`,
        { error },
      );
      return null;
    }
  }

  /**
   * Build context messages for AI prompt injection (TOKEN-BASED)
   * Returns messages from pointer onwards (or all if no pointer)
   * Filters out tool_call and tool_result messages when summarization is enabled
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

    const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
    const conversationData = await this.redisClient?.get(redisKey);
    const conversation = deserializeConversation(conversationData || null);

    if (!conversation) {
      return [];
    }

    const session: SessionMemory = {
      sessionId: conversation.sessionId,
      userId: conversation.userId,
      messages: conversation.messages,
      summarizedUpToMessageId: conversation.summarizedUpToMessageId,
      summarizedUpToMessageIndex: conversation.summarizedUpToMessageIndex,
      tokenThreshold: conversation.tokenThreshold,
      lastTokenCount: conversation.lastTokenCount,
      lastCountedAt: conversation.lastCountedAt,
      createdAt: new Date(conversation.createdAt).getTime(),
      lastActivity: new Date(conversation.updatedAt).getTime(),
    };

    const contextMessages = buildContextFromPointer(session);

    // Filter out tool_call and tool_result messages ONLY if summarization is enabled
    // This optimizes token usage by excluding intermediate tool execution details
    // while preserving the assistant's final responses that incorporate tool results
    const isSummarizationEnabled = this.config.enableSummarization === true;

    let finalMessages = contextMessages;
    if (isSummarizationEnabled) {
      finalMessages = contextMessages.filter(
        (msg) => msg.role !== "tool_call" && msg.role !== "tool_result",
      );
    }

    logger.info("[RedisConversationMemoryManager] Retrieved context messages", {
      sessionId,
      userId,
    });

    return finalMessages;
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
  public createSummarySystemMessage(
    content: string,
    summarizesFrom?: string,
    summarizesTo?: string,
  ): ChatMessage {
    return {
      id: `summary-${randomUUID()}`,
      role: "system",
      content: `Summary of previous conversation turns:\n\n${content}`,
      timestamp: new Date().toISOString(),
      metadata: {
        isSummary: true,
        summarizesFrom,
        summarizesTo,
      },
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
        id: randomUUID(),
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
        id: randomUUID(),
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

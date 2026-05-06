/**
 * Redis Conversation Memory Manager for NeuroLink
 * Redis-based implementation of conversation storage with same interface as ConversationMemoryManager
 */

import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { tracers } from "../telemetry/tracers.js";
import { randomUUID } from "crypto";
import { MESSAGES_PER_TURN } from "../config/conversationMemory.js";
import { generateToolOutputPreview } from "../context/toolOutputLimits.js";
import { NEUROLINK_ARTIFACT_ID_KEY } from "../mcp/mcpOutputNormalizer.js";
import { SummarizationEngine } from "../context/summarizationEngine.js";
import { NeuroLink } from "../neurolink.js";
import type {
  ChatMessage,
  ChatMessageMetadata,
  ToolResultData,
  ConversationMemoryConfig,
  ConversationMemoryStats,
  RedisConversationObject,
  RedisStorageConfig,
  SessionMemory,
  SessionMetadata,
  StoreConversationTurnOptions,
  AgenticLoopReportMetadata,
  IConversationMemoryManager,
  PendingToolExecution,
} from "../types/index.js";
import { ConversationMemoryError } from "../types/index.js";
import { withTimeout } from "../utils/errorHandling.js";

import {
  buildContextFromPointer,
  getEffectiveTokenThreshold,
} from "../utils/conversationMemory.js";
import { runWithCurrentLangfuseContext } from "../services/server/ai/observability/instrumentation.js";
import { logger } from "../utils/logger.js";
import {
  createRedisClient,
  deserializeConversation,
  getNormalizedConfig,
  getPooledRedisClient,
  getSessionKey,
  getUserSessionsKey,
  releasePooledRedisClient,
  scanKeys,
  serializeConversation,
} from "../utils/redis.js";

const redisTracer = tracers.redis;
const REDIS_TIMEOUT_MS = 5000;

/**
 * Redis-based implementation of the ConversationMemoryManager
 * Uses the same interface but stores data in Redis
 */

export class RedisConversationMemoryManager implements IConversationMemoryManager {
  public config: ConversationMemoryConfig;
  private isInitialized: boolean = false;
  private summarizationEngine: SummarizationEngine = new SummarizationEngine();
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

  /**
   * Track sessions currently being summarized to prevent race conditions
   * Key format: "${sessionId}:${userId}"
   */
  private summarizationInProgress: Set<string> = new Set();

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

    await redisTracer.startActiveSpan(
      "neurolink.memory.initialize",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "redis.host": this.redisConfig.host,
          "redis.port": this.redisConfig.port,
          "redis.key_prefix": this.redisConfig.keyPrefix,
        },
      },
      async (span) => {
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

          this.redisClient = await getPooledRedisClient(this.redisConfig);
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
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );
          logger.error(
            "[RedisConversationMemoryManager] Failed to initialize",
            {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              config: {
                host: this.redisConfig.host,
                port: this.redisConfig.port,
              },
            },
          );

          throw new ConversationMemoryError(
            "Failed to initialize Redis conversation memory",
            "CONFIG_ERROR",
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        } finally {
          span.end();
        }
      },
    );
  }

  /** Whether this memory manager can persist data (Redis connected and initialized) */
  public get canPersist(): boolean {
    return (
      this.isInitialized && this.redisClient !== null && this.redisClient.isOpen
    );
  }

  /** Whether Redis client is configured and connected */
  public get isRedisConfigured(): boolean {
    return this.redisClient !== null && this.redisClient.isOpen;
  }

  /** Get health status for monitoring */
  public getHealthStatus(): {
    initialized: boolean;
    connected: boolean;
    host: string;
    keyPrefix: string;
  } {
    return {
      initialized: this.isInitialized,
      connected: this.redisClient?.isOpen ?? false,
      host: this.redisConfig.host,
      keyPrefix: this.redisConfig.keyPrefix,
    };
  }

  /**
   * Get session by ID, reconstructing a SessionMemory from Redis storage.
   */
  public async getSession(
    sessionId: string,
    userId?: string,
    requestId?: string,
  ): Promise<SessionMemory | undefined> {
    await this.ensureInitialized();
    if (!this.redisClient) {
      return undefined;
    }
    const redisClient = this.redisClient;

    return redisTracer.startActiveSpan(
      "neurolink.memory.getSession",
      { kind: SpanKind.CLIENT, attributes: { "session.id": sessionId } },
      async (span) => {
        if (userId) {
          span.setAttribute("user.id", userId);
        }
        try {
          const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
          const conversationData = await withTimeout(
            redisClient.get(redisKey),
            REDIS_TIMEOUT_MS,
          );
          const conversation = deserializeConversation(
            conversationData || null,
          );
          if (!conversation) {
            span.setAttribute("session.found", false);
            return undefined;
          }

          span.setAttribute("session.found", true);

          // Log session load metadata for observability
          const blobSizeBytes = conversationData
            ? Buffer.byteLength(conversationData, "utf8")
            : 0;
          const messageCount = conversation.messages.length;
          const hasSummary = !!conversation.summarizedUpToMessageId;
          const pointerIndex = hasSummary
            ? conversation.messages.findIndex(
                (msg) => msg.id === conversation.summarizedUpToMessageId,
              )
            : -1;
          const recentMessageCount =
            hasSummary && pointerIndex !== -1
              ? messageCount - pointerIndex - 1
              : messageCount;

          span.setAttribute("message.count", messageCount);
          span.setAttribute("blob.size_bytes", blobSizeBytes);

          logger.info("[ConversationMemory] Session loaded", {
            requestId,
            sessionId,
            blobSizeBytes,
            messageCount,
            hasSummary,
            recentMessageCount,
          });

          if (blobSizeBytes > 512 * 1024) {
            logger.warn("[ConversationMemory] Large session blob", {
              requestId,
              sessionId,
              blobSizeBytes,
              messageCount,
            });
          }

          return {
            sessionId: conversation.sessionId,
            userId: conversation.userId,
            messages: conversation.messages,
            summarizedUpToMessageId: conversation.summarizedUpToMessageId,
            summarizedMessage: conversation.summarizedMessage,
            tokenThreshold: conversation.tokenThreshold,
            lastTokenCount: conversation.lastTokenCount,
            lastCountedAt: conversation.lastCountedAt,
            lastApiTokenCount: conversation.lastApiTokenCount,
            createdAt: new Date(conversation.createdAt).getTime(),
            lastActivity: new Date(conversation.updatedAt).getTime(),
          };
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );
          logger.error(
            "[RedisConversationMemoryManager] Failed to get session",
            {
              sessionId,
              userId,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          return undefined;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Get raw session data without any filtering or transformation.
   * Used by the memory retrieval tool and internal APIs that need
   * access to full message data including unmodified tool outputs.
   */
  async getSessionRaw(
    sessionId: string,
    userId?: string,
  ): Promise<RedisConversationObject | null> {
    try {
      await this.ensureInitialized();
      if (!this.redisClient) {
        return null;
      }
      const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
      const conversationData = await this.redisClient.get(redisKey);
      return deserializeConversation(conversationData || null);
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to get raw session",
        {
          sessionId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
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
      return Array.from(sessions).map(String);
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

      return Number(result) > 0;
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
      output?: unknown;
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
    options: StoreConversationTurnOptions,
  ): Promise<void> {
    logger.debug("[RedisConversationMemoryManager] Storing conversation turn", {
      sessionId: options.sessionId,
      userId: options.userId,
    });

    await this.ensureInitialized();

    // NLK-GAP-012: Add span for storeTurn CRUD operation
    return redisTracer.startActiveSpan(
      "neurolink.memory.storeTurn",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "session.id": options.sessionId,
          ...(options.userId && { "user.id": options.userId }),
        },
      },
      async (span) => {
        try {
          if (!this.redisClient) {
            throw new Error("Redis client not initialized");
          }

          const redisKey = getSessionKey(
            this.redisConfig,
            options.sessionId,
            options.userId,
          );
          const conversationData = await this.redisClient.get(redisKey);
          let conversation = deserializeConversation(conversationData);

          const currentTime = new Date().toISOString();
          const normalizedUserId = options.userId || "randomUser";

          if (!conversation) {
            const titleGenerationKey = `${options.sessionId}:${normalizedUserId}`;

            // Capture the current Langfuse ALS context before setImmediate,
            // which breaks automatic AsyncLocalStorage propagation and would
            // otherwise cause orphaned traces in Langfuse.
            const generateTitleWithContext = runWithCurrentLangfuseContext(
              async () => {
                if (this.titleGenerationInProgress.has(titleGenerationKey)) {
                  return;
                }
                this.titleGenerationInProgress.add(titleGenerationKey);

                try {
                  const title = await this.generateConversationTitle(
                    options.userMessage,
                  );

                  const updatedRedisKey = getSessionKey(
                    this.redisConfig,
                    options.sessionId,
                    options.userId || undefined,
                  );
                  const updatedConversationData =
                    await this.redisClient?.get(updatedRedisKey);
                  const updatedConversation = deserializeConversation(
                    updatedConversationData || null,
                  );

                  if (updatedConversation) {
                    updatedConversation.title = title;
                    updatedConversation.updatedAt = new Date().toISOString();

                    const serializedData =
                      serializeConversation(updatedConversation);
                    await this.redisClient?.set(
                      updatedRedisKey,
                      serializedData,
                    );

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
                      sessionId: options.sessionId,
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
              },
            );
            setImmediate(generateTitleWithContext);

            conversation = {
              id: randomUUID(),
              title: "New Conversation", // Temporary title until generated
              sessionId: options.sessionId,
              userId: normalizedUserId,
              createdAt: options.startTimeStamp?.toISOString() || currentTime,
              updatedAt: options.startTimeStamp?.toISOString() || currentTime,
              messages: [],
            };
          } else {
            conversation.updatedAt = currentTime;
          }

          const tokenThreshold = options.providerDetails
            ? getEffectiveTokenThreshold(
                options.providerDetails.provider,
                options.providerDetails.model,
                this.config.tokenThreshold,
                conversation.tokenThreshold,
              )
            : this.config.tokenThreshold || 50000;

          const userMsg: ChatMessage = {
            id: randomUUID(),
            timestamp:
              options.startTimeStamp?.toISOString() || this.generateTimestamp(),
            role: "user",
            content: options.userMessage,
          };
          conversation.messages.push(userMsg);

          await this.flushPendingToolData(
            conversation,
            options.sessionId,
            normalizedUserId,
          );

          const assistantMsg: ChatMessage = {
            id: randomUUID(),
            timestamp: this.generateTimestamp(),
            role: "assistant",
            content: options.aiResponse,
            events: options.events || undefined,
            ...(options.thoughtSignature && {
              metadata: { thoughtSignature: options.thoughtSignature },
            }),
          };
          conversation.messages.push(assistantMsg);

          // Store API-reported token counts if available
          if (options.tokenUsage) {
            conversation.lastApiTokenCount = options.tokenUsage;
          }

          logger.info("[RedisConversationMemoryManager] Added new messages", {
            sessionId: conversation.sessionId,
            userId: conversation.userId,
          });

          // Use per-request enableSummarization with higher priority than instance config
          const shouldSummarize =
            options.enableSummarization !== undefined
              ? options.enableSummarization
              : this.config.enableSummarization;

          if (shouldSummarize) {
            const normalizedUserId = options.userId || "randomUser";
            const summarizationKey = `${options.sessionId}:${normalizedUserId}`;

            // Only trigger summarization if not already in progress for this session
            if (!this.summarizationInProgress.has(summarizationKey)) {
              // Capture the current Langfuse ALS context before setImmediate,
              // which breaks automatic AsyncLocalStorage propagation and would
              // otherwise cause orphaned traces in Langfuse.
              const summarizeWithContext = runWithCurrentLangfuseContext(
                async () => {
                  try {
                    await this.checkAndSummarize(
                      conversation,
                      tokenThreshold,
                      options.sessionId,
                      options.userId,
                      options.requestId,
                    );
                  } catch (error) {
                    logger.error("Background summarization failed", {
                      sessionId: conversation.sessionId,
                      error:
                        error instanceof Error ? error.message : String(error),
                    });
                  }
                },
              );
              setImmediate(summarizeWithContext);
            } else {
              logger.debug(
                "[RedisConversationMemoryManager] Summarization already in progress, skipping",
                {
                  sessionId: options.sessionId,
                  userId: normalizedUserId,
                },
              );
            }
          }

          const serializedData = serializeConversation(conversation);
          await this.redisClient.set(redisKey, serializedData);

          // Log turn storage metadata for observability
          const blobSizeBytes = Buffer.byteLength(serializedData, "utf8");
          logger.info("[ConversationMemory] Turn stored", {
            requestId: options.requestId,
            sessionId: options.sessionId,
            blobSizeBytes,
            totalMessages: conversation.messages.length,
            userMsgChars: options.userMessage.length,
            assistantMsgChars: options.aiResponse.length,
          });

          if (blobSizeBytes > 512 * 1024) {
            logger.warn("[ConversationMemory] Large session blob", {
              requestId: options.requestId,
              sessionId: options.sessionId,
              blobSizeBytes,
              messageCount: conversation.messages.length,
            });
          }

          if (this.redisConfig.ttl > 0) {
            await this.redisClient.expire(redisKey, this.redisConfig.ttl);
          }

          if (options.userId) {
            await this.addUserSession(options.userId, options.sessionId);
          }

          span.setAttribute("message.count", conversation.messages.length);
          span.setStatus({ code: SpanStatusCode.OK });
          logger.debug(
            "[RedisConversationMemoryManager] Successfully stored conversation turn",
            {
              sessionId: options.sessionId,
              totalMessages: conversation.messages.length,
              title: conversation.title,
            },
          );
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );
          throw new ConversationMemoryError(
            `Failed to store conversation turn in Redis for session ${options.sessionId}`,
            "STORAGE_ERROR",
            {
              sessionId: options.sessionId,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Check if summarization is needed based on token count
   */
  private async checkAndSummarize(
    conversation: RedisConversationObject,
    threshold: number,
    sessionId: string,
    userId?: string,
    requestId?: string,
  ): Promise<void> {
    const normalizedUserId = userId || "randomUser";
    const summarizationKey = `${sessionId}:${normalizedUserId}`;

    if (this.summarizationInProgress.has(summarizationKey)) {
      logger.debug(
        "[RedisConversationMemoryManager] Summarization already in progress, skipping",
        {
          sessionId,
          userId: normalizedUserId,
        },
      );
      return;
    }

    this.summarizationInProgress.add(summarizationKey);

    try {
      const session: SessionMemory = {
        sessionId: conversation.sessionId,
        userId: conversation.userId,
        messages: conversation.messages,
        summarizedUpToMessageId: conversation.summarizedUpToMessageId,
        summarizedMessage: conversation.summarizedMessage,
        tokenThreshold: conversation.tokenThreshold,
        lastTokenCount: conversation.lastTokenCount,
        lastCountedAt: conversation.lastCountedAt,
        createdAt: new Date(conversation.createdAt).getTime(),
        lastActivity: new Date(conversation.updatedAt).getTime(),
      };

      const summarized = await this.summarizationEngine.checkAndSummarize(
        session,
        threshold,
        this.config,
        "[RedisConversationMemoryManager]",
        requestId,
      );

      conversation.lastTokenCount = session.lastTokenCount;
      conversation.lastCountedAt = session.lastCountedAt;

      if (summarized) {
        conversation.summarizedUpToMessageId = session.summarizedUpToMessageId;
        conversation.summarizedMessage = session.summarizedMessage;

        if (this.redisClient) {
          const redisKey = getSessionKey(this.redisConfig, sessionId, userId);

          // Re-read current state to avoid clobbering messages added during summarization
          const latestData = await this.redisClient.get(redisKey);
          if (latestData) {
            const latestConversation = deserializeConversation(latestData);
            if (latestConversation) {
              // Apply only summarization metadata onto the fresh state
              latestConversation.summarizedUpToMessageId =
                conversation.summarizedUpToMessageId;
              latestConversation.summarizedMessage =
                conversation.summarizedMessage;
              latestConversation.lastTokenCount = conversation.lastTokenCount;
              latestConversation.lastCountedAt = conversation.lastCountedAt;
              const freshSerialized = serializeConversation(latestConversation);
              await this.redisClient.set(redisKey, freshSerialized);
              if (this.redisConfig.ttl > 0) {
                await this.redisClient.expire(redisKey, this.redisConfig.ttl);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error("Token counting or summarization failed", {
        sessionId: conversation.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.summarizationInProgress.delete(summarizationKey);
    }
  }

  /**
   * Build context messages for AI prompt injection (TOKEN-BASED)
   * Returns messages from pointer onwards (or all if no pointer)
   * Applies sendToolPreview toggle and hydrates result.result for backward compat
   */
  async buildContextMessages(
    sessionId: string,
    userId?: string,
    enableSummarization?: boolean,
    requestId?: string,
  ): Promise<ChatMessage[]> {
    logger.debug("[RedisConversationMemoryManager] Building context messages", {
      sessionId,
      userId,
      enableSummarization,
    });
    await this.ensureInitialized();
    if (!this.redisClient) {
      logger.warn(
        "[RedisConversationMemoryManager] Redis client not available in buildContextMessages",
      );
      return [];
    }
    const redisClient = this.redisClient;

    // NLK-GAP-012: Add span for buildContext CRUD operation
    return redisTracer.startActiveSpan(
      "neurolink.memory.buildContext",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "session.id": sessionId,
          ...(userId && { "user.id": userId }),
        },
      },
      async (span) => {
        try {
          logger.info(
            "[RedisConversationMemoryManager] Building context messages",
            {
              sessionId,
              userId,
              method: "buildContextMessages",
            },
          );

          const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
          const conversationData = await withTimeout(
            redisClient.get(redisKey),
            REDIS_TIMEOUT_MS,
          );
          const conversation = deserializeConversation(
            conversationData || null,
          );

          logger.debug(
            "[RedisConversationMemoryManager] Retrieved conversation for context building",
            {
              sessionId,
              userId,
              conversationFound: !!conversation,
            },
          );

          if (!conversation) {
            span.setAttribute("session.found", false);
            span.setStatus({ code: SpanStatusCode.OK });
            return [];
          }

          const session: SessionMemory = {
            sessionId: conversation.sessionId,
            userId: conversation.userId,
            messages: conversation.messages,
            summarizedUpToMessageId: conversation.summarizedUpToMessageId,
            summarizedMessage: conversation.summarizedMessage,
            tokenThreshold: conversation.tokenThreshold,
            lastTokenCount: conversation.lastTokenCount,
            lastCountedAt: conversation.lastCountedAt,
            createdAt: new Date(conversation.createdAt).getTime(),
            lastActivity: new Date(conversation.updatedAt).getTime(),
          };

          const contextMessages = buildContextFromPointer(session, requestId);

          logger.debug(
            "[RedisConversationMemoryManager] Built context messages from pointer",
            {
              sessionId,
              userId,
              contextMessageCount: contextMessages.length,
              pointerMessageId: session.summarizedUpToMessageId || "none",
            },
          );

          const sendToolPreview =
            this.config?.contextCompaction?.sendToolPreview === true;

          // Map tool_result messages: apply preview toggle + hydrate result.result
          const finalMessages = contextMessages.map((msg) => {
            if (msg.role !== "tool_result") {
              return msg;
            }

            // Toggle: swap content to preview if enabled AND a preview exists
            const content =
              sendToolPreview && msg.metadata?.toolOutputPreview
                ? msg.metadata.toolOutputPreview
                : msg.content;

            // Hydrate result.result from content for backward compatibility
            // (result.result is no longer stored — inferred from content at read time)
            let hydratedResult = msg.result;
            if (msg.result && msg.result.result === undefined) {
              let parsedResult: unknown = content;
              try {
                parsedResult = JSON.parse(content);
              } catch {
                /* plain text — use as-is */
              }
              hydratedResult = { ...msg.result, result: parsedResult };
            }

            logger.debug(
              "[RedisConversationMemoryManager] Processing tool_result message for context",
              {
                sessionId,
                userId,
                messageId: msg.id,
                sendToolPreview,
                hasPreview: !!msg.metadata?.toolOutputPreview,
                contentLength: content ? String(content).length : 0,
                resultHydrated: hydratedResult !== msg.result,
              },
            );

            return { ...msg, content, result: hydratedResult };
          });

          // Tool messages now have real content and participate in context properly.
          // The tool output pruner (Stage 1) handles bounding old tool outputs.

          span.setAttribute("context.message_count", finalMessages.length);
          span.setStatus({ code: SpanStatusCode.OK });
          logger.info(
            "[RedisConversationMemoryManager] Retrieved context messages",
            {
              sessionId,
              userId,
            },
          );

          return finalMessages;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );
          throw error;
        } finally {
          span.end();
        }
      },
    );
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
          metadata: conversation.additionalMetadata?.agenticLoopReports
            ? {
                agenticLoopReports:
                  conversation.additionalMetadata.agenticLoopReports,
              }
            : undefined,
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
        {
          userId,
          sessionId,
        },
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
    logger.info(
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

      const defaultTitlePrompt = `Generate a clear, concise, and descriptive title (20-25 letters maximum) for a conversation based on the following user message.
The title must meaningfully reflect the topic or intent of the message.
Do not output anything unrelated, vague, or generic.
Do not say you cannot create a title. Always return a valid title.

User message: "${userMessage}"`;

      const customPrompt = process.env.NEUROLINK_TITLE_PROMPT;
      const titlePrompt = customPrompt
        ? customPrompt.replace(/\$\{userMessage\}/g, userMessage)
        : defaultTitlePrompt;

      const result = await titleGenerator.generate({
        input: { text: titlePrompt },
        provider: this.config.summarizationProvider || "vertex",
        model: this.config.summarizationModel || "gemini-2.5-flash",
        disableTools: true, // Title generation doesn't need tools — saves ~600 tokens of tool descriptions
      });

      // Clean up the generated title
      let title = result.content?.trim() || "New Conversation";

      // Remove common prefixes/suffixes that might be added by the AI
      title = title.replace(/^(Title:|Here's a title:|The title is:)\s*/i, "");
      title = title.replace(/['"]/g, ""); // Remove quotes
      title = title.replace(/\.$/, ""); // Remove trailing period

      if (title.length < 3) {
        title = "New Conversation";
      }

      logger.info(
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
   * Get the raw messages array for a session.
   * Returns the full messages list without context filtering or summarization.
   */
  async getSessionMessages(
    sessionId: string,
    userId?: string,
  ): Promise<ChatMessage[]> {
    await this.ensureInitialized();
    if (!this.redisClient) {
      return [];
    }

    try {
      const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
      const conversationData = await this.redisClient.get(redisKey);
      const conversation = deserializeConversation(conversationData || null);
      return conversation?.messages ?? [];
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to get session messages",
        {
          sessionId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return [];
    }
  }

  /**
   * Replace the entire messages array for a session.
   * The session must already exist in Redis.
   */
  async setSessionMessages(
    sessionId: string,
    messages: ChatMessage[],
    userId?: string,
  ): Promise<void> {
    await this.ensureInitialized();
    if (!this.redisClient) {
      throw new ConversationMemoryError(
        "Redis client not initialized",
        "STORAGE_ERROR",
        { sessionId },
      );
    }

    try {
      const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
      const conversationData = await this.redisClient.get(redisKey);
      const conversation = deserializeConversation(conversationData || null);

      if (!conversation) {
        throw new ConversationMemoryError(
          `Session ${sessionId} not found`,
          "STORAGE_ERROR",
          { sessionId },
        );
      }

      conversation.messages = messages;
      conversation.updatedAt = new Date().toISOString();
      // Reset summarization pointers — the old summary no longer applies
      // to the replaced messages array
      conversation.summarizedUpToMessageId = undefined;
      conversation.summarizedMessage = undefined;
      conversation.lastTokenCount = undefined;
      conversation.lastCountedAt = undefined;

      const serializedData = serializeConversation(conversation);
      await this.redisClient.set(redisKey, serializedData);

      if (this.redisConfig.ttl > 0) {
        await this.redisClient.expire(redisKey, this.redisConfig.ttl);
      }

      logger.debug(
        "[RedisConversationMemoryManager] Session messages replaced",
        {
          sessionId,
          userId,
          messageCount: messages.length,
        },
      );
    } catch (error) {
      if (error instanceof ConversationMemoryError) {
        throw error;
      }
      throw new ConversationMemoryError(
        `Failed to set session messages for session ${sessionId}`,
        "STORAGE_ERROR",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    if (this.redisClient) {
      await releasePooledRedisClient(this.redisConfig);
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
    const redisClient = this.redisClient;

    // NLK-GAP-012: Add span for clearSession CRUD operation
    return redisTracer.startActiveSpan(
      "neurolink.memory.clear",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "session.id": sessionId,
          ...(userId && { "user.id": userId }),
        },
      },
      async (span) => {
        try {
          const redisKey = getSessionKey(this.redisConfig, sessionId, userId);
          const result = await withTimeout(
            redisClient.del(redisKey),
            REDIS_TIMEOUT_MS,
          );

          if (Number(result) > 0) {
            // Remove session from user's session set
            if (userId) {
              await this.removeUserSession(userId, sessionId);
            }

            span.setAttribute("session.deleted", true);
            span.setStatus({ code: SpanStatusCode.OK });
            logger.info("Redis session cleared", { sessionId });
            return true;
          }

          span.setAttribute("session.deleted", false);
          span.setStatus({ code: SpanStatusCode.OK });
          return false;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          span.recordException(
            error instanceof Error ? error : new Error(String(error)),
          );
          throw error;
        } finally {
          span.end();
        }
      },
    );
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

    try {
      // Create a mapping from toolCallId to toolName for matching tool results
      const toolCallMap = new Map<string, string>();

      // Create separate messages for tool calls and build the mapping
      for (const toolCall of pendingData.toolCalls) {
        const toolCallId = toolCall.toolCallId ?? "";
        const toolName = toolCall.toolName ?? "";

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
          metadata: {
            ...(toolCall.thoughtSignature
              ? { thoughtSignature: String(toolCall.thoughtSignature) }
              : {}),
            ...(toolCall.stepIndex !== null && toolCall.stepIndex !== undefined
              ? { stepIndex: Number(toolCall.stepIndex) }
              : {}),
          },
        };
        conversation.messages.push(toolCallMessage);
      }

      // Create separate messages for tool results using the mapping
      for (const toolResult of pendingData.toolResults) {
        const toolCallId = String(
          toolResult.toolCallId || toolResult.id || "unknown",
        );
        const toolName =
          toolCallMap.get(toolCallId) ||
          String(toolResult.toolName || "unknown");
        const toolResultRecord = toolResult as Record<string, unknown>;
        const selectedResultField =
          "output" in toolResultRecord ? "output" : "result";
        const toolResultValue =
          selectedResultField === "output"
            ? toolResultRecord.output
            : toolResult.result;

        // Serialize the tool result to string for content field
        let serializedResult: string;
        if (typeof toolResultValue === "string") {
          serializedResult = toolResultValue;
        } else if (toolResultValue === undefined || toolResultValue === null) {
          serializedResult = String(toolResultValue ?? "null");
        } else {
          try {
            serializedResult = JSON.stringify(toolResultValue, null, 2);
          } catch (serializeError) {
            serializedResult = `[Serialization failed: ${serializeError instanceof Error ? serializeError.message : String(serializeError)}]`;
          }
        }

        // Generate preview (uses existing config fields that were previously unused)
        const { preview, truncated, originalSize } = generateToolOutputPreview(
          serializedResult,
          {
            maxBytes: this.config?.contextCompaction?.maxToolOutputBytes,
            maxLines: this.config?.contextCompaction?.maxToolOutputLines,
          },
        );

        // Extract artifact ID if this result was externalized by McpOutputNormalizer.
        // The surrogate carries `_meta.neurolinkArtifactId` on the raw result object.
        let artifactId: string | undefined;
        try {
          const rawResult = toolResultValue;
          if (rawResult && typeof rawResult === "object") {
            const meta = (rawResult as Record<string, unknown>)._meta;
            if (meta && typeof meta === "object") {
              const idValue = (meta as Record<string, unknown>)[
                NEUROLINK_ARTIFACT_ID_KEY
              ];
              if (typeof idValue === "string") {
                artifactId = idValue;
              }
            }
          }
        } catch {
          // Ignore extraction errors — artifact ID is best-effort metadata
        }

        // Build metadata — only store preview when truncation occurred (no duplication)
        const metadata: ChatMessageMetadata = {
          truncated,
          ...(truncated && { toolOutputPreview: preview }),
          ...(truncated && { originalSize }),
          ...(artifactId && { artifactId }),
          ...(toolResult.stepIndex !== null &&
          toolResult.stepIndex !== undefined
            ? { stepIndex: Number(toolResult.stepIndex) }
            : {}),
        };

        // Build result — success/error metadata only, NOT the output data
        const result: ToolResultData = {
          success: !toolResult.error,
          // result.result intentionally NOT stored — inferred from content at read time
          error: toolResult.error ? String(toolResult.error) : undefined,
        };

        const toolResultMessage: ChatMessage = {
          id: randomUUID(),
          timestamp:
            toolResult.timestamp?.toISOString() || this.generateTimestamp(),
          role: "tool_result",
          content: serializedResult, // Full output (was "")
          tool: toolName,
          result,
          metadata,
        };

        conversation.messages.push(toolResultMessage);
      }

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
    } finally {
      // Always clean up pending data, even on failure, to prevent infinite retry loops
      this.pendingToolExecutions.delete(pendingKey);
    }
  }

  /**
   * Update agentic loop report metadata for a conversation session.
   * Upserts a report entry by reportId — updates existing or adds new.
   * Follows the read → patch → write pattern (same as title generation).
   *
   * @param sessionId The session identifier
   * @param userId The user identifier (optional)
   * @param report The report metadata to upsert
   */
  public async updateAgenticLoopReport(
    sessionId: string,
    userId: string | undefined,
    report: AgenticLoopReportMetadata,
  ): Promise<void> {
    logger.debug(
      "[RedisConversationMemoryManager] Updating agentic loop report",
      {
        sessionId,
        userId,
        reportId: report.reportId,
        reportType: report.reportType,
        reportStatus: report.reportStatus,
      },
    );

    await this.ensureInitialized();

    if (!this.redisClient) {
      logger.warn(
        "[RedisConversationMemoryManager] Redis client not available for report update",
        { sessionId, userId },
      );
      return;
    }

    try {
      const redisKey = getSessionKey(
        this.redisConfig,
        sessionId,
        userId || undefined,
      );
      const conversationData = await withTimeout(
        this.redisClient.get(redisKey),
        5000,
      );

      if (!conversationData) {
        logger.warn(
          "[RedisConversationMemoryManager] No conversation found for report update",
          { sessionId, userId },
        );
        return;
      }

      const conversation = deserializeConversation(conversationData);
      if (!conversation) {
        logger.warn(
          "[RedisConversationMemoryManager] Failed to deserialize conversation for report update",
          { sessionId, userId },
        );
        return;
      }

      // Initialize additionalMetadata and agenticLoopReports if needed
      if (!conversation.additionalMetadata) {
        conversation.additionalMetadata = {};
      }
      if (!conversation.additionalMetadata.agenticLoopReports) {
        conversation.additionalMetadata.agenticLoopReports = [];
      }

      // Upsert: find existing report by reportId and update, or push new entry
      const existingIndex =
        conversation.additionalMetadata.agenticLoopReports.findIndex(
          (r) => r.reportId === report.reportId,
        );

      if (existingIndex >= 0) {
        conversation.additionalMetadata.agenticLoopReports[existingIndex] =
          report;
        logger.debug(
          "[RedisConversationMemoryManager] Updated existing agentic loop report",
          { sessionId, reportId: report.reportId },
        );
      } else {
        conversation.additionalMetadata.agenticLoopReports.push(report);
        logger.debug(
          "[RedisConversationMemoryManager] Added new agentic loop report",
          { sessionId, reportId: report.reportId },
        );
      }

      conversation.updatedAt = new Date().toISOString();

      // Write back to Redis
      const serializedData = serializeConversation(conversation);
      await withTimeout(this.redisClient.set(redisKey, serializedData), 5000);

      if (this.redisConfig.ttl > 0) {
        await withTimeout(
          this.redisClient.expire(redisKey, this.redisConfig.ttl),
          5000,
        );
      }

      logger.info(
        "[RedisConversationMemoryManager] Successfully updated agentic loop report",
        {
          sessionId,
          userId,
          reportId: report.reportId,
          reportStatus: report.reportStatus,
        },
      );
    } catch (error) {
      logger.error(
        "[RedisConversationMemoryManager] Failed to update agentic loop report",
        {
          sessionId,
          userId,
          reportId: report.reportId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw new ConversationMemoryError(
        "Failed to update agentic loop report",
        "STORAGE_ERROR",
        {
          sessionId,
          userId,
          reportId: report.reportId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}

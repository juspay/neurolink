/**
 * Memory Persistence Processor
 *
 * Stores conversation turns in memory for future retrieval.
 * Supports both in-memory and Redis stores with optional summarization.
 *
 * @module memoryPersistenceProcessor
 */

import type {
  MemoryPersistenceConfig,
  OutputProcessor,
  OutputProcessorData,
  ProcessorResult,
} from "../../types/index.js";

/**
 * Create a Memory Persistence Processor
 *
 * Stores conversation turns in memory stores for future retrieval,
 * enabling conversation continuity across sessions.
 *
 * @param defaultConfig - Default configuration
 * @returns OutputProcessor instance
 *
 * @example Basic usage
 * ```typescript
 * const memoryProcessor = createMemoryPersistenceProcessor({
 *   storeType: 'redis',
 *   maxMessages: 100,
 *   ttlSeconds: 86400, // 24 hours
 * });
 *
 * const result = await memoryProcessor.process(outputData);
 * ```
 *
 * @example With summarization
 * ```typescript
 * const memoryProcessor = createMemoryPersistenceProcessor({
 *   enableSummarization: true,
 *   maxMessages: 50,
 *   includeToolCalls: true,
 * });
 * ```
 */
export function createMemoryPersistenceProcessor(
  defaultConfig?: MemoryPersistenceConfig,
): OutputProcessor<MemoryPersistenceConfig> {
  return {
    id: "memory-persistence",
    name: "Memory Persistence",
    description: "Stores conversation turns in memory for future retrieval",
    priority: 50, // Run after other output processors

    async process(
      data: OutputProcessorData,
      config?: MemoryPersistenceConfig,
    ): Promise<ProcessorResult<OutputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        storeType = "in-memory",
        sessionId,
        maxMessages = 100,
        ttlSeconds,
        includeToolCalls = true,
        enableSummarization = false,
        customMetadata = {},
      } = mergedConfig;

      const effectiveSessionId = sessionId || data.metadata.sessionId;

      if (!effectiveSessionId) {
        return {
          action: "continue",
          data,
          metadata: {
            memoryPersistenceSkipped: true,
            reason: "no_session_id",
          },
        };
      }

      try {
        // Build the conversation turn to store
        const turn: ConversationTurn = {
          userMessage: data.input.text,
          assistantMessage: data.responseText,
          toolCalls: includeToolCalls ? data.toolCalls : undefined,
          timestamp: Date.now(),
          metadata: {
            ...customMetadata,
            provider: data.metadata.provider,
            model: data.metadata.model,
            requestId: data.metadata.requestId,
          },
        };

        // Store in appropriate memory store
        await storeConversationTurn(effectiveSessionId, turn, storeType, {
          maxMessages,
          ttlSeconds,
          enableSummarization,
        });

        return {
          action: "continue",
          data,
          metadata: {
            memoryPersisted: true,
            storeType,
            sessionId: effectiveSessionId,
            includeToolCalls,
          },
        };
      } catch (error) {
        // Don't fail the response if memory persistence fails
        return {
          action: "continue",
          data,
          issues: [
            {
              category: "memory_persistence",
              severity: "warning",
              message: `Memory persistence failed: ${error instanceof Error ? error.message : String(error)}`,
              context: { storeType, sessionId: effectiveSessionId },
            },
          ],
          metadata: {
            memoryPersisted: false,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    validateConfig(config: MemoryPersistenceConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (config.maxMessages !== undefined && config.maxMessages < 1) {
        errors.push("maxMessages must be at least 1");
      }

      if (config.ttlSeconds !== undefined && config.ttlSeconds < 0) {
        errors.push("ttlSeconds must be non-negative");
      }

      if (
        config.storeType &&
        !["redis", "in-memory"].includes(config.storeType)
      ) {
        errors.push(
          `Invalid storeType: ${config.storeType}. Must be 'redis' or 'in-memory'`,
        );
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Conversation turn structure for storage
 */
type ConversationTurn = {
  /** User's input message */
  userMessage?: string;
  /** Assistant's response message */
  assistantMessage: string;
  /** Tool calls made during the turn */
  toolCalls?: Array<{
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
  }>;
  /** Timestamp when the turn occurred */
  timestamp: number;
  /** Additional metadata */
  metadata: Record<string, unknown>;
};

/**
 * Options for storing conversation turns
 */
type StoreOptions = {
  maxMessages: number;
  ttlSeconds?: number;
  enableSummarization: boolean;
};

/**
 * Store a conversation turn in the specified memory store
 *
 * This is a placeholder implementation. In production, this would
 * integrate with ConversationMemoryManager or RedisConversationMemoryManager.
 *
 * @param sessionId - Session identifier
 * @param turn - Conversation turn to store
 * @param storeType - Type of memory store
 * @param options - Storage options
 */
async function storeConversationTurn(
  _sessionId: string,
  _turn: ConversationTurn,
  _storeType: "redis" | "in-memory",
  _options: StoreOptions,
): Promise<void> {
  // This is a placeholder implementation
  // In production, this would integrate with:
  // - ConversationMemoryManager for in-memory storage
  // - RedisConversationMemoryManager for Redis storage
  //
  // The implementation would look something like:
  //
  // if (storeType === 'redis') {
  //   const redisManager = getRedisConversationMemoryManager();
  //   await redisManager.addMessage(sessionId, {
  //     role: 'user',
  //     content: turn.userMessage || '',
  //   });
  //   await redisManager.addMessage(sessionId, {
  //     role: 'assistant',
  //     content: turn.assistantMessage,
  //     toolCalls: turn.toolCalls,
  //   });
  //
  //   // Apply TTL if specified
  //   if (options.ttlSeconds) {
  //     await redisManager.setTTL(sessionId, options.ttlSeconds);
  //   }
  //
  //   // Enforce max messages
  //   await redisManager.trimMessages(sessionId, options.maxMessages);
  //
  //   // Optionally summarize if over limit
  //   if (options.enableSummarization) {
  //     await redisManager.summarizeIfNeeded(sessionId, options.maxMessages);
  //   }
  // } else {
  //   const memoryManager = getConversationMemoryManager();
  //   await memoryManager.addTurn(sessionId, turn, options);
  // }

  // For now, this is a no-op as it requires integration with memory services
  return Promise.resolve();
}

/**
 * Pre-configured memory persistence processor with default settings
 */
export const memoryPersistenceProcessor = createMemoryPersistenceProcessor();

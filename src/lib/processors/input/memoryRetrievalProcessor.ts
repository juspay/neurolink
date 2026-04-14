/**
 * Memory Retrieval Processor
 *
 * Retrieves relevant conversation history from memory stores.
 * Supports both in-memory and Redis stores, with optional semantic search.
 *
 * @module memoryRetrievalProcessor
 */

import type {
  InputProcessor,
  InputProcessorData,
  MemoryRetrievalConfig,
  ProcessorResult,
} from "../../types/index.js";
import type { ChatMessage } from "../../types/index.js";

/**
 * Create a Memory Retrieval Processor
 *
 * Retrieves relevant conversation history from memory stores and
 * prepends it to the current message context.
 *
 * @param defaultConfig - Default configuration
 * @returns InputProcessor instance
 *
 * @example Basic usage
 * ```typescript
 * const memoryProcessor = createMemoryRetrievalProcessor({
 *   maxMessages: 10,
 *   storeType: 'redis',
 *   includeSystemMessages: false,
 * });
 *
 * const result = await memoryProcessor.process(inputData);
 * ```
 *
 * @example With semantic search
 * ```typescript
 * const memoryProcessor = createMemoryRetrievalProcessor({
 *   enableSemanticSearch: true,
 *   similarityThreshold: 0.7,
 *   maxMessages: 5,
 * });
 * ```
 */
export function createMemoryRetrievalProcessor(
  defaultConfig?: MemoryRetrievalConfig,
): InputProcessor<MemoryRetrievalConfig> {
  return {
    id: "memory-retrieval",
    name: "Memory Message Retrieval",
    description: "Retrieves relevant conversation history from memory stores",
    priority: 100, // Run early to add context

    async process(
      data: InputProcessorData,
      config?: MemoryRetrievalConfig,
    ): Promise<ProcessorResult<InputProcessorData>> {
      const mergedConfig = { ...defaultConfig, ...config };
      const {
        maxMessages = 10,
        includeSystemMessages = false,
        storeType = "in-memory",
        sessionId,
        enableSemanticSearch = false,
        similarityThreshold = 0.7,
      } = mergedConfig;

      try {
        const effectiveSessionId = sessionId || data.metadata.sessionId;

        if (!effectiveSessionId) {
          // No session, nothing to retrieve
          return {
            action: "continue",
            data,
            metadata: {
              memoryRetrievalSkipped: true,
              reason: "no_session_id",
            },
          };
        }

        // Retrieve messages from appropriate store
        const retrievedMessages = await retrieveMessages(
          effectiveSessionId,
          storeType,
          {
            maxMessages,
            includeSystemMessages,
            enableSemanticSearch,
            similarityThreshold,
            currentQuery: data.text,
          },
        );

        if (retrievedMessages.length === 0) {
          return {
            action: "continue",
            data,
            metadata: {
              memoryRetrievalSkipped: false,
              messagesRetrieved: 0,
            },
          };
        }

        // Prepend retrieved messages to existing messages
        const enrichedData: InputProcessorData = {
          ...data,
          messages: [...retrievedMessages, ...data.messages],
        };

        return {
          action: "continue",
          data: enrichedData,
          metadata: {
            messagesRetrieved: retrievedMessages.length,
            memoryStoreType: storeType,
            semanticSearchUsed: enableSemanticSearch,
          },
        };
      } catch (error) {
        // Don't block on memory failure - continue without context
        return {
          action: "continue",
          data,
          issues: [
            {
              category: "memory_retrieval",
              severity: "warning",
              message: `Memory retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
              context: { storeType, enableSemanticSearch },
            },
          ],
          metadata: {
            memoryRetrievalFailed: true,
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        };
      }
    },

    validateConfig(config: MemoryRetrievalConfig): {
      valid: boolean;
      errors: string[];
    } {
      const errors: string[] = [];

      if (config.maxMessages !== undefined && config.maxMessages < 0) {
        errors.push("maxMessages must be non-negative");
      }

      if (
        config.storeType &&
        !["redis", "in-memory"].includes(config.storeType)
      ) {
        errors.push(
          `Invalid storeType: ${config.storeType}. Must be 'redis' or 'in-memory'`,
        );
      }

      if (
        config.similarityThreshold !== undefined &&
        (config.similarityThreshold < 0 || config.similarityThreshold > 1)
      ) {
        errors.push("similarityThreshold must be between 0 and 1");
      }

      return { valid: errors.length === 0, errors };
    },
  };
}

/**
 * Options for message retrieval
 */
type RetrievalOptions = {
  maxMessages: number;
  includeSystemMessages: boolean;
  enableSemanticSearch: boolean;
  similarityThreshold: number;
  currentQuery?: string;
};

/**
 * Retrieve messages from the specified store
 *
 * This is a placeholder implementation. In production, this would
 * integrate with ConversationMemoryManager or RedisConversationMemoryManager.
 *
 * @param sessionId - Session identifier
 * @param storeType - Type of memory store
 * @param options - Retrieval options
 * @returns Array of chat messages
 */
async function retrieveMessages(
  _sessionId: string,
  _storeType: "redis" | "in-memory",
  _options: RetrievalOptions,
): Promise<ChatMessage[]> {
  // This is a placeholder implementation
  // In production, this would integrate with:
  // - ConversationMemoryManager for in-memory storage
  // - RedisConversationMemoryManager for Redis storage
  //
  // The implementation would look something like:
  //
  // if (storeType === 'redis') {
  //   const redisManager = getRedisConversationMemoryManager();
  //   const messages = await redisManager.getMessages(sessionId, options.maxMessages);
  //   if (!options.includeSystemMessages) {
  //     return messages.filter(m => m.role !== 'system');
  //   }
  //   return messages;
  // } else {
  //   const memoryManager = getConversationMemoryManager();
  //   return memoryManager.getMessages(sessionId, options);
  // }

  // For now, return empty array as this requires integration with memory services
  return [];
}

/**
 * Pre-configured memory retrieval processor with default settings
 */
export const memoryRetrievalProcessor = createMemoryRetrievalProcessor();

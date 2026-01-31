/**
 * Thread Manager
 *
 * High-level interface for managing conversation threads and messages.
 * Provides convenience methods for common thread operations.
 *
 * Features:
 * - Thread lifecycle management
 * - Message CRUD with batch operations
 * - Thread context summarization
 * - Message history retrieval
 * - Resource-based thread organization
 */

import type { JsonObject, JsonValue } from "../../types/index.js";
import type {
  StorageProvider,
  StorageThread,
  StorageMessage,
  CreateThreadInput,
  UpdateThreadInput,
  CreateMessageInput,
  UpdateMessageInput,
  ThreadQueryOptions,
  MessageQueryOptions,
  PaginatedResult,
  MessageRole,
  ThreadManagerOptions,
  ThreadWithMessages,
  SimpleMessageInput,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Thread Manager
 *
 * Provides a high-level interface for managing conversation threads and messages.
 */
export class ThreadManager {
  private storage: StorageProvider;
  private options: Required<ThreadManagerOptions>;

  constructor(storage: StorageProvider, options?: ThreadManagerOptions) {
    this.storage = storage;
    this.options = {
      defaultResourceId: options?.defaultResourceId || "default",
      defaultMessageLimit: options?.defaultMessageLimit || 100,
      autoArchive: options?.autoArchive || false,
      archiveThresholdMs:
        options?.archiveThresholdMs || 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  // ============================================================================
  // Thread Operations
  // ============================================================================

  /**
   * Create a new thread
   */
  async createThread(
    resourceId?: string,
    title?: string,
    metadata?: JsonObject,
  ): Promise<StorageThread> {
    const input: CreateThreadInput = {
      resourceId: resourceId || this.options.defaultResourceId,
      title,
      metadata,
      status: "active",
    };

    const thread = await this.storage.createThread(input);
    logger.debug("[ThreadManager] Created thread", { threadId: thread.id });

    return thread;
  }

  /**
   * Get a thread by ID
   */
  async getThread(threadId: string): Promise<StorageThread | null> {
    return this.storage.getThread(threadId);
  }

  /**
   * Get a thread with its messages
   */
  async getThreadWithMessages(
    threadId: string,
    messageLimit?: number,
  ): Promise<ThreadWithMessages | null> {
    const thread = await this.storage.getThread(threadId);
    if (!thread) {
      return null;
    }

    const messages = await this.storage.getMessagesByThreadId(threadId, {
      limit: messageLimit || this.options.defaultMessageLimit,
    });

    return { thread, messages };
  }

  /**
   * Update thread metadata
   */
  async updateThread(
    threadId: string,
    updates: UpdateThreadInput,
  ): Promise<StorageThread | null> {
    return this.storage.updateThread(threadId, updates);
  }

  /**
   * Update thread title
   */
  async setThreadTitle(
    threadId: string,
    title: string,
  ): Promise<StorageThread | null> {
    return this.storage.updateThread(threadId, { title });
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string): Promise<StorageThread | null> {
    return this.storage.updateThread(threadId, { status: "archived" });
  }

  /**
   * Unarchive a thread
   */
  async unarchiveThread(threadId: string): Promise<StorageThread | null> {
    return this.storage.updateThread(threadId, { status: "active" });
  }

  /**
   * Delete a thread and all its messages
   */
  async deleteThread(threadId: string): Promise<boolean> {
    const deleted = await this.storage.deleteThread(threadId);
    if (deleted) {
      logger.debug("[ThreadManager] Deleted thread", { threadId });
    }
    return deleted;
  }

  /**
   * List threads with optional filters
   */
  async listThreads(
    options?: ThreadQueryOptions,
  ): Promise<PaginatedResult<StorageThread>> {
    return this.storage.listThreads(options);
  }

  /**
   * Get threads for a specific resource
   */
  async getThreadsByResource(
    resourceId: string,
    includeArchived = false,
  ): Promise<StorageThread[]> {
    const result = await this.storage.listThreads({
      resourceId,
      status: includeArchived ? undefined : "active",
    });
    return result.data;
  }

  /**
   * Get or create a thread for a resource
   */
  async getOrCreateThread(
    resourceId: string,
    title?: string,
    metadata?: JsonObject,
  ): Promise<StorageThread> {
    // Try to find an existing active thread
    const result = await this.storage.listThreads({
      resourceId,
      status: "active",
      limit: 1,
    });

    if (result.data.length > 0) {
      return result.data[0];
    }

    // Create new thread
    return this.createThread(resourceId, title, metadata);
  }

  // ============================================================================
  // Message Operations
  // ============================================================================

  /**
   * Add a message to a thread
   */
  async addMessage(
    threadId: string,
    role: MessageRole,
    content: string,
    metadata?: JsonObject,
  ): Promise<StorageMessage> {
    const input: CreateMessageInput = {
      threadId,
      role,
      content,
      type: "text",
      metadata,
    };

    const message = await this.storage.createMessage(input);

    // Update thread timestamp
    await this.storage.updateThread(threadId, {});

    return message;
  }

  /**
   * Add a user message
   */
  async addUserMessage(
    threadId: string,
    content: string,
    metadata?: JsonObject,
  ): Promise<StorageMessage> {
    return this.addMessage(threadId, "user", content, metadata);
  }

  /**
   * Add an assistant message
   */
  async addAssistantMessage(
    threadId: string,
    content: string,
    metadata?: JsonObject,
  ): Promise<StorageMessage> {
    return this.addMessage(threadId, "assistant", content, metadata);
  }

  /**
   * Add a system message
   */
  async addSystemMessage(
    threadId: string,
    content: string,
    metadata?: JsonObject,
  ): Promise<StorageMessage> {
    return this.addMessage(threadId, "system", content, metadata);
  }

  /**
   * Add a tool result message
   */
  async addToolMessage(
    threadId: string,
    content: string,
    toolInfo: {
      toolCallId: string;
      toolName: string;
      result?: JsonValue;
    },
    metadata?: JsonObject,
  ): Promise<StorageMessage> {
    const input: CreateMessageInput = {
      threadId,
      role: "tool",
      content,
      type: "tool-result",
      toolInfo,
      metadata,
    };

    return this.storage.createMessage(input);
  }

  /**
   * Add multiple messages in batch
   */
  async addMessages(
    threadId: string,
    messages: SimpleMessageInput[],
  ): Promise<StorageMessage[]> {
    const inputs: CreateMessageInput[] = messages.map((msg) => ({
      threadId,
      role: msg.role,
      content: msg.content,
      type: "text",
      metadata: msg.metadata,
    }));

    const created = await this.storage.createMessages(inputs);

    // Update thread timestamp
    await this.storage.updateThread(threadId, {});

    return created;
  }

  /**
   * Get a message by ID
   */
  async getMessage(messageId: string): Promise<StorageMessage | null> {
    return this.storage.getMessage(messageId);
  }

  /**
   * Update a message
   */
  async updateMessage(
    messageId: string,
    updates: UpdateMessageInput,
  ): Promise<StorageMessage | null> {
    return this.storage.updateMessage(messageId, updates);
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    return this.storage.deleteMessage(messageId);
  }

  /**
   * Get messages from a thread
   */
  async getMessages(
    threadId: string,
    options?: MessageQueryOptions,
  ): Promise<StorageMessage[]> {
    const result = await this.storage.listMessages({
      threadId,
      ...options,
      limit: options?.limit || this.options.defaultMessageLimit,
    });
    return result.data;
  }

  /**
   * Get the last N messages from a thread
   */
  async getLastMessages(
    threadId: string,
    count: number,
  ): Promise<StorageMessage[]> {
    const allMessages = await this.storage.getMessagesByThreadId(threadId);

    // Return the last N messages
    return allMessages.slice(-count);
  }

  /**
   * Get messages by role
   */
  async getMessagesByRole(
    threadId: string,
    role: MessageRole,
  ): Promise<StorageMessage[]> {
    const result = await this.storage.listMessages({
      threadId,
      role,
    });
    return result.data;
  }

  /**
   * Count messages in a thread
   */
  async countMessages(threadId: string): Promise<number> {
    const result = await this.storage.listMessages({
      threadId,
      limit: 1,
    });
    return result.total ?? 0;
  }

  /**
   * Clear all messages from a thread
   */
  async clearMessages(threadId: string): Promise<number> {
    const deleted = await this.storage.deleteMessagesByThreadId(threadId);
    logger.debug("[ThreadManager] Cleared messages", { threadId, deleted });
    return deleted;
  }

  // ============================================================================
  // Context Operations
  // ============================================================================

  /**
   * Get conversation context as a formatted string
   */
  async getConversationContext(
    threadId: string,
    maxMessages?: number,
  ): Promise<string> {
    const messages = await this.getLastMessages(
      threadId,
      maxMessages || this.options.defaultMessageLimit,
    );

    return messages
      .map((msg) => {
        const roleLabel = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
        return `${roleLabel}: ${msg.content}`;
      })
      .join("\n\n");
  }

  /**
   * Get conversation as message array for AI SDK
   */
  async getConversationMessages(
    threadId: string,
    maxMessages?: number,
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.getLastMessages(
      threadId,
      maxMessages || this.options.defaultMessageLimit,
    );

    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Get thread summary (for context window management)
   */
  async getThreadSummary(threadId: string): Promise<{
    threadId: string;
    title?: string;
    messageCount: number;
    lastMessageAt?: Date;
    firstMessageAt?: Date;
  }> {
    const thread = await this.storage.getThread(threadId);
    const messages = await this.storage.getMessagesByThreadId(threadId);

    return {
      threadId,
      title: thread?.title,
      messageCount: messages.length,
      lastMessageAt:
        messages.length > 0
          ? messages[messages.length - 1].createdAt
          : undefined,
      firstMessageAt: messages.length > 0 ? messages[0].createdAt : undefined,
    };
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  /**
   * Archive inactive threads
   */
  async archiveInactiveThreads(): Promise<number> {
    if (!this.options.autoArchive) {
      return 0;
    }

    const threshold = new Date(Date.now() - this.options.archiveThresholdMs);
    const result = await this.storage.listThreads({ status: "active" });

    let archived = 0;
    for (const thread of result.data) {
      if (thread.updatedAt < threshold) {
        await this.archiveThread(thread.id);
        archived++;
      }
    }

    if (archived > 0) {
      logger.info("[ThreadManager] Archived inactive threads", {
        count: archived,
      });
    }

    return archived;
  }

  /**
   * Delete old archived threads
   */
  async deleteOldArchivedThreads(olderThanMs: number): Promise<number> {
    const threshold = new Date(Date.now() - olderThanMs);
    const result = await this.storage.listThreads({ status: "archived" });

    let deleted = 0;
    for (const thread of result.data) {
      if (thread.updatedAt < threshold) {
        await this.deleteThread(thread.id);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info("[ThreadManager] Deleted old archived threads", {
        count: deleted,
      });
    }

    return deleted;
  }
}

/**
 * Create a thread manager for a storage provider
 */
export function createThreadManager(
  storage: StorageProvider,
  options?: ThreadManagerOptions,
): ThreadManager {
  return new ThreadManager(storage, options);
}

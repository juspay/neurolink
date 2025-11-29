/**
 * Disk Conversation Memory Manager for NeuroLink
 * File system-based implementation of conversation storage with same interface as ConversationMemoryManager
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import { randomUUID } from "crypto";
import { createGzip, createGunzip } from "zlib";
import { pipeline } from "stream/promises";
import { createReadStream, createWriteStream } from "fs";
import type {
  ConversationMemoryConfig,
  ConversationMemoryStats,
  ChatMessage,
  DiskStorageConfig,
  SessionMetadata,
  RedisConversationObject,
} from "../types/conversation.js";
import { ConversationMemoryError } from "../types/conversation.js";
import { MESSAGES_PER_TURN } from "../config/conversationMemory.js";
import { logger } from "../utils/logger.js";
import { NeuroLink } from "../neurolink.js";

/**
 * Disk-based implementation of the ConversationMemoryManager
 * Uses the same interface but stores data in the file system
 */
export class DiskConversationMemoryManager {
  public config: ConversationMemoryConfig;
  private diskConfig: Required<DiskStorageConfig>;
  private isInitialized: boolean = false;
  private basePath: string;
  private usersPath: string;
  private indexesPath: string;
  private backupsPath: string;

  /**
   * Track sessions currently generating titles to prevent race conditions
   */
  private titleGenerationInProgress: Set<string> = new Set();

  constructor(config: ConversationMemoryConfig, diskConfig: DiskStorageConfig) {
    this.config = config;
    this.diskConfig = this.normalizeDiskConfig(diskConfig);
    this.basePath = this.diskConfig.storagePath;
    this.usersPath = join(this.basePath, "users");
    this.indexesPath = join(this.basePath, "indexes");
    this.backupsPath = join(this.basePath, "backups");
  }

  /**
   * Normalize disk configuration with defaults
   */
  private normalizeDiskConfig(
    config: DiskStorageConfig,
  ): Required<DiskStorageConfig> {
    return {
      storagePath: config.storagePath,
      format: config.format || "json",
      compression: config.compression || "none",
      ttl: config.ttl || 0, // 0 means no TTL
      maxFileSize: config.maxFileSize || "10MB",
      enableBackup: config.enableBackup || false,
      backupRetention: config.backupRetention || 7,
      enableEncryption: config.enableEncryption || false,
      encryptionKey: config.encryptionKey || "",
      filePermissions: config.filePermissions || "0600",
    };
  }

  /**
   * Initialize the memory manager with file system setup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug(
        "[DiskConversationMemoryManager] Already initialized, skipping",
      );
      return;
    }

    try {
      logger.debug("[DiskConversationMemoryManager] Initializing with config", {
        storagePath: this.diskConfig.storagePath,
        format: this.diskConfig.format,
        compression: this.diskConfig.compression,
        enableBackup: this.diskConfig.enableBackup,
        ttl: this.diskConfig.ttl,
      });

      // Create directory structure
      await this.createDirectoryStructure();

      // Initialize index files
      await this.initializeIndexFiles();

      // Perform cleanup if TTL is enabled
      if (this.diskConfig.ttl > 0) {
        await this.performTTLCleanup();
      }

      this.isInitialized = true;

      logger.info("DiskConversationMemoryManager initialized", {
        storage: "disk",
        storagePath: this.diskConfig.storagePath,
        format: this.diskConfig.format,
        compression: this.diskConfig.compression,
        maxSessions: this.config.maxSessions,
        maxTurnsPerSession: this.config.maxTurnsPerSession,
      });
    } catch (error) {
      logger.error("[DiskConversationMemoryManager] Failed to initialize", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        config: {
          storagePath: this.diskConfig.storagePath,
          format: this.diskConfig.format,
        },
      });

      throw new ConversationMemoryError(
        "Failed to initialize disk conversation memory",
        "CONFIG_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Create directory structure for disk storage
   */
  private async createDirectoryStructure(): Promise<void> {
    const directories = [this.basePath, this.usersPath, this.indexesPath];

    if (this.diskConfig.enableBackup) {
      directories.push(this.backupsPath);
    }

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true, mode: 0o755 });
        logger.debug(
          `[DiskConversationMemoryManager] Created directory: ${dir}`,
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
          throw error;
        }
      }
    }
  }

  /**
   * Initialize index files for fast lookups
   */
  private async initializeIndexFiles(): Promise<void> {
    const userSessionsIndexPath = join(this.indexesPath, "user-sessions.json");
    const sessionMetadataIndexPath = join(
      this.indexesPath,
      "session-metadata.json",
    );

    // Initialize user-sessions index if it doesn't exist
    try {
      await fs.access(userSessionsIndexPath);
    } catch {
      await fs.writeFile(userSessionsIndexPath, JSON.stringify({}), "utf8");
      logger.debug(
        "[DiskConversationMemoryManager] Created user-sessions index",
      );
    }

    // Initialize session-metadata index if it doesn't exist
    try {
      await fs.access(sessionMetadataIndexPath);
    } catch {
      await fs.writeFile(sessionMetadataIndexPath, JSON.stringify({}), "utf8");
      logger.debug(
        "[DiskConversationMemoryManager] Created session-metadata index",
      );
    }
  }

  /**
   * Calculate file path for a conversation
   */
  private calculateFilePath(sessionId: string, userId?: string): string {
    const normalizedUserId = userId || "anonymous";
    const userDir = join(this.usersPath, normalizedUserId);
    const fileName = `session-${sessionId}.${this.diskConfig.format}${
      this.diskConfig.compression === "gzip" ? ".gz" : ""
    }`;
    return join(userDir, fileName);
  }

  /**
   * Calculate backup file path
   */
  private calculateBackupPath(sessionId: string, userId?: string): string {
    const normalizedUserId = userId || "anonymous";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const backupDir = join(this.backupsPath, today);
    const fileName = `${normalizedUserId}-session-${sessionId}.${this.diskConfig.format}`;
    return join(backupDir, fileName);
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
    logger.debug("[DiskConversationMemoryManager] Storing conversation turn", {
      sessionId,
      userId,
      userMessageLength: userMessage.length,
      aiResponseLength: aiResponse.length,
    });

    await this.ensureInitialized();

    try {
      const normalizedUserId = userId || "anonymous";
      const filePath = this.calculateFilePath(sessionId, normalizedUserId);
      const userDir = dirname(filePath);

      // Ensure user directory exists
      await fs.mkdir(userDir, { recursive: true, mode: 0o755 });

      // Load existing conversation or create new one
      let conversation = await this.loadConversationFromFile(filePath);
      const currentTime = new Date().toISOString();

      if (!conversation) {
        // Generate title asynchronously in the background (non-blocking)
        const titleGenerationKey = `${sessionId}:${normalizedUserId}`;

        setImmediate(async () => {
          // Check if title generation is already in progress for this session
          if (this.titleGenerationInProgress.has(titleGenerationKey)) {
            logger.debug(
              "[DiskConversationMemoryManager] Title generation already in progress, skipping",
              { sessionId, userId: normalizedUserId, titleGenerationKey },
            );
            return;
          }

          // Mark title generation as in progress
          this.titleGenerationInProgress.add(titleGenerationKey);

          try {
            const title = await this.generateConversationTitle(userMessage);
            logger.info(
              "[DiskConversationMemoryManager] Successfully generated conversation title",
              { sessionId, userId: normalizedUserId, title },
            );

            // Update the conversation file with the generated title
            const updatedConversation =
              await this.loadConversationFromFile(filePath);
            if (updatedConversation) {
              updatedConversation.title = title;
              updatedConversation.updatedAt = new Date().toISOString();
              await this.saveConversationToFile(filePath, updatedConversation);
            }
          } catch (titleError) {
            logger.warn(
              "[DiskConversationMemoryManager] Failed to generate conversation title in background",
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
        // Update existing conversation timestamp
        conversation.updatedAt = currentTime;
      }

      // Add new messages to conversation history
      const userMsg: ChatMessage = {
        id: this.generateMessageId(conversation),
        timestamp: startTimeStamp?.toISOString() || this.generateTimestamp(),
        role: "user",
        content: userMessage,
      };
      conversation.messages.push(userMsg);

      const assistantMsg: ChatMessage = {
        id: this.generateMessageId(conversation),
        timestamp: this.generateTimestamp(),
        role: "assistant",
        content: aiResponse,
      };
      conversation.messages.push(assistantMsg);

      // Apply turn limits if configured
      if (this.config.maxTurnsPerSession) {
        const maxMessages = this.config.maxTurnsPerSession * MESSAGES_PER_TURN;
        if (conversation.messages.length > maxMessages) {
          conversation.messages = conversation.messages.slice(-maxMessages);
        }
      }

      // Save conversation to file
      await this.saveConversationToFile(filePath, conversation);

      // Update indexes
      await this.updateIndexes(sessionId, normalizedUserId, conversation);

      // Create backup if enabled
      if (this.diskConfig.enableBackup) {
        await this.createBackup(sessionId, normalizedUserId, conversation);
      }

      logger.debug(
        "[DiskConversationMemoryManager] Successfully stored conversation turn",
        {
          sessionId,
          userId: normalizedUserId,
          filePath,
          totalMessages: conversation.messages.length,
          title: conversation.title,
        },
      );
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to store conversation turn in disk for session ${sessionId}`,
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
    logger.debug("[DiskConversationMemoryManager] Building context messages", {
      sessionId,
      userId,
    });

    await this.ensureInitialized();

    try {
      const normalizedUserId = userId || "anonymous";
      const filePath = this.calculateFilePath(sessionId, normalizedUserId);
      const conversation = await this.loadConversationFromFile(filePath);

      if (!conversation || !conversation.messages) {
        logger.debug(
          "[DiskConversationMemoryManager] No context messages found",
          { sessionId, userId: normalizedUserId },
        );
        return [];
      }

      logger.debug(
        "[DiskConversationMemoryManager] Retrieved context messages",
        {
          sessionId,
          userId: normalizedUserId,
          messageCount: conversation.messages.length,
          messageRoles: conversation.messages.map((m) => m.role),
        },
      );

      return conversation.messages;
    } catch (error) {
      logger.error(
        "[DiskConversationMemoryManager] Failed to build context messages",
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
   * Load conversation from file
   */
  private async loadConversationFromFile(
    filePath: string,
  ): Promise<RedisConversationObject | null> {
    try {
      await fs.access(filePath);
    } catch {
      return null; // File doesn't exist
    }

    try {
      let content: string;

      if (this.diskConfig.compression === "gzip" && filePath.endsWith(".gz")) {
        // Read compressed file
        const chunks: Buffer[] = [];
        const readStream = createReadStream(filePath);
        const gunzip = createGunzip();

        await pipeline(readStream, gunzip);

        for await (const chunk of gunzip) {
          chunks.push(chunk);
        }

        content = Buffer.concat(chunks).toString("utf8");
      } else {
        // Read uncompressed file
        content = await fs.readFile(filePath, "utf8");
      }

      const conversation = JSON.parse(content) as RedisConversationObject;

      // Validate conversation structure
      if (!conversation.messages || !Array.isArray(conversation.messages)) {
        logger.warn(
          "[DiskConversationMemoryManager] Invalid conversation structure",
          { filePath, hasMessages: !!conversation.messages },
        );
        return null;
      }

      return conversation;
    } catch (error) {
      logger.error(
        "[DiskConversationMemoryManager] Failed to load conversation from file",
        {
          filePath,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }

  /**
   * Save conversation to file with atomic write
   */
  private async saveConversationToFile(
    filePath: string,
    conversation: RedisConversationObject,
  ): Promise<{ filePath: string; fileSize: number }> {
    const tempFilePath = `${filePath}.tmp`;
    const content = JSON.stringify(conversation, null, 2);

    try {
      if (this.diskConfig.compression === "gzip") {
        // Write compressed file
        const writeStream = createWriteStream(tempFilePath);
        const gzip = createGzip();

        await pipeline(
          async function* () {
            yield Buffer.from(content, "utf8");
          },
          gzip,
          writeStream,
        );
      } else {
        // Write uncompressed file
        await fs.writeFile(tempFilePath, content, "utf8");
      }

      // Atomic rename
      await fs.rename(tempFilePath, filePath);

      // Set file permissions
      if (this.diskConfig.filePermissions) {
        await fs.chmod(filePath, this.diskConfig.filePermissions);
      }

      const stats = await fs.stat(filePath);
      return { filePath, fileSize: stats.size };
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Generate next message ID for a conversation
   */
  private generateMessageId(conversation: {
    messages?: ChatMessage[];
  }): string {
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
   * Update index files for fast lookups
   */
  private async updateIndexes(
    sessionId: string,
    userId: string,
    conversation: RedisConversationObject,
  ): Promise<void> {
    try {
      // Update user-sessions index
      const userSessionsIndexPath = join(
        this.indexesPath,
        "user-sessions.json",
      );
      let userSessionsIndex: Record<string, string[]> = {};

      try {
        const content = await fs.readFile(userSessionsIndexPath, "utf8");
        userSessionsIndex = JSON.parse(content);
      } catch {
        // File doesn't exist or is invalid, start with empty index
      }

      if (!userSessionsIndex[userId]) {
        userSessionsIndex[userId] = [];
      }

      if (!userSessionsIndex[userId].includes(sessionId)) {
        userSessionsIndex[userId].push(sessionId);
      }

      await fs.writeFile(
        userSessionsIndexPath,
        JSON.stringify(userSessionsIndex, null, 2),
        "utf8",
      );

      // Update session-metadata index
      const sessionMetadataIndexPath = join(
        this.indexesPath,
        "session-metadata.json",
      );
      let sessionMetadataIndex: Record<string, SessionMetadata> = {};

      try {
        const content = await fs.readFile(sessionMetadataIndexPath, "utf8");
        sessionMetadataIndex = JSON.parse(content);
      } catch {
        // File doesn't exist or is invalid, start with empty index
      }

      sessionMetadataIndex[`${userId}:${sessionId}`] = {
        id: sessionId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      };

      await fs.writeFile(
        sessionMetadataIndexPath,
        JSON.stringify(sessionMetadataIndex, null, 2),
        "utf8",
      );
    } catch (error) {
      logger.warn("[DiskConversationMemoryManager] Failed to update indexes", {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - index update failures shouldn't break conversation storage
    }
  }

  /**
   * Create backup of conversation file
   */
  private async createBackup(
    sessionId: string,
    userId: string,
    conversation: RedisConversationObject,
  ): Promise<void> {
    try {
      const backupPath = this.calculateBackupPath(sessionId, userId);
      const backupDir = dirname(backupPath);

      // Ensure backup directory exists
      await fs.mkdir(backupDir, { recursive: true, mode: 0o755 });

      // Write backup file (always uncompressed for easier recovery)
      const content = JSON.stringify(conversation, null, 2);
      await fs.writeFile(backupPath, content, "utf8");

      logger.debug("[DiskConversationMemoryManager] Created backup", {
        sessionId,
        userId,
        backupPath,
      });

      // Clean up old backups if retention is configured
      if (this.diskConfig.backupRetention > 0) {
        await this.cleanupOldBackups();
      }
    } catch (error) {
      logger.warn("[DiskConversationMemoryManager] Failed to create backup", {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - backup failures shouldn't break conversation storage
    }
  }

  /**
   * Clean up old backup files based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const retentionMs = this.diskConfig.backupRetention * 24 * 60 * 60 * 1000;
      const cutoffTime = Date.now() - retentionMs;

      const backupDirs = await fs.readdir(this.backupsPath);

      for (const dirName of backupDirs) {
        const dirPath = join(this.backupsPath, dirName);
        const stats = await fs.stat(dirPath);

        if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
          await fs.rm(dirPath, { recursive: true, force: true });
          logger.debug(
            "[DiskConversationMemoryManager] Cleaned up old backup directory",
            { dirPath, age: Date.now() - stats.mtime.getTime() },
          );
        }
      }
    } catch (error) {
      logger.warn(
        "[DiskConversationMemoryManager] Failed to cleanup old backups",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Perform TTL cleanup of expired conversations
   */
  private async performTTLCleanup(): Promise<void> {
    if (this.diskConfig.ttl <= 0) {
      return;
    }

    try {
      const ttlMs = this.diskConfig.ttl * 1000;
      const cutoffTime = Date.now() - ttlMs;

      const userDirs = await fs.readdir(this.usersPath);

      for (const userDir of userDirs) {
        const userPath = join(this.usersPath, userDir);
        const userStats = await fs.stat(userPath);

        if (!userStats.isDirectory()) {
          continue;
        }

        const files = await fs.readdir(userPath);

        for (const file of files) {
          if (!file.startsWith("session-")) {
            continue;
          }

          const filePath = join(userPath, file);
          const fileStats = await fs.stat(filePath);

          if (fileStats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            logger.debug(
              "[DiskConversationMemoryManager] Cleaned up expired conversation",
              { filePath, age: Date.now() - fileStats.mtime.getTime() },
            );
          }
        }
      }
    } catch (error) {
      logger.warn(
        "[DiskConversationMemoryManager] Failed to perform TTL cleanup",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Generate a conversation title from the first user message
   */
  private async generateConversationTitle(
    userMessage: string,
  ): Promise<string> {
    logger.debug(
      "[DiskConversationMemoryManager] Generating conversation title",
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

User message: "${userMessage}"`;

      const result = await titleGenerator.generate({
        input: { text: titlePrompt },
        provider: this.config.summarizationProvider || "vertex",
        model: this.config.summarizationModel || "gemini-2.5-flash",
        disableTools: true,
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
        "[DiskConversationMemoryManager] Generated conversation title",
        {
          originalLength: result.content?.length || 0,
          cleanedTitle: title,
          titleLength: title.length,
        },
      );

      return title;
    } catch (error) {
      logger.error(
        "[DiskConversationMemoryManager] Failed to generate conversation title",
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
   * Ensure disk storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Get statistics about conversation storage
   */
  public async getStats(): Promise<ConversationMemoryStats> {
    await this.ensureInitialized();

    try {
      let totalSessions = 0;
      let totalTurns = 0;

      const userDirs = await fs.readdir(this.usersPath);

      for (const userDir of userDirs) {
        const userPath = join(this.usersPath, userDir);
        const userStats = await fs.stat(userPath);

        if (!userStats.isDirectory()) {
          continue;
        }

        const files = await fs.readdir(userPath);

        for (const file of files) {
          if (!file.startsWith("session-")) {
            continue;
          }

          totalSessions++;

          // Load conversation to count messages
          const filePath = join(userPath, file);
          const conversation = await this.loadConversationFromFile(filePath);

          if (conversation?.messages) {
            totalTurns += conversation.messages.length / MESSAGES_PER_TURN;
          }
        }
      }

      return { totalSessions, totalTurns };
    } catch (error) {
      logger.error("[DiskConversationMemoryManager] Failed to get stats", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { totalSessions: 0, totalTurns: 0 };
    }
  }

  /**
   * Clear a specific session
   */
  public async clearSession(
    sessionId: string,
    userId?: string,
  ): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const normalizedUserId = userId || "anonymous";
      const filePath = this.calculateFilePath(sessionId, normalizedUserId);

      try {
        await fs.unlink(filePath);
        logger.info("Disk session cleared", {
          sessionId,
          userId: normalizedUserId,
        });

        // Remove from indexes
        await this.removeFromIndexes(sessionId, normalizedUserId);

        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return false; // File doesn't exist
        }
        throw error;
      }
    } catch (error) {
      logger.error("[DiskConversationMemoryManager] Failed to clear session", {
        sessionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Clear all sessions
   */
  public async clearAllSessions(): Promise<void> {
    await this.ensureInitialized();

    try {
      // Remove all user directories
      const userDirs = await fs.readdir(this.usersPath);

      for (const userDir of userDirs) {
        const userPath = join(this.usersPath, userDir);
        await fs.rm(userPath, { recursive: true, force: true });
      }

      // Clear indexes
      await fs.writeFile(
        join(this.indexesPath, "user-sessions.json"),
        JSON.stringify({}),
        "utf8",
      );
      await fs.writeFile(
        join(this.indexesPath, "session-metadata.json"),
        JSON.stringify({}),
        "utf8",
      );

      logger.info("All disk sessions cleared");
    } catch (error) {
      logger.error(
        "[DiskConversationMemoryManager] Failed to clear all sessions",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Remove session from indexes
   */
  private async removeFromIndexes(
    sessionId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Remove from user-sessions index
      const userSessionsIndexPath = join(
        this.indexesPath,
        "user-sessions.json",
      );
      let userSessionsIndex: Record<string, string[]> = {};

      try {
        const content = await fs.readFile(userSessionsIndexPath, "utf8");
        userSessionsIndex = JSON.parse(content);
      } catch {
        return; // Index doesn't exist
      }

      if (userSessionsIndex[userId]) {
        userSessionsIndex[userId] = userSessionsIndex[userId].filter(
          (id) => id !== sessionId,
        );

        if (userSessionsIndex[userId].length === 0) {
          delete userSessionsIndex[userId];
        }
      }

      await fs.writeFile(
        userSessionsIndexPath,
        JSON.stringify(userSessionsIndex, null, 2),
        "utf8",
      );

      // Remove from session-metadata index
      const sessionMetadataIndexPath = join(
        this.indexesPath,
        "session-metadata.json",
      );
      let sessionMetadataIndex: Record<string, SessionMetadata> = {};

      try {
        const content = await fs.readFile(sessionMetadataIndexPath, "utf8");
        sessionMetadataIndex = JSON.parse(content);
      } catch {
        return; // Index doesn't exist
      }

      delete sessionMetadataIndex[`${userId}:${sessionId}`];

      await fs.writeFile(
        sessionMetadataIndexPath,
        JSON.stringify(sessionMetadataIndex, null, 2),
        "utf8",
      );
    } catch (error) {
      logger.warn(
        "[DiskConversationMemoryManager] Failed to remove from indexes",
        {
          sessionId,
          userId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get conversation file path (disk-specific method)
   */
  public async getConversationFilePath(
    sessionId: string,
    userId?: string,
  ): Promise<string> {
    const normalizedUserId = userId || "anonymous";
    return this.calculateFilePath(sessionId, normalizedUserId);
  }

  /**
   * Get storage information (disk-specific method)
   */
  public async getStorageInfo(): Promise<{
    type: "disk";
    path: string;
    totalSize: string;
    fileCount: number;
    lastCleanup: string;
  }> {
    await this.ensureInitialized();

    try {
      let fileCount = 0;
      let totalSize = 0;

      const userDirs = await fs.readdir(this.usersPath);

      for (const userDir of userDirs) {
        const userPath = join(this.usersPath, userDir);
        const userStats = await fs.stat(userPath);

        if (!userStats.isDirectory()) {
          continue;
        }

        const files = await fs.readdir(userPath);

        for (const file of files) {
          if (!file.startsWith("session-")) {
            continue;
          }

          fileCount++;
          const filePath = join(userPath, file);
          const fileStats = await fs.stat(filePath);
          totalSize += fileStats.size;
        }
      }

      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

      return {
        type: "disk",
        path: this.basePath,
        totalSize: `${totalSizeMB}MB`,
        fileCount,
        lastCleanup: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(
        "[DiskConversationMemoryManager] Failed to get storage info",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      return {
        type: "disk",
        path: this.basePath,
        totalSize: "0MB",
        fileCount: 0,
        lastCleanup: new Date().toISOString(),
      };
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
}

/**
 * Working Memory Layer Implementation
 *
 * Provides structured knowledge storage for user profiles, preferences,
 * and other persistent context. This is Layer 3 of the Three-Layer
 * Memory System.
 *
 * Features:
 * - Template mode: Markdown-based free-form text with replace semantics
 * - Schema mode: JSON Schema structured data with merge semantics
 * - Persistent storage backends (in-memory, Redis)
 * - Token estimation for context budgeting
 * - Resource-scoped storage
 */

import type { z } from "zod";
import type {
  WorkingMemoryConfig,
  MemoryLayerType,
  WorkingMemoryData,
  WorkingMemoryMode,
  WorkingMemoryStorageBackend,
  WorkingMemoryLayer as IWorkingMemoryLayer,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { createErrorFactory } from "../../core/infrastructure/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const WorkingMemoryErrors = createErrorFactory("WorkingMemory", {
  INITIALIZATION_FAILED: "WORKING_MEMORY_INITIALIZATION_FAILED",
  STORAGE_ERROR: "WORKING_MEMORY_STORAGE_ERROR",
  VALIDATION_ERROR: "WORKING_MEMORY_VALIDATION_ERROR",
  NOT_FOUND: "WORKING_MEMORY_NOT_FOUND",
  MERGE_ERROR: "WORKING_MEMORY_MERGE_ERROR",
});

// =============================================================================
// In-Memory Working Memory Storage
// =============================================================================

/**
 * In-memory storage for working memory (development/testing)
 */
export class InMemoryWorkingMemoryStorage implements WorkingMemoryStorageBackend {
  private data: Map<string, WorkingMemoryData> = new Map();
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    logger.debug("[InMemoryWorkingMemoryStorage] Initialized");
  }

  async get(resourceId: string): Promise<WorkingMemoryData | null> {
    return this.data.get(resourceId) || null;
  }

  async set(resourceId: string, data: WorkingMemoryData): Promise<void> {
    this.data.set(resourceId, data);
    logger.debug("[InMemoryWorkingMemoryStorage] Set data", { resourceId });
  }

  async delete(resourceId: string): Promise<boolean> {
    const existed = this.data.has(resourceId);
    this.data.delete(resourceId);
    logger.debug("[InMemoryWorkingMemoryStorage] Deleted data", {
      resourceId,
      existed,
    });
    return existed;
  }

  async list(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async close(): Promise<void> {
    this.data.clear();
    this.isInitialized = false;
    logger.debug("[InMemoryWorkingMemoryStorage] Closed");
  }
}

// =============================================================================
// Redis Working Memory Storage
// =============================================================================

/**
 * Redis storage for working memory (production)
 */
export class RedisWorkingMemoryStorage implements WorkingMemoryStorageBackend {
  private redisClient: {
    get: (key: string) => Promise<string | null>;
    set: (
      key: string,
      value: string,
      options?: { EX?: number },
    ) => Promise<void>;
    del: (key: string) => Promise<number>;
    keys: (pattern: string) => Promise<string[]>;
    quit: () => Promise<void>;
  } | null = null;
  private keyPrefix: string;
  private ttl: number;
  private isInitialized: boolean = false;
  private redisConfig: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };

  constructor(
    config: {
      host?: string;
      port?: number;
      password?: string;
      db?: number;
      keyPrefix?: string;
      ttl?: number;
    } = {},
  ) {
    this.keyPrefix = config.keyPrefix || "neurolink:working_memory:";
    this.ttl = config.ttl || 86400 * 30; // 30 days default
    this.redisConfig = {
      host: config.host || "localhost",
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Dynamic import of redis utilities
      const { createRedisClient, getNormalizedConfig } =
        await import("../../utils/redis.js");

      const normalizedConfig = getNormalizedConfig({
        host: this.redisConfig.host,
        port: this.redisConfig.port,
        password: this.redisConfig.password,
        db: this.redisConfig.db,
      });

      const client = await createRedisClient(normalizedConfig);

      this.redisClient = {
        get: async (key: string) => String((await client.get(key)) ?? ""),
        set: async (key: string, value: string, options?: { EX?: number }) => {
          if (options?.EX) {
            await client.setEx(key, options.EX, value);
          } else {
            await client.set(key, value);
          }
        },
        del: async (key: string) => Number(await client.del(key)),
        keys: async (pattern: string) =>
          (await client.keys(pattern)).map(String),
        quit: async () => {
          await client.quit();
        },
      };

      this.isInitialized = true;
      logger.info("[RedisWorkingMemoryStorage] Initialized", {
        host: this.redisConfig.host,
        port: this.redisConfig.port,
        keyPrefix: this.keyPrefix,
      });
    } catch (error) {
      throw WorkingMemoryErrors.create(
        "INITIALIZATION_FAILED",
        "Failed to initialize Redis working memory storage",
        {
          cause: error instanceof Error ? error : undefined,
          details: { host: this.redisConfig.host, port: this.redisConfig.port },
        },
      );
    }
  }

  async get(resourceId: string): Promise<WorkingMemoryData | null> {
    if (!this.redisClient) {
      throw WorkingMemoryErrors.create(
        "STORAGE_ERROR",
        "Redis client not initialized",
      );
    }

    const key = this.getKey(resourceId);
    const data = await this.redisClient.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as WorkingMemoryData;
    } catch {
      logger.error("[RedisWorkingMemoryStorage] Failed to parse data", {
        resourceId,
      });
      return null;
    }
  }

  async set(resourceId: string, data: WorkingMemoryData): Promise<void> {
    if (!this.redisClient) {
      throw WorkingMemoryErrors.create(
        "STORAGE_ERROR",
        "Redis client not initialized",
      );
    }

    const key = this.getKey(resourceId);
    await this.redisClient.set(key, JSON.stringify(data), { EX: this.ttl });
    logger.debug("[RedisWorkingMemoryStorage] Set data", { resourceId });
  }

  async delete(resourceId: string): Promise<boolean> {
    if (!this.redisClient) {
      throw WorkingMemoryErrors.create(
        "STORAGE_ERROR",
        "Redis client not initialized",
      );
    }

    const key = this.getKey(resourceId);
    const result = await this.redisClient.del(key);
    logger.debug("[RedisWorkingMemoryStorage] Deleted data", {
      resourceId,
      existed: result > 0,
    });
    return result > 0;
  }

  async list(): Promise<string[]> {
    if (!this.redisClient) {
      throw WorkingMemoryErrors.create(
        "STORAGE_ERROR",
        "Redis client not initialized",
      );
    }

    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redisClient.keys(pattern);
    return keys.map((key) => key.replace(this.keyPrefix, ""));
  }

  async close(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
      this.redisClient = null;
    }
    this.isInitialized = false;
    logger.debug("[RedisWorkingMemoryStorage] Closed");
  }

  private getKey(resourceId: string): string {
    return `${this.keyPrefix}${resourceId}`;
  }
}

// =============================================================================
// Token Estimation Utility
// =============================================================================

/**
 * Estimate token count for text content
 * Uses a simple heuristic: ~4 characters per token
 */
function estimateTokenCount(text: string): number {
  if (!text) {
    return 0;
  }
  // Rough estimation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// =============================================================================
// Working Memory Layer Implementation
// =============================================================================

/**
 * Default working memory configuration
 */
const DEFAULT_CONFIG = {
  enabled: true,
  scope: "resource" as const,
  template: undefined as string | undefined,
  schema: undefined as z.ZodObject<z.ZodRawShape> | undefined,
  updateInstructions: undefined as string | undefined,
  maxTokens: 4096,
} satisfies WorkingMemoryConfig;

/**
 * Working Memory Layer
 *
 * Provides structured knowledge storage for user profiles, preferences,
 * and other persistent context.
 */
export class WorkingMemoryLayerImpl implements IWorkingMemoryLayer {
  private storage: WorkingMemoryStorageBackend;
  private config: WorkingMemoryConfig & {
    enabled: boolean;
    scope: string;
    maxTokens: number;
  };
  private isInitializedFlag: boolean = false;
  private mode: WorkingMemoryMode;

  constructor(
    storage: WorkingMemoryStorageBackend,
    config: WorkingMemoryConfig,
  ) {
    this.storage = storage;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    // Determine mode based on config
    this.mode = this.config.schema ? "schema" : "template";
  }

  /**
   * Initialize the working memory layer
   */
  async initialize(): Promise<void> {
    if (this.isInitializedFlag) {
      return;
    }

    try {
      await this.storage.initialize();
      this.isInitializedFlag = true;
      logger.info("[WorkingMemoryLayer] Initialized", {
        mode: this.mode,
        maxTokens: this.config.maxTokens,
        scope: this.config.scope,
      });
    } catch (error) {
      throw WorkingMemoryErrors.create(
        "INITIALIZATION_FAILED",
        "Failed to initialize working memory layer",
        {
          cause: error instanceof Error ? error : undefined,
          details: { mode: this.mode },
        },
      );
    }
  }

  /**
   * Check if layer is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get layer type
   */
  getLayerType(): MemoryLayerType {
    return "working";
  }

  /**
   * Get working memory for a resource
   */
  async get(resourceId: string): Promise<WorkingMemoryData | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const data = await this.storage.get(resourceId);

      if (!data) {
        logger.debug("[WorkingMemoryLayer] No data found for resource", {
          resourceId,
        });
        return null;
      }

      return data;
    } catch (error) {
      logger.error("[WorkingMemoryLayer] Failed to get data", {
        resourceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw WorkingMemoryErrors.create(
        "STORAGE_ERROR",
        "Failed to get working memory",
        {
          cause: error instanceof Error ? error : undefined,
          details: { resourceId },
        },
      );
    }
  }

  /**
   * Set working memory for a resource (replace semantics for template)
   */
  async set(
    resourceId: string,
    data: string | Record<string, unknown>,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const now = new Date().toISOString();
      const existing = await this.storage.get(resourceId);

      let workingMemoryData: WorkingMemoryData;

      if (typeof data === "string") {
        // Template mode
        const tokenCount = estimateTokenCount(data);

        if (tokenCount > this.config.maxTokens) {
          throw WorkingMemoryErrors.create(
            "VALIDATION_ERROR",
            `Content exceeds maximum token limit (${tokenCount} > ${this.config.maxTokens})`,
            { details: { tokenCount, maxTokens: this.config.maxTokens } },
          );
        }

        workingMemoryData = {
          resourceId,
          mode: "template",
          template: data,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
          tokenCount,
        };
      } else {
        // Schema mode
        const serialized = JSON.stringify(data);
        const tokenCount = estimateTokenCount(serialized);

        if (tokenCount > this.config.maxTokens) {
          throw WorkingMemoryErrors.create(
            "VALIDATION_ERROR",
            `Content exceeds maximum token limit (${tokenCount} > ${this.config.maxTokens})`,
            { details: { tokenCount, maxTokens: this.config.maxTokens } },
          );
        }

        // Validate against schema if provided
        if (this.config.schema) {
          this.validateAgainstSchema(data);
        }

        workingMemoryData = {
          resourceId,
          mode: "schema",
          schemaData: data,
          createdAt: existing?.createdAt || now,
          updatedAt: now,
          tokenCount,
        };
      }

      await this.storage.set(resourceId, workingMemoryData);

      logger.debug("[WorkingMemoryLayer] Set data", {
        resourceId,
        mode: workingMemoryData.mode,
        tokenCount: workingMemoryData.tokenCount,
      });
    } catch (error) {
      if (error instanceof Error && error.name.includes("WorkingMemory")) {
        throw error;
      }
      throw WorkingMemoryErrors.create(
        "STORAGE_ERROR",
        "Failed to set working memory",
        {
          cause: error instanceof Error ? error : undefined,
          details: { resourceId },
        },
      );
    }
  }

  /**
   * Merge data into working memory (for schema mode)
   */
  async merge(
    resourceId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const existing = await this.storage.get(resourceId);
      const now = new Date().toISOString();

      let mergedData: Record<string, unknown>;

      if (existing && existing.mode === "schema" && existing.schemaData) {
        // Deep merge with existing data
        mergedData = this.deepMerge(existing.schemaData, data);
      } else {
        // No existing data or not in schema mode, use new data
        mergedData = data;
      }

      const serialized = JSON.stringify(mergedData);
      const tokenCount = estimateTokenCount(serialized);

      if (tokenCount > this.config.maxTokens) {
        throw WorkingMemoryErrors.create(
          "VALIDATION_ERROR",
          `Merged content exceeds maximum token limit (${tokenCount} > ${this.config.maxTokens})`,
          { details: { tokenCount, maxTokens: this.config.maxTokens } },
        );
      }

      // Validate against schema if provided
      if (this.config.schema) {
        this.validateAgainstSchema(mergedData);
      }

      const workingMemoryData: WorkingMemoryData = {
        resourceId,
        mode: "schema",
        schemaData: mergedData,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        tokenCount,
      };

      await this.storage.set(resourceId, workingMemoryData);

      logger.debug("[WorkingMemoryLayer] Merged data", {
        resourceId,
        tokenCount,
        hadExisting: !!existing,
      });
    } catch (error) {
      if (error instanceof Error && error.name.includes("WorkingMemory")) {
        throw error;
      }
      throw WorkingMemoryErrors.create(
        "MERGE_ERROR",
        "Failed to merge working memory",
        {
          cause: error instanceof Error ? error : undefined,
          details: { resourceId },
        },
      );
    }
  }

  /**
   * Clear working memory for a resource
   */
  async clear(resourceId: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const result = await this.storage.delete(resourceId);
      logger.debug("[WorkingMemoryLayer] Cleared data", { resourceId, result });
      return result;
    } catch (error) {
      throw WorkingMemoryErrors.create(
        "STORAGE_ERROR",
        "Failed to clear working memory",
        {
          cause: error instanceof Error ? error : undefined,
          details: { resourceId },
        },
      );
    }
  }

  /**
   * Get rendered working memory content
   */
  async render(
    resourceId: string,
    variables?: Record<string, unknown>,
  ): Promise<string> {
    if (!this.config.enabled) {
      return "";
    }

    const data = await this.storage.get(resourceId);
    if (!data) {
      return "";
    }

    if (data.mode === "template" && data.template) {
      // Render template with variable substitution
      return this.renderTemplate(data.template, variables || {});
    } else if (data.mode === "schema" && data.schemaData) {
      // Convert schema data to readable format
      return this.renderSchema(data.schemaData);
    }

    return "";
  }

  /**
   * Get token count for working memory
   */
  async getTokenCount(resourceId: string): Promise<number> {
    const data = await this.storage.get(resourceId);
    if (!data) {
      return 0;
    }
    return data.tokenCount || 0;
  }

  /**
   * Close/cleanup resources
   */
  async close(): Promise<void> {
    await this.storage.close();
    this.isInitializedFlag = false;
    logger.debug("[WorkingMemoryLayer] Closed");
  }

  /**
   * Get current mode
   */
  getMode(): WorkingMemoryMode {
    return this.mode;
  }

  /**
   * List all resource IDs with working memory
   */
  async listResources(): Promise<string[]> {
    return this.storage.list();
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Deep merge two objects
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target };

    for (const key of Object.keys(source)) {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (this.isPlainObject(targetValue) && this.isPlainObject(sourceValue)) {
        result[key] = this.deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>,
        );
      } else {
        result[key] = sourceValue;
      }
    }

    return result;
  }

  /**
   * Check if value is a plain object
   */
  private isPlainObject(value: unknown): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Render template with variable substitution
   */
  private renderTemplate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, "g"), String(value));
    }

    return result;
  }

  /**
   * Render schema data to readable format
   */
  private renderSchema(data: Record<string, unknown>): string {
    const lines: string[] = [];

    const renderValue = (
      key: string,
      value: unknown,
      indent: number = 0,
    ): void => {
      const prefix = "  ".repeat(indent);

      if (Array.isArray(value)) {
        lines.push(`${prefix}${key}:`);
        value.forEach((item, idx) => {
          if (this.isPlainObject(item)) {
            lines.push(`${prefix}  - [${idx + 1}]`);
            for (const [k, v] of Object.entries(
              item as Record<string, unknown>,
            )) {
              renderValue(k, v, indent + 2);
            }
          } else {
            lines.push(`${prefix}  - ${String(item)}`);
          }
        });
      } else if (this.isPlainObject(value)) {
        lines.push(`${prefix}${key}:`);
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          renderValue(k, v, indent + 1);
        }
      } else {
        lines.push(`${prefix}${key}: ${String(value)}`);
      }
    };

    for (const [key, value] of Object.entries(data)) {
      renderValue(key, value);
    }

    return lines.join("\n");
  }

  /**
   * Validate data against JSON schema (basic validation)
   */
  private validateAgainstSchema(data: Record<string, unknown>): void {
    // Basic validation - check required fields if schema defines them
    const schema = this.config.schema as unknown as
      | Record<string, unknown>
      | undefined;

    if (!schema) {
      return;
    }

    // Check required fields
    const required = schema.required as string[] | undefined;
    if (required && Array.isArray(required)) {
      for (const field of required) {
        if (!(field in data)) {
          throw WorkingMemoryErrors.create(
            "VALIDATION_ERROR",
            `Missing required field: ${field}`,
            { details: { field, required } },
          );
        }
      }
    }

    // Additional validation can be added here
    // For full JSON Schema validation, consider using a library like ajv
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a working memory layer with in-memory storage (for development/testing)
 */
export function createInMemoryWorkingMemoryLayer(
  config?: Partial<WorkingMemoryConfig>,
): WorkingMemoryLayerImpl {
  const storage = new InMemoryWorkingMemoryStorage();
  return new WorkingMemoryLayerImpl(storage, {
    enabled: true,
    ...config,
  });
}

/**
 * Create a working memory layer with Redis storage (for production)
 */
export function createRedisWorkingMemoryLayer(
  redisConfig: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    ttl?: number;
  } = {},
  config?: Partial<WorkingMemoryConfig>,
): WorkingMemoryLayerImpl {
  const storage = new RedisWorkingMemoryStorage(redisConfig);
  return new WorkingMemoryLayerImpl(storage, {
    enabled: true,
    ...config,
  });
}

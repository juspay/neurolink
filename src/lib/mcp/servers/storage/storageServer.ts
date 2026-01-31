/**
 * NeuroLink Storage Server
 * Provides tools for querying conversation threads and message history
 */

import { z } from "zod";
import type {
  Unknown,
  NeuroLinkExecutionContext,
  ToolResult,
  StorageThread,
} from "../../../types/index.js";
import { createMCPServer } from "../../factory.js";
import { logger } from "../../../utils/logger.js";

/**
 * Storage Server - Conversation thread and message lookup tools
 */
export const storageServer = createMCPServer({
  id: "neurolink-storage",
  title: "NeuroLink Storage Server",
  description: "Query conversation threads and message history",
  category: "data",
  version: "1.0.0",
});

/**
 * Search Threads Input Schema
 */
const SearchThreadsSchema = z.object({
  resourceId: z.string().optional().describe("Filter by resource/user ID"),
  limit: z
    .number()
    .optional()
    .default(10)
    .describe("Maximum number of results to return"),
});

/**
 * Register Search Threads Tool
 */
storageServer.registerTool({
  name: "search_threads",
  description: "Search conversation threads by resource ID or title",
  category: "data",
  inputSchema: SearchThreadsSchema,
  isImplemented: true,
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedInput = SearchThreadsSchema.parse(params);
      const { resourceId, limit } = validatedInput;

      logger.debug(
        `[Storage] Searching threads with resourceId: ${resourceId}, limit: ${limit}`,
      );

      const { createStorageFromEnv } =
        await import("../../../storage/index.js");
      const storage = await createStorageFromEnv();
      await storage.init();

      const result = await storage.getThreadsByResourceId(resourceId || "");
      const limited = result.data.slice(0, limit || 10);

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[Storage] Found ${limited.length} threads in ${executionTime}ms`,
      );

      return {
        success: true,
        data: limited.map((t: StorageThread) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          createdAt: t.createdAt,
        })),
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "search_threads",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[Storage] Search threads failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "search_threads",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Get Thread History Input Schema
 */
const GetThreadHistorySchema = z.object({
  threadId: z.string().describe("Thread ID to fetch messages from"),
  limit: z
    .number()
    .optional()
    .default(50)
    .describe("Maximum number of messages to return"),
});

/**
 * Register Get Thread History Tool
 */
storageServer.registerTool({
  name: "get_thread_history",
  description: "Get message history for a conversation thread",
  category: "data",
  inputSchema: GetThreadHistorySchema,
  isImplemented: true,
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedInput = GetThreadHistorySchema.parse(params);
      const { threadId, limit } = validatedInput;

      logger.debug(
        `[Storage] Getting thread history for threadId: ${threadId}, limit: ${limit}`,
      );

      const { createStorageFromEnv } =
        await import("../../../storage/index.js");
      const storage = await createStorageFromEnv();
      await storage.init();

      const messages = await storage.getMessagesByThreadId(threadId);
      const limited = messages.slice(-(limit || 50));

      const executionTime = Date.now() - startTime;

      logger.debug(
        `[Storage] Retrieved ${limited.length} messages in ${executionTime}ms`,
      );

      return {
        success: true,
        data: limited.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "get_thread_history",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[Storage] Get thread history failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "get_thread_history",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Get Thread Input Schema
 */
const GetThreadSchema = z.object({
  threadId: z.string().describe("Thread ID to retrieve"),
});

/**
 * Register Get Thread Tool
 */
storageServer.registerTool({
  name: "get_thread",
  description: "Get details about a specific conversation thread",
  category: "data",
  inputSchema: GetThreadSchema,
  isImplemented: true,
  execute: async (
    params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      const validatedInput = GetThreadSchema.parse(params);
      const { threadId } = validatedInput;

      logger.debug(`[Storage] Getting thread: ${threadId}`);

      const { createStorageFromEnv } =
        await import("../../../storage/index.js");
      const storage = await createStorageFromEnv();
      await storage.init();

      const thread = await storage.getThread(threadId);

      const executionTime = Date.now() - startTime;

      if (!thread) {
        logger.warn(`[Storage] Thread not found: ${threadId}`);
        return {
          success: false,
          error: `Thread not found: ${threadId}`,
          metadata: {
            toolName: "get_thread",
            serverId: "neurolink-storage",
            sessionId: context.sessionId,
            timestamp: Date.now(),
            executionTime,
          },
        };
      }

      logger.debug(
        `[Storage] Thread retrieved successfully in ${executionTime}ms`,
      );

      return {
        success: true,
        data: thread,
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "get_thread",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[Storage] Get thread failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "get_thread",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

/**
 * Storage Status Input Schema
 */
const StorageStatusSchema = z.object({});

/**
 * Register Storage Status Tool
 */
storageServer.registerTool({
  name: "storage_status",
  description: "Get storage backend health and status information",
  category: "data",
  inputSchema: StorageStatusSchema,
  isImplemented: true,
  execute: async (
    _params: Unknown,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> => {
    const startTime = Date.now();

    try {
      logger.debug("[Storage] Checking storage health status");

      const { createStorageFromEnv } =
        await import("../../../storage/index.js");
      const storage = await createStorageFromEnv();
      await storage.init();

      const health = await storage.healthCheck();

      const executionTime = Date.now() - startTime;

      logger.debug(`[Storage] Health check completed in ${executionTime}ms`);

      return {
        success: true,
        data: health,
        usage: {
          executionTime,
        },
        metadata: {
          toolName: "storage_status",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error(`[Storage] Health check failed: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        metadata: {
          toolName: "storage_status",
          serverId: "neurolink-storage",
          sessionId: context.sessionId,
          timestamp: Date.now(),
          executionTime,
        },
      };
    }
  },
});

// Log successful server creation
logger.debug(
  "[Storage] NeuroLink Storage Server v1.0.0 created with 4 tools:",
  Object.keys(storageServer.tools),
);

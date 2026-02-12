/**
 * Memory Routes
 * Endpoints for conversation memory management
 */

import type { RouteGroup, ServerContext } from "../types.js";
import {
  createErrorResponse,
  IdParamSchema,
  SessionIdParamSchema,
  validateParams,
} from "../utils/validation.js";

/**
 * Handler: Get messages for a session
 */
async function handleGetSessionMessages(ctx: ServerContext) {
  // Validate path params
  const paramValidation = validateParams(
    IdParamSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { id: sessionId } = paramValidation.data;

  // Parse query params for pagination
  const limitParam = ctx.query.limit ? parseInt(ctx.query.limit, 10) : 50;
  const offsetParam = ctx.query.offset ? parseInt(ctx.query.offset, 10) : 0;

  // Validate pagination params
  const limit =
    isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 100);
  const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;
  const memory = ctx.neurolink.conversationMemory;

  if (!memory) {
    return createErrorResponse(
      "MEMORY_UNAVAILABLE",
      "Conversation memory not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    let messages: unknown[] = [];

    // Handle Redis memory manager (has getUserSessionHistory)
    if ("getUserSessionHistory" in memory) {
      // For Redis, we need a userId - check query params or use a default
      const userId = ctx.query.userId || "default";
      const sessionMessages = await (
        memory as {
          getUserSessionHistory: (
            userId: string,
            sessionId: string,
          ) => Promise<unknown[] | null>;
        }
      ).getUserSessionHistory(userId, sessionId);

      if (sessionMessages === null) {
        return createErrorResponse(
          "SESSION_NOT_FOUND",
          `Session '${sessionId}' not found`,
          undefined,
          ctx.requestId,
        );
      }

      messages = sessionMessages;
    }
    // Handle in-memory manager (has getSession)
    else if ("getSession" in memory) {
      const session = (
        memory as {
          getSession: (
            sessionId: string,
          ) => { messages: unknown[] } | undefined;
        }
      ).getSession(sessionId);

      if (!session) {
        return createErrorResponse(
          "SESSION_NOT_FOUND",
          `Session '${sessionId}' not found`,
          undefined,
          ctx.requestId,
        );
      }

      messages = session.messages;
    }
    // Fallback: try buildContextMessages if available
    else if ("buildContextMessages" in memory) {
      messages = await (
        memory as {
          buildContextMessages: (sessionId: string) => Promise<unknown[]>;
        }
      ).buildContextMessages(sessionId);

      // If no messages, session might not exist
      if (messages.length === 0) {
        return createErrorResponse(
          "SESSION_NOT_FOUND",
          `Session '${sessionId}' not found or has no messages`,
          undefined,
          ctx.requestId,
        );
      }
    }

    const total = messages.length;
    const paginatedMessages = messages.slice(offset, offset + limit);

    return {
      sessionId,
      messages: paginatedMessages,
      total,
      limit,
      offset,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "MEMORY_ERROR",
      error instanceof Error ? error.message : "Failed to get session messages",
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: Get session by ID
 */
async function handleGetSession(ctx: ServerContext) {
  // Validate path params
  const paramValidation = validateParams(
    IdParamSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { id: sessionId } = paramValidation.data;
  const memory = ctx.neurolink.conversationMemory;

  if (!memory) {
    return createErrorResponse(
      "MEMORY_UNAVAILABLE",
      "Conversation memory not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    // Handle Redis memory manager (has getUserSessionObject or getUserSessionMetadata)
    if ("getUserSessionObject" in memory) {
      // For Redis, we need a userId - check query params or use a default
      const userId = ctx.query.userId || "default";
      const sessionObject = await (
        memory as {
          getUserSessionObject: (
            userId: string,
            sessionId: string,
          ) => Promise<unknown | null>;
        }
      ).getUserSessionObject(userId, sessionId);

      if (sessionObject === null) {
        return createErrorResponse(
          "SESSION_NOT_FOUND",
          `Session '${sessionId}' not found`,
          undefined,
          ctx.requestId,
        );
      }

      return {
        session: sessionObject,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      };
    }
    // Handle in-memory manager (has getSession)
    else if ("getSession" in memory) {
      const session = (
        memory as {
          getSession: (sessionId: string) => unknown | undefined;
        }
      ).getSession(sessionId);

      if (!session) {
        return createErrorResponse(
          "SESSION_NOT_FOUND",
          `Session '${sessionId}' not found`,
          undefined,
          ctx.requestId,
        );
      }

      return {
        session,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      };
    }

    return createErrorResponse(
      "MEMORY_ERROR",
      "Session retrieval not supported for this memory type",
      undefined,
      ctx.requestId,
    );
  } catch (error) {
    return createErrorResponse(
      "MEMORY_ERROR",
      error instanceof Error ? error.message : "Failed to get session",
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: List all conversation sessions
 */
async function handleListSessions(ctx: ServerContext) {
  // Parse query params
  const userId = ctx.query.userId;
  const limitParam = ctx.query.limit ? parseInt(ctx.query.limit, 10) : 50;
  const offsetParam = ctx.query.offset ? parseInt(ctx.query.offset, 10) : 0;

  // Validate pagination params
  const limit =
    isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 100);
  const offset = isNaN(offsetParam) || offsetParam < 0 ? 0 : offsetParam;

  const memory = ctx.neurolink.conversationMemory;

  if (!memory) {
    return createErrorResponse(
      "MEMORY_UNAVAILABLE",
      "Conversation memory not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    let sessions: unknown[] = [];

    // Handle Redis memory manager (has getUserAllSessionsHistory or getUserSessions)
    if ("getUserAllSessionsHistory" in memory && userId) {
      sessions = await (
        memory as {
          getUserAllSessionsHistory: (userId: string) => Promise<unknown[]>;
        }
      ).getUserAllSessionsHistory(userId);
    } else if ("getUserSessions" in memory && userId) {
      // Get session IDs and then fetch metadata for each
      const sessionIds = await (
        memory as {
          getUserSessions: (userId: string) => Promise<string[]>;
        }
      ).getUserSessions(userId);

      // If we can get metadata, do so
      if ("getUserSessionMetadata" in memory) {
        const metadataPromises = sessionIds.map((id) =>
          (
            memory as {
              getUserSessionMetadata: (
                userId: string,
                sessionId: string,
              ) => Promise<unknown | null>;
            }
          ).getUserSessionMetadata(userId, id),
        );
        const metadataResults = await Promise.all(metadataPromises);
        sessions = metadataResults.filter((m) => m !== null);
      } else {
        // Just return session IDs as basic objects
        sessions = sessionIds.map((id) => ({ id }));
      }
    }
    // Handle in-memory manager - iterate over internal sessions Map
    else if ("getStats" in memory) {
      // For in-memory, we can use getSession to check if sessions exist
      // but we need to know the session IDs first. The in-memory manager
      // doesn't expose a listSessions method, so we return stats info instead.
      const stats = await memory.getStats?.();
      return {
        sessions: [],
        total: stats?.totalSessions || 0,
        limit,
        offset,
        message:
          "Session listing not fully supported for in-memory storage. Use /stats endpoint for session counts.",
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: ctx.requestId,
        },
      };
    }

    const total = sessions.length;
    const paginatedSessions = sessions.slice(offset, offset + limit);

    return {
      sessions: paginatedSessions,
      total,
      limit,
      offset,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "MEMORY_ERROR",
      error instanceof Error ? error.message : "Failed to list sessions",
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: Get memory statistics
 */
async function handleGetStats(ctx: ServerContext) {
  const memory = ctx.neurolink.conversationMemory;

  if (!memory) {
    return createErrorResponse(
      "MEMORY_UNAVAILABLE",
      "Conversation memory not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    // Get memory statistics if available
    const stats = await memory.getStats?.();

    return {
      available: true,
      type: memory.constructor.name,
      stats: stats || {
        message: "Statistics not available for this memory type",
      },
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return createErrorResponse(
      "MEMORY_ERROR",
      error instanceof Error ? error.message : "Failed to get statistics",
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: Clear a conversation session
 */
async function handleClearSession(ctx: ServerContext) {
  // Validate params
  const paramValidation = validateParams(
    SessionIdParamSchema,
    ctx.params,
    ctx.requestId,
  );

  if (!paramValidation.success) {
    return paramValidation.error;
  }

  const { sessionId } = paramValidation.data;
  const memory = ctx.neurolink.conversationMemory;

  if (!memory) {
    return createErrorResponse(
      "MEMORY_UNAVAILABLE",
      "Conversation memory not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    // Use clearSession for ConversationMemoryManager
    const cleared = await memory.clearSession?.(sessionId);

    if (cleared === false) {
      return createErrorResponse(
        "SESSION_NOT_FOUND",
        `Session '${sessionId}' not found`,
        undefined,
        ctx.requestId,
      );
    }

    return {
      success: true,
      sessionId,
      message: "Session cleared successfully",
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "MEMORY_ERROR",
      error instanceof Error ? error.message : "Failed to clear session",
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: Clear all conversation sessions
 */
async function handleClearAllSessions(ctx: ServerContext) {
  const memory = ctx.neurolink.conversationMemory;

  if (!memory) {
    return createErrorResponse(
      "MEMORY_UNAVAILABLE",
      "Conversation memory not available",
      undefined,
      ctx.requestId,
    );
  }

  try {
    // Use clearAllSessions for ConversationMemoryManager
    await memory.clearAllSessions?.();

    return {
      success: true,
      message: "All sessions cleared successfully",
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
      },
    };
  } catch (error) {
    return createErrorResponse(
      "MEMORY_ERROR",
      error instanceof Error ? error.message : "Failed to clear sessions",
      undefined,
      ctx.requestId,
    );
  }
}

/**
 * Handler: Check memory system health
 */
async function handleMemoryHealth(ctx: ServerContext) {
  const memory = ctx.neurolink.conversationMemory;

  return {
    available: !!memory,
    type: memory?.constructor.name || "none",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create memory management routes
 * Note: These routes provide a simplified interface to conversation memory.
 * The actual implementation depends on the memory manager type (ConversationMemoryManager or RedisConversationMemoryManager).
 */
export function createMemoryRoutes(basePath: string = "/api"): RouteGroup {
  return {
    prefix: `${basePath}/memory`,
    routes: [
      // Route order matters - most specific routes first
      // GET /api/memory/sessions/:id/messages - Get messages for a session (most specific)
      {
        method: "GET",
        path: `${basePath}/memory/sessions/:id/messages`,
        handler: handleGetSessionMessages,
        description: "Get messages for a session",
        tags: ["memory"],
      },
      // GET /api/memory/sessions/:id - Get session by ID
      {
        method: "GET",
        path: `${basePath}/memory/sessions/:id`,
        handler: handleGetSession,
        description: "Get session by ID",
        tags: ["memory"],
      },
      // GET /api/memory/sessions - List all conversation sessions
      {
        method: "GET",
        path: `${basePath}/memory/sessions`,
        handler: handleListSessions,
        description: "List all conversation sessions",
        tags: ["memory"],
      },
      {
        method: "GET",
        path: `${basePath}/memory/stats`,
        handler: handleGetStats,
        description: "Get memory statistics",
        tags: ["memory"],
      },
      {
        method: "DELETE",
        path: `${basePath}/memory/sessions/:sessionId`,
        handler: handleClearSession,
        description: "Clear a conversation session",
        tags: ["memory"],
      },
      {
        method: "DELETE",
        path: `${basePath}/memory/sessions`,
        handler: handleClearAllSessions,
        description: "Clear all conversation sessions",
        tags: ["memory"],
      },
      {
        method: "GET",
        path: `${basePath}/memory/health`,
        handler: handleMemoryHealth,
        description: "Check memory system health",
        tags: ["memory", "health"],
      },
    ],
  };
}

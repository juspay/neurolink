/**
 * Memory Routes
 * Endpoints for conversation memory management
 */

import type {
  RouteGroup,
  ServerContext,
  ServerMemoryActor,
  ServerMemoryRouteOptions,
} from "../../types/index.js";
import { withSpan } from "../../telemetry/withSpan.js";
import { tracers } from "../../telemetry/tracers.js";
import {
  createErrorResponse,
  IdParamSchema,
  SessionIdParamSchema,
  validateParams,
} from "../utils/validation.js";

/**
 * Wrap a route handler with an OTel span for HTTP observability.
 */
function tracedMemoryHandler<T>(
  name: string,
  route: string,
  fn: (ctx: ServerContext) => Promise<T>,
): (ctx: ServerContext) => Promise<T> {
  return (ctx: ServerContext) =>
    withSpan(
      {
        name,
        tracer: tracers.http,
        attributes: {
          "http.route": route,
          "http.request.id": ctx.requestId,
        },
      },
      () => fn(ctx),
    );
}

const DEFAULT_ADMIN_ROLES = ["admin"];

/**
 * Who is calling. Without `ctx.user` (no auth, or one shared API key) there is
 * no identity to scope by and the routes behave as they always have.
 */
function resolveMemoryActor(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
): ServerMemoryActor {
  const adminRoles = options?.adminRoles ?? DEFAULT_ADMIN_ROLES;
  return {
    user: ctx.user,
    admin: (ctx.user?.roles ?? []).some((role) => adminRoles.includes(role)),
  };
}

/**
 * Whose sessions this request is about. An authenticated caller is always
 * itself: `?userId=` may repeat its own id, and only an admin may name another.
 * Taking the user from the query string is what let any authenticated caller
 * read another user's conversations.
 */
function resolveSubjectUserId(
  ctx: ServerContext,
  actor: ServerMemoryActor,
): { userId: string | undefined } | ReturnType<typeof createErrorResponse> {
  const requested = ctx.query.userId;
  if (!actor.user) {
    return { userId: requested };
  }
  if (!requested || requested === actor.user.id) {
    return { userId: actor.user.id };
  }
  if (actor.admin) {
    return { userId: requested };
  }
  return createErrorResponse(
    "FORBIDDEN",
    "userId does not match the authenticated user",
    undefined,
    ctx.requestId,
  );
}

/**
 * The in-memory manager keys sessions by id alone, so ownership is the
 * session's own `userId`. A session with none belongs to no one an
 * authenticated caller can prove to be themselves, so only an admin sees it.
 */
function ownsSession(actor: ServerMemoryActor, session: unknown): boolean {
  if (!actor.user || actor.admin) {
    return true;
  }
  const owner = (session as { userId?: unknown } | null)?.userId;
  return typeof owner === "string" && owner === actor.user.id;
}

/**
 * Handler: Get messages for a session
 */
async function handleGetSessionMessages(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
) {
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
  const actor = resolveMemoryActor(ctx, options);
  const subject = resolveSubjectUserId(ctx, actor);
  if ("error" in subject) {
    return subject;
  }

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
      const userId = subject.userId || "default";
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
          ) => { messages: unknown[]; userId?: string } | undefined;
        }
      ).getSession(sessionId);

      if (!session || !ownsSession(actor, session)) {
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
      // Ownership cannot be established for this manager.
      if (actor.user && !actor.admin) {
        return createErrorResponse(
          "SESSION_NOT_FOUND",
          `Session '${sessionId}' not found`,
          undefined,
          ctx.requestId,
        );
      }
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
async function handleGetSession(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
) {
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
  const actor = resolveMemoryActor(ctx, options);
  const subject = resolveSubjectUserId(ctx, actor);
  if ("error" in subject) {
    return subject;
  }
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
      const userId = subject.userId || "default";
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

      if (!session || !ownsSession(actor, session)) {
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
async function handleListSessions(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
) {
  const actor = resolveMemoryActor(ctx, options);
  const subject = resolveSubjectUserId(ctx, actor);
  if ("error" in subject) {
    return subject;
  }
  // Parse query params
  const userId = subject.userId;
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
    // In-memory manager: an authenticated non-admin sees only their own
    // sessions, not the stats branch's count of everyone's.
    else if (actor.user && !actor.admin && "listSessions" in memory) {
      sessions = await (
        memory as {
          listSessions: (userId?: string) => Promise<unknown[]>;
        }
      ).listSessions(actor.user.id);
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
async function handleGetStats(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
) {
  const actor = resolveMemoryActor(ctx, options);
  if (actor.user && !actor.admin) {
    return createErrorResponse(
      "FORBIDDEN",
      "Memory statistics require an admin role",
      undefined,
      ctx.requestId,
    );
  }
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
async function handleClearSession(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
) {
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
  const actor = resolveMemoryActor(ctx, options);
  const subject = resolveSubjectUserId(ctx, actor);
  if ("error" in subject) {
    return subject;
  }
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
    const redisBacked = "getUserSessionObject" in memory;
    if (actor.user && !actor.admin && !redisBacked) {
      const existing =
        "getSession" in memory
          ? (memory as { getSession: (id: string) => unknown }).getSession(
              sessionId,
            )
          : undefined;
      if (!existing || !ownsSession(actor, existing)) {
        return createErrorResponse(
          "SESSION_NOT_FOUND",
          `Session '${sessionId}' not found`,
          undefined,
          ctx.requestId,
        );
      }
    }
    // The Redis manager derives the key from the user, so hand it the one
    // this request is scoped to; the in-memory manager ignores the argument.
    const cleared = await (
      memory as {
        clearSession?: (sessionId: string, userId?: string) => Promise<boolean>;
      }
    ).clearSession?.(sessionId, redisBacked ? subject.userId : undefined);

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
async function handleClearAllSessions(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
) {
  const actor = resolveMemoryActor(ctx, options);
  if (actor.user && !actor.admin) {
    return createErrorResponse(
      "FORBIDDEN",
      "Clearing every session requires an admin role",
      undefined,
      ctx.requestId,
    );
  }
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
 *
 * When the request carries an authenticated user, the routes are scoped to it:
 * a caller reaches only its own sessions, and statistics and clear-all need a
 * role in `options.adminRoles` (default `["admin"]`). Without a user (no auth,
 * or one shared API key) behaviour is unchanged.
 */
export function createMemoryRoutes(
  basePath: string = "/api",
  options?: ServerMemoryRouteOptions,
): RouteGroup {
  return {
    prefix: `${basePath}/memory`,
    routes: [
      // Route order matters - most specific routes first
      // GET /api/memory/sessions/:id/messages - Get messages for a session (most specific)
      {
        method: "GET",
        path: `${basePath}/memory/sessions/:id/messages`,
        handler: tracedMemoryHandler(
          "neurolink.http.memory.getSessionMessages",
          `${basePath}/memory/sessions/:id/messages`,
          (ctx) => handleGetSessionMessages(ctx, options),
        ),
        description: "Get messages for a session",
        tags: ["memory"],
      },
      // GET /api/memory/sessions/:id - Get session by ID
      {
        method: "GET",
        path: `${basePath}/memory/sessions/:id`,
        handler: tracedMemoryHandler(
          "neurolink.http.memory.getSession",
          `${basePath}/memory/sessions/:id`,
          (ctx) => handleGetSession(ctx, options),
        ),
        description: "Get session by ID",
        tags: ["memory"],
      },
      // GET /api/memory/sessions - List all conversation sessions
      {
        method: "GET",
        path: `${basePath}/memory/sessions`,
        handler: tracedMemoryHandler(
          "neurolink.http.memory.listSessions",
          `${basePath}/memory/sessions`,
          (ctx) => handleListSessions(ctx, options),
        ),
        description: "List all conversation sessions",
        tags: ["memory"],
      },
      {
        method: "GET",
        path: `${basePath}/memory/stats`,
        handler: tracedMemoryHandler(
          "neurolink.http.memory.stats",
          `${basePath}/memory/stats`,
          (ctx) => handleGetStats(ctx, options),
        ),
        description: "Get memory statistics",
        tags: ["memory"],
      },
      {
        method: "DELETE",
        path: `${basePath}/memory/sessions/:sessionId`,
        handler: tracedMemoryHandler(
          "neurolink.http.memory.clearSession",
          `${basePath}/memory/sessions/:sessionId`,
          (ctx) => handleClearSession(ctx, options),
        ),
        description: "Clear a conversation session",
        tags: ["memory"],
      },
      {
        method: "DELETE",
        path: `${basePath}/memory/sessions`,
        handler: tracedMemoryHandler(
          "neurolink.http.memory.clearAllSessions",
          `${basePath}/memory/sessions`,
          (ctx) => handleClearAllSessions(ctx, options),
        ),
        description: "Clear all conversation sessions",
        tags: ["memory"],
      },
      {
        method: "GET",
        path: `${basePath}/memory/health`,
        handler: tracedMemoryHandler(
          "neurolink.http.memory.health",
          `${basePath}/memory/health`,
          handleMemoryHealth,
        ),
        description: "Check memory system health",
        tags: ["memory", "health"],
      },
    ],
  };
}

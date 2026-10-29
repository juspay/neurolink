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
import { shapeRouteError } from "../utils/clientError.js";
import { SESSION_ONLY_USER_ID } from "../../utils/redis.js";
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
 * Under `perUserAuth` a `:` is refused in every part of a session's key the
 * routes take from the request: the authenticated user's id, an admin's
 * `?userId=` and the session id. The Redis manager joins them unescaped as
 * `<keyPrefix><userId>:<sessionId>`, so with a `:` in either part two different
 * pairs share a key, and user `a` asking for session `b:c` would reach user
 * `a:b`'s session `c`. The rule is the same on every manager, so whether a
 * request is accepted does not depend on the backend.
 */
function refuseColon(
  ctx: ServerContext,
  what: string,
): ReturnType<typeof createErrorResponse> {
  return createErrorResponse(
    "VALIDATION_ERROR",
    `${what} must not contain ':' when the memory routes are scoped with perUserAuth`,
    undefined,
    ctx.requestId,
  );
}

/**
 * Under `perUserAuth` the user id `session-only` is refused as well, as the
 * authenticated user's id and as an admin's `?userId=`. It is the key a session
 * created without a `userId` is stored under on Redis, and the Redis manager
 * refuses it as a user id, so a request naming it could only miss; refusing it
 * here, on every manager, says why instead of answering `404`.
 */
function refuseReservedUserId(
  ctx: ServerContext,
  what: string,
): ReturnType<typeof createErrorResponse> {
  return createErrorResponse(
    "VALIDATION_ERROR",
    `${what} must not be '${SESSION_ONLY_USER_ID}', the user id reserved for sessions created without one, when the memory routes are scoped with perUserAuth`,
    undefined,
    ctx.requestId,
  );
}

/**
 * Who is calling. Without `perUserAuth` the routes do not read `ctx.user` at
 * all: no auth and one shared API key (which sets the same `ctx.user` for every
 * caller) both leave nothing to scope by, so the actor carries no user and every
 * route behaves as it always has. With `perUserAuth` (any truthy value, as for
 * the agent routes, so a JavaScript caller passing `"true"` or `1` still fails
 * closed) the request must carry an authenticated user with a non-empty id;
 * anything else is refused with 401, because an anonymous request is otherwise
 * indistinguishable from the trusted unscoped one. A user whose `roles` is not
 * an array (a malformed authentication middleware) has no roles, so it is an
 * ordinary user, never a 500.
 */
function resolveMemoryActor(
  ctx: ServerContext,
  options?: ServerMemoryRouteOptions,
): ServerMemoryActor | ReturnType<typeof createErrorResponse> {
  if (!options?.perUserAuth) {
    return { user: undefined, admin: false };
  }
  const user = ctx.user;
  if (!user || typeof user.id !== "string" || user.id.length === 0) {
    return createErrorResponse(
      "AUTH_REQUIRED",
      "Memory routes require an authenticated user",
      undefined,
      ctx.requestId,
    );
  }
  if (user.id.includes(":")) {
    return refuseColon(ctx, "The authenticated user id");
  }
  if (user.id === SESSION_ONLY_USER_ID) {
    return refuseReservedUserId(ctx, "The authenticated user id");
  }
  const adminRoles = options.adminRoles ?? DEFAULT_ADMIN_ROLES;
  return {
    user,
    admin:
      Array.isArray(user.roles) &&
      user.roles.some((role) => adminRoles.includes(role)),
  };
}

/**
 * Whose sessions this request is about. Under `perUserAuth` the caller is always
 * itself: `?userId=` may repeat its own id, and only an admin may name another.
 * Taking the user from the query string is what let any authenticated caller
 * read another user's conversations. Without it the query string is the only
 * source, as it always was.
 *
 * Express, Fastify and Koa hand a repeated `?userId=a&userId=b` to the handler
 * as an array (and an application that configures a bracket-parsing query
 * parser gets one for `?userId[]=x` too). Under `perUserAuth` such a value is
 * refused with 400 rather than read as "absent": reading it as absent would
 * answer about a different user than the one the caller asked for (the caller's
 * own sessions, or for an admin on the in-memory manager every session).
 * Without `perUserAuth` the value is passed on untouched, as it always was.
 */
function resolveSubjectUserId(
  ctx: ServerContext,
  actor: ServerMemoryActor,
): { userId: string | undefined } | ReturnType<typeof createErrorResponse> {
  const requested: unknown = ctx.query.userId;
  if (!actor.user) {
    return { userId: ctx.query.userId };
  }
  if (requested !== undefined && typeof requested !== "string") {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "userId must be a single value",
      undefined,
      ctx.requestId,
    );
  }
  if (requested?.includes(":")) {
    return refuseColon(ctx, "userId");
  }
  if (requested === SESSION_ONLY_USER_ID) {
    return refuseReservedUserId(ctx, "userId");
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
 * The in-memory manager keys sessions by id alone, so under `perUserAuth`
 * ownership is the session's own `userId`. A session with none belongs to no one
 * a caller can prove to be themselves, so only an admin sees it.
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
  const actor = resolveMemoryActor(ctx, options);
  if ("error" in actor) {
    return actor;
  }

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
  if (actor.user && sessionId.includes(":")) {
    return refuseColon(ctx, "The session id");
  }
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
      shapeRouteError("memoryRoutes", ctx.requestId, error).message,
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
  const actor = resolveMemoryActor(ctx, options);
  if ("error" in actor) {
    return actor;
  }

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
  if (actor.user && sessionId.includes(":")) {
    return refuseColon(ctx, "The session id");
  }
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
      shapeRouteError("memoryRoutes", ctx.requestId, error).message,
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
  if ("error" in actor) {
    return actor;
  }
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
    // In-memory manager under perUserAuth: a user sees their own sessions, an
    // admin every session (or one user's with ?userId=), rather than the stats
    // branch's empty list and a count of everyone's.
    else if (actor.user && "listSessions" in memory) {
      const scope = actor.admin ? ctx.query.userId || undefined : actor.user.id;
      sessions = await (
        memory as {
          listSessions: (userId?: string) => Promise<unknown[]>;
        }
      ).listSessions(scope);
    }
    // Handle in-memory manager - iterate over internal sessions Map
    else if ("getStats" in memory) {
      // For in-memory, we can use getSession to check if sessions exist
      // but we need to know the session IDs first. The in-memory manager
      // doesn't expose a listSessions method, so we return stats info instead.
      //
      // Under perUserAuth that total counts every user's sessions, and a manager
      // that gets here cannot say which of them are the caller's. An ordinary
      // user therefore gets an empty list and a total of 0, and the manager is
      // not asked; an admin, who may read statistics anyway, gets the total.
      const hidesTotal = Boolean(actor.user) && !actor.admin;
      const stats = hidesTotal ? undefined : await memory.getStats?.();
      return {
        sessions: [],
        total: stats?.totalSessions || 0,
        limit,
        offset,
        message: hidesTotal
          ? "This memory manager cannot list sessions per user."
          : "Session listing not fully supported for in-memory storage. Use /stats endpoint for session counts.",
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
      shapeRouteError("memoryRoutes", ctx.requestId, error).message,
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
  if ("error" in actor) {
    return actor;
  }
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
      shapeRouteError("memoryRoutes", ctx.requestId, error).message,
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
  const actor = resolveMemoryActor(ctx, options);
  if ("error" in actor) {
    return actor;
  }

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
  if (actor.user && sessionId.includes(":")) {
    return refuseColon(ctx, "The session id");
  }
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
    // The Redis manager derives the key from the user, so under perUserAuth hand
    // it the one this request is scoped to; the in-memory manager ignores the
    // argument. Without perUserAuth the call is as it always was, with no user.
    const cleared =
      actor.user && redisBacked
        ? await memory.clearSession?.(sessionId, subject.userId)
        : await memory.clearSession?.(sessionId);

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
      shapeRouteError("memoryRoutes", ctx.requestId, error).message,
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
  if ("error" in actor) {
    return actor;
  }
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
      shapeRouteError("memoryRoutes", ctx.requestId, error).message,
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
 * By default the routes ignore who is calling: sessions are chosen by id (and
 * `?userId=` on Redis), and statistics and clear-all are open to every caller
 * that gets past your authentication. That is right for no authentication or one
 * shared API key. Set `options.perUserAuth` (any truthy value) when the
 * authentication middleware identifies individual people: every route but
 * `GET /memory/health` then needs an authenticated user (401 otherwise), a
 * caller reaches only its own sessions, and statistics and clear-all need a role
 * in `options.adminRoles` (default `["admin"]`). A `?userId=` that is not a
 * single value (a repeated `?userId=a&userId=b`) is refused with 400, and a user
 * whose `roles` is not an array has no roles. A manager that can only report
 * statistics (no `listSessions`, not Redis) shows an ordinary user an empty
 * listing with a total of 0, never the count of everyone's sessions.
 *
 * `perUserAuth` needs `ctx.user` in the handler, which an adapter hands over
 * only when the server carries middleware state. `registerAllRoutes()` turns
 * that on for the server when it is given `perUserAuth`. A caller that registers
 * these routes itself with `perUserAuth` must create the server with
 * `carryMiddlewareState: true`. Without it, the user the authentication
 * middleware sets does not reach the routes, so every request whose context
 * has no `ctx.user` is answered 401, except `GET /memory/health`; a custom
 * adapter or direct handler call that sets `ctx.user` itself is served as that
 * user.
 *
 * On Redis, sessions are keyed by user, so an admin reaches another user's
 * session only by naming that user in `?userId=`. The Redis key is
 * `<keyPrefix><userId>:<sessionId>` with neither part escaped, so under
 * `perUserAuth` a `:` in the authenticated user's id, an admin's `?userId=` or
 * the session id is refused with 400 on every manager; otherwise user `a` asking
 * for session `b:c` would reach user `a:b`'s session `c`. A session created
 * without a `userId` is stored under the reserved user id `session-only`, which
 * the routes refuse with 400 as the authenticated user's id or an admin's
 * `?userId=`, so under `perUserAuth` no request reaches it.
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
          "http.memory.getSessionMessages",
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
          "http.memory.getSession",
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
          "http.memory.listSessions",
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
          "http.memory.stats",
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
          "http.memory.clearSession",
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
          "http.memory.clearAllSessions",
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
          "http.memory.health",
          `${basePath}/memory/health`,
          handleMemoryHealth,
        ),
        description: "Check memory system health",
        tags: ["memory", "health"],
      },
    ],
  };
}

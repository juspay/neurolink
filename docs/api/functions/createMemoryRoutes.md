[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMemoryRoutes

# Function: createMemoryRoutes()

> **createMemoryRoutes**(`basePath?`, `options?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Create memory management routes
Note: These routes provide a simplified interface to conversation memory.
The actual implementation depends on the memory manager type (ConversationMemoryManager or RedisConversationMemoryManager).

When the request carries an authenticated user, the routes are scoped to it:
a caller reaches only its own sessions, and statistics and clear-all need a
role in `options.adminRoles` (default `["admin"]`). Without a user (no auth,
or one shared API key) behaviour is unchanged.

## Parameters

### basePath?

`string` = `"/api"`

### options?

[`ServerMemoryRouteOptions`](../type-aliases/ServerMemoryRouteOptions.md)

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)

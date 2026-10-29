[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createMemoryRoutes

# Function: createMemoryRoutes()

> **createMemoryRoutes**(`basePath?`, `options?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Create memory management routes
Note: These routes provide a simplified interface to conversation memory.
The actual implementation depends on the memory manager type (ConversationMemoryManager or RedisConversationMemoryManager).

By default the routes ignore who is calling: sessions are chosen by id (and
`?userId=` on Redis), and statistics and clear-all are open to every caller
that gets past your authentication. That is right for no authentication or one
shared API key. Set `options.perUserAuth` (any truthy value) when the
authentication middleware identifies individual people: every route but
`GET /memory/health` then needs an authenticated user (401 otherwise), a
caller reaches only its own sessions, and statistics and clear-all need a role
in `options.adminRoles` (default `["admin"]`). A `?userId=` that is not a
single value (a repeated `?userId=a&userId=b`) is refused with 400, and a user
whose `roles` is not an array has no roles. A manager that can only report
statistics (no `listSessions`, not Redis) shows an ordinary user an empty
listing with a total of 0, never the count of everyone's sessions.

`perUserAuth` needs `ctx.user` in the handler, which an adapter hands over
only when the server carries middleware state. `registerAllRoutes()` turns
that on for the server when it is given `perUserAuth`. A caller that registers
these routes itself with `perUserAuth` must create the server with
`carryMiddlewareState: true`. Without it, the user the authentication
middleware sets does not reach the routes, so every request whose context
has no `ctx.user` is answered 401, except `GET /memory/health`; a custom
adapter or direct handler call that sets `ctx.user` itself is served as that
user.

On Redis, sessions are keyed by user, so an admin reaches another user's
session only by naming that user in `?userId=`. The Redis key is
`<keyPrefix><userId>:<sessionId>` with neither part escaped, so under
`perUserAuth` a `:` in the authenticated user's id, an admin's `?userId=` or
the session id is refused with 400 on every manager; otherwise user `a` asking
for session `b:c` would reach user `a:b`'s session `c`. A session created
without a `userId` is stored under the reserved user id `session-only`, which
the routes refuse with 400 as the authenticated user's id or an admin's
`?userId=`, so under `perUserAuth` no request reaches it.

## Parameters

### basePath?

`string` = `"/api"`

### options?

[`ServerMemoryRouteOptions`](../type-aliases/ServerMemoryRouteOptions.md)

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)

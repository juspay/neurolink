[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerMemoryRouteOptions

# Type Alias: ServerMemoryRouteOptions

> **ServerMemoryRouteOptions** = `object`

Options for `createMemoryRoutes()`.

## Properties

### perUserAuth?

> `optional` **perUserAuth?**: `boolean`

Set to `true` when the authentication middleware identifies individual
people (one credential per person). Every memory route but
`GET <basePath>/memory/health` then needs an authenticated user (`401`
without one, or with an empty id) and is scoped to it: a caller reaches
only its own sessions, and statistics and clear-all need an admin role.
Any truthy value turns it on.

Leave it unset (default `false`) for no authentication or one shared API
key, such as `neurolink serve` with `NEUROLINK_SERVER_API_KEY`. A shared key
names no person, so the routes do not read `ctx.user` at all and behave as
they always have: `?userId=` chooses the user on Redis, in-memory sessions
are keyed by id alone, and statistics and clear-all are open to every
caller that passes your authentication.

The routes can only read `ctx.user` if the adapter hands it to the handler,
which it does when the server carries middleware state.
`registerAllRoutes` turns that on when given `perUserAuth`; a caller that
registers `createMemoryRoutes` itself must create the server with
`carryMiddlewareState: true`, or every request but `GET /memory/health` is
answered `401`.

"Only its own sessions" holds on every manager because the routes refuse a
`:` (400) in the authenticated user's id, an admin's `?userId=` and the
session id: the Redis manager joins user and session unescaped as
`<keyPrefix><userId>:<sessionId>`, where user `a` asking for session `b:c`
would otherwise reach user `a:b`'s session `c`. A deployment whose user ids
contain `:` cannot use the scoped routes. On Redis a session created
without a `userId` shares the key of a user whose id is `session-only`, so
do not issue that id.

---

### adminRoles?

> `optional` **adminRoles?**: `string`[]

Roles allowed to read another user's sessions, read memory statistics and
clear every session. Default `["admin"]`. Only consulted with
`perUserAuth`.

On Redis, sessions are keyed per user, so an admin reaches another user's
session by naming that user in `?userId=` (without it the admin's own
sessions). A session created without a `userId` is stored under
`<keyPrefix>session-only:<sessionId>`, the key of a user named
`session-only`: an admin reaches it by naming `?userId=session-only` (so
does an ordinary user whose own id is `session-only`), no other name
reaches it, and clear-all removes it. The in-memory manager lists every
session for an admin.

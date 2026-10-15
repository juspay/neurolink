[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAgentRouteOptions

# Type Alias: ServerAgentRouteOptions

> **ServerAgentRouteOptions** = `object`

Options for `createAgentRoutes()`.

## Properties

### allowedInputRoots?

> `optional` **allowedInputRoots?**: `string`[]

Directories a request's `input.images` / `input.files` entries may name as
local paths. Empty or omitted (the default) refuses every local path: a
server must not read its own disk on a caller's say-so unless the operator
names where.

---

### maxInputBytes?

> `optional` **maxInputBytes?**: `number`

Largest single attachment accepted, in bytes. Default 50 MiB. A `data:` URI
is measured by its string length. When `maxInputTotalBytes` is set lower,
the smaller of the two is the per-attachment cap.

---

### maxInputAttachments?

> `optional` **maxInputAttachments?**: `number`

Most attachments one request may carry, `input.images` and `input.files`
counted together. Default 20. A longer list is refused with 413 before any
attachment is read or downloaded.

---

### maxInputTotalBytes?

> `optional` **maxInputTotalBytes?**: `number`

Largest sum of all attachments of one request, in bytes: images and files
share this one budget, and a `data:` URI is charged its string length.
Default 100 MiB. A request that overflows it is refused with 413, and a
file or download that would overflow it stops mid-transfer.

---

### perUserAuth?

> `optional` **perUserAuth?**: `boolean`

For a caller of `createAgentRoutes()` itself; with `registerAllRoutes()` /
`createAllRoutes()` use `CreateRoutesOptions.perUserAuth` instead. The
routes can only take identity from `ctx.user` if the server hands it to
the handler, so a caller that registers them itself with this option must
create the server with `carryMiddlewareState: true`; `registerAllRoutes()`
does that for the server by itself. With `carryMiddlewareState` off, such a request has
a user only on Hono when the client sent its own `X-Request-ID` (Hono then
hands the handler the middleware's context regardless); every other request
runs as anonymous, with no `userId` and no session.

Set to `true` when the authentication middleware identifies individual
people (one credential per person). The agent routes then take `userId`
and the session only from the authenticated user (`ctx.user`,
`ctx.session`) and ignore the request body's, on every adapter and for
every request, so a caller cannot act as someone else. A request with no
authenticated user gets no `userId` and no session, so with optional
authentication anonymous callers never share a conversation. Any truthy
value turns it on.

**A server with per-person authentication must set this.** Left at the
default (`false`) identity resolves as it always has: requests choose
`userId` and `sessionId` in the body, so any authenticated caller can name
another person there and act as them. The one exception is Hono, where a
request whose client sent its own `X-Request-ID` header reaches the
handler with the middleware's context, and an authenticated `ctx.user`
(and `ctx.session`) wins over the body, as before, and so does it on a
context the built-in adapters did not build (your own adapter, a handler
called directly). Only this flag, with `carryMiddlewareState` on, makes the agent routes take
the user from `ctx.user`, and ignore the body's `userId`, on every
built-in adapter and every request. When the server carries middleware state
the routes log one warning per instance the first time a request served
from the body names a different `userId` than a `ctx.user` that is not
marked `shared: true`; the body's `userId` is still used. With `carryMiddlewareState`
off the handler has no `ctx.user` on such a request, so there is nothing to
compare and no warning.

Leave it unset for no authentication or one shared API key, such as
`neurolink serve` with `NEUROLINK_SERVER_API_KEY`: a shared key names no
person, so requests choose `userId` and `sessionId` in the body. Middleware
for a shared key should set `shared: true` on the `AuthenticatedUser` it
returns, which keeps the warning quiet (the CLI's key middleware does).

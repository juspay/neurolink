[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAgentRoutes

# Function: createAgentRoutes()

> **createAgentRoutes**(`basePath?`, `options?`): [`RouteGroup`](../type-aliases/RouteGroup.md)

Create agent routes

`options.perUserAuth` decides where a request's identity comes from; see
`ServerAgentRouteOptions`. Authentication middleware that sets `ctx.user`
does not change that on its own: one shared API key sets the same user for
every caller, so trusting it as a person would give every client the same
userId and no conversation memory. The converse is the operator's to act on:
a server whose authentication identifies individual people must set
`perUserAuth`, or any authenticated caller can name another userId and
sessionId in the body.

Unset, identity resolves as it did before the adapters carried `ctx.user` to
the handler: the body's `userId` and `sessionId`, with one exception. On
Hono, a request whose client sent its own `X-Request-ID` header reached the
handler with the middleware's context, so an authenticated `ctx.user` (and
`ctx.session`) won over the body there, and still does. A context the
built-in adapters did not hand the carry to also keeps that rule: a custom
adapter that sets `ctx.user` itself, or a handler called directly with a
context the caller built. Only `perUserAuth` (with the server carrying
middleware state) makes these routes take the user from `ctx.user`, and
ignore the body's `userId`, on every built-in adapter and for every request.

`perUserAuth` needs the user in the handler, which an adapter hands over on
every request only when the server carries middleware state.
`registerAllRoutes()` turns that on for the server when it is given
`perUserAuth`. A caller that registers these routes itself with `perUserAuth`
must create the server with `carryMiddlewareState: true`. Without it, a
request has a user only on Hono when the client sent its own `X-Request-ID`
(Hono then hands the handler the middleware's context regardless); every
other request (Hono without that header, Express, Fastify, Koa) runs as
anonymous, with no `userId` and no session.

Without `perUserAuth`, and when the server carries middleware state, the
routes log one warning per instance the first time a request whose body names
a different `userId` than its `ctx.user` is served from the body, unless that
user is marked `shared: true` (an identity for every holder of one
credential, which the CLI's API-key middleware sets). Such a request is
served from the body; the warning only tells the operator that per-person
authentication is running without the flag that makes it hold. With the
carry off the handler has no `ctx.user` on those requests, so there is
nothing to compare and no warning. A request where `ctx.user` already won has
nothing to warn about.

## Parameters

### basePath?

`string` = `"/api"`

### options?

[`ServerAgentRouteOptions`](../type-aliases/ServerAgentRouteOptions.md)

Limits for `input.images` / `input.files`:
`allowedInputRoots` (default: none, every local-path attachment is
refused), `maxInputBytes` per attachment (default 50 MiB),
`maxInputAttachments` per request (default 20, images and files together)
and `maxInputTotalBytes` per request (default 100 MiB, one budget shared by
images and files); and `perUserAuth` (described above).

## Returns

[`RouteGroup`](../type-aliases/RouteGroup.md)

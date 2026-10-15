[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSessionMiddleware

# Function: createSessionMiddleware()

> **createSessionMiddleware**(`config?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Create session middleware.

Reads a session id from `X-Session-Id` (or the configured header) and sets
`ctx.session.id`. When the header is absent or empty and `cookieName` is set,
that cookie supplies the id instead. When a user is authenticated the id
becomes `<userId>:<id>`, so two users who send the same id get different
sessions: the in-memory conversation manager keys sessions by id alone, and
without the prefix one user could read and extend another's conversation by
guessing its id. A request with no id gets no session.

The prefix isolates the conversations the agent routes keep. It is not an
access check on the memory routes: they look a session up by the id in the
URL (on the in-memory manager by that id alone, on Redis by it together with
the `userId` query parameter). Whether a server limits them to a session's
owner depends on how that server configures and protects those routes, not on
this middleware, so a caller who can reach them and knows a prefixed id such
as `bob:chat-1` reads that session unless the server prevents it.

The prefix also relies on `ctx.user` naming one person: when every client
shares one credential they share one `ctx.user`, and one prefix.

The server must carry middleware state for this to do anything. By default
(`carryMiddlewareState` off) Express, Fastify and Koa build a fresh context
for every middleware step and for the handler, so this middleware sees no
`ctx.user` and the `ctx.session` it sets never reaches the handler; Hono
shares the context only for a request whose client sent its own
`X-Request-ID`. Nothing warns about it. `registerAllRoutes()` with
`perUserAuth` turns the carry on for the server; otherwise create the server
with `carryMiddlewareState: true`.

With `perUserAuth` on the routes, the agent routes take the session only from
`ctx.session`, and only for an authenticated request, so this middleware is
how a signed-in client keeps a conversation. A request with no `ctx.user`
(optional authentication) gets no conversation even when it sends an id, so
anonymous callers never share one.

With `perUserAuth` off (the default) the agent routes take the session from the
request body and this middleware has no effect on them, whether
`carryMiddlewareState` is off (the handler never receives `ctx.session`) or on
(it does, and the routes do not read it); with the carry on it still sets
`ctx.session` for your own routes. That holds on Express, Fastify and Koa, and
on Hono when the client sent no `X-Request-ID`. The exception is a context that
did not receive the adapters' carry: Hono when the client sent its own
`X-Request-ID` (with the carry on or off), an adapter you wrote, or a handler
called directly. There an authenticated user's session is `ctx.session` alone
(the body's is ignored), and an anonymous caller's is `ctx.session`, else the
body's, so anonymous callers that send the same id share one bare
conversation.

The agent routes keep a conversation only when conversation memory is
enabled on the `NeuroLink` instance; without it nothing is remembered
whatever the session id.

A browser client on another origin must be allowed to send the header. The
default `X-Session-Id` is in the servers' default CORS allowed headers. A
custom `headerName` is not: add it to `cors.headers`, which replaces the
default list when you set it. A cookie sent cross-origin also needs
`cors.credentials: true` and a listed origin rather than `*`.

Ids start with a letter or digit and continue with letters, digits, `.`, `_`
or `-`, 128 characters at most. A header that is not valid is a 400. A
cookie that is not valid is ignored, as if absent: a browser sends it on its
own, so it must not turn every request into an error.

Register it after authentication. The registration order is what runs: the
`order` number (12, with auth at 10) is informational and nothing sorts by
it, so a session middleware registered before authentication sees no user and
sets an unprefixed id without any warning.

## Parameters

### config?

[`ServerSessionConfig`](../type-aliases/ServerSessionConfig.md) = `{}`

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
const neurolink = new NeuroLink({ conversationMemory: { enabled: true } });
const server = await createServer(neurolink, { framework: "hono" });
server.registerMiddleware(createAuthMiddleware({ type: "bearer", validate }));
server.registerMiddleware(createSessionMiddleware());
// perUserAuth also turns on carryMiddlewareState for this server.
registerAllRoutes(server, "/api", { perUserAuth: true });
// A client sends `X-Session-Id: chat-1`; the agent routes then keep that
// conversation, separately for each authenticated user.
```

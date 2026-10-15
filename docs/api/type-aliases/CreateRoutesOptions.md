[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateRoutesOptions

# Type Alias: CreateRoutesOptions

> **CreateRoutesOptions** = `object`

Options for createAllRoutes / createRoutes.

## Properties

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

---

### getRoutes?

> `optional` **getRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]

---

### proxy?

> `optional` **proxy?**: `boolean`

Enable every proxy door: Claude, OpenAI, Codex and Gemini.

---

### claudeProxy?

> `optional` **claudeProxy?**: `boolean`

---

### openaiProxy?

> `optional` **openaiProxy?**: `boolean`

---

### codexProxy?

> `optional` **codexProxy?**: `boolean`

Enable the Codex door on its own.

Codex was reachable only from `neurolink proxy start` until this existed —
`createAllRoutes` mounted two of the doors, so an SDK consumer could not
expose it even deliberately.

---

### geminiProxy?

> `optional` **geminiProxy?**: `boolean`

Enable the Gemini door on its own, for the same reason.

---

### runtimeConfigProvider?

> `optional` **runtimeConfigProvider?**: [`ProxyRuntimeConfigProvider`](ProxyRuntimeConfigProvider.md)

Runtime config provider for engines that read it (currently: Codex
outbound fallback). NOTE: this option alone cannot make the Codex
outbound fallback's `anthropic` target reachable — that leg dispatches
through an in-process loopback (`loopbackPort` / `internalDispatch`)
that only `createCodexProxyRoutes`' direct, non-`CreateRoutesOptions`
parameters carry (the CLI's `neurolink proxy start` wires them; this
generic SDK route surface deliberately does not gain a new option for
it). Enabling the feature with an `anthropic` target here logs one
startup warning and then fails every such request at attempt time. A
`vertex`-only configuration is unaffected. See
docs/features/codex-proxy-support.md.

---

### transcribe?

> `optional` **transcribe?**: [`ServerTranscribeRouteOptions`](ServerTranscribeRouteOptions.md)

Options for the transcription routes (`POST <basePath>/agent/transcribe`
and the OpenAI-compatible `POST /v1/audio/transcriptions`), which are
always mounted.

---

### agent?

> `optional` **agent?**: `Omit`\<[`ServerAgentRouteOptions`](ServerAgentRouteOptions.md), `"perUserAuth"`\>

Options for the agent routes (`POST <basePath>/agent/execute` and
`/agent/stream`): where local-path attachments may be read from, and how
large an attachment may be. Whose identity the routes trust is decided by
the top-level `perUserAuth`, which is why it is not accepted here.

---

### perUserAuth?

> `optional` **perUserAuth?**: `boolean`

Set to `true` when the authentication middleware identifies individual
people (one credential per person). The agent routes then take `userId`
and the session only from the authenticated user and ignore the request
body's, on every adapter and for every request; a request with no
authenticated user gets neither. Any truthy value turns it on.

**A server with per-person authentication must set this.** Left at the
default (`false`) requests choose `userId` and `sessionId` in the body, so
any authenticated caller can name another person there and act as them.
The one exception is Hono, where a request whose client sent its own
`X-Request-ID` header reaches the handler with the middleware's context and
an authenticated `ctx.user` wins over the body, as before, and so on a
context the built-in adapters did not build (your own adapter, a handler
called directly); only this flag, with `carryMiddlewareState` on, makes the agent routes take
the user from `ctx.user` everywhere. When the server carries middleware state, the first time a
request served from the body names a different `userId` than its
`ctx.user`, the routes log a warning (once per instance); with `carryMiddlewareState`
off the handler has no `ctx.user` to compare, and there is no warning.
Leave it unset for no authentication or one shared
API key, such as `neurolink serve` with `NEUROLINK_SERVER_API_KEY`:
requests choose `userId` and `sessionId` in the body. Middleware for a
shared key should set `shared: true` on the `AuthenticatedUser` it
returns, which keeps the warning quiet.

This is the one switch for a server built with `registerAllRoutes` /
`createAllRoutes`: every route group that scopes by identity reads it from
here, so it cannot be set for the agent routes alone. `registerAllRoutes`
also turns on the server's `carryMiddlewareState` when this is set, since
the routes need the user in the handler; `createAllRoutes` returns route
groups only, so a caller that registers them itself must create the server
with `carryMiddlewareState: true`; with `carryMiddlewareState` off, a `perUserAuth`
request has a user only on Hono when the client sent its own
`X-Request-ID`, and every other request runs as anonymous.

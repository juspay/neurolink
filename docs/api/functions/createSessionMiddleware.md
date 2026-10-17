[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createSessionMiddleware

# Function: createSessionMiddleware()

> **createSessionMiddleware**(`config?`): [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

Create session middleware.

Reads a session id from `X-Session-Id` (or the configured header, or, when
`cookieName` is set, that cookie) and sets `ctx.session.id`. When a user is
authenticated the id becomes `<userId>:<id>`, so two users who send the same
id get different sessions: the in-memory conversation manager keys sessions
by id alone, and without the prefix one user could read and extend another's
conversation by guessing its id. A request with no id gets no session.

Register it after authentication (it runs at order 12, auth runs at 10).
Ids are 1 to 128 characters of letters, digits, `.`, `_` and `-`; anything
else is a 400.

## Parameters

### config?

[`ServerSessionConfig`](../type-aliases/ServerSessionConfig.md) = `{}`

## Returns

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

## Example

```typescript
server.registerMiddleware(createAuthMiddleware({ type: "bearer", validate }));
server.registerMiddleware(createSessionMiddleware());
// A client sends `X-Session-Id: chat-1`; the agent routes then keep that
// conversation, separately for each authenticated user.
```

[**NeuroLink API Reference v8.26.1**](../README.md)

---

[NeuroLink API Reference](../globals.md) / setLangfuseContext

# Function: setLangfuseContext()

> **setLangfuseContext**(`context`, `callback?`): `Promise`\<`void`\>

Defined in: [services/server/ai/observability/instrumentation.ts:242](https://github.com/juspay/neurolink/blob/997832c0dc437abf3a045a6ab43aafda5c330f4e/src/lib/services/server/ai/observability/instrumentation.ts#L242)

Set user and session context for Langfuse spans in the current async context

Merges the provided context with existing AsyncLocalStorage context. If a callback is provided,
the context is scoped to that callback execution. Without a callback, the context applies to
the current execution context and its children.

Uses AsyncLocalStorage to properly scope context per request, avoiding race conditions
in concurrent scenarios.

## Parameters

### context

Object containing optional userId and/or sessionId to merge with existing context

#### userId?

`string` \| `null`

#### sessionId?

`string` \| `null`

### callback?

() => `void` \| `Promise`\<`void`\>

Optional callback to run within the context scope. If omitted, context applies to current execution

## Returns

`Promise`\<`void`\>

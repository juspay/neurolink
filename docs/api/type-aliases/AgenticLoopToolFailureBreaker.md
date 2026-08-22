[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopToolFailureBreaker

# Type Alias: AgenticLoopToolFailureBreaker

> **AgenticLoopToolFailureBreaker** = `object`

Defined in: [types/loopEngine.ts:106](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L106)

## Properties

### maxRetries

> **maxRetries**: `number`

Defined in: [types/loopEngine.ts:107](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L107)

---

### consecutive?

> `optional` **consecutive?**: `boolean`

Defined in: [types/loopEngine.ts:118](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L118)

Count CONSECUTIVE failures rather than lifetime ones: a clean result
clears the strike count for that tool.

Off by default because the two behaviours diverge for a tool that fails
intermittently, and the providers already on this engine accumulate. What
it protects is the argument-dependent soft error — a file-not-found on one
path, fine on the next — which under lifetime counting disables a working
tool for the rest of the turn.

---

### classifyResultFailure?

> `optional` **classifyResultFailure?**: (`output`) => `string` \| `undefined`

Defined in: [types/loopEngine.ts:131](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L131)

Decide whether a RESOLVED tool result is really a failure.

Some tools report failure without throwing: MCP `isError` payloads, a
proxy-blocked call returning `{ error }`. Counting only thrown errors lets
the model grind on one of those for the entire step budget. Returning a
non-empty string strikes the breaker exactly as a throw does; returning
undefined leaves the result a success.

Off by default — a provider whose loop never inspected results this way
must not start doing so as a side effect of migrating.

#### Parameters

##### output

`unknown`

#### Returns

`string` \| `undefined`

[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatStreamLifecycleListeners

# Type Alias: OpenAICompatStreamLifecycleListeners

> **OpenAICompatStreamLifecycleListeners** = `object`

Defined in: [types/openaiCompatible.ts:350](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L350)

Per-stream lifecycle listeners returned from an OpenAIChatCompletionsProvider
subclass's `onStreamStart` hook. Every property is optional — provide only
what the subclass cares about. Used by LiteLLM to wire an OTel span around
the deferred analytics promises.

## Properties

### onUsage?

> `optional` **onUsage?**: (`usage`) => `void`

Defined in: [types/openaiCompatible.ts:357](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L357)

Fired once the deferred usage promise resolves with the final aggregated
token counts. promptTokens is the UNCACHED remainder; cacheReadTokens
carries the cached portion (non-overlapping convention), and
reasoningTokens is a subset of completionTokens.

#### Parameters

##### usage

[`DeferredUsage`](DeferredUsage.md)

#### Returns

`void`

---

### onFinish?

> `optional` **onFinish?**: (`reason`, `capturedError?`) => `void`

Defined in: [types/openaiCompatible.ts:363](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L363)

Fired once the deferred finish promise resolves. `reason` is "stop",
"length", "tool-calls", "content-filter", or "error". When the loop
errored, the upstream cause is passed as `capturedError`.

#### Parameters

##### reason

`string`

##### capturedError?

`unknown`

#### Returns

`void`

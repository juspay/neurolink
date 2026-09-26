[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatStreamLifecycleListeners

# Type Alias: OpenAICompatStreamLifecycleListeners

> **OpenAICompatStreamLifecycleListeners** = `object`

Per-stream lifecycle listeners returned from an OpenAIChatCompletionsProvider
subclass's `onStreamStart` hook. Every property is optional — provide only
what the subclass cares about. Used by LiteLLM to wire an OTel span around
the deferred analytics promises.

## Properties

### onUsage?

> `optional` **onUsage?**: (`usage`) => `void`

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

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeferredUsage

# Type Alias: DeferredUsage

> **DeferredUsage** = `object`

Aggregated usage resolved by a provider's deferred-analytics pair after a
multi-step stream loop ends. The cache fields are optional — only providers
with prompt caching (Anthropic) populate them.

## Properties

### promptTokens

> **promptTokens**: `number`

---

### completionTokens

> **completionTokens**: `number`

---

### totalTokens

> **totalTokens**: `number`

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Reasoning/thinking tokens — a SUBSET already included in completionTokens.

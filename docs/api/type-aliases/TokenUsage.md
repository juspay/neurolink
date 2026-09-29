[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenUsage

# Type Alias: TokenUsage

> **TokenUsage** = `object`

Token usage information (consolidated from multiple sources)

## Properties

### input

> **input**: `number`

---

### output

> **output**: `number`

---

### total

> **total**: `number`

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

---

### cacheCreation1hTokens?

> `optional` **cacheCreation1hTokens?**: `number`

The 1-hour-TTL share of `cacheCreationTokens` (a subset, not additive —
Anthropic's `cache_creation.ephemeral_1h_input_tokens` is reported inside
the same `cache_creation_input_tokens` total). Undefined/0 keeps today's
pricing exactly, since `calculateCost` treats every write as 5-minute-TTL
unless told otherwise.

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

---

### reasoning?

> `optional` **reasoning?**: `number`

---

### cacheSavingsPercent?

> `optional` **cacheSavingsPercent?**: `number`

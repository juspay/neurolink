[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopUsage

# Type Alias: AgenticLoopUsage

> **AgenticLoopUsage** = `object`

## Properties

### inputTokens

> **inputTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

---

### cacheWriteTokens?

> `optional` **cacheWriteTokens?**: `number`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

---

### cacheWrite5mTokens?

> `optional` **cacheWrite5mTokens?**: `number`

Cache writes split by time-to-live, which Anthropic reports separately
from the total under `cache_creation.ephemeral_5m_input_tokens` and
`ephemeral_1h_input_tokens`.

Carried because the Claude-on-Vertex turn span reports both as
`input_cache_creation_5m` / `_1h`, and `cacheWriteTokens` alone cannot
reconstruct them — the two tiers are priced differently, so collapsing
them loses the only signal that says which one a turn actually bought.
Undefined for providers that never report the split.

---

### cacheWrite1hTokens?

> `optional` **cacheWrite1hTokens?**: `number`

[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgenticLoopUsage

# Type Alias: AgenticLoopUsage

> **AgenticLoopUsage** = `object`

Defined in: [types/loopEngine.ts:31](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L31)

## Properties

### inputTokens

> **inputTokens**: `number`

Defined in: [types/loopEngine.ts:32](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L32)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/loopEngine.ts:33](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L33)

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

Defined in: [types/loopEngine.ts:34](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L34)

---

### cacheWriteTokens?

> `optional` **cacheWriteTokens?**: `number`

Defined in: [types/loopEngine.ts:35](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L35)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/loopEngine.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L36)

---

### cacheWrite5mTokens?

> `optional` **cacheWrite5mTokens?**: `number`

Defined in: [types/loopEngine.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L48)

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

Defined in: [types/loopEngine.ts:49](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/loopEngine.ts#L49)

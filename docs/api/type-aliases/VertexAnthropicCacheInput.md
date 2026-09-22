[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicCacheInput

# Type Alias: VertexAnthropicCacheInput

> **VertexAnthropicCacheInput** = `object`

Defined in: [types/providers.ts:2617](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2617)

Input to `applyVertexAnthropicCacheBreakpoints`.

## Properties

### system?

> `optional` **system?**: `string`

Defined in: [types/providers.ts:2618](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2618)

---

### tools?

> `optional` **tools?**: [`VertexAnthropicTool`](VertexAnthropicTool.md)[]

Defined in: [types/providers.ts:2619](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2619)

---

### messages

> **messages**: [`VertexAnthropicMessage`](VertexAnthropicMessage.md)[]

Defined in: [types/providers.ts:2620](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2620)

---

### maxHistoryBreakpoints?

> `optional` **maxHistoryBreakpoints?**: `number`

Defined in: [types/providers.ts:2627](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2627)

Cap on how many of the most-recent messages receive a rolling history
breakpoint. Defaults to "use the remaining budget". Two or more gives
cross-turn continuity and resilience against Anthropic's 20-block cache
lookback window on tool-heavy turns.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicCacheInput

# Type Alias: VertexAnthropicCacheInput

> **VertexAnthropicCacheInput** = `object`

Defined in: [types/providers.ts:2653](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2653)

Input to `applyVertexAnthropicCacheBreakpoints`.

## Properties

### system?

> `optional` **system?**: `string`

Defined in: [types/providers.ts:2654](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2654)

---

### tools?

> `optional` **tools?**: [`VertexAnthropicTool`](VertexAnthropicTool.md)[]

Defined in: [types/providers.ts:2655](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2655)

---

### messages

> **messages**: [`VertexAnthropicMessage`](VertexAnthropicMessage.md)[]

Defined in: [types/providers.ts:2656](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2656)

---

### maxHistoryBreakpoints?

> `optional` **maxHistoryBreakpoints?**: `number`

Defined in: [types/providers.ts:2663](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2663)

Cap on how many of the most-recent messages receive a rolling history
breakpoint. Defaults to "use the remaining budget". Two or more gives
cross-turn continuity and resilience against Anthropic's 20-block cache
lookback window on tool-heavy turns.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAnthropicCacheInput

# Type Alias: VertexAnthropicCacheInput

> **VertexAnthropicCacheInput** = `object`

Defined in: [types/providers.ts:2488](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2488)

Input to `applyVertexAnthropicCacheBreakpoints`.

## Properties

### system?

> `optional` **system?**: `string`

Defined in: [types/providers.ts:2489](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2489)

---

### tools?

> `optional` **tools?**: [`VertexAnthropicTool`](VertexAnthropicTool.md)[]

Defined in: [types/providers.ts:2490](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2490)

---

### messages

> **messages**: [`VertexAnthropicMessage`](VertexAnthropicMessage.md)[]

Defined in: [types/providers.ts:2491](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2491)

---

### maxHistoryBreakpoints?

> `optional` **maxHistoryBreakpoints?**: `number`

Defined in: [types/providers.ts:2498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2498)

Cap on how many of the most-recent messages receive a rolling history
breakpoint. Defaults to "use the remaining budget". Two or more gives
cross-turn continuity and resilience against Anthropic's 20-block cache
lookback window on tool-heavy turns.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BenchmarkParams

# Type Alias: BenchmarkParams

> **BenchmarkParams** = `object`

Defined in: [types/mcp.ts:2699](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2699)

Parsed input for the benchmark-provider-performance MCP tool.

## Properties

### providers?

> `optional` **providers?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)[]

Defined in: [types/mcp.ts:2700](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2700)

---

### testPrompts?

> `optional` **testPrompts?**: `string`[]

Defined in: [types/mcp.ts:2701](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2701)

---

### iterations

> **iterations**: `number`

Defined in: [types/mcp.ts:2702](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2702)

---

### metrics

> **metrics**: (`"latency"` \| `"quality"` \| `"cost"` \| `"tokens"`)[]

Defined in: [types/mcp.ts:2703](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2703)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/mcp.ts:2704](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2704)

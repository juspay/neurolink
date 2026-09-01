[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BenchmarkParams

# Type Alias: BenchmarkParams

> **BenchmarkParams** = `object`

Defined in: [types/mcp.ts:2680](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2680)

Parsed input for the benchmark-provider-performance MCP tool.

## Properties

### providers?

> `optional` **providers?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)[]

Defined in: [types/mcp.ts:2681](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2681)

---

### testPrompts?

> `optional` **testPrompts?**: `string`[]

Defined in: [types/mcp.ts:2682](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2682)

---

### iterations

> **iterations**: `number`

Defined in: [types/mcp.ts:2683](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2683)

---

### metrics

> **metrics**: (`"latency"` \| `"quality"` \| `"cost"` \| `"tokens"`)[]

Defined in: [types/mcp.ts:2684](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2684)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/mcp.ts:2685](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2685)

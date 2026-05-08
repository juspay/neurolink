[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BenchmarkParams

# Type Alias: BenchmarkParams

> **BenchmarkParams** = `object`

Defined in: [types/mcp.ts:2661](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2661)

Parsed input for the benchmark-provider-performance MCP tool.

## Properties

### providers?

> `optional` **providers?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)[]

Defined in: [types/mcp.ts:2662](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2662)

---

### testPrompts?

> `optional` **testPrompts?**: `string`[]

Defined in: [types/mcp.ts:2663](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2663)

---

### iterations

> **iterations**: `number`

Defined in: [types/mcp.ts:2664](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2664)

---

### metrics

> **metrics**: (`"latency"` \| `"quality"` \| `"cost"` \| `"tokens"`)[]

Defined in: [types/mcp.ts:2665](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2665)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/mcp.ts:2666](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2666)

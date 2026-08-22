[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BenchmarkParams

# Type Alias: BenchmarkParams

> **BenchmarkParams** = `object`

Defined in: [types/mcp.ts:2661](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2661)

Parsed input for the benchmark-provider-performance MCP tool.

## Properties

### providers?

> `optional` **providers?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)[]

Defined in: [types/mcp.ts:2662](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2662)

---

### testPrompts?

> `optional` **testPrompts?**: `string`[]

Defined in: [types/mcp.ts:2663](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2663)

---

### iterations

> **iterations**: `number`

Defined in: [types/mcp.ts:2664](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2664)

---

### metrics

> **metrics**: (`"latency"` \| `"quality"` \| `"cost"` \| `"tokens"`)[]

Defined in: [types/mcp.ts:2665](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2665)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/mcp.ts:2666](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L2666)

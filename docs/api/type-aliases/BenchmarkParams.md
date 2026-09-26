[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BenchmarkParams

# Type Alias: BenchmarkParams

> **BenchmarkParams** = `object`

Parsed input for the benchmark-provider-performance MCP tool.

## Properties

### providers?

> `optional` **providers?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)[]

---

### testPrompts?

> `optional` **testPrompts?**: `string`[]

---

### iterations

> **iterations**: `number`

---

### metrics

> **metrics**: (`"latency"` \| `"quality"` \| `"cost"` \| `"tokens"`)[]

---

### maxTokens

> **maxTokens**: `number`

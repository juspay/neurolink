[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OllamaMessage

# Type Alias: OllamaMessage

> **OllamaMessage** = `object`

Defined in: [types/providers.ts:974](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L974)

Ollama message structure for conversation and tool execution

## Properties

### role

> **role**: `"system"` \| `"user"` \| `"assistant"` \| `"tool"`

Defined in: [types/providers.ts:975](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L975)

---

### content

> **content**: `string` \| `object`[]

Defined in: [types/providers.ts:976](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L976)

---

### tool_calls?

> `optional` **tool_calls?**: [`OllamaToolCall`](OllamaToolCall.md)[]

Defined in: [types/providers.ts:979](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L979)

---

### images?

> `optional` **images?**: `string`[]

Defined in: [types/providers.ts:980](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L980)

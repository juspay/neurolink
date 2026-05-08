[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalChatMessage

# Type Alias: MultimodalChatMessage

> **MultimodalChatMessage** = `object`

Defined in: [types/multimodal.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L441)

Extended chat message for multimodal support (internal use)
Used during message processing and transformation

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

Defined in: [types/multimodal.ts:443](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L443)

Role of the message sender

---

### content

> **content**: `string` \| [`MessageContent`](MessageContent.md)[]

Defined in: [types/multimodal.ts:446](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L446)

Content of the message - can be text or multimodal content array

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `unknown`\>

Defined in: [types/multimodal.ts:449](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L449)

Provider-specific options (e.g. Anthropic cache_control)

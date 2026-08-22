[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalChatMessage

# Type Alias: MultimodalChatMessage

> **MultimodalChatMessage** = `object`

Defined in: [types/multimodal.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L536)

Extended chat message for multimodal support (internal use)
Used during message processing and transformation

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

Defined in: [types/multimodal.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L538)

Role of the message sender

---

### content

> **content**: `string` \| [`MessageContent`](MessageContent.md)[]

Defined in: [types/multimodal.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L541)

Content of the message - can be text or multimodal content array

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `unknown`\>

Defined in: [types/multimodal.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/multimodal.ts#L544)

Provider-specific options (e.g. Anthropic cache_control)

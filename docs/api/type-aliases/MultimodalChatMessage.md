[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalChatMessage

# Type Alias: MultimodalChatMessage

> **MultimodalChatMessage** = `object`

Extended chat message for multimodal support (internal use)
Used during message processing and transformation

## Properties

### role

> **role**: `"user"` \| `"assistant"` \| `"system"`

Role of the message sender

---

### content

> **content**: `string` \| [`MessageContent`](MessageContent.md)[]

Content of the message - can be text or multimodal content array

---

### providerOptions?

> `optional` **providerOptions?**: `Record`\<`string`, `unknown`\>

Provider-specific options (e.g. Anthropic cache_control)

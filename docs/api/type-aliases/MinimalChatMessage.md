[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MinimalChatMessage

# Type Alias: MinimalChatMessage

> **MinimalChatMessage** = `object`

Defined in: [types/conversation.ts:775](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L775)

Reduced ChatMessage shape used by callers (typically tests and history
reconstructors) that pass synthetic entries into the Gemini history
reconstructor without filling every `ChatMessage` field. Mirrors the
fields actually read by `prependConversationMessages`.

## Properties

### role

> **role**: [`ChatMessage`](ChatMessage.md)\[`"role"`\]

Defined in: [types/conversation.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L776)

---

### content

> **content**: `string`

Defined in: [types/conversation.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L777)

---

### tool?

> `optional` **tool?**: `string`

Defined in: [types/conversation.ts:778](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L778)

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

Defined in: [types/conversation.ts:779](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L779)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/conversation.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L780)

#### stepIndex?

> `optional` **stepIndex?**: `number`

#### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

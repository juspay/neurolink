[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MinimalChatMessage

# Type Alias: MinimalChatMessage

> **MinimalChatMessage** = `object`

Defined in: [types/conversation.ts:767](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L767)

Reduced ChatMessage shape used by callers (typically tests and history
reconstructors) that pass synthetic entries into the Gemini history
reconstructor without filling every `ChatMessage` field. Mirrors the
fields actually read by `prependConversationMessages`.

## Properties

### role

> **role**: [`ChatMessage`](ChatMessage.md)\[`"role"`\]

Defined in: [types/conversation.ts:768](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L768)

---

### content

> **content**: `string`

Defined in: [types/conversation.ts:769](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L769)

---

### tool?

> `optional` **tool?**: `string`

Defined in: [types/conversation.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L770)

---

### args?

> `optional` **args?**: `Record`\<`string`, `unknown`\>

Defined in: [types/conversation.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L771)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/conversation.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L772)

#### stepIndex?

> `optional` **stepIndex?**: `number`

#### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

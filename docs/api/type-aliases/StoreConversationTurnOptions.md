[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StoreConversationTurnOptions

# Type Alias: StoreConversationTurnOptions

> **StoreConversationTurnOptions** = `object`

Defined in: [types/conversation.ts:426](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L426)

Options for storing a conversation turn

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/conversation.ts:427](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L427)

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/conversation.ts:428](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L428)

---

### userMessage

> **userMessage**: `string`

Defined in: [types/conversation.ts:429](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L429)

---

### aiResponse

> **aiResponse**: `string`

Defined in: [types/conversation.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L430)

---

### startTimeStamp?

> `optional` **startTimeStamp?**: `Date`

Defined in: [types/conversation.ts:431](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L431)

---

### providerDetails?

> `optional` **providerDetails?**: [`ProviderDetails`](ProviderDetails.md)

Defined in: [types/conversation.ts:432](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L432)

---

### enableSummarization?

> `optional` **enableSummarization?**: `boolean`

Defined in: [types/conversation.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L433)

---

### events?

> `optional` **events?**: [`StreamEventSequence`](StreamEventSequence.md)[]

Defined in: [types/conversation.ts:434](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L434)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/conversation.ts:436](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L436)

Observability request identifier for log correlation

---

### tokenUsage?

> `optional` **tokenUsage?**: `object`

Defined in: [types/conversation.ts:438](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L438)

API-reported token usage from provider response

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`

#### totalTokens?

> `optional` **totalTokens?**: `number`

#### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

#### cacheWriteTokens?

> `optional` **cacheWriteTokens?**: `number`

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/conversation.ts:446](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L446)

Gemini 3 thought signature for reasoning continuity across turns

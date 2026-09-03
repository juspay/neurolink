[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamLoopArgs

# Type Alias: StreamLoopArgs

> **StreamLoopArgs** = `object`

Defined in: [types/openaiCompatible.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L298)

## Properties

### maxSteps

> **maxSteps**: `number`

Defined in: [types/openaiCompatible.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L299)

---

### modelId

> **modelId**: `string`

Defined in: [types/openaiCompatible.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L300)

---

### url

> **url**: `string`

Defined in: [types/openaiCompatible.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L301)

---

### fetchImpl

> **fetchImpl**: _typeof_ `fetch`

Defined in: [types/openaiCompatible.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L302)

---

### abortSignal

> **abortSignal**: `AbortSignal` \| `undefined`

Defined in: [types/openaiCompatible.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L303)

---

### options

> **options**: [`StreamOptions`](StreamOptions.md)

Defined in: [types/openaiCompatible.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L304)

---

### conversation

> **conversation**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

Defined in: [types/openaiCompatible.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L305)

---

### openAITools

> **openAITools**: [`OpenAICompatChatTool`](OpenAICompatChatTool.md)[] \| `undefined`

Defined in: [types/openaiCompatible.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L306)

---

### openAIToolChoice

> **openAIToolChoice**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md) \| `undefined`

Defined in: [types/openaiCompatible.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L307)

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, [`Tool`](Tool.md)\>

Defined in: [types/openaiCompatible.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L308)

---

### toolNameFromWire?

> `optional` **toolNameFromWire?**: `Map`\<`string`, `string`\>

Defined in: [types/openaiCompatible.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L310)

Wire → registered tool-name map when sanitization was needed (see buildWireToolNameMaps).

---

### emitter

> **emitter**: `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\> \| `undefined`

Defined in: [types/openaiCompatible.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L311)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/openaiCompatible.ts:312](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L312)

---

### toolExecutionSummaries

> **toolExecutionSummaries**: [`ToolExecutionSummaryInternal`](ToolExecutionSummaryInternal.md)[]

Defined in: [types/openaiCompatible.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L313)

---

### pushChunk

> **pushChunk**: (`chunk`) => `void`

Defined in: [types/openaiCompatible.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L314)

#### Parameters

##### chunk

[`OpenAICompatStreamChunk`](OpenAICompatStreamChunk.md)

#### Returns

`void`

---

### closeChannel

> **closeChannel**: () => `void`

Defined in: [types/openaiCompatible.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L316)

Signals the channel that no further chunks will arrive (success or error path alike).

#### Returns

`void`

---

### resolveUsage

> **resolveUsage**: (`u`) => `void`

Defined in: [types/openaiCompatible.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L317)

#### Parameters

##### u

###### promptTokens

`number`

###### completionTokens

`number`

###### totalTokens

`number`

#### Returns

`void`

---

### resolveFinish

> **resolveFinish**: (`reason`) => `void`

Defined in: [types/openaiCompatible.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L322)

#### Parameters

##### reason

`string`

#### Returns

`void`

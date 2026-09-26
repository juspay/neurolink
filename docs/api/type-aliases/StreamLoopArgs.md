[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamLoopArgs

# Type Alias: StreamLoopArgs

> **StreamLoopArgs** = `object`

Defined in: [types/openaiCompatible.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L301)

## Properties

### maxSteps

> **maxSteps**: `number`

Defined in: [types/openaiCompatible.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L302)

---

### modelId

> **modelId**: `string`

Defined in: [types/openaiCompatible.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L303)

---

### url

> **url**: `string`

Defined in: [types/openaiCompatible.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L304)

---

### fetchImpl

> **fetchImpl**: _typeof_ `fetch`

Defined in: [types/openaiCompatible.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L305)

---

### abortSignal

> **abortSignal**: `AbortSignal` \| `undefined`

Defined in: [types/openaiCompatible.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L306)

---

### options

> **options**: [`StreamOptions`](StreamOptions.md)

Defined in: [types/openaiCompatible.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L307)

---

### conversation

> **conversation**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

Defined in: [types/openaiCompatible.ts:308](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L308)

---

### openAITools

> **openAITools**: [`OpenAICompatChatTool`](OpenAICompatChatTool.md)[] \| `undefined`

Defined in: [types/openaiCompatible.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L309)

---

### openAIToolChoice

> **openAIToolChoice**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md) \| `undefined`

Defined in: [types/openaiCompatible.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L310)

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, [`Tool`](Tool.md)\>

Defined in: [types/openaiCompatible.ts:311](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L311)

---

### toolNameFromWire?

> `optional` **toolNameFromWire?**: `Map`\<`string`, `string`\>

Defined in: [types/openaiCompatible.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L313)

Wire → registered tool-name map when sanitization was needed (see buildWireToolNameMaps).

---

### emitter

> **emitter**: `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\> \| `undefined`

Defined in: [types/openaiCompatible.ts:314](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L314)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/openaiCompatible.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L315)

---

### toolExecutionSummaries

> **toolExecutionSummaries**: [`ToolExecutionSummaryInternal`](ToolExecutionSummaryInternal.md)[]

Defined in: [types/openaiCompatible.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L316)

---

### pushChunk

> **pushChunk**: (`chunk`) => `void`

Defined in: [types/openaiCompatible.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L317)

#### Parameters

##### chunk

[`OpenAICompatStreamChunk`](OpenAICompatStreamChunk.md)

#### Returns

`void`

---

### closeChannel

> **closeChannel**: () => `void`

Defined in: [types/openaiCompatible.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L319)

Signals the channel that no further chunks will arrive (success or error path alike).

#### Returns

`void`

---

### resolveUsage

> **resolveUsage**: (`u`) => `void`

Defined in: [types/openaiCompatible.ts:320](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L320)

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

Defined in: [types/openaiCompatible.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L325)

#### Parameters

##### reason

`string`

#### Returns

`void`

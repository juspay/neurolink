[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamLoopArgs

# Type Alias: StreamLoopArgs

> **StreamLoopArgs** = `object`

Defined in: [types/openaiCompatible.ts:291](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L291)

## Properties

### maxSteps

> **maxSteps**: `number`

Defined in: [types/openaiCompatible.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L292)

---

### modelId

> **modelId**: `string`

Defined in: [types/openaiCompatible.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L293)

---

### url

> **url**: `string`

Defined in: [types/openaiCompatible.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L294)

---

### fetchImpl

> **fetchImpl**: _typeof_ `fetch`

Defined in: [types/openaiCompatible.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L295)

---

### abortSignal

> **abortSignal**: `AbortSignal` \| `undefined`

Defined in: [types/openaiCompatible.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L296)

---

### options

> **options**: [`StreamOptions`](StreamOptions.md)

Defined in: [types/openaiCompatible.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L297)

---

### conversation

> **conversation**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

Defined in: [types/openaiCompatible.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L298)

---

### openAITools

> **openAITools**: [`OpenAICompatChatTool`](OpenAICompatChatTool.md)[] \| `undefined`

Defined in: [types/openaiCompatible.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L299)

---

### openAIToolChoice

> **openAIToolChoice**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md) \| `undefined`

Defined in: [types/openaiCompatible.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L300)

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, `Tool`\>

Defined in: [types/openaiCompatible.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L301)

---

### toolNameFromWire?

> `optional` **toolNameFromWire?**: `Map`\<`string`, `string`\>

Defined in: [types/openaiCompatible.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L303)

Wire → registered tool-name map when sanitization was needed (see buildWireToolNameMaps).

---

### emitter

> **emitter**: `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\> \| `undefined`

Defined in: [types/openaiCompatible.ts:304](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L304)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/openaiCompatible.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L305)

---

### toolExecutionSummaries

> **toolExecutionSummaries**: [`ToolExecutionSummaryInternal`](ToolExecutionSummaryInternal.md)[]

Defined in: [types/openaiCompatible.ts:306](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L306)

---

### pushChunk

> **pushChunk**: (`chunk`) => `void`

Defined in: [types/openaiCompatible.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L307)

#### Parameters

##### chunk

[`OpenAICompatStreamChunk`](OpenAICompatStreamChunk.md)

#### Returns

`void`

---

### closeChannel

> **closeChannel**: () => `void`

Defined in: [types/openaiCompatible.ts:309](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L309)

Signals the channel that no further chunks will arrive (success or error path alike).

#### Returns

`void`

---

### resolveUsage

> **resolveUsage**: (`u`) => `void`

Defined in: [types/openaiCompatible.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L310)

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

Defined in: [types/openaiCompatible.ts:315](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L315)

#### Parameters

##### reason

`string`

#### Returns

`void`

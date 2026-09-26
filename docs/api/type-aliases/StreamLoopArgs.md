[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamLoopArgs

# Type Alias: StreamLoopArgs

> **StreamLoopArgs** = `object`

## Properties

### maxSteps

> **maxSteps**: `number`

---

### modelId

> **modelId**: `string`

---

### url

> **url**: `string`

---

### fetchImpl

> **fetchImpl**: _typeof_ `fetch`

---

### abortSignal

> **abortSignal**: `AbortSignal` \| `undefined`

---

### options

> **options**: [`StreamOptions`](StreamOptions.md)

---

### conversation

> **conversation**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

---

### openAITools

> **openAITools**: [`OpenAICompatChatTool`](OpenAICompatChatTool.md)[] \| `undefined`

---

### openAIToolChoice

> **openAIToolChoice**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md) \| `undefined`

---

### toolsRecord

> **toolsRecord**: `Record`\<`string`, [`Tool`](Tool.md)\>

---

### toolNameFromWire?

> `optional` **toolNameFromWire?**: `Map`\<`string`, `string`\>

Wire → registered tool-name map when sanitization was needed (see buildWireToolNameMaps).

---

### emitter

> **emitter**: `TypedEventEmitter`\<[`NeuroLinkEvents`](NeuroLinkEvents.md)\> \| `undefined`

---

### toolsUsed

> **toolsUsed**: `string`[]

---

### toolExecutionSummaries

> **toolExecutionSummaries**: [`ToolExecutionSummaryInternal`](ToolExecutionSummaryInternal.md)[]

---

### pushChunk

> **pushChunk**: (`chunk`) => `void`

#### Parameters

##### chunk

[`OpenAICompatStreamChunk`](OpenAICompatStreamChunk.md)

#### Returns

`void`

---

### closeChannel

> **closeChannel**: () => `void`

Signals the channel that no further chunks will arrive (success or error path alike).

#### Returns

`void`

---

### resolveUsage

> **resolveUsage**: (`u`) => `void`

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

#### Parameters

##### reason

`string`

#### Returns

`void`

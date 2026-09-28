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

---

### responseFormat?

> `optional` **responseFormat?**: [`OpenAICompatResponseFormat`](OpenAICompatResponseFormat.md)

`response_format` for this turn's requests, computed once up front from
`options.schema` (see `suppressResponseFormatWithTools`). Absent when no
schema was requested, or when tools suppress it.

---

### onModelObserved?

> `optional` **onModelObserved?**: (`model`) => `void`

Fired once per step that echoes a `model` field on the wire (SSE
`chunk.model`, captured by `parseSSEStream` into `OpenAICompatSSEResult.model`).
Lets the caller learn what the SERVER actually served, distinct from the
pre-call resolved/requested `modelId` — a gateway or router can rewrite
an alias to a concrete model id. Not called when a step's response omits
`model` (some backends don't echo it), so the caller must keep its own
fallback.

#### Parameters

##### model

`string`

#### Returns

`void`

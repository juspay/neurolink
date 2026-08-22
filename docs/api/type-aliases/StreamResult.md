[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamResult

# Type Alias: StreamResult

> **StreamResult** = `object`

Defined in: [types/stream.ts:715](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L715)

Stream function result type - Primary output format for streaming
Future-ready for multi-modal outputs while maintaining text focus

## Properties

### knowledge?

> `optional` **knowledge?**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

Defined in: [types/stream.ts:717](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L717)

Knowledge-grounding diagnostics for this turn (present only when grounding ran).

---

### stream

> **stream**: `AsyncIterable`\<\{ `content`: `string`; `reasoning?`: `string`; \} \| [`StreamNoOutputSentinel`](StreamNoOutputSentinel.md) \| \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \} \| \{ `type`: `"image"`; `imageOutput`: \{ `base64`: `string`; \}; \} \| \{ `content`: `string`; `type?`: `"preliminary"` \| `"final"`; \}\>

Defined in: [types/stream.ts:718](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L718)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/stream.ts:733](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L733)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/stream.ts:734](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L734)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/stream.ts:737](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L737)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/stream.ts:740](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L740)

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/stream.ts:748](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L748)

Why the agentic turn ended (see GenerateStopReason). For background-loop
streams (native Vertex paths) prefer `metadata.stopReason` after draining
the stream — this top-level field may be a getter that resolves late, and
wrapper spreads can snapshot it before the loop finishes.

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/stream.ts:750](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L750)

Verbatim provider finish/stop reason for the turn's terminal model call.

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/stream.ts:753](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L753)

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Defined in: [types/stream.ts:754](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L754)

---

### toolEvents?

> `optional` **toolEvents?**: `AsyncIterable`\<[`ToolExecutionEvent`](ToolExecutionEvent.md)\>

Defined in: [types/stream.ts:757](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L757)

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecutionSummary`](ToolExecutionSummary.md)[]

Defined in: [types/stream.ts:758](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L758)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/stream.ts:759](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L759)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stream.ts:762](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L762)

#### streamId?

> `optional` **streamId?**: `string`

#### startTime?

> `optional` **startTime?**: `number`

#### totalChunks?

> `optional` **totalChunks?**: `number`

#### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

#### responseTime?

> `optional` **responseTime?**: `number`

#### preliminaryTime?

> `optional` **preliminaryTime?**: `number`

#### fallback?

> `optional` **fallback?**: `boolean`

#### totalToolExecutions?

> `optional` **totalToolExecutions?**: `number`

#### toolExecutionTime?

> `optional` **toolExecutionTime?**: `number`

#### hasToolErrors?

> `optional` **hasToolErrors?**: `boolean`

#### guardrailsBlocked?

> `optional` **guardrailsBlocked?**: `boolean`

#### error?

> `optional` **error?**: `string`

#### finishReason?

> `optional` **finishReason?**: `string`

#### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

#### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

#### stepsUsed?

> `optional` **stepsUsed?**: `number`

#### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

#### thoughts?

> `optional` **thoughts?**: `object`[]

---

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md) \| `Promise`\<[`AnalyticsData`](AnalyticsData.md)\>

Defined in: [types/stream.ts:792](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L792)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md) \| `Promise`\<[`EvaluationData`](EvaluationData.md)\>

Defined in: [types/stream.ts:793](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L793)

---

### events?

> `optional` **events?**: `object`[]

Defined in: [types/stream.ts:796](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L796)

#### Index Signature

\[`key`: `string`\]: `unknown`

#### type

> **type**: `string`

#### seq

> **seq**: `number`

#### timestamp

> **timestamp**: `number`

---

### workflow?

> `optional` **workflow?**: `object`

Defined in: [types/stream.ts:804](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L804)

#### originalResponse

> **originalResponse**: `string`

#### processedResponse

> **processedResponse**: `string`

#### ensembleResponses

> **ensembleResponses**: `object`[]

#### judgeScores?

> `optional` **judgeScores?**: `object`

##### judgeScores.scores

> **scores**: `Record`\<`string`, `number`\>

##### judgeScores.reasoning?

> `optional` **reasoning?**: `string`

##### judgeScores.selectedModel

> **selectedModel**: `string`

#### selectedModel

> **selectedModel**: `string`

#### metrics

> **metrics**: `object`

##### metrics.totalTime

> **totalTime**: `number`

##### metrics.ensembleTime

> **ensembleTime**: `number`

##### metrics.judgeTime?

> `optional` **judgeTime?**: `number`

##### metrics.conditioningTime?

> `optional` **conditioningTime?**: `number`

#### workflowId

> **workflowId**: `string`

#### workflowName

> **workflowName**: `string`

---

### transcription?

> `optional` **transcription?**: [`STTResult`](STTResult.md)

Defined in: [types/stream.ts:832](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L832)

STT transcription result (when stt option is used)

---

### audio?

> `optional` **audio?**: `Promise`\<[`TTSResult`](TTSResult.md) \| `undefined`\>

Defined in: [types/stream.ts:841](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stream.ts#L841)

TTS Mode 2 result (when `tts.enabled && tts.useAiResponse`).
Resolves with the synthesized audio after the stream completes;
resolves to undefined if TTS was not enabled or synthesis failed.
The same audio is also yielded as a final chunk on `stream` for callers
that prefer to consume it inline.

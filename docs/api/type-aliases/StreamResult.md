[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamResult

# Type Alias: StreamResult

> **StreamResult** = `object`

Defined in: [types/stream.ts:727](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L727)

Stream function result type - Primary output format for streaming
Future-ready for multi-modal outputs while maintaining text focus

## Properties

### knowledge?

> `optional` **knowledge?**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

Defined in: [types/stream.ts:729](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L729)

Knowledge-grounding diagnostics for this turn (present only when grounding ran).

---

### stream

> **stream**: `AsyncIterable`\<\{ `content`: `string`; `reasoning?`: `string`; \} \| [`StreamNoOutputSentinel`](StreamNoOutputSentinel.md) \| \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \} \| \{ `type`: `"image"`; `imageOutput`: \{ `base64`: `string`; \}; \} \| \{ `content`: `string`; `type?`: `"preliminary"` \| `"final"`; \}\>

Defined in: [types/stream.ts:730](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L730)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/stream.ts:745](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L745)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/stream.ts:746](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L746)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/stream.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L749)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/stream.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L752)

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/stream.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L760)

Why the agentic turn ended (see GenerateStopReason). For background-loop
streams (native Vertex paths) prefer `metadata.stopReason` after draining
the stream — this top-level field may be a getter that resolves late, and
wrapper spreads can snapshot it before the loop finishes.

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/stream.ts:762](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L762)

Verbatim provider finish/stop reason for the turn's terminal model call.

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/stream.ts:765](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L765)

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Defined in: [types/stream.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L766)

---

### toolEvents?

> `optional` **toolEvents?**: `AsyncIterable`\<[`ToolExecutionEvent`](ToolExecutionEvent.md)\>

Defined in: [types/stream.ts:769](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L769)

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecutionSummary`](ToolExecutionSummary.md)[]

Defined in: [types/stream.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L770)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/stream.ts:771](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L771)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stream.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L774)

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

Defined in: [types/stream.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L804)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md) \| `Promise`\<[`EvaluationData`](EvaluationData.md)\>

Defined in: [types/stream.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L805)

---

### events?

> `optional` **events?**: `object`[]

Defined in: [types/stream.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L808)

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

Defined in: [types/stream.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L816)

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

Defined in: [types/stream.ts:844](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L844)

STT transcription result (when stt option is used)

---

### audio?

> `optional` **audio?**: `Promise`\<[`TTSResult`](TTSResult.md) \| `undefined`\>

Defined in: [types/stream.ts:853](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L853)

TTS Mode 2 result (when `tts.enabled && tts.useAiResponse`).
Resolves with the synthesized audio after the stream completes;
resolves to undefined if TTS was not enabled or synthesis failed.
The same audio is also yielded as a final chunk on `stream` for callers
that prefer to consume it inline.

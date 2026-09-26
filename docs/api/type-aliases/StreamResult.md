[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamResult

# Type Alias: StreamResult

> **StreamResult** = `object`

Defined in: [types/stream.ts:934](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L934)

Stream function result type - Primary output format for streaming
Future-ready for multi-modal outputs while maintaining text focus

## Properties

### knowledge?

> `optional` **knowledge?**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

Defined in: [types/stream.ts:936](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L936)

Knowledge-grounding diagnostics for this turn (present only when grounding ran).

---

### agentModeVersion?

> `optional` **agentModeVersion?**: [`TerminalAgentModeVersion`](TerminalAgentModeVersion.md)

Defined in: [types/stream.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L938)

Terminal agent instructions version applied (present only with `agentMode`).

---

### stream

> **stream**: `AsyncIterable`\<\{ `content`: `string`; `reasoning?`: `string`; \} \| [`StreamNoOutputSentinel`](StreamNoOutputSentinel.md) \| \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \} \| \{ `type`: `"image"`; `imageOutput`: \{ `base64`: `string`; \}; \} \| \{ `content`: `string`; `type?`: `"preliminary"` \| `"final"`; \}\>

Defined in: [types/stream.ts:939](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L939)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/stream.ts:954](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L954)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/stream.ts:955](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L955)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/stream.ts:958](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L958)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/stream.ts:961](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L961)

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/stream.ts:970](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L970)

Why the agentic turn ended (see GenerateStopReason). For background-loop
streams (the native Vertex paths and the native Anthropic stream path)
prefer `metadata.stopReason` after draining the stream — this top-level
field may be a getter that resolves late, and wrapper spreads can
snapshot it before the loop finishes.

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/stream.ts:972](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L972)

Verbatim provider finish/stop reason for the turn's terminal model call.

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/stream.ts:975](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L975)

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Defined in: [types/stream.ts:976](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L976)

---

### toolEvents?

> `optional` **toolEvents?**: `AsyncIterable`\<[`ToolExecutionEvent`](ToolExecutionEvent.md)\>

Defined in: [types/stream.ts:979](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L979)

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecutionSummary`](ToolExecutionSummary.md)[]

Defined in: [types/stream.ts:980](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L980)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/stream.ts:981](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L981)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stream.ts:984](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L984)

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

Defined in: [types/stream.ts:1014](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1014)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md) \| `Promise`\<[`EvaluationData`](EvaluationData.md)\>

Defined in: [types/stream.ts:1015](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1015)

---

### events?

> `optional` **events?**: `object`[]

Defined in: [types/stream.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1018)

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

Defined in: [types/stream.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1026)

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

Defined in: [types/stream.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1054)

STT transcription result (when stt option is used)

---

### audio?

> `optional` **audio?**: `Promise`\<[`TTSResult`](TTSResult.md) \| `undefined`\>

Defined in: [types/stream.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1080)

Streaming TTS result (when `tts.enabled`). `stream()` synthesizes the AI
response incrementally; `useAiResponse` continues to select input vs
response synthesis for non-streaming generation.
Resolves with the synthesized audio after the caller drains `stream` to
completion; like other stream-final fields, it remains pending while the
lazy stream is unconsumed. It resolves with the aggregate of whatever
segments were synthesized: a synthesis failure part-way through still
resolves with the earlier segments rather than discarding them. It resolves
to undefined only when no segment was produced — TTS was not enabled, no
handler resolved for the requested provider, the model stream errored, every
synthesis failed, or the caller stopped draining `stream` before it ended
(an abandoned stream settles undefined rather than a partial aggregate).
Audio is also yielded incrementally as ordered
`tts_audio` chunks. Each chunk, including the final one, contains only its
own buffered segment. The aggregate is a byte concatenation of those
independently synthesized segments, so what it is depends on the format's
framing: for frame- or sample-stream formats (`mp3`, `mpeg`, `mpga`,
`pcm16`) it is one playable stream; for header-bearing container formats
(`wav`, `flac`, `m4a`, `mp4`, `webm`) it is not a valid file, because each
segment carries its own header; for `ogg`/`opus` it is a chained stream that
some decoders read only through its first segment. Use the individual chunk
buffers when each segment must be a valid container file.

---

### ttsMetadata?

> `optional` **ttsMetadata?**: [`TTSMetadata`](TTSMetadata.md)

Defined in: [types/stream.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1087)

Outcome metadata for streaming TTS synthesis. This is a mutable reference
whose success and latency fields are finalized asynchronously; read it
after draining `stream`.

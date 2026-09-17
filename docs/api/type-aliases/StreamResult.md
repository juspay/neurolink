[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamResult

# Type Alias: StreamResult

> **StreamResult** = `object`

Defined in: [types/stream.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L878)

Stream function result type - Primary output format for streaming
Future-ready for multi-modal outputs while maintaining text focus

## Properties

### knowledge?

> `optional` **knowledge?**: [`KnowledgeGroundingMetadata`](KnowledgeGroundingMetadata.md)

Defined in: [types/stream.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L880)

Knowledge-grounding diagnostics for this turn (present only when grounding ran).

---

### stream

> **stream**: `AsyncIterable`\<\{ `content`: `string`; `reasoning?`: `string`; \} \| [`StreamNoOutputSentinel`](StreamNoOutputSentinel.md) \| \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \} \| \{ `type`: `"image"`; `imageOutput`: \{ `base64`: `string`; \}; \} \| \{ `content`: `string`; `type?`: `"preliminary"` \| `"final"`; \}\>

Defined in: [types/stream.ts:881](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L881)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/stream.ts:896](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L896)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/stream.ts:897](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L897)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/stream.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L900)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/stream.ts:903](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L903)

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/stream.ts:912](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L912)

Why the agentic turn ended (see GenerateStopReason). For background-loop
streams (the native Vertex paths and the native Anthropic stream path)
prefer `metadata.stopReason` after draining the stream — this top-level
field may be a getter that resolves late, and wrapper spreads can
snapshot it before the loop finishes.

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/stream.ts:914](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L914)

Verbatim provider finish/stop reason for the turn's terminal model call.

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/stream.ts:917](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L917)

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Defined in: [types/stream.ts:918](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L918)

---

### toolEvents?

> `optional` **toolEvents?**: `AsyncIterable`\<[`ToolExecutionEvent`](ToolExecutionEvent.md)\>

Defined in: [types/stream.ts:921](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L921)

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecutionSummary`](ToolExecutionSummary.md)[]

Defined in: [types/stream.ts:922](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L922)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/stream.ts:923](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L923)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stream.ts:926](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L926)

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

#### structuredData?

> `optional` **structuredData?**: `unknown`

Parsed structured output for a `stream({ schema })` turn, available
AFTER the stream has been drained.

Lives on metadata for the same reason `finishReason` above does: it is a
mutable reference the loop fills in, so result-object spreads in stream
wrappers cannot snapshot it before it resolves. A plain field rather than
a promise, deliberately — when a middleware short-circuits the request
and the loop never runs, an unresolved promise would hang every reader,
whereas an absent field is simply absent. Readers must tolerate that:
absence means the model never produced the object.

#### structuredDataUsage?

> `optional` **structuredDataUsage?**: `object`

Tokens spent by the tool-free re-ask that produced `structuredData`,
when one was needed.

That re-ask is a second, separately-billed model call, and the stream's
own `usage` has already resolved by the time it runs — so folding these
tokens into it would mutate a value a caller may have read, and leaving
them out entirely would under-report what the turn cost. Reported here
instead: same delivery as `structuredData`, filled at the same moment,
read at the same moment. Absent when no re-ask was needed, which is the
common case. The generate path accounts for its equivalent re-ask
inline, since there the usage has not been handed out yet.

##### structuredDataUsage.inputTokens

> **inputTokens**: `number`

##### structuredDataUsage.outputTokens

> **outputTokens**: `number`

#### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

#### thoughts?

> `optional` **thoughts?**: `object`[]

---

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md) \| `Promise`\<[`AnalyticsData`](AnalyticsData.md)\>

Defined in: [types/stream.ts:986](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L986)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md) \| `Promise`\<[`EvaluationData`](EvaluationData.md)\>

Defined in: [types/stream.ts:987](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L987)

---

### events?

> `optional` **events?**: `object`[]

Defined in: [types/stream.ts:990](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L990)

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

Defined in: [types/stream.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L998)

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

Defined in: [types/stream.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1026)

STT transcription result (when stt option is used)

---

### audio?

> `optional` **audio?**: `Promise`\<[`TTSResult`](TTSResult.md) \| `undefined`\>

Defined in: [types/stream.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1052)

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

Defined in: [types/stream.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L1059)

Outcome metadata for streaming TTS synthesis. This is a mutable reference
whose success and latency fields are finalized asynchronously; read it
after draining `stream`.

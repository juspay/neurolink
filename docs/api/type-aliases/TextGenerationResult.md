[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationResult

# Type Alias: TextGenerationResult

> **TextGenerationResult** = `object`

Defined in: [types/generate.ts:1621](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1621)

Text generation result (consolidated from core types)

## Properties

### content

> **content**: `string`

Defined in: [types/generate.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1622)

---

### structuredData?

> `optional` **structuredData?**: `unknown`

Defined in: [types/generate.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1624)

Parsed structured object when a `schema` was requested (see GenerateResult.structuredData).

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/generate.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1625)

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/generate.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1627)

Turn-exit discriminator from native agentic loops (see GenerateStopReason).

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1629](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1629)

Verbatim provider finish/stop reason for the turn's terminal model call.

---

### stepsUsed?

> `optional` **stepsUsed?**: `number`

Defined in: [types/generate.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1631)

Number of agentic steps (model calls) the turn used.

---

### jsonRepaired?

> `optional` **jsonRepaired?**: `boolean`

Defined in: [types/generate.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1633)

True when the schema JSON was repaired from malformed model text.

---

### jsonTruncated?

> `optional` **jsonTruncated?**: `boolean`

Defined in: [types/generate.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1635)

True when the schema JSON appears truncated (output hit the token cap).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/generate.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1636)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1637)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/generate.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1638)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/generate.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1639)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/generate.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1640)

---

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

Defined in: [types/generate.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1641)

#### toolName

> **toolName**: `string`

#### executionTime

> **executionTime**: `number`

#### success

> **success**: `boolean`

#### serverId?

> `optional` **serverId?**: `string`

---

### enhancedWithTools?

> `optional` **enhancedWithTools?**: `boolean`

Defined in: [types/generate.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1647)

---

### availableTools?

> `optional` **availableTools?**: `object`[]

Defined in: [types/generate.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1648)

#### name

> **name**: `string`

#### description

> **description**: `string`

#### server

> **server**: `string`

#### category?

> `optional` **category?**: `string`

---

### analytics?

> `optional` **analytics?**: [`AnalyticsData`](AnalyticsData.md)

Defined in: [types/generate.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1655)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/generate.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1656)

---

### audio?

> `optional` **audio?**: [`TTSResult`](TTSResult.md)

Defined in: [types/generate.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1657)

---

### ttsMetadata?

> `optional` **ttsMetadata?**: [`TTSMetadata`](TTSMetadata.md)

Defined in: [types/generate.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1659)

Outcome of TTS synthesis, including the failure reason.

---

### transcription?

> `optional` **transcription?**: [`STTResult`](STTResult.md)

Defined in: [types/generate.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1661)

STT transcription result (present when stt input was processed)

---

### video?

> `optional` **video?**: [`VideoGenerationResult`](VideoGenerationResult.md)

Defined in: [types/generate.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1663)

Video generation result

---

### avatar?

> `optional` **avatar?**: [`AvatarResult`](AvatarResult.md)

Defined in: [types/generate.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1665)

Avatar (talking-head) generation result

---

### music?

> `optional` **music?**: [`MusicResult`](MusicResult.md)

Defined in: [types/generate.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1667)

Music generation result

---

### ppt?

> `optional` **ppt?**: [`PPTGenerationResult`](PPTGenerationResult.md)

Defined in: [types/generate.ts:1669](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1669)

PowerPoint generation result

---

### imageOutput?

> `optional` **imageOutput?**: \{ `base64`: `string`; \} \| `null`

Defined in: [types/generate.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1671)

Image generation output

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/generate.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1673)

Gemini 3 thought signature for reasoning continuity across turns

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1675](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1675)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts, DeepSeek/NIM reasoning_content)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/generate.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1677)

Token count for reasoning content

---

### retries?

> `optional` **retries?**: `object`

Defined in: [types/generate.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1679)

#### count

> **count**: `number`

#### errors

> **errors**: `object`[]

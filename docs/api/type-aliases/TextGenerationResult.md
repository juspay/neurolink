[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationResult

# Type Alias: TextGenerationResult

> **TextGenerationResult** = `object`

Defined in: [types/generate.ts:1607](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1607)

Text generation result (consolidated from core types)

## Properties

### content

> **content**: `string`

Defined in: [types/generate.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1608)

---

### structuredData?

> `optional` **structuredData?**: `unknown`

Defined in: [types/generate.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1610)

Parsed structured object when a `schema` was requested (see GenerateResult.structuredData).

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/generate.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1611)

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/generate.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1613)

Turn-exit discriminator from native agentic loops (see GenerateStopReason).

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1615)

Verbatim provider finish/stop reason for the turn's terminal model call.

---

### stepsUsed?

> `optional` **stepsUsed?**: `number`

Defined in: [types/generate.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1617)

Number of agentic steps (model calls) the turn used.

---

### jsonRepaired?

> `optional` **jsonRepaired?**: `boolean`

Defined in: [types/generate.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1619)

True when the schema JSON was repaired from malformed model text.

---

### jsonTruncated?

> `optional` **jsonTruncated?**: `boolean`

Defined in: [types/generate.ts:1621](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1621)

True when the schema JSON appears truncated (output hit the token cap).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/generate.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1622)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1623)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/generate.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1624)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/generate.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1625)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/generate.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1626)

---

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

Defined in: [types/generate.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1627)

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

Defined in: [types/generate.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1633)

---

### availableTools?

> `optional` **availableTools?**: `object`[]

Defined in: [types/generate.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1634)

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

Defined in: [types/generate.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1641)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/generate.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1642)

---

### audio?

> `optional` **audio?**: [`TTSResult`](TTSResult.md)

Defined in: [types/generate.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1643)

---

### transcription?

> `optional` **transcription?**: [`STTResult`](STTResult.md)

Defined in: [types/generate.ts:1645](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1645)

STT transcription result (present when stt input was processed)

---

### video?

> `optional` **video?**: [`VideoGenerationResult`](VideoGenerationResult.md)

Defined in: [types/generate.ts:1647](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1647)

Video generation result

---

### avatar?

> `optional` **avatar?**: [`AvatarResult`](AvatarResult.md)

Defined in: [types/generate.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1649)

Avatar (talking-head) generation result

---

### music?

> `optional` **music?**: [`MusicResult`](MusicResult.md)

Defined in: [types/generate.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1651)

Music generation result

---

### ppt?

> `optional` **ppt?**: [`PPTGenerationResult`](PPTGenerationResult.md)

Defined in: [types/generate.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1653)

PowerPoint generation result

---

### imageOutput?

> `optional` **imageOutput?**: \{ `base64`: `string`; \} \| `null`

Defined in: [types/generate.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1655)

Image generation output

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/generate.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1657)

Gemini 3 thought signature for reasoning continuity across turns

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1659)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts, DeepSeek/NIM reasoning_content)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/generate.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1661)

Token count for reasoning content

---

### retries?

> `optional` **retries?**: `object`

Defined in: [types/generate.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1663)

#### count

> **count**: `number`

#### errors

> **errors**: `object`[]

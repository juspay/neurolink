[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationResult

# Type Alias: TextGenerationResult

> **TextGenerationResult** = `object`

Defined in: [types/generate.ts:1600](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1600)

Text generation result (consolidated from core types)

## Properties

### content

> **content**: `string`

Defined in: [types/generate.ts:1601](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1601)

---

### structuredData?

> `optional` **structuredData?**: `unknown`

Defined in: [types/generate.ts:1603](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1603)

Parsed structured object when a `schema` was requested (see GenerateResult.structuredData).

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/generate.ts:1604](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1604)

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/generate.ts:1606](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1606)

Turn-exit discriminator from native agentic loops (see GenerateStopReason).

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1608](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1608)

Verbatim provider finish/stop reason for the turn's terminal model call.

---

### stepsUsed?

> `optional` **stepsUsed?**: `number`

Defined in: [types/generate.ts:1610](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1610)

Number of agentic steps (model calls) the turn used.

---

### jsonRepaired?

> `optional` **jsonRepaired?**: `boolean`

Defined in: [types/generate.ts:1612](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1612)

True when the schema JSON was repaired from malformed model text.

---

### jsonTruncated?

> `optional` **jsonTruncated?**: `boolean`

Defined in: [types/generate.ts:1614](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1614)

True when the schema JSON appears truncated (output hit the token cap).

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/generate.ts:1615](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1615)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:1616](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1616)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/generate.ts:1617](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1617)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/generate.ts:1618](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1618)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/generate.ts:1619](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1619)

---

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

Defined in: [types/generate.ts:1620](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1620)

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

Defined in: [types/generate.ts:1626](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1626)

---

### availableTools?

> `optional` **availableTools?**: `object`[]

Defined in: [types/generate.ts:1627](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1627)

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

Defined in: [types/generate.ts:1634](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1634)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/generate.ts:1635](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1635)

---

### audio?

> `optional` **audio?**: [`TTSResult`](TTSResult.md)

Defined in: [types/generate.ts:1636](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1636)

---

### transcription?

> `optional` **transcription?**: [`STTResult`](STTResult.md)

Defined in: [types/generate.ts:1638](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1638)

STT transcription result (present when stt input was processed)

---

### video?

> `optional` **video?**: [`VideoGenerationResult`](VideoGenerationResult.md)

Defined in: [types/generate.ts:1640](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1640)

Video generation result

---

### avatar?

> `optional` **avatar?**: [`AvatarResult`](AvatarResult.md)

Defined in: [types/generate.ts:1642](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1642)

Avatar (talking-head) generation result

---

### music?

> `optional` **music?**: [`MusicResult`](MusicResult.md)

Defined in: [types/generate.ts:1644](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1644)

Music generation result

---

### ppt?

> `optional` **ppt?**: [`PPTGenerationResult`](PPTGenerationResult.md)

Defined in: [types/generate.ts:1646](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1646)

PowerPoint generation result

---

### imageOutput?

> `optional` **imageOutput?**: \{ `base64`: `string`; \} \| `null`

Defined in: [types/generate.ts:1648](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1648)

Image generation output

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/generate.ts:1650](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1650)

Gemini 3 thought signature for reasoning continuity across turns

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1652](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1652)

Thinking/reasoning text from provider (Anthropic thinking blocks, Gemini thought parts, DeepSeek/NIM reasoning_content)

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Defined in: [types/generate.ts:1654](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1654)

Token count for reasoning content

---

### retries?

> `optional` **retries?**: `object`

Defined in: [types/generate.ts:1656](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1656)

#### count

> **count**: `number`

#### errors

> **errors**: `object`[]

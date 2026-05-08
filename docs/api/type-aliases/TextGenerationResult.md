[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationResult

# Type Alias: TextGenerationResult

> **TextGenerationResult** = `object`

Defined in: [types/generate.ts:1163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1163)

Text generation result (consolidated from core types)

## Properties

### content

> **content**: `string`

Defined in: [types/generate.ts:1164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1164)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/generate.ts:1165](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1165)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/generate.ts:1166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1166)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/generate.ts:1167](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1167)

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/generate.ts:1168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1168)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/generate.ts:1169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1169)

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/generate.ts:1170](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1170)

---

### toolExecutions?

> `optional` **toolExecutions?**: `object`[]

Defined in: [types/generate.ts:1171](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1171)

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

Defined in: [types/generate.ts:1177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1177)

---

### availableTools?

> `optional` **availableTools?**: `object`[]

Defined in: [types/generate.ts:1178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1178)

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

Defined in: [types/generate.ts:1185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1185)

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/generate.ts:1186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1186)

---

### audio?

> `optional` **audio?**: [`TTSResult`](TTSResult.md)

Defined in: [types/generate.ts:1187](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1187)

---

### transcription?

> `optional` **transcription?**: [`STTResult`](STTResult.md)

Defined in: [types/generate.ts:1189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1189)

STT transcription result (present when stt input was processed)

---

### video?

> `optional` **video?**: [`VideoGenerationResult`](VideoGenerationResult.md)

Defined in: [types/generate.ts:1191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1191)

Video generation result

---

### ppt?

> `optional` **ppt?**: [`PPTGenerationResult`](PPTGenerationResult.md)

Defined in: [types/generate.ts:1193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1193)

PowerPoint generation result

---

### imageOutput?

> `optional` **imageOutput?**: \{ `base64`: `string`; \} \| `null`

Defined in: [types/generate.ts:1195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1195)

Image generation output

---

### thoughtSignature?

> `optional` **thoughtSignature?**: `string`

Defined in: [types/generate.ts:1197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1197)

Gemini 3 thought signature for reasoning continuity across turns

---

### retries?

> `optional` **retries?**: `object`

Defined in: [types/generate.ts:1199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L1199)

#### count

> **count**: `number`

#### errors

> **errors**: `object`[]

[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TextGenerationResult

# Type Alias: TextGenerationResult

> **TextGenerationResult** = `object`

Defined in: [types/generateTypes.ts:653](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L653)

Text generation result (consolidated from core types)

## Properties

### content

> **content**: `string`

Defined in: [types/generateTypes.ts:654](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L654)

---

### provider?

> `optional` **provider**: `string`

Defined in: [types/generateTypes.ts:655](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L655)

---

### model?

> `optional` **model**: `string`

Defined in: [types/generateTypes.ts:656](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L656)

---

### usage?

> `optional` **usage**: `TokenUsage`

Defined in: [types/generateTypes.ts:657](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L657)

---

### responseTime?

> `optional` **responseTime**: `number`

Defined in: [types/generateTypes.ts:658](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L658)

---

### toolsUsed?

> `optional` **toolsUsed**: `string`[]

Defined in: [types/generateTypes.ts:659](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L659)

---

### toolExecutions?

> `optional` **toolExecutions**: `object`[]

Defined in: [types/generateTypes.ts:660](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L660)

#### toolName

> **toolName**: `string`

#### executionTime

> **executionTime**: `number`

#### success

> **success**: `boolean`

#### serverId?

> `optional` **serverId**: `string`

---

### enhancedWithTools?

> `optional` **enhancedWithTools**: `boolean`

Defined in: [types/generateTypes.ts:666](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L666)

---

### availableTools?

> `optional` **availableTools**: `object`[]

Defined in: [types/generateTypes.ts:667](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L667)

#### name

> **name**: `string`

#### description

> **description**: `string`

#### server

> **server**: `string`

#### category?

> `optional` **category**: `string`

---

### analytics?

> `optional` **analytics**: [`AnalyticsData`](AnalyticsData.md)

Defined in: [types/generateTypes.ts:674](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L674)

---

### evaluation?

> `optional` **evaluation**: [`EvaluationData`](EvaluationData.md)

Defined in: [types/generateTypes.ts:675](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L675)

---

### audio?

> `optional` **audio**: `TTSResult`

Defined in: [types/generateTypes.ts:676](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L676)

---

### video?

> `optional` **video**: `VideoGenerationResult`

Defined in: [types/generateTypes.ts:678](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L678)

Video generation result

---

### imageOutput?

> `optional` **imageOutput**: \{ `base64`: `string`; \} \| `null`

Defined in: [types/generateTypes.ts:680](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/generateTypes.ts#L680)

Image generation output

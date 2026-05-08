[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnsembleResponse

# Type Alias: EnsembleResponse

> **EnsembleResponse** = `object`

Defined in: [types/workflow.ts:307](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L307)

Single ensemble model response

## Properties

### provider

> **provider**: `string`

Defined in: [types/workflow.ts:309](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L309)

---

### model

> **model**: `string`

Defined in: [types/workflow.ts:310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L310)

---

### modelLabel?

> `optional` **modelLabel?**: `string`

Defined in: [types/workflow.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L311)

---

### content

> **content**: `string`

Defined in: [types/workflow.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L314)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/workflow.ts:317](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L317)

---

### usage?

> `optional` **usage?**: `object`

Defined in: [types/workflow.ts:320](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L320)

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### status

> **status**: `"success"` \| `"failure"` \| `"timeout"` \| `"partial"`

Defined in: [types/workflow.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L327)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/workflow.ts:328](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L328)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L331)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/workflow.ts:332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L332)

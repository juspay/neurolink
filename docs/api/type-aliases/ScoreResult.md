[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScoreResult

# Type Alias: ScoreResult

> **ScoreResult** = `object`

Defined in: [types/scorer.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L41)

Individual score result from a scorer

## Properties

### scorerId

> **scorerId**: `string`

Defined in: [types/scorer.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L43)

Unique identifier for the scorer

---

### scorerName

> **scorerName**: `string`

Defined in: [types/scorer.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L45)

Display name of the scorer

---

### score

> **score**: `number`

Defined in: [types/scorer.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L47)

Numeric score value

---

### normalizedScore

> **normalizedScore**: `number`

Defined in: [types/scorer.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L49)

Normalized score (0-1 scale)

---

### scale

> **scale**: [`ScoreScale`](ScoreScale.md)

Defined in: [types/scorer.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L51)

Score scale used

---

### reasoning

> **reasoning**: `string`

Defined in: [types/scorer.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L53)

Human-readable reasoning for the score

---

### passed

> **passed**: `boolean`

Defined in: [types/scorer.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L55)

Whether the score passes the threshold

---

### threshold

> **threshold**: `number`

Defined in: [types/scorer.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L57)

Threshold used for pass/fail determination

---

### confidence?

> `optional` **confidence?**: `number`

Defined in: [types/scorer.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L59)

Confidence level (0-1) for LLM-based scores

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/scorer.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L61)

Additional metadata from the scorer

---

### computeTime

> **computeTime**: `number`

Defined in: [types/scorer.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L63)

Time taken to compute the score (ms)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/scorer.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L65)

Error if scoring failed

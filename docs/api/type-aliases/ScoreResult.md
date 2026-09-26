[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScoreResult

# Type Alias: ScoreResult

> **ScoreResult** = `object`

Individual score result from a scorer

## Properties

### scorerId

> **scorerId**: `string`

Unique identifier for the scorer

---

### scorerName

> **scorerName**: `string`

Display name of the scorer

---

### score

> **score**: `number`

Numeric score value

---

### normalizedScore

> **normalizedScore**: `number`

Normalized score (0-1 scale)

---

### scale

> **scale**: [`ScoreScale`](ScoreScale.md)

Score scale used

---

### reasoning

> **reasoning**: `string`

Human-readable reasoning for the score

---

### passed

> **passed**: `boolean`

Whether the score passes the threshold

---

### threshold

> **threshold**: `number`

Threshold used for pass/fail determination

---

### confidence?

> `optional` **confidence?**: `number`

Confidence level (0-1) for LLM-based scores

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Additional metadata from the scorer

---

### computeTime

> **computeTime**: `number`

Time taken to compute the score (ms)

---

### error?

> `optional` **error?**: `string`

Error if scoring failed

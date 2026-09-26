[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicatePrediction

# Type Alias: ReplicatePrediction

> **ReplicatePrediction** = `object`

Replicate prediction object as returned by /v1/predictions POST and
/v1/predictions/:id GET. Output shape varies by model — caller narrows.

## Properties

### id

> **id**: `string`

---

### model?

> `optional` **model?**: `string`

---

### version?

> `optional` **version?**: `string`

---

### status

> **status**: [`ReplicatePredictionStatus`](ReplicatePredictionStatus.md)

---

### output?

> `optional` **output?**: `unknown`

URL string, array of URL strings, base64, or model-specific JSON.

---

### error?

> `optional` **error?**: `string` \| `null`

---

### metrics?

> `optional` **metrics?**: `object`

#### predict_time?

> `optional` **predict_time?**: `number`

---

### urls?

> `optional` **urls?**: `object`

#### get

> **get**: `string`

#### cancel

> **cancel**: `string`

---

### logs?

> `optional` **logs?**: `string`

---

### created_at?

> `optional` **created_at?**: `string`

---

### started_at?

> `optional` **started_at?**: `string`

---

### completed_at?

> `optional` **completed_at?**: `string`

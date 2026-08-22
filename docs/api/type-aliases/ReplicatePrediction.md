[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicatePrediction

# Type Alias: ReplicatePrediction

> **ReplicatePrediction** = `object`

Defined in: [types/replicate.ts:32](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L32)

Replicate prediction object as returned by /v1/predictions POST and
/v1/predictions/:id GET. Output shape varies by model — caller narrows.

## Properties

### id

> **id**: `string`

Defined in: [types/replicate.ts:33](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L33)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/replicate.ts:34](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L34)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/replicate.ts:35](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L35)

---

### status

> **status**: [`ReplicatePredictionStatus`](ReplicatePredictionStatus.md)

Defined in: [types/replicate.ts:36](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L36)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/replicate.ts:38](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L38)

URL string, array of URL strings, base64, or model-specific JSON.

---

### error?

> `optional` **error?**: `string` \| `null`

Defined in: [types/replicate.ts:39](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L39)

---

### metrics?

> `optional` **metrics?**: `object`

Defined in: [types/replicate.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L40)

#### predict_time?

> `optional` **predict_time?**: `number`

---

### urls?

> `optional` **urls?**: `object`

Defined in: [types/replicate.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L41)

#### get

> **get**: `string`

#### cancel

> **cancel**: `string`

---

### logs?

> `optional` **logs?**: `string`

Defined in: [types/replicate.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L42)

---

### created_at?

> `optional` **created_at?**: `string`

Defined in: [types/replicate.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L43)

---

### started_at?

> `optional` **started_at?**: `string`

Defined in: [types/replicate.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L44)

---

### completed_at?

> `optional` **completed_at?**: `string`

Defined in: [types/replicate.ts:45](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/replicate.ts#L45)

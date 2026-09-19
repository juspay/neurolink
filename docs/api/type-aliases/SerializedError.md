[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SerializedError

# Type Alias: SerializedError

> **SerializedError** = `object`

Defined in: [types/processor.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1174)

Serialized error representation with full context.

## Properties

### errorId

> **errorId**: `string`

Defined in: [types/processor.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1175)

---

### errorFingerprint

> **errorFingerprint**: `string`

Defined in: [types/processor.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1176)

---

### errorType

> **errorType**: `string`

Defined in: [types/processor.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1177)

---

### message

> **message**: `string`

Defined in: [types/processor.ts:1178](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1178)

---

### stack?

> `optional` **stack?**: `string`

Defined in: [types/processor.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1179)

---

### stackFrames?

> `optional` **stackFrames?**: `string`[]

Defined in: [types/processor.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1180)

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/processor.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1181)

---

### isOperational?

> `optional` **isOperational?**: `boolean`

Defined in: [types/processor.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1182)

---

### isRetryable?

> `optional` **isRetryable?**: `boolean`

Defined in: [types/processor.ts:1183](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1183)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/processor.ts:1184](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1184)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/processor.ts:1185](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1185)

---

### cause?

> `optional` **cause?**: `SerializedError`

Defined in: [types/processor.ts:1186](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1186)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/processor.ts:1187](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1187)

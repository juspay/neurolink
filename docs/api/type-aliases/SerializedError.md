[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SerializedError

# Type Alias: SerializedError

> **SerializedError** = `object`

Defined in: [types/processor.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1169)

Serialized error representation with full context.

## Properties

### errorId

> **errorId**: `string`

Defined in: [types/processor.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1170)

---

### errorFingerprint

> **errorFingerprint**: `string`

Defined in: [types/processor.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1171)

---

### errorType

> **errorType**: `string`

Defined in: [types/processor.ts:1172](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1172)

---

### message

> **message**: `string`

Defined in: [types/processor.ts:1173](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1173)

---

### stack?

> `optional` **stack?**: `string`

Defined in: [types/processor.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1174)

---

### stackFrames?

> `optional` **stackFrames?**: `string`[]

Defined in: [types/processor.ts:1175](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1175)

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/processor.ts:1176](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1176)

---

### isOperational?

> `optional` **isOperational?**: `boolean`

Defined in: [types/processor.ts:1177](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1177)

---

### isRetryable?

> `optional` **isRetryable?**: `boolean`

Defined in: [types/processor.ts:1178](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1178)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/processor.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1179)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/processor.ts:1180](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1180)

---

### cause?

> `optional` **cause?**: `SerializedError`

Defined in: [types/processor.ts:1181](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1181)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/processor.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1182)

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SerializedError

# Type Alias: SerializedError

> **SerializedError** = `object`

Defined in: [types/processor.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1202)

Serialized error representation with full context.

## Properties

### errorId

> **errorId**: `string`

Defined in: [types/processor.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1203)

---

### errorFingerprint

> **errorFingerprint**: `string`

Defined in: [types/processor.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1204)

---

### errorType

> **errorType**: `string`

Defined in: [types/processor.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1205)

---

### message

> **message**: `string`

Defined in: [types/processor.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1206)

---

### stack?

> `optional` **stack?**: `string`

Defined in: [types/processor.ts:1207](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1207)

---

### stackFrames?

> `optional` **stackFrames?**: `string`[]

Defined in: [types/processor.ts:1208](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1208)

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/processor.ts:1209](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1209)

---

### isOperational?

> `optional` **isOperational?**: `boolean`

Defined in: [types/processor.ts:1210](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1210)

---

### isRetryable?

> `optional` **isRetryable?**: `boolean`

Defined in: [types/processor.ts:1211](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1211)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/processor.ts:1212](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1212)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/processor.ts:1213](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1213)

---

### cause?

> `optional` **cause?**: `SerializedError`

Defined in: [types/processor.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1214)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/processor.ts:1215](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L1215)

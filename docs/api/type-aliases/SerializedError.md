[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SerializedError

# Type Alias: SerializedError

> **SerializedError** = `object`

Defined in: [types/processor.ts:1102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1102)

Serialized error representation with full context.

## Properties

### errorId

> **errorId**: `string`

Defined in: [types/processor.ts:1103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1103)

---

### errorFingerprint

> **errorFingerprint**: `string`

Defined in: [types/processor.ts:1104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1104)

---

### errorType

> **errorType**: `string`

Defined in: [types/processor.ts:1105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1105)

---

### message

> **message**: `string`

Defined in: [types/processor.ts:1106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1106)

---

### stack?

> `optional` **stack?**: `string`

Defined in: [types/processor.ts:1107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1107)

---

### stackFrames?

> `optional` **stackFrames?**: `string`[]

Defined in: [types/processor.ts:1108](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1108)

---

### statusCode?

> `optional` **statusCode?**: `number`

Defined in: [types/processor.ts:1109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1109)

---

### isOperational?

> `optional` **isOperational?**: `boolean`

Defined in: [types/processor.ts:1110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1110)

---

### isRetryable?

> `optional` **isRetryable?**: `boolean`

Defined in: [types/processor.ts:1111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1111)

---

### code?

> `optional` **code?**: `string`

Defined in: [types/processor.ts:1112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1112)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/processor.ts:1113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1113)

---

### cause?

> `optional` **cause?**: `SerializedError`

Defined in: [types/processor.ts:1114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1114)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/processor.ts:1115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L1115)

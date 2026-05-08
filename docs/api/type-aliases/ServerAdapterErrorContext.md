[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterErrorContext

# Type Alias: ServerAdapterErrorContext

> **ServerAdapterErrorContext** = `object`

Defined in: [types/server.ts:1153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1153)

Error context for server adapter errors

## Properties

### category

> **category**: [`ErrorCategoryType`](ErrorCategoryType.md)

Defined in: [types/server.ts:1154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1154)

---

### severity

> **severity**: [`ErrorSeverityType`](ErrorSeverityType.md)

Defined in: [types/server.ts:1155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1155)

---

### retryable

> **retryable**: `boolean`

Defined in: [types/server.ts:1156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1156)

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/server.ts:1157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1157)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/server.ts:1158](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1158)

---

### path?

> `optional` **path?**: `string`

Defined in: [types/server.ts:1159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1159)

---

### method?

> `optional` **method?**: `string`

Defined in: [types/server.ts:1160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1160)

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [types/server.ts:1161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1161)

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/server.ts:1162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1162)

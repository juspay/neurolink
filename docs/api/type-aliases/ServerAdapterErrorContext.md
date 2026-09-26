[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterErrorContext

# Type Alias: ServerAdapterErrorContext

> **ServerAdapterErrorContext** = `object`

Defined in: [types/server.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1162)

Error context for server adapter errors

## Properties

### category

> **category**: [`ErrorCategoryType`](ErrorCategoryType.md)

Defined in: [types/server.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1163)

---

### severity

> **severity**: [`ErrorSeverityType`](ErrorSeverityType.md)

Defined in: [types/server.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1164)

---

### retryable

> **retryable**: `boolean`

Defined in: [types/server.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1165)

---

### retryAfterMs?

> `optional` **retryAfterMs?**: `number`

Defined in: [types/server.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1166)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/server.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1167)

---

### path?

> `optional` **path?**: `string`

Defined in: [types/server.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1168)

---

### method?

> `optional` **method?**: `string`

Defined in: [types/server.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1169)

---

### details?

> `optional` **details?**: `Record`\<`string`, `unknown`\>

Defined in: [types/server.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1170)

---

### cause?

> `optional` **cause?**: `Error`

Defined in: [types/server.ts:1171](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1171)

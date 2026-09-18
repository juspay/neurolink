[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1324)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1325)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1326)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1327)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1328)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1329)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1330)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1332)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1333)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1334)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1335)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1336)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1337)

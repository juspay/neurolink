[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1102)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1103)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1104)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1105)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1106)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1107)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1108)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1110)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1111)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1112)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1113)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1114)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1115)

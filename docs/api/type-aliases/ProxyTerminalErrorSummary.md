[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1108)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1109)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1110)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1111)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1112)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1113)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1114)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1116)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1117)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1118)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1119)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1120)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1121)

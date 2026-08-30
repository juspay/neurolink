[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1093)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1094)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1095)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1096)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1097)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1098)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1099)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1101)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1102)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1103)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1104)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1105)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1106)

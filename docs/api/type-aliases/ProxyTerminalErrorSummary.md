[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1203)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1204)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1205)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1206)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1207)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1208)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1209)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1211)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1212)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1213)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1214)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1215)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1216)

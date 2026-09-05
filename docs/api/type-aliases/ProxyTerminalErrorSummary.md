[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1113)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1114)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1115)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1116)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1117)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1118)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1119)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1121)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1122)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1123)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1124)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1125)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1126)

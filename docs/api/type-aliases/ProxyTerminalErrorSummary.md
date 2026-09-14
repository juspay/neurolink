[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1300)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1301)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1302)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1303)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1304)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1305)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1306)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1308](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1308)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1309)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1310)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1311)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1312)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1313)

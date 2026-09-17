[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1309](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1309)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1310)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1311)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1312)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1313)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1314)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1315](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1315)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1317](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1317)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1318](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1318)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1319)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1320)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1321)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1322)

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1405)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1406)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1407](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1407)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1408](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1408)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1409)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1410)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1411)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1413](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1413)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1414)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1415](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1415)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1416](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1416)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1417](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1417)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1418)

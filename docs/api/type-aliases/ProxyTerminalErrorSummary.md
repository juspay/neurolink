[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1456)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1457)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1458)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1459)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1460)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1461)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1462)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1464)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1465)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1466)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1467)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1468)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1469)

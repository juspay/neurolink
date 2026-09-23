[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1476)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1477)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1478)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1479)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1480)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1481)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1482)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1484)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1485)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1486)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1487)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1488)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1489)

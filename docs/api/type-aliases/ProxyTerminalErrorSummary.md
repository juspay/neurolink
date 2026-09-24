[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1479)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1480)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1481)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1482)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1483)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1484)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1485)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1487)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1488)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1489)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1490](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1490)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1491)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1492)

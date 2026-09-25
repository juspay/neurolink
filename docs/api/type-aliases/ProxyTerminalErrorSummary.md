[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1544)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1545)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1546)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1547)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1548)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1549)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1550)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1552)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1553)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1554)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1555)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1556)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1557)

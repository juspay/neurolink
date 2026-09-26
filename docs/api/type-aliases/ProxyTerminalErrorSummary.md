[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Defined in: [types/proxy.ts:1568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1568)

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

Defined in: [types/proxy.ts:1569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1569)

---

### at

> **at**: `number`

Defined in: [types/proxy.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1570)

---

### status

> **status**: `number`

Defined in: [types/proxy.ts:1571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1571)

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

Defined in: [types/proxy.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1572)

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/proxy.ts:1573](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1573)

---

### account?

> `optional` **account?**: `string`

Defined in: [types/proxy.ts:1574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1574)

---

### accountKey?

> `optional` **accountKey?**: `string`

Defined in: [types/proxy.ts:1576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1576)

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1577)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1578](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1578)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1579)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

Defined in: [types/proxy.ts:1580](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1580)

---

### message?

> `optional` **message?**: `string`

Defined in: [types/proxy.ts:1581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1581)

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:1792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1792)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:1793](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1793)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1794)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1795)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1796)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:1797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1797)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:1798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1798)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:1799](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1799)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:1800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1800)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1801)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:1802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1802)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:1804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1804)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1805)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1806)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:1807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1807)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1808)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1809)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1810)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1811)

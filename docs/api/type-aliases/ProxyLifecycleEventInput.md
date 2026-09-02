[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1890)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1891)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1892)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1893)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1894)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1895)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1896)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1897)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:1898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1898)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1899)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:1900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1900)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1902)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1903)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:1904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1904)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1905)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1906)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1907)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1908)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:1909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1909)

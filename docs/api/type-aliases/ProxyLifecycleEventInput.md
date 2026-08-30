[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1859)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1860)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1861)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1862)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1863)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1864)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1865)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1866)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1867)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1868)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1869)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:1871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1871)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1872)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:1873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1873)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1874)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1875)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1876)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1877)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1878)

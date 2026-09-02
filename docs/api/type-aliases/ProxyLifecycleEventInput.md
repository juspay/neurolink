[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:1881](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1881)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1882)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1883)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1884)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1885)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1886)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1887)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1888)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1889)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1890)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1891)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1893)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1894)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1895)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1896)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1897)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1898)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1899)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:1900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1900)

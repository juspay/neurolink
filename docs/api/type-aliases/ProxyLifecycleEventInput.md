[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLifecycleEventInput

# Type Alias: ProxyLifecycleEventInput

> **ProxyLifecycleEventInput** = `object`

Defined in: [types/proxy.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1902)

Content-free lifecycle event accepted by the bounded metadata logger.

## Properties

### event

> **event**: [`ProxyLifecycleEventName`](ProxyLifecycleEventName.md)

Defined in: [types/proxy.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1903)

---

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1904)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1905)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1906)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/proxy.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1907)

---

### stream?

> `optional` **stream?**: `boolean`

Defined in: [types/proxy.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1908)

---

### toolCount?

> `optional` **toolCount?**: `number`

Defined in: [types/proxy.ts:1909](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1909)

---

### sessionHash?

> `optional` **sessionHash?**: `string`

Defined in: [types/proxy.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1910)

---

### requestBytes?

> `optional` **requestBytes?**: `number`

Defined in: [types/proxy.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1911)

---

### responseStatus?

> `optional` **responseStatus?**: `number`

Defined in: [types/proxy.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1912)

---

### observedBodyBytes?

> `optional` **observedBodyBytes?**: `number`

Defined in: [types/proxy.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1914)

Decoded response-body bytes observed by the adapter.

---

### responseChunks?

> `optional` **responseChunks?**: `number`

Defined in: [types/proxy.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1915)

---

### elapsedMs?

> `optional` **elapsedMs?**: `number`

Defined in: [types/proxy.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1916)

---

### terminalOutcome?

> `optional` **terminalOutcome?**: [`ProxyLifecycleTerminalOutcome`](ProxyLifecycleTerminalOutcome.md)

Defined in: [types/proxy.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1917)

---

### errorType?

> `optional` **errorType?**: `string`

Defined in: [types/proxy.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1918)

---

### errorCode?

> `optional` **errorCode?**: `string`

Defined in: [types/proxy.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1919)

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/proxy.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1920)

---

### monotonicMs?

> `optional` **monotonicMs?**: `number`

Defined in: [types/proxy.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1921)

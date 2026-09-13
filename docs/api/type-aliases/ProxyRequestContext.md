[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1832)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1833)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1834)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1835)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1836)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1837](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1837)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1838)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1840)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1841)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1842)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1843](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1843)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1850)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

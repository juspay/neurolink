[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1929)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1930)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1931)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1932)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1933)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1934)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1935)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1937)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1938)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1939)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1940)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1947)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1949)

An internal fallback is an attempt; its parent owns request/token metrics.

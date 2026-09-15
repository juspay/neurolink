[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1936)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1937)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1938)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1939)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1940)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1941)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1942)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1944)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1945)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1946)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1947)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1954)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:1956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1956)

An internal fallback is an attempt; its parent owns request/token metrics.

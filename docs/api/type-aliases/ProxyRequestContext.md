[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1953)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1954)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1955)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:1956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1956)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:1957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1957)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:1958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1958)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:1959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1959)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:1961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1961)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:1962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1962)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:1963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1963)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:1964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1964)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:1971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1971)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:1973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1973)

An internal fallback is an attempt; its parent owns request/token metrics.

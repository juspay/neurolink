[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2105)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2106](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2106)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2107)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2108)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2109)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2110)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2111)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2113)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:2114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2114)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2115)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:2116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2116)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:2123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2123)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2125)

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Defined in: [types/proxy.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2129)

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

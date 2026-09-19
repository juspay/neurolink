[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:2034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2034)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2035)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2036)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2037)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2038)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2039)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2040)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:2042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2042)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:2043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2043)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:2044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2044)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:2045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2045)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:2052](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2052)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:2054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2054)

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Defined in: [types/proxy.ts:2058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2058)

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

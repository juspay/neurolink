[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:2085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2085)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2086)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2087)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2088)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2089)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2090)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2091)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2093)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2094)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2095)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2096)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2103)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2105)

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Defined in: [types/proxy.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2109)

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:2173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2173)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2174)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2175)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2176](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2176)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2177)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2178)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2179)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2181)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:2182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2182)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2183)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2184)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2191)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Defined in: [types/proxy.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2197)

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

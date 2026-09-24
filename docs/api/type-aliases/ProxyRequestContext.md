[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2187)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2188)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2189)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2190)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2191)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2192)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:2195](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2195)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:2196](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2196)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2197)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2198)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2205)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:2207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2207)

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Defined in: [types/proxy.ts:2211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2211)

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

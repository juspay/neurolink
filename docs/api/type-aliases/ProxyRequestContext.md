[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:2197](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2197)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2198](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2198)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2199](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2199)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2200](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2200)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2201](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2201)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2202](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2202)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2203)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2205)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:2206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2206)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:2207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2207)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2208)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:2215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2215)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:2217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2217)

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Defined in: [types/proxy.ts:2221](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2221)

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

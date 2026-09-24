[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Defined in: [types/proxy.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2108)

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

Defined in: [types/proxy.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2109)

---

### method

> **method**: `string`

Defined in: [types/proxy.ts:2110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2110)

---

### path

> **path**: `string`

Defined in: [types/proxy.ts:2111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2111)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2112)

---

### stream

> **stream**: `boolean`

Defined in: [types/proxy.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2113)

---

### toolCount

> **toolCount**: `number`

Defined in: [types/proxy.ts:2114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2114)

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Defined in: [types/proxy.ts:2116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2116)

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/proxy.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2117)

---

### userAgent?

> `optional` **userAgent?**: `string`

Defined in: [types/proxy.ts:2118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2118)

---

### clientApp?

> `optional` **clientApp?**: `string`

Defined in: [types/proxy.ts:2119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2119)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/proxy.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2126)

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Defined in: [types/proxy.ts:2128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2128)

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Defined in: [types/proxy.ts:2132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2132)

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

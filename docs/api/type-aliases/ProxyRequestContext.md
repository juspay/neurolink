[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRequestContext

# Type Alias: ProxyRequestContext

> **ProxyRequestContext** = `object`

Context for a proxy request at the root span level.

## Properties

### requestId

> **requestId**: `string`

---

### method

> **method**: `string`

---

### path

> **path**: `string`

---

### model

> **model**: `string`

---

### stream

> **stream**: `boolean`

---

### toolCount

> **toolCount**: `number`

---

### toolNames?

> `optional` **toolNames?**: `string`[]

Names of the tools advertised in the request (what the caller exposed).

---

### sessionId?

> `optional` **sessionId?**: `string`

---

### userAgent?

> `optional` **userAgent?**: `string`

---

### clientApp?

> `optional` **clientApp?**: `string`

---

### provider?

> `optional` **provider?**: `string`

Provider that will serve the request, used for costing. Defaults to
"anthropic" when omitted, which is correct for the /v1/messages engine;
the OpenAI-compatible engine must pass whatever ModelRouter resolved, or
every non-Anthropic model prices to $0.

---

### recordRequestMetrics?

> `optional` **recordRequestMetrics?**: `boolean`

Whether this span owns client request, latency, and error metrics.

---

### recordUsageMetrics?

> `optional` **recordUsageMetrics?**: `boolean`

Provider usage ownership. Defaults to recordRequestMetrics for backwards
compatibility: internal Codex fallback spans suppress both, while bridge
children explicitly retain usage and their parent owns client outcomes.

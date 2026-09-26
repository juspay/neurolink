[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:2177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2177)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:2178](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2178)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:2179](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2179)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:2180](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2180)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:2181](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2181)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:2182](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2182)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:2183](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2183)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:2184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2184)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:2185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2185)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:2186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2186)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:2187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2187)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:2188](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2188)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:2189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2189)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:2190](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2190)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:2191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2191)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:2192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2192)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:2193](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2193)

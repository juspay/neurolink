[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:2065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2065)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:2066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2066)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:2067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2067)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:2068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2068)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2069)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2070)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2071)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:2072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2072)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:2073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2073)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2074)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:2075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2075)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2076)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:2077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2077)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:2078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2078)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:2079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2079)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:2080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2080)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:2081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2081)

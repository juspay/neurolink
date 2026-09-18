[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1933)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1934)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1935)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1936)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1937)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1938)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1939)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1940)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1941)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1942)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1943)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1944)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1945)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1946)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1947)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1948)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1949)

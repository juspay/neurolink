[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1918)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1919)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1920)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1921)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1922)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1923)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1924)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1925)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1926)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1927)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1928)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1929)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1930)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1931)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1932)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1933)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1934)

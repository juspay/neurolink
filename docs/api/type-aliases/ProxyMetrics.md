[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1812)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1813)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1814)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1815](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1815)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1816)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1817)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1818)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1819)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1820)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1821)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1822)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1823)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1824)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1825)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1826)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1827)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1828)

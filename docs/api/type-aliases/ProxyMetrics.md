[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1722)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1723)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1724)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1725)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1726)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1727)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1728)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1729)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1730)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1731)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1732)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1733)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1734)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1735)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1736)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1737)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1738)

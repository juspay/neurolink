[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1716)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1717)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1718)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1719)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1720)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1721)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1722)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1723)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1724)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1725)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1726)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1727)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1728)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1729)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1730)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1731)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1732)

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1701](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1701)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1702)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1703](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1703)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1704)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1705](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1705)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1706](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1706)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1707](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1707)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1708](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1708)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1709)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1710](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1710)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1711)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1712](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1712)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1713)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1714)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1715)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1716)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1717)

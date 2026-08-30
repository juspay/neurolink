[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1679)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1680)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1681)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1682](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1682)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1683)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1684)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1685)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1686)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1687)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1688)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1689)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1690)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1691)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1692](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1692)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1693)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1694)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1695)

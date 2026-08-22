[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1606](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1606)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1607)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1608](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1608)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1609)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1610](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1610)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1611)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1612)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1613)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1614)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1615)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1616)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1617)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1618)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1619)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1620)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1621)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1622)

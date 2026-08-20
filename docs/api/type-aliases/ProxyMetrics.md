[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

Defined in: [types/proxy.ts:1612](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1612)

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

Defined in: [types/proxy.ts:1613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1613)

---

### requestDuration

> **requestDuration**: `Histogram`

Defined in: [types/proxy.ts:1614](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1614)

---

### tokensInput

> **tokensInput**: `Counter`

Defined in: [types/proxy.ts:1615](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1615)

---

### tokensOutput

> **tokensOutput**: `Counter`

Defined in: [types/proxy.ts:1616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1616)

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

Defined in: [types/proxy.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1617)

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

Defined in: [types/proxy.ts:1618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1618)

---

### tokensReasoning

> **tokensReasoning**: `Counter`

Defined in: [types/proxy.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1619)

---

### costTotal

> **costTotal**: `Counter`

Defined in: [types/proxy.ts:1620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1620)

---

### errorsTotal

> **errorsTotal**: `Counter`

Defined in: [types/proxy.ts:1621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1621)

---

### retriesTotal

> **retriesTotal**: `Counter`

Defined in: [types/proxy.ts:1622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1622)

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

Defined in: [types/proxy.ts:1623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1623)

---

### requestBodySize

> **requestBodySize**: `Histogram`

Defined in: [types/proxy.ts:1624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1624)

---

### responseBodySize

> **responseBodySize**: `Histogram`

Defined in: [types/proxy.ts:1625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1625)

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

Defined in: [types/proxy.ts:1626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1626)

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

Defined in: [types/proxy.ts:1627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1627)

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

Defined in: [types/proxy.ts:1628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1628)

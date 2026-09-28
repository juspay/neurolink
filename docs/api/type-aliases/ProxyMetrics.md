[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyMetrics

# Type Alias: ProxyMetrics

> **ProxyMetrics** = `object`

OTel metric instruments used by the proxy tracer.

## Properties

### requestsTotal

> **requestsTotal**: `Counter`

---

### requestDuration

> **requestDuration**: `Histogram`

---

### tokensInput

> **tokensInput**: `Counter`

---

### tokensOutput

> **tokensOutput**: `Counter`

---

### tokensCacheRead

> **tokensCacheRead**: `Counter`

---

### tokensCacheCreation

> **tokensCacheCreation**: `Counter`

---

### tokensReasoning

> **tokensReasoning**: `Counter`

---

### costTotal

> **costTotal**: `Counter`

---

### errorsTotal

> **errorsTotal**: `Counter`

---

### retriesTotal

> **retriesTotal**: `Counter`

---

### modelSubstitutionTotal

> **modelSubstitutionTotal**: `Counter`

---

### requestBodySize

> **requestBodySize**: `Histogram`

---

### responseBodySize

> **responseBodySize**: `Histogram`

---

### fallbackAttemptsTotal

> **fallbackAttemptsTotal**: `Counter`

---

### fallbackSuccessTotal

> **fallbackSuccessTotal**: `Counter`

---

### fallbackFailureTotal

> **fallbackFailureTotal**: `Counter`

---

### schemaDegradedTotal

> **schemaDegradedTotal**: `Counter`

Codex-outbound: a declared tool's JSON Schema needed flattening or lost
a feature (circular $ref, dropped `strict`, a custom grammar tool wrapped
into a one-string schema) on its way to a Claude tool.

---

### unsupportedFieldTotal

> **unsupportedFieldTotal**: `Counter`

Codex-outbound: an inbound field this repo cannot faithfully represent
in the Claude request was dropped rather than failing the translation.

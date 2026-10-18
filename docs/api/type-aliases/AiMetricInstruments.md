[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AiMetricInstruments

# Type Alias: AiMetricInstruments

> **AiMetricInstruments** = `object`

## Description

The OpenTelemetry instruments behind NeuroLink's `ai_*`, `mcp_*`, `connections_total`, `response_time_ms` and `custom_*` metrics, created on one meter.

## Properties

### meter

> **meter**: `Meter`

---

### requests

> **requests**: `Counter`

---

### duration

> **duration**: `Histogram`

---

### tokens

> **tokens**: `Counter`

---

### cost

> **cost**: `Counter`

---

### providerErrors

> **providerErrors**: `Counter`

---

### mcpToolCalls

> **mcpToolCalls**: `Counter`

---

### connections

> **connections**: `Counter`

---

### responseTime

> **responseTime**: `Histogram`

---

### custom

> **custom**: `Map`\<`string`, `Counter` \| `Histogram`\>

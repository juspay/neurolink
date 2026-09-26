[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryRecord

# Type Alias: TelemetryRecord

> **TelemetryRecord** = `object`

Single request lifecycle record for advanced analytics aggregation.

## Properties

### id

> **id**: `string`

---

### provider

> **provider**: `string`

---

### model

> **model**: `string`

---

### userId?

> `optional` **userId?**: `string`

---

### teamId?

> `optional` **teamId?**: `string`

---

### department?

> `optional` **department?**: `string`

---

### timestamp

> **timestamp**: `number`

---

### latency

> **latency**: `number`

---

### inputTokens

> **inputTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### totalTokens

> **totalTokens**: `number`

---

### cost

> **cost**: `number`

---

### isError

> **isError**: `boolean`

---

### errorMessage?

> `optional` **errorMessage?**: `string`

---

### qualityScore?

> `optional` **qualityScore?**: [`AnalyticsQualityScore`](AnalyticsQualityScore.md)

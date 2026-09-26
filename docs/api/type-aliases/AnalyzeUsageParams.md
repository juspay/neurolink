[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyzeUsageParams

# Type Alias: AnalyzeUsageParams

> **AnalyzeUsageParams** = `object`

Parsed input for the analyze-ai-usage MCP tool.

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

---

### timeRange

> **timeRange**: `"1h"` \| `"24h"` \| `"7d"` \| `"30d"`

---

### provider?

> `optional` **provider?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)

---

### includeTokenBreakdown

> **includeTokenBreakdown**: `boolean`

---

### includeCostEstimation

> **includeCostEstimation**: `boolean`

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyzeUsageParams

# Type Alias: AnalyzeUsageParams

> **AnalyzeUsageParams** = `object`

Defined in: [types/mcp.ts:2671](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2671)

Parsed input for the analyze-ai-usage MCP tool.

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/mcp.ts:2672](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2672)

---

### timeRange

> **timeRange**: `"1h"` \| `"24h"` \| `"7d"` \| `"30d"`

Defined in: [types/mcp.ts:2673](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2673)

---

### provider?

> `optional` **provider?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)

Defined in: [types/mcp.ts:2674](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2674)

---

### includeTokenBreakdown

> **includeTokenBreakdown**: `boolean`

Defined in: [types/mcp.ts:2675](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2675)

---

### includeCostEstimation

> **includeCostEstimation**: `boolean`

Defined in: [types/mcp.ts:2676](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L2676)

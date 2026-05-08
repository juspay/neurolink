[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnalyzeUsageParams

# Type Alias: AnalyzeUsageParams

> **AnalyzeUsageParams** = `object`

Defined in: [types/mcp.ts:2652](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2652)

Parsed input for the analyze-ai-usage MCP tool.

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/mcp.ts:2653](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2653)

---

### timeRange

> **timeRange**: `"1h"` \| `"24h"` \| `"7d"` \| `"30d"`

Defined in: [types/mcp.ts:2654](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2654)

---

### provider?

> `optional` **provider?**: [`AiAnalysisProvider`](AiAnalysisProvider.md)

Defined in: [types/mcp.ts:2655](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2655)

---

### includeTokenBreakdown

> **includeTokenBreakdown**: `boolean`

Defined in: [types/mcp.ts:2656](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2656)

---

### includeCostEstimation

> **includeCostEstimation**: `boolean`

Defined in: [types/mcp.ts:2657](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L2657)

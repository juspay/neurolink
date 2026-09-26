[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowAnalytics

# Type Alias: WorkflowAnalytics

> **WorkflowAnalytics** = [`AnalyticsData`](AnalyticsData.md) & `object`

Workflow-specific analytics

## Type Declaration

### workflowId

> **workflowId**: `string`

### workflowType

> **workflowType**: [`WorkflowType`](WorkflowType.md)

### modelsExecuted

> **modelsExecuted**: `number`

### modelsSuccessful

> **modelsSuccessful**: `number`

### modelsFailed

> **modelsFailed**: `number`

### averageConfidence

> **averageConfidence**: `number`

### consensusLevel?

> `optional` **consensusLevel?**: `number`

### modelResponseTimes

> **modelResponseTimes**: `Record`\<`string`, `number`\>

### fastestModel?

> `optional` **fastestModel?**: `string`

### slowestModel?

> `optional` **slowestModel?**: `string`

### totalCost

> **totalCost**: `number`

### costByModel

> **costByModel**: `Record`\<`string`, `number`\>

### costEfficiency?

> `optional` **costEfficiency?**: `number`

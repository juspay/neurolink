[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowAnalytics

# Type Alias: WorkflowAnalytics

> **WorkflowAnalytics** = [`AnalyticsData`](AnalyticsData.md) & `object`

Defined in: [types/workflow.ts:425](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L425)

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

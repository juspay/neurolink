[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowResult

# Type Alias: WorkflowResult

> **WorkflowResult** = `object`

Complete workflow execution result
Returns both original and conditioned responses for comparison

## Properties

### content

> **content**: `string`

---

### originalContent?

> `optional` **originalContent?**: `string`

---

### score

> **score**: `number`

---

### reasoning

> **reasoning**: `string`

---

### ensembleResponses

> **ensembleResponses**: [`EnsembleResponse`](EnsembleResponse.md)[]

---

### judgeScores?

> `optional` **judgeScores?**: [`JudgeScores`](JudgeScores.md)

---

### selectedResponse?

> `optional` **selectedResponse?**: [`EnsembleResponse`](EnsembleResponse.md)

---

### confidence

> **confidence**: `number`

---

### consensus?

> `optional` **consensus?**: `number`

---

### totalTime

> **totalTime**: `number`

---

### ensembleTime

> **ensembleTime**: `number`

---

### judgeTime?

> `optional` **judgeTime?**: `number`

---

### conditioningTime?

> `optional` **conditioningTime?**: `number`

---

### workflow

> **workflow**: `string`

---

### workflowName

> **workflowName**: `string`

---

### workflowVersion?

> `optional` **workflowVersion?**: `string`

---

### usage?

> `optional` **usage?**: [`AggregatedUsage`](AggregatedUsage.md)

---

### cost?

> `optional` **cost?**: `number`

---

### analytics?

> `optional` **analytics?**: [`WorkflowAnalytics`](WorkflowAnalytics.md)

---

### evaluation?

> `optional` **evaluation?**: [`WorkflowEvaluationData`](WorkflowEvaluationData.md)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### timestamp

> **timestamp**: `string`

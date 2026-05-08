[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowResult

# Type Alias: WorkflowResult

> **WorkflowResult** = `object`

Defined in: [types/workflow.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L258)

Complete workflow execution result
Returns both original and conditioned responses for comparison

## Properties

### content

> **content**: `string`

Defined in: [types/workflow.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L260)

---

### originalContent?

> `optional` **originalContent?**: `string`

Defined in: [types/workflow.ts:263](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L263)

---

### score

> **score**: `number`

Defined in: [types/workflow.ts:266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L266)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/workflow.ts:267](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L267)

---

### ensembleResponses

> **ensembleResponses**: [`EnsembleResponse`](EnsembleResponse.md)[]

Defined in: [types/workflow.ts:270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L270)

---

### judgeScores?

> `optional` **judgeScores?**: [`JudgeScores`](JudgeScores.md)

Defined in: [types/workflow.ts:273](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L273)

---

### selectedResponse?

> `optional` **selectedResponse?**: [`EnsembleResponse`](EnsembleResponse.md)

Defined in: [types/workflow.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L274)

---

### confidence

> **confidence**: `number`

Defined in: [types/workflow.ts:277](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L277)

---

### consensus?

> `optional` **consensus?**: `number`

Defined in: [types/workflow.ts:278](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L278)

---

### totalTime

> **totalTime**: `number`

Defined in: [types/workflow.ts:281](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L281)

---

### ensembleTime

> **ensembleTime**: `number`

Defined in: [types/workflow.ts:282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L282)

---

### judgeTime?

> `optional` **judgeTime?**: `number`

Defined in: [types/workflow.ts:283](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L283)

---

### conditioningTime?

> `optional` **conditioningTime?**: `number`

Defined in: [types/workflow.ts:284](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L284)

---

### workflow

> **workflow**: `string`

Defined in: [types/workflow.ts:287](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L287)

---

### workflowName

> **workflowName**: `string`

Defined in: [types/workflow.ts:288](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L288)

---

### workflowVersion?

> `optional` **workflowVersion?**: `string`

Defined in: [types/workflow.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L289)

---

### usage?

> `optional` **usage?**: [`AggregatedUsage`](AggregatedUsage.md)

Defined in: [types/workflow.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L292)

---

### cost?

> `optional` **cost?**: `number`

Defined in: [types/workflow.ts:293](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L293)

---

### analytics?

> `optional` **analytics?**: [`WorkflowAnalytics`](WorkflowAnalytics.md)

Defined in: [types/workflow.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L296)

---

### evaluation?

> `optional` **evaluation?**: [`WorkflowEvaluationData`](WorkflowEvaluationData.md)

Defined in: [types/workflow.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L297)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:300](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L300)

---

### timestamp

> **timestamp**: `string`

Defined in: [types/workflow.ts:301](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L301)

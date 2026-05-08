[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowConfig

# Type Alias: WorkflowConfig

> **WorkflowConfig** = `object`

Defined in: [types/workflow.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L66)

Workflow configuration

## Properties

### id

> **id**: `string`

Defined in: [types/workflow.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L68)

---

### name

> **name**: `string`

Defined in: [types/workflow.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L69)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/workflow.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L70)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/workflow.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L71)

---

### type

> **type**: [`WorkflowType`](WorkflowType.md)

Defined in: [types/workflow.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L74)

---

### models

> **models**: [`WorkflowModelConfig`](WorkflowModelConfig.md)[]

Defined in: [types/workflow.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L75)

---

### modelGroups?

> `optional` **modelGroups?**: [`ModelGroup`](ModelGroup.md)[]

Defined in: [types/workflow.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L76)

---

### defaultSystemPrompt?

> `optional` **defaultSystemPrompt?**: `string`

Defined in: [types/workflow.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L79)

---

### defaultJudgePrompt?

> `optional` **defaultJudgePrompt?**: `string`

Defined in: [types/workflow.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L80)

---

### judge?

> `optional` **judge?**: [`JudgeConfig`](JudgeConfig.md)

Defined in: [types/workflow.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L83)

---

### judges?

> `optional` **judges?**: [`JudgeConfig`](JudgeConfig.md)[]

Defined in: [types/workflow.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L84)

---

### conditioning?

> `optional` **conditioning?**: [`ConditioningConfig`](ConditioningConfig.md)

Defined in: [types/workflow.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L85)

---

### execution?

> `optional` **execution?**: [`ExecutionConfig`](ExecutionConfig.md)

Defined in: [types/workflow.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L86)

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/workflow.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L89)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L90)

---

### createdAt?

> `optional` **createdAt?**: `string`

Defined in: [types/workflow.ts:91](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L91)

---

### updatedAt?

> `optional` **updatedAt?**: `string`

Defined in: [types/workflow.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L92)

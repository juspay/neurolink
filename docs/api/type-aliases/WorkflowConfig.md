[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowConfig

# Type Alias: WorkflowConfig

> **WorkflowConfig** = `object`

Workflow configuration

## Properties

### id

> **id**: `string`

---

### name

> **name**: `string`

---

### description?

> `optional` **description?**: `string`

---

### version?

> `optional` **version?**: `string`

---

### type

> **type**: [`WorkflowType`](WorkflowType.md)

---

### models

> **models**: [`WorkflowModelConfig`](WorkflowModelConfig.md)[]

---

### modelGroups?

> `optional` **modelGroups?**: [`ModelGroup`](ModelGroup.md)[]

---

### defaultSystemPrompt?

> `optional` **defaultSystemPrompt?**: `string`

---

### defaultJudgePrompt?

> `optional` **defaultJudgePrompt?**: `string`

---

### judge?

> `optional` **judge?**: [`JudgeConfig`](JudgeConfig.md)

---

### judges?

> `optional` **judges?**: [`JudgeConfig`](JudgeConfig.md)[]

---

### conditioning?

> `optional` **conditioning?**: [`ConditioningConfig`](ConditioningConfig.md)

---

### execution?

> `optional` **execution?**: [`ExecutionConfig`](ExecutionConfig.md)

---

### tags?

> `optional` **tags?**: `string`[]

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### createdAt?

> `optional` **createdAt?**: `string`

---

### updatedAt?

> `optional` **updatedAt?**: `string`

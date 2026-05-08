[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelGroup

# Type Alias: ModelGroup

> **ModelGroup** = `object`

Defined in: [types/workflow.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L41)

Model group for layer-based execution
Enables sequential vs parallel control at group level

## Properties

### id

> **id**: `string`

Defined in: [types/workflow.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L43)

---

### name?

> `optional` **name?**: `string`

Defined in: [types/workflow.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L44)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/workflow.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L45)

---

### models

> **models**: [`WorkflowModelConfig`](WorkflowModelConfig.md)[]

Defined in: [types/workflow.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L48)

---

### executionStrategy

> **executionStrategy**: [`ExecutionStrategy`](ExecutionStrategy.md)

Defined in: [types/workflow.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L51)

---

### continueOnFailure?

> `optional` **continueOnFailure?**: `boolean`

Defined in: [types/workflow.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L52)

---

### minSuccessful?

> `optional` **minSuccessful?**: `number`

Defined in: [types/workflow.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L53)

---

### parallelism?

> `optional` **parallelism?**: `number`

Defined in: [types/workflow.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L56)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/workflow.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L57)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L60)

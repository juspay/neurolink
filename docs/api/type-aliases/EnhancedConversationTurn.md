[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedConversationTurn

# Type Alias: EnhancedConversationTurn

> **EnhancedConversationTurn** = `object`

Defined in: [types/evaluation.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L186)

Represents a single turn in an enhanced conversation history,
including tool executions and evaluations for richer context.

## Properties

### role

> **role**: `"user"` \| `"assistant"`

Defined in: [types/evaluation.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L188)

The role of the speaker, either 'user' or 'assistant'.

---

### content

> **content**: `string`

Defined in: [types/evaluation.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L190)

The content of the message.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/evaluation.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L192)

The timestamp of the message.

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecution`](ToolExecution.md)[]

Defined in: [types/evaluation.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L194)

Any tools that were executed as part of this turn.

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationResult`](EvaluationResult.md)

Defined in: [types/evaluation.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L196)

The evaluation result for this turn, if applicable.

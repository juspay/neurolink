[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedConversationTurn

# Type Alias: EnhancedConversationTurn

> **EnhancedConversationTurn** = `object`

Defined in: [types/evaluation.ts:181](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L181)

Represents a single turn in an enhanced conversation history,
including tool executions and evaluations for richer context.

## Properties

### role

> **role**: `"user"` \| `"assistant"`

Defined in: [types/evaluation.ts:183](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L183)

The role of the speaker, either 'user' or 'assistant'.

---

### content

> **content**: `string`

Defined in: [types/evaluation.ts:185](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L185)

The content of the message.

---

### timestamp

> **timestamp**: `string`

Defined in: [types/evaluation.ts:187](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L187)

The timestamp of the message.

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecution`](ToolExecution.md)[]

Defined in: [types/evaluation.ts:189](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L189)

Any tools that were executed as part of this turn.

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationResult`](EvaluationResult.md)

Defined in: [types/evaluation.ts:191](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/evaluation.ts#L191)

The evaluation result for this turn, if applicable.

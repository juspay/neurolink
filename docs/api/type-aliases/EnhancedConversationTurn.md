[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / EnhancedConversationTurn

# Type Alias: EnhancedConversationTurn

> **EnhancedConversationTurn** = `object`

Represents a single turn in an enhanced conversation history,
including tool executions and evaluations for richer context.

## Properties

### role

> **role**: `"user"` \| `"assistant"`

The role of the speaker, either 'user' or 'assistant'.

---

### content

> **content**: `string`

The content of the message.

---

### timestamp

> **timestamp**: `string`

The timestamp of the message.

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecution`](ToolExecution.md)[]

Any tools that were executed as part of this turn.

---

### evaluation?

> `optional` **evaluation?**: [`EvaluationResult`](EvaluationResult.md)

The evaluation result for this turn, if applicable.

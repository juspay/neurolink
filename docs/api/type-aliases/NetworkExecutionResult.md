[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionResult

# Type Alias: NetworkExecutionResult

> **NetworkExecutionResult** = `object`

Result of network execution

## Properties

### content

> **content**: `string`

Final output content

---

### object?

> `optional` **object?**: `unknown`

Structured output if schema was provided

---

### trace

> **trace**: [`NetworkExecutionTrace`](NetworkExecutionTrace.md)

Execution trace

---

### usage

> **usage**: [`NetworkTokenUsage`](NetworkTokenUsage.md)

Token usage across all agents

---

### status

> **status**: [`NetworkExecutionStatus`](NetworkExecutionStatus.md)

Execution status

---

### duration

> **duration**: `number`

Time taken in milliseconds

---

### error?

> `optional` **error?**: `string`

Error message if status is error

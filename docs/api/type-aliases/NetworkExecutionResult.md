[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionResult

# Type Alias: NetworkExecutionResult

> **NetworkExecutionResult** = `object`

Defined in: [types/agentNetwork.ts:436](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L436)

Result of network execution

## Properties

### content

> **content**: `string`

Defined in: [types/agentNetwork.ts:438](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L438)

Final output content

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/agentNetwork.ts:441](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L441)

Structured output if schema was provided

---

### trace

> **trace**: [`NetworkExecutionTrace`](NetworkExecutionTrace.md)

Defined in: [types/agentNetwork.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L444)

Execution trace

---

### usage

> **usage**: [`NetworkTokenUsage`](NetworkTokenUsage.md)

Defined in: [types/agentNetwork.ts:447](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L447)

Token usage across all agents

---

### status

> **status**: [`NetworkExecutionStatus`](NetworkExecutionStatus.md)

Defined in: [types/agentNetwork.ts:450](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L450)

Execution status

---

### duration

> **duration**: `number`

Defined in: [types/agentNetwork.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L453)

Time taken in milliseconds

---

### error?

> `optional` **error?**: `string`

Defined in: [types/agentNetwork.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L456)

Error message if status is error

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrimitiveExecutionResult

# Type Alias: PrimitiveExecutionResult

> **PrimitiveExecutionResult** = `object`

Defined in: [types/agentNetwork.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L587)

Result from executing a primitive

## Properties

### output

> **output**: `unknown`

Defined in: [types/agentNetwork.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L589)

Output from the primitive

---

### error?

> `optional` **error?**: `string`

Defined in: [types/agentNetwork.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L592)

Error message if execution failed

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/agentNetwork.ts:595](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L595)

Token usage

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/agentNetwork.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L598)

Execution duration in ms

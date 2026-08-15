[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PrimitiveExecutionResult

# Type Alias: PrimitiveExecutionResult

> **PrimitiveExecutionResult** = `object`

Defined in: [types/agentNetwork.ts:587](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L587)

Result from executing a primitive

## Properties

### output

> **output**: `unknown`

Defined in: [types/agentNetwork.ts:589](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L589)

Output from the primitive

---

### error?

> `optional` **error?**: `string`

Defined in: [types/agentNetwork.ts:592](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L592)

Error message if execution failed

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/agentNetwork.ts:595](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L595)

Token usage

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/agentNetwork.ts:598](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L598)

Execution duration in ms

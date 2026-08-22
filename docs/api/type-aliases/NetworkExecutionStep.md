[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionStep

# Type Alias: NetworkExecutionStep

> **NetworkExecutionStep** = `object`

Defined in: [types/agentNetwork.ts:482](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L482)

Single execution step in the trace

## Properties

### index

> **index**: `number`

Defined in: [types/agentNetwork.ts:484](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L484)

Step index

---

### primitive

> **primitive**: `object`

Defined in: [types/agentNetwork.ts:487](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L487)

Primitive that was executed

#### type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

#### id

> **id**: `string`

#### name

> **name**: `string`

---

### input

> **input**: `unknown`

Defined in: [types/agentNetwork.ts:494](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L494)

Input to the primitive

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/agentNetwork.ts:497](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L497)

Output from the primitive

---

### error?

> `optional` **error?**: `string`

Defined in: [types/agentNetwork.ts:500](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L500)

Error if step failed

---

### duration

> **duration**: `number`

Defined in: [types/agentNetwork.ts:503](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L503)

Duration in milliseconds

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/agentNetwork.ts:506](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L506)

Token usage for this step

---

### timestamp

> **timestamp**: `number`

Defined in: [types/agentNetwork.ts:509](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L509)

Timestamp

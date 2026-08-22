[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskAnalysis

# Type Alias: TaskAnalysis

> **TaskAnalysis** = `object`

Defined in: [types/agentNetwork.ts:850](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L850)

Result of task analysis

## Properties

### intent

> **intent**: `string`

Defined in: [types/agentNetwork.ts:852](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L852)

Identified intent of the task

---

### entities

> **entities**: [`Entity`](Entity.md)[]

Defined in: [types/agentNetwork.ts:855](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L855)

Entities extracted from the task

---

### requirements

> **requirements**: [`Requirement`](Requirement.md)[]

Defined in: [types/agentNetwork.ts:858](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L858)

Requirements for completing the task

---

### complexity

> **complexity**: `"simple"` \| `"moderate"` \| `"complex"`

Defined in: [types/agentNetwork.ts:861](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L861)

Task complexity assessment

---

### suggestedPrimitives

> **suggestedPrimitives**: `string`[]

Defined in: [types/agentNetwork.ts:864](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L864)

Suggested primitives for handling

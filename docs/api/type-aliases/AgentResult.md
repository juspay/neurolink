[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentResult

# Type Alias: AgentResult

> **AgentResult** = `object`

Defined in: [types/agentNetwork.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L72)

Result of agent execution

## Properties

### content

> **content**: `string`

Defined in: [types/agentNetwork.ts:74](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L74)

Generated content

---

### object?

> `optional` **object?**: `unknown`

Defined in: [types/agentNetwork.ts:77](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L77)

Structured output if schema was provided

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Defined in: [types/agentNetwork.ts:80](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L80)

Token usage for this execution

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Defined in: [types/agentNetwork.ts:83](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L83)

Tools used during execution

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecutionRecord`](ToolExecutionRecord.md)[]

Defined in: [types/agentNetwork.ts:89](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L89)

Real per-call tool execution records from the underlying generate()
turn (params, bounded result text, error flag, timing per call).

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Defined in: [types/agentNetwork.ts:95](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L95)

Why the agentic turn ended (`completed`, `step-cap`, `time-limit`,
`stalled`, `aborted`, …) — see [GenerateStopReason](GenerateStopReason.md).

---

### duration

> **duration**: `number`

Defined in: [types/agentNetwork.ts:98](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L98)

Execution duration in milliseconds

---

### status

> **status**: `"success"` \| `"error"`

Defined in: [types/agentNetwork.ts:101](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L101)

Execution status

---

### error?

> `optional` **error?**: `string`

Defined in: [types/agentNetwork.ts:104](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L104)

Error message if status is error

---

### agentId

> **agentId**: `string`

Defined in: [types/agentNetwork.ts:107](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L107)

Agent ID that produced this result

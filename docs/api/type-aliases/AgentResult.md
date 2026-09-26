[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentResult

# Type Alias: AgentResult

> **AgentResult** = `object`

Result of agent execution

## Properties

### content

> **content**: `string`

Generated content

---

### object?

> `optional` **object?**: `unknown`

Structured output if schema was provided

---

### usage?

> `optional` **usage?**: [`TokenUsage`](TokenUsage.md)

Token usage for this execution

---

### toolsUsed?

> `optional` **toolsUsed?**: `string`[]

Tools used during execution

---

### toolExecutions?

> `optional` **toolExecutions?**: [`ToolExecutionRecord`](ToolExecutionRecord.md)[]

Real per-call tool execution records from the underlying generate()
turn (params, bounded result text, error flag, timing per call).

---

### stopReason?

> `optional` **stopReason?**: [`GenerateStopReason`](GenerateStopReason.md)

Why the agentic turn ended (`completed`, `step-cap`, `time-limit`,
`stalled`, `aborted`, …) — see [GenerateStopReason](GenerateStopReason.md).

---

### duration

> **duration**: `number`

Execution duration in milliseconds

---

### status

> **status**: `"success"` \| `"error"`

Execution status

---

### error?

> `optional` **error?**: `string`

Error message if status is error

---

### agentId

> **agentId**: `string`

Agent ID that produced this result

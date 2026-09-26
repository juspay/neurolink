[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunEvent

# Type Alias: AgentRunEvent

> **AgentRunEvent** = `object`

Lifecycle event for `AgentRunOptions.onEvent`. Fire-and-forget — listener
errors never break the run.

Note: `tool_call` and `tool_result` both fire AFTER the execution
completes (they are driven by the capture record) — a long-running tool
emits nothing until it returns. Treat them as accounting events, not
live started/finished signals.

## Properties

### type

> **type**: [`AgentRunEventType`](AgentRunEventType.md)

---

### runId

> **runId**: `string`

Run id (also the default tool-context sessionId).

---

### agentId

> **agentId**: `string`

Agent definition id.

---

### timestamp

> **timestamp**: `number`

Epoch milliseconds.

---

### phase?

> `optional` **phase?**: `"research"` \| `"extraction"`

Current phase, on `phase` events.

---

### toolName?

> `optional` **toolName?**: `string`

Tool name, on tool_call/tool_result events.

---

### params?

> `optional` **params?**: `unknown`

Tool params, on tool_call events.

---

### resultSummary?

> `optional` **resultSummary?**: `string`

Bounded result summary, on tool_result events.

---

### isError?

> `optional` **isError?**: `boolean`

Whether the tool result was an error, on tool_result events.

---

### legIndex?

> `optional` **legIndex?**: `number`

Leg index, on leg_end events (leashed mode).

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Tripped waste signatures, on waste events.

---

### error?

> `optional` **error?**: `string`

Error message, on error events.

---

### status?

> `optional` **status?**: [`AgentRunStatus`](AgentRunStatus.md)

Final status, on complete events.

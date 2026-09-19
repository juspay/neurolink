[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunEvent

# Type Alias: AgentRunEvent

> **AgentRunEvent** = `object`

Defined in: [types/isolatedAgent.ts:216](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L216)

Lifecycle event for `AgentRunOptions.onEvent`. Fire-and-forget — listener
errors never break the run.

Note: `tool_call` and `tool_result` both fire AFTER the execution
completes (they are driven by the capture record) — a long-running tool
emits nothing until it returns. Treat them as accounting events, not
live started/finished signals.

## Properties

### type

> **type**: [`AgentRunEventType`](AgentRunEventType.md)

Defined in: [types/isolatedAgent.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L217)

---

### runId

> **runId**: `string`

Defined in: [types/isolatedAgent.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L219)

Run id (also the default tool-context sessionId).

---

### agentId

> **agentId**: `string`

Defined in: [types/isolatedAgent.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L221)

Agent definition id.

---

### timestamp

> **timestamp**: `number`

Defined in: [types/isolatedAgent.ts:223](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L223)

Epoch milliseconds.

---

### phase?

> `optional` **phase?**: `"research"` \| `"extraction"`

Defined in: [types/isolatedAgent.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L225)

Current phase, on `phase` events.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/isolatedAgent.ts:227](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L227)

Tool name, on tool_call/tool_result events.

---

### params?

> `optional` **params?**: `unknown`

Defined in: [types/isolatedAgent.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L229)

Tool params, on tool_call events.

---

### resultSummary?

> `optional` **resultSummary?**: `string`

Defined in: [types/isolatedAgent.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L231)

Bounded result summary, on tool_result events.

---

### isError?

> `optional` **isError?**: `boolean`

Defined in: [types/isolatedAgent.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L233)

Whether the tool result was an error, on tool_result events.

---

### legIndex?

> `optional` **legIndex?**: `number`

Defined in: [types/isolatedAgent.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L235)

Leg index, on leg_end events (leashed mode).

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Defined in: [types/isolatedAgent.ts:237](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L237)

Tripped waste signatures, on waste events.

---

### error?

> `optional` **error?**: `string`

Defined in: [types/isolatedAgent.ts:239](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L239)

Error message, on error events.

---

### status?

> `optional` **status?**: [`AgentRunStatus`](AgentRunStatus.md)

Defined in: [types/isolatedAgent.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/isolatedAgent.ts#L241)

Final status, on complete events.

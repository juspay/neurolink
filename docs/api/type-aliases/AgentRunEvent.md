[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRunEvent

# Type Alias: AgentRunEvent

> **AgentRunEvent** = `object`

Defined in: [types/isolatedAgent.ts:207](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L207)

Lifecycle event for `AgentRunOptions.onEvent`. Fire-and-forget — listener
errors never break the run.

Note: `tool_call` and `tool_result` both fire AFTER the execution
completes (they are driven by the capture record) — a long-running tool
emits nothing until it returns. Treat them as accounting events, not
live started/finished signals.

## Properties

### type

> **type**: [`AgentRunEventType`](AgentRunEventType.md)

Defined in: [types/isolatedAgent.ts:208](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L208)

---

### runId

> **runId**: `string`

Defined in: [types/isolatedAgent.ts:210](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L210)

Run id (also the default tool-context sessionId).

---

### agentId

> **agentId**: `string`

Defined in: [types/isolatedAgent.ts:212](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L212)

Agent definition id.

---

### timestamp

> **timestamp**: `number`

Defined in: [types/isolatedAgent.ts:214](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L214)

Epoch milliseconds.

---

### phase?

> `optional` **phase?**: `"research"` \| `"extraction"`

Defined in: [types/isolatedAgent.ts:216](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L216)

Current phase, on `phase` events.

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/isolatedAgent.ts:218](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L218)

Tool name, on tool_call/tool_result events.

---

### params?

> `optional` **params?**: `unknown`

Defined in: [types/isolatedAgent.ts:220](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L220)

Tool params, on tool_call events.

---

### resultSummary?

> `optional` **resultSummary?**: `string`

Defined in: [types/isolatedAgent.ts:222](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L222)

Bounded result summary, on tool_result events.

---

### isError?

> `optional` **isError?**: `boolean`

Defined in: [types/isolatedAgent.ts:224](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L224)

Whether the tool result was an error, on tool_result events.

---

### legIndex?

> `optional` **legIndex?**: `number`

Defined in: [types/isolatedAgent.ts:226](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L226)

Leg index, on leg_end events (leashed mode).

---

### wasteSignals?

> `optional` **wasteSignals?**: `string`[]

Defined in: [types/isolatedAgent.ts:228](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L228)

Tripped waste signatures, on waste events.

---

### error?

> `optional` **error?**: `string`

Defined in: [types/isolatedAgent.ts:230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L230)

Error message, on error events.

---

### status?

> `optional` **status?**: [`AgentRunStatus`](AgentRunStatus.md)

Defined in: [types/isolatedAgent.ts:232](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/isolatedAgent.ts#L232)

Final status, on complete events.

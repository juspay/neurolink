[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecutionOptions

# Type Alias: AgentExecutionOptions

> **AgentExecutionOptions** = `object`

Defined in: [types/agentNetwork.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L113)

Options for agent execution

## Properties

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L115)

Additional context for the agent

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Defined in: [types/agentNetwork.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L118)

Override max steps for this execution

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/agentNetwork.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L121)

Trace ID for observability

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Defined in: [types/agentNetwork.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L124)

Parent span ID for nested tracing

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/agentNetwork.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L127)

Per-model-call timeout in milliseconds (see GenerateOptions.timeout)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/agentNetwork.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L133)

Abort signal threaded into every generate() the agent makes. An aborted
parent stops the agent — no ghost runs.

---

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Defined in: [types/agentNetwork.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L136)

Wall-clock cap for the whole agentic turn (ms). See GenerateOptions.turnTimeoutMs.

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Defined in: [types/agentNetwork.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L139)

Remaining-time threshold for the wrap-up nudge (ms). See GenerateOptions.wrapupTimeLeadMs.

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Defined in: [types/agentNetwork.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L142)

Max time with no progress before the turn ends as "stalled" (ms). See GenerateOptions.stallTimeoutMs.

---

### credentials?

> `optional` **credentials?**: `Record`\<`string`, `unknown`\>

Defined in: [types/agentNetwork.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L145)

Per-execution credentials override

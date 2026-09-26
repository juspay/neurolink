[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecutionOptions

# Type Alias: AgentExecutionOptions

> **AgentExecutionOptions** = `object`

Options for agent execution

## Properties

### context?

> `optional` **context?**: `Record`\<`string`, `unknown`\>

Additional context for the agent

---

### maxSteps?

> `optional` **maxSteps?**: `number`

Override max steps for this execution

---

### traceId?

> `optional` **traceId?**: `string`

Trace ID for observability

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Parent span ID for nested tracing

---

### timeout?

> `optional` **timeout?**: `number`

Per-model-call timeout in milliseconds (see GenerateOptions.timeout)

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Abort signal threaded into every generate() the agent makes. An aborted
parent stops the agent — no ghost runs.

---

### turnTimeoutMs?

> `optional` **turnTimeoutMs?**: `number`

Wall-clock cap for the whole agentic turn (ms). See GenerateOptions.turnTimeoutMs.

---

### wrapupTimeLeadMs?

> `optional` **wrapupTimeLeadMs?**: `number`

Remaining-time threshold for the wrap-up nudge (ms). See GenerateOptions.wrapupTimeLeadMs.

---

### stallTimeoutMs?

> `optional` **stallTimeoutMs?**: `number`

Max time with no progress before the turn ends as "stalled" (ms). See GenerateOptions.stallTimeoutMs.

---

### credentials?

> `optional` **credentials?**: `Record`\<`string`, `unknown`\>

Per-execution credentials override

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecutionContext

# Type Alias: AgentExecutionContext

> **AgentExecutionContext** = `object`

Defined in: [types/agentNetwork.ts:360](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L360)

Execution context passed to primitives

## Indexable

> \[`key`: `string`\]: `unknown`

Additional context data

## Properties

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/agentNetwork.ts:362](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L362)

Session ID for memory

---

### traceId?

> `optional` **traceId?**: `string`

Defined in: [types/agentNetwork.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L365)

Trace ID for observability

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Defined in: [types/agentNetwork.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L368)

Parent span ID

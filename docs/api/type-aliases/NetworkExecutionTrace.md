[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionTrace

# Type Alias: NetworkExecutionTrace

> **NetworkExecutionTrace** = `object`

Execution trace for debugging and monitoring

## Properties

### traceId

> **traceId**: `string`

Unique trace ID

---

### steps

> **steps**: [`NetworkExecutionStep`](NetworkExecutionStep.md)[]

Steps taken during execution

---

### routingDecisions

> **routingDecisions**: [`AgentRoutingDecision`](AgentRoutingDecision.md)[]

Routing decisions made

---

### startTime

> **startTime**: `number`

Start timestamp

---

### endTime?

> `optional` **endTime?**: `number`

End timestamp

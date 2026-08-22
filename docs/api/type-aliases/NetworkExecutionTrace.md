[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkExecutionTrace

# Type Alias: NetworkExecutionTrace

> **NetworkExecutionTrace** = `object`

Defined in: [types/agentNetwork.ts:462](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L462)

Execution trace for debugging and monitoring

## Properties

### traceId

> **traceId**: `string`

Defined in: [types/agentNetwork.ts:464](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L464)

Unique trace ID

---

### steps

> **steps**: [`NetworkExecutionStep`](NetworkExecutionStep.md)[]

Defined in: [types/agentNetwork.ts:467](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L467)

Steps taken during execution

---

### routingDecisions

> **routingDecisions**: [`AgentRoutingDecision`](AgentRoutingDecision.md)[]

Defined in: [types/agentNetwork.ts:470](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L470)

Routing decisions made

---

### startTime

> **startTime**: `number`

Defined in: [types/agentNetwork.ts:473](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L473)

Start timestamp

---

### endTime?

> `optional` **endTime?**: `number`

Defined in: [types/agentNetwork.ts:476](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L476)

End timestamp

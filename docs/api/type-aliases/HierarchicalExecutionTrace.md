[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HierarchicalExecutionTrace

# Type Alias: HierarchicalExecutionTrace

> **HierarchicalExecutionTrace** = [`NetworkExecutionTrace`](NetworkExecutionTrace.md) & `object`

Defined in: [types/agentNetwork.ts:960](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L960)

Hierarchical execution trace

## Type Declaration

### parentTraceId?

> `optional` **parentTraceId?**: `string`

Parent trace ID if this is a child network

### childTraces?

> `optional` **childTraces?**: `HierarchicalExecutionTrace`[]

Child traces

### hierarchyLevel

> **hierarchyLevel**: `number`

Hierarchy level (0 = root)

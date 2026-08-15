[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HierarchicalExecutionTrace

# Type Alias: HierarchicalExecutionTrace

> **HierarchicalExecutionTrace** = [`NetworkExecutionTrace`](NetworkExecutionTrace.md) & `object`

Defined in: [types/agentNetwork.ts:960](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L960)

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

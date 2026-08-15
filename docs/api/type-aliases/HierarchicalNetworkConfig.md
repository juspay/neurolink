[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HierarchicalNetworkConfig

# Type Alias: HierarchicalNetworkConfig

> **HierarchicalNetworkConfig** = [`AgentNetworkConfig`](AgentNetworkConfig.md) & `object`

Defined in: [types/agentNetwork.ts:923](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L923)

Configuration for hierarchical networks

## Type Declaration

### maxDepth?

> `optional` **maxDepth?**: `number`

Maximum nesting depth

### delegationRules?

> `optional` **delegationRules?**: [`DelegationRule`](DelegationRule.md)[]

Delegation rules for child networks

### supervisionMode?

> `optional` **supervisionMode?**: `"autonomous"` \| `"supervised"` \| `"collaborative"`

Supervision mode

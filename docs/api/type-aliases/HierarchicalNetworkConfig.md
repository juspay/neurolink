[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HierarchicalNetworkConfig

# Type Alias: HierarchicalNetworkConfig

> **HierarchicalNetworkConfig** = [`AgentNetworkConfig`](AgentNetworkConfig.md) & `object`

Defined in: [types/agentNetwork.ts:923](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L923)

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

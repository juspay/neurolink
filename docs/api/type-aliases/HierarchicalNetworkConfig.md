[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HierarchicalNetworkConfig

# Type Alias: HierarchicalNetworkConfig

> **HierarchicalNetworkConfig** = [`AgentNetworkConfig`](AgentNetworkConfig.md) & `object`

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

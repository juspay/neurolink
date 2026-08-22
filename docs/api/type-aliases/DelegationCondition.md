[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegationCondition

# Type Alias: DelegationCondition

> **DelegationCondition** = \{ `type`: `"keyword"`; `keywords`: `string`[]; \} \| \{ `type`: `"complexity"`; `threshold`: `"simple"` \| `"moderate"` \| `"complex"`; \} \| \{ `type`: `"toolRequired"`; `tools`: `string`[]; \} \| \{ `type`: `"custom"`; `evaluator`: (`task`) => `boolean`; \}

Defined in: [types/agentNetwork.ts:951](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/agentNetwork.ts#L951)

Delegation condition types

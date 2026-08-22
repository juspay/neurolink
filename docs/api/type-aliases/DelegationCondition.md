[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegationCondition

# Type Alias: DelegationCondition

> **DelegationCondition** = \{ `type`: `"keyword"`; `keywords`: `string`[]; \} \| \{ `type`: `"complexity"`; `threshold`: `"simple"` \| `"moderate"` \| `"complex"`; \} \| \{ `type`: `"toolRequired"`; `tools`: `string`[]; \} \| \{ `type`: `"custom"`; `evaluator`: (`task`) => `boolean`; \}

Defined in: [types/agentNetwork.ts:951](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L951)

Delegation condition types

[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegationCondition

# Type Alias: DelegationCondition

> **DelegationCondition** = \{ `type`: `"keyword"`; `keywords`: `string`[]; \} \| \{ `type`: `"complexity"`; `threshold`: `"simple"` \| `"moderate"` \| `"complex"`; \} \| \{ `type`: `"toolRequired"`; `tools`: `string`[]; \} \| \{ `type`: `"custom"`; `evaluator`: (`task`) => `boolean`; \}

Defined in: [types/agentNetwork.ts:951](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L951)

Delegation condition types

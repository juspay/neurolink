[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegationCondition

# Type Alias: DelegationCondition

> **DelegationCondition** = \{ `type`: `"keyword"`; `keywords`: `string`[]; \} \| \{ `type`: `"complexity"`; `threshold`: `"simple"` \| `"moderate"` \| `"complex"`; \} \| \{ `type`: `"toolRequired"`; `tools`: `string`[]; \} \| \{ `type`: `"custom"`; `evaluator`: (`task`) => `boolean`; \}

Delegation condition types

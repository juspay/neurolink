[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / resolveDecisionLimitsReading

# Function: resolveDecisionLimitsReading()

> **resolveDecisionLimitsReading**(`descriptor`, `model`): [`DecisionLimitsReading`](../type-aliases/DecisionLimitsReading.md) \| `null`

Flatten a descriptor's `decisionLimits` for one model: the per-model entry
overrides the base, field by field, and `advisory` becomes
`enforcedLocally: false`. Returns null for a descriptor that declares no
limits.

## Parameters

### descriptor

`Pick`\<[`ProviderDescriptor`](../type-aliases/ProviderDescriptor.md), `"name"` \| `"decisionLimits"`\>

### model

`string`

## Returns

[`DecisionLimitsReading`](../type-aliases/DecisionLimitsReading.md) \| `null`

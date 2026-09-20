[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionScoreQuestion

# Type Alias: DecisionScoreQuestion

> **DecisionScoreQuestion** = `object`

Defined in: [types/decision.ts:69](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L69)

Rate against an ordered rubric. The answer is the **0-based index**, so a
four-level rubric scores 0–3. At least two levels are required.

## Properties

### type

> **type**: `"score"`

Defined in: [types/decision.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L70)

---

### instructions

> **instructions**: [`DecisionInput`](DecisionInput.md)

Defined in: [types/decision.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L71)

---

### criteria

> **criteria**: readonly ([`DecisionInput`](DecisionInput.md) \| `null`)[]

Defined in: [types/decision.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L72)

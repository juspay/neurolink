[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionScoreQuestion

# Type Alias: DecisionScoreQuestion

> **DecisionScoreQuestion** = `object`

Rate against an ordered rubric. The answer is the **0-based index**, so a
four-level rubric scores 0–3. At least two levels are required.

## Properties

### type

> **type**: `"score"`

---

### instructions

> **instructions**: [`DecisionInput`](DecisionInput.md)

---

### criteria

> **criteria**: readonly ([`DecisionInput`](DecisionInput.md) \| `null`)[]

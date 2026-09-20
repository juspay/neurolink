[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionBooleanQuestion

# Type Alias: DecisionBooleanQuestion

> **DecisionBooleanQuestion** = `object`

Defined in: [types/decision.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L43)

A yes/no question. Answered with a probability and **no confidence of its
own** — gate it on distance from 0.5 via [decisionBooleanConfidence](../functions/decisionBooleanConfidence.md).

## Properties

### type

> **type**: `"boolean"`

Defined in: [types/decision.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L44)

---

### instructions

> **instructions**: [`DecisionInput`](DecisionInput.md)

Defined in: [types/decision.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L45)

---

### criteria?

> `optional` **criteria?**: `object`

Defined in: [types/decision.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L47)

Optional descriptions of what a yes and a no mean.

#### true?

> `optional` **true?**: [`DecisionInput`](DecisionInput.md) \| `null`

#### false?

> `optional` **false?**: [`DecisionInput`](DecisionInput.md) \| `null`

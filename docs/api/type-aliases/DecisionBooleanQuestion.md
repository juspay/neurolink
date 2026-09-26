[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionBooleanQuestion

# Type Alias: DecisionBooleanQuestion

> **DecisionBooleanQuestion** = `object`

A yes/no question. Answered with a probability and **no confidence of its
own** — gate it on distance from 0.5 via [decisionBooleanConfidence](../functions/decisionBooleanConfidence.md).

## Properties

### type

> **type**: `"boolean"`

---

### instructions

> **instructions**: [`DecisionInput`](DecisionInput.md)

---

### criteria?

> `optional` **criteria?**: `object`

Optional descriptions of what a yes and a no mean.

#### true?

> `optional` **true?**: [`DecisionInput`](DecisionInput.md) \| `null`

#### false?

> `optional` **false?**: [`DecisionInput`](DecisionInput.md) \| `null`

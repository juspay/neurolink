[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionBooleanGate

# Type Alias: DecisionBooleanGate

> **DecisionBooleanGate** = `object`

Shared gate for acting on a yes/no answer.

A `boolean` answer carries no confidence of its own, so two separate bars
apply: which side of the coin flip it fell on, and how far from the flip it
landed. Both must be cleared, which is why "probability 0.55" never counts
as a yes.

## Properties

### minProbability?

> `optional` **minProbability?**: `number`

Minimum probability to read the answer as "yes". Default 0.5.

---

### minConfidence?

> `optional` **minConfidence?**: `number`

Minimum [decisionBooleanConfidence](../functions/decisionBooleanConfidence.md) to act at all. Default 0.4.

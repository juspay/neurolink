[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionBooleanGate

# Type Alias: DecisionBooleanGate

> **DecisionBooleanGate** = `object`

Defined in: [types/decision.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L264)

Shared gate for acting on a yes/no answer.

A `boolean` answer carries no confidence of its own, so two separate bars
apply: which side of the coin flip it fell on, and how far from the flip it
landed. Both must be cleared, which is why "probability 0.55" never counts
as a yes.

## Properties

### minProbability?

> `optional` **minProbability?**: `number`

Defined in: [types/decision.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L266)

Minimum probability to read the answer as "yes". Default 0.5.

---

### minConfidence?

> `optional` **minConfidence?**: `number`

Defined in: [types/decision.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L268)

Minimum [decisionBooleanConfidence](../functions/decisionBooleanConfidence.md) to act at all. Default 0.4.

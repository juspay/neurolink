[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionChoiceReading

# Type Alias: DecisionChoiceReading

> **DecisionChoiceReading** = `object`

Defined in: [types/decision.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L180)

Narrowed view of a choice answer, safe to consume without re-narrowing.
Returned by the reader helpers so call sites need no type assertion.

## Properties

### choice

> **choice**: `string`

Defined in: [types/decision.ts:181](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L181)

---

### confidence

> **confidence**: `number`

Defined in: [types/decision.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L182)

---

### probabilities

> **probabilities**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [types/decision.ts:183](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L183)

---

### ranked

> **ranked**: readonly `object`[]

Defined in: [types/decision.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L188)

Every option ordered by probability, highest first. A choice question is
therefore also a ranking — the basis for catalogue selection.

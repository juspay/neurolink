[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionChoiceReading

# Type Alias: DecisionChoiceReading

> **DecisionChoiceReading** = `object`

Defined in: [types/decision.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L209)

Narrowed view of a choice answer, safe to consume without re-narrowing.
Returned by the reader helpers so call sites need no type assertion.

## Properties

### choice

> **choice**: `string`

Defined in: [types/decision.ts:210](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L210)

---

### confidence

> **confidence**: `number`

Defined in: [types/decision.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L211)

---

### probabilities

> **probabilities**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [types/decision.ts:212](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L212)

---

### ranked

> **ranked**: readonly `object`[]

Defined in: [types/decision.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L217)

Every option ordered by probability, highest first. A choice question is
therefore also a ranking — the basis for catalogue selection.

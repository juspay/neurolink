[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionChoiceReading

# Type Alias: DecisionChoiceReading

> **DecisionChoiceReading** = `object`

Narrowed view of a choice answer, safe to consume without re-narrowing.
Returned by the reader helpers so call sites need no type assertion.

## Properties

### choice

> **choice**: `string`

---

### confidence

> **confidence**: `number`

---

### probabilities

> **probabilities**: `Readonly`\<`Record`\<`string`, `number`\>\>

---

### ranked

> **ranked**: readonly `object`[]

Every option ordered by probability, highest first. A choice question is
therefore also a ranking — the basis for catalogue selection.

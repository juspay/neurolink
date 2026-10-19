[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionChoiceAnswer

# Type Alias: DecisionChoiceAnswer

> **DecisionChoiceAnswer** = `object`

## Properties

### type

> **type**: `"choice"`

---

### choice

> **choice**: `string`

The highest-probability option name.

---

### probabilities

> **probabilities**: `Readonly`\<`Record`\<`string`, `number`\>\>

Every option mapped to its probability. Key order is not stable.

---

### confidence

> **confidence**: `number`

Calibrated certainty, 0–1, derived from the distribution.

---

### unknown?

> `optional` **unknown?**: `boolean`

True when the question set `unknown` and the model picked it.

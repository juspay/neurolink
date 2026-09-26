[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionScoreAnswer

# Type Alias: DecisionScoreAnswer

> **DecisionScoreAnswer** = `object`

## Properties

### type

> **type**: `"score"`

---

### score

> **score**: `number`

Probability-weighted level index; lands between levels.

---

### legend

> **legend**: `Readonly`\<`Record`\<`string`, `string`\>\>

Level index (as a string key) → the description supplied.

---

### probabilities

> **probabilities**: `Readonly`\<`Record`\<`string`, `number`\>\>

Level index (as a string key) → probability.

---

### confidence

> **confidence**: `number`

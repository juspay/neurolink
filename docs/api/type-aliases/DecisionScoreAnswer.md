[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionScoreAnswer

# Type Alias: DecisionScoreAnswer

> **DecisionScoreAnswer** = `object`

Defined in: [types/decision.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L99)

## Properties

### type

> **type**: `"score"`

Defined in: [types/decision.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L100)

---

### score

> **score**: `number`

Defined in: [types/decision.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L102)

Probability-weighted level index; lands between levels.

---

### legend

> **legend**: `Readonly`\<`Record`\<`string`, `string`\>\>

Defined in: [types/decision.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L104)

Level index (as a string key) → the description supplied.

---

### probabilities

> **probabilities**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [types/decision.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L106)

Level index (as a string key) → probability.

---

### confidence

> **confidence**: `number`

Defined in: [types/decision.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L107)

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionChoiceAnswer

# Type Alias: DecisionChoiceAnswer

> **DecisionChoiceAnswer** = `object`

Defined in: [types/decision.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L89)

## Properties

### type

> **type**: `"choice"`

Defined in: [types/decision.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L90)

---

### choice

> **choice**: `string`

Defined in: [types/decision.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L92)

The highest-probability option name.

---

### probabilities

> **probabilities**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [types/decision.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L94)

Every option mapped to its probability. Key order is not stable.

---

### confidence

> **confidence**: `number`

Defined in: [types/decision.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L96)

Calibrated certainty, 0–1, derived from the distribution.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionChoiceQuestion

# Type Alias: DecisionChoiceQuestion

> **DecisionChoiceQuestion** = `object`

Defined in: [types/decision.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L59)

Pick one option. `criteria` maps option name → rubric description.

The answer carries the full probability distribution, not just the winner,
so a single choice question over N options also **ranks** all N.

## Properties

### type

> **type**: `"choice"`

Defined in: [types/decision.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L60)

---

### instructions

> **instructions**: [`DecisionInput`](DecisionInput.md)

Defined in: [types/decision.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L61)

---

### criteria

> **criteria**: `Readonly`\<`Record`\<`string`, [`DecisionInput`](DecisionInput.md) \| `null`\>\>

Defined in: [types/decision.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/decision.ts#L62)

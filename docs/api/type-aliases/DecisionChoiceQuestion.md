[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionChoiceQuestion

# Type Alias: DecisionChoiceQuestion

> **DecisionChoiceQuestion** = `object`

Pick one option. `criteria` maps option name → rubric description.

The answer carries the full probability distribution, not just the winner,
so a single choice question over N options also **ranks** all N.

## Properties

### type

> **type**: `"choice"`

---

### instructions

> **instructions**: [`DecisionInput`](DecisionInput.md)

---

### criteria

> **criteria**: `Readonly`\<`Record`\<`string`, [`DecisionInput`](DecisionInput.md) \| `null`\>\>

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

---

### unknown?

> `optional` **unknown?**: `boolean`

True adds an option named `unknown` the model picks when none of the
criteria fits; the answer then carries `unknown: true`. Only a provider
whose `decisionLimits.questionTypes` lists `"choice-unknown"` accepts it,
and no criteria key may be named `unknown` alongside it.

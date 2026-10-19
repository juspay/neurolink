[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecisionValueQuestion

# Type Alias: DecisionValueQuestion

> **DecisionValueQuestion** = `object`

Extract one typed field from the state: an amount, a reference, a name. Only
a provider whose `decisionLimits.questionTypes` lists `"value"` accepts it.

## Properties

### type

> **type**: `"value"`

---

### instructions

> **instructions**: [`DecisionInput`](DecisionInput.md)

---

### dtype?

> `optional` **dtype?**: `"string"` \| `"int"` \| `"float"`

The type of the extracted value. Omitted means `string`.

---

### pattern?

> `optional` **pattern?**: `string`

A regular expression the extracted text must match.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTDictionaryEntry

# Type Alias: STTDictionaryEntry

> **STTDictionaryEntry** = `object`

One dictionary entry: the correct spelling, how engines mis-hear it, and what it means.

## Properties

### term

> **term**: `string`

Correct spelling, written exactly like this in the output.

---

### heardAs?

> `optional` **heardAs?**: `string`[]

Mis-hearings, in any script ("jasper", "जसपे"). Each one found in a transcript becomes a candidate.

---

### meaning?

> `optional` **meaning?**: `string`

Meaning or usage, given to the decision model and the rewrite model.

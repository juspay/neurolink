[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalComparison

# Type Alias: ServerSTTEvalComparison

> **ServerSTTEvalComparison** = `object`

Agreement between the two STTs for one speaker. Neither side is ground
truth: `disagreement` is the word edit distance between them divided by the
primary's word count, so 0 means both wrote the same words.

## Properties

### participant_identity

> **participant_identity**: `string`

---

### participant_name

> **participant_name**: `string`

---

### primary

> **primary**: [`ServerSTTEvalSide`](ServerSTTEvalSide.md)

---

### shadow

> **shadow**: [`ServerSTTEvalSide`](ServerSTTEvalSide.md)

---

### disagreement

> **disagreement**: `number` \| `null`

Word edit distance / primary words, on normalized text. Null when the primary wrote nothing.

---

### phonetic_disagreement

> **phonetic_disagreement**: `number` \| `null`

The same on phonetic word keys, so one STT writing Devanagari and the other Latin is not counted as a difference.

---

### method

> **method**: `"full"` \| `"windowed"`

`full` aligns the whole speaker; `windowed` aligns 5-minute windows of a long speaker.

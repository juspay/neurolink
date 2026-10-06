[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTDecisionRecord

# Type Alias: STTDecisionRecord

> **STTDecisionRecord** = `object`

What the decision model answered for one dictionary candidate.

## Properties

### heard

> **heard**: `string`

The mis-hearing found in the transcript.

---

### term

> **term**: `string`

The dictionary term it may stand for.

---

### choice

> **choice**: `"term"` \| `"literal"`

---

### probability?

> `optional` **probability?**: `number`

Probability of the chosen reading, when the guard ran.

---

### confidence?

> `optional` **confidence?**: `number`

---

### note?

> `optional` **note?**: `string`

Why no decision was made ("decision model unavailable", "guard off", …).

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalSide

# Type Alias: ServerSTTEvalSide

> **ServerSTTEvalSide** = `object`

One STT's side of a speaker's comparison.

## Properties

### model

> **model**: `string`

---

### segments

> **segments**: `number`

---

### words

> **words**: `number`

---

### languages

> **languages**: `string`[]

Languages the STT reported, most frequent first.

---

### mean_latency_s

> **mean_latency_s**: `number` \| `null`

Mean seconds from the end of speech to the final, when the STT reports timings.

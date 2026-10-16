[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTOutputRendering

# Type Alias: STTOutputRendering

> **STTOutputRendering** = `object`

The transcript in one output language. `text` is empty unless the status is `ok`, `same-language` or `partial`.

## Properties

### language

> **language**: `string`

---

### text

> **text**: `string`

---

### status

> **status**: [`STTOutputStatus`](STTOutputStatus.md)

---

### ms

> **ms**: `number`

---

### segments?

> `optional` **segments?**: `object`[]

Per segment (or utterance), in order, when the transcript has more than one.

#### index

> **index**: `number`

#### text

> **text**: `string`

---

### reason?

> `optional` **reason?**: `string`

Why a rendering was refused or failed.

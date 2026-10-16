[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscriptionSessionOptions

# Type Alias: TranscriptionSessionOptions

> **TranscriptionSessionOptions** = `object`

## Properties

### id?

> `optional` **id?**: `string`

---

### backlog?

> `optional` **backlog?**: `number`

Utterances kept for listeners who join late. Default 50.

---

### maxLanguages?

> `optional` **maxLanguages?**: `number`

Distinct output languages a session renders at once. Default 8.

---

### output?

> `optional` **output?**: `Omit`\<[`STTOutputOptions`](STTOutputOptions.md), `"languages"`\>

Rendering settings shared by every speaker; the languages come from the listeners.

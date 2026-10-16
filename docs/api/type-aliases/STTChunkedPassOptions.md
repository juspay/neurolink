[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTChunkedPassOptions

# Type Alias: STTChunkedPassOptions

> **STTChunkedPassOptions** = `object`

What the adapter tells `run` about a pass.

## Properties

### utterance

> **utterance**: `number`

---

### final

> **final**: `boolean`

---

### engine

> **engine**: [`STTStreamEngineRole`](STTStreamEngineRole.md)

---

### seconds

> **seconds**: `number`

Audio length of the utterance so far.

---

### languagePrior?

> `optional` **languagePrior?**: `string`

The last confidently detected language of this stream, for engines that take a prior.

---

### languageHint?

> `optional` **languageHint?**: `string`

Transcribe in this language rather than detecting one: set on the
fallback role once the utterance (or the stream) is settled as that
language, so a short pass cannot drift into another script.

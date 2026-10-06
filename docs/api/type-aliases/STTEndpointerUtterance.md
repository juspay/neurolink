[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTEndpointerUtterance

# Type Alias: STTEndpointerUtterance

> **STTEndpointerUtterance** = `object`

One utterance as the energy gate builds it, at the input rate.

## Properties

### id

> **id**: `number`

1-based, in order of onset. A dropped cough consumes an id, so ids can skip.

---

### startSeconds

> **startSeconds**: `number`

Offset of the first sample (pre-roll included) from the start of the stream.

---

### blocks

> **blocks**: `Float32Array`[]

20 ms blocks, pre-roll included.

---

### rms

> **rms**: `number`[]

RMS of each block, parallel to `blocks`.

---

### length

> **length**: `number`

Total samples in `blocks`.

---

### speechMs

> **speechMs**: `number`

---

### silenceMs

> **silenceMs**: `number`

---

### heard

> **heard**: `boolean`

Set by the caller once a pass produced words: such an utterance is never dropped as a cough.

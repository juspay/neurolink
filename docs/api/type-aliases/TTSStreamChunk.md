[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSStreamChunk

# ~~Type Alias: TTSStreamChunk~~

> **TTSStreamChunk** = `object`

TTS stream chunk for streaming synthesis

## Deprecated

Use the canonical `TTSChunk` type instead. Kept at its
original shape so existing external callers keep compiling: `TTSChunk`
narrows `format` to `TTSAudioFormat` and has no `timestampMs`, so it
is not a drop-in replacement.

## Properties

### ~~data~~

> **data**: `Buffer`

Audio data chunk

---

### ~~index~~

> **index**: `number`

Chunk sequence number

---

### ~~isFinal~~

> **isFinal**: `boolean`

Whether this is the final chunk

---

### ~~format~~

> **format**: `string`

Audio format

---

### ~~sampleRate?~~

> `optional` **sampleRate?**: `number`

Sample rate

---

### ~~timestampMs?~~

> `optional` **timestampMs?**: `number`

Timestamp offset in audio (milliseconds)

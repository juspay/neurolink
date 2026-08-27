[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSStreamChunk

# ~~Type Alias: TTSStreamChunk~~

> **TTSStreamChunk** = `object`

Defined in: [types/voice.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L249)

TTS stream chunk for streaming synthesis

## Deprecated

Use the canonical `TTSChunk` type instead. Kept at its
original shape so existing external callers keep compiling: `TTSChunk`
narrows `format` to `TTSAudioFormat` and has no `timestampMs`, so it
is not a drop-in replacement.

## Properties

### ~~data~~

> **data**: `Buffer`

Defined in: [types/voice.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L251)

Audio data chunk

---

### ~~index~~

> **index**: `number`

Defined in: [types/voice.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L253)

Chunk sequence number

---

### ~~isFinal~~

> **isFinal**: `boolean`

Defined in: [types/voice.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L255)

Whether this is the final chunk

---

### ~~format~~

> **format**: `string`

Defined in: [types/voice.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L257)

Audio format

---

### ~~sampleRate?~~

> `optional` **sampleRate?**: `number`

Defined in: [types/voice.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L259)

Sample rate

---

### ~~timestampMs?~~

> `optional` **timestampMs?**: `number`

Defined in: [types/voice.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/voice.ts#L261)

Timestamp offset in audio (milliseconds)

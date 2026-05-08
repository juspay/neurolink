[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSStreamChunk

# Type Alias: TTSStreamChunk

> **TTSStreamChunk** = `object`

Defined in: [types/voice.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L236)

TTS stream chunk for streaming synthesis

## Properties

### data

> **data**: `Buffer`

Defined in: [types/voice.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L238)

Audio data chunk

---

### index

> **index**: `number`

Defined in: [types/voice.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L240)

Chunk sequence number

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/voice.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L242)

Whether this is the final chunk

---

### format

> **format**: `string`

Defined in: [types/voice.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L244)

Audio format

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/voice.ts:246](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L246)

Sample rate

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/voice.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L248)

Timestamp offset in audio (milliseconds)

[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioStreamChunk

# Type Alias: AudioStreamChunk

> **AudioStreamChunk** = `object`

Defined in: [types/voice.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L124)

Audio stream chunk for streaming operations

## Properties

### data

> **data**: `Buffer`

Defined in: [types/voice.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L126)

Audio data

---

### index

> **index**: `number`

Defined in: [types/voice.ts:128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L128)

Chunk index

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/voice.ts:130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L130)

Whether this is the final chunk

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/voice.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L132)

Audio format

---

### sampleRate

> **sampleRate**: `number`

Defined in: [types/voice.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L134)

Sample rate

---

### timestampMs

> **timestampMs**: `number`

Defined in: [types/voice.ts:136](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L136)

Timestamp offset in milliseconds

---

### durationMs

> **durationMs**: `number`

Defined in: [types/voice.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/voice.ts#L138)

Duration of this chunk in milliseconds

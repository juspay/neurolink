[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSStreamChunk

# Type Alias: TTSStreamChunk

> **TTSStreamChunk** = `object`

Defined in: [types/voice.ts:236](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L236)

TTS stream chunk for streaming synthesis

## Properties

### data

> **data**: `Buffer`

Defined in: [types/voice.ts:238](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L238)

Audio data chunk

---

### index

> **index**: `number`

Defined in: [types/voice.ts:240](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L240)

Chunk sequence number

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/voice.ts:242](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L242)

Whether this is the final chunk

---

### format

> **format**: `string`

Defined in: [types/voice.ts:244](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L244)

Audio format

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/voice.ts:246](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L246)

Sample rate

---

### timestampMs?

> `optional` **timestampMs?**: `number`

Defined in: [types/voice.ts:248](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/voice.ts#L248)

Timestamp offset in audio (milliseconds)

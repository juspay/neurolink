[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeAudioChunk

# Type Alias: RealtimeAudioChunk

> **RealtimeAudioChunk** = `object`

Defined in: [types/realtime.ts:119](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/realtime.ts#L119)

Realtime audio chunk

## Properties

### data

> **data**: `Buffer`

Defined in: [types/realtime.ts:121](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/realtime.ts#L121)

Audio data

---

### index

> **index**: `number`

Defined in: [types/realtime.ts:123](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/realtime.ts#L123)

Chunk sequence number

---

### isFinal

> **isFinal**: `boolean`

Defined in: [types/realtime.ts:125](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/realtime.ts#L125)

Whether this is the final chunk

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/realtime.ts:127](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/realtime.ts#L127)

Audio format

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/realtime.ts:129](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/realtime.ts#L129)

Sample rate

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/realtime.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/realtime.ts#L131)

Duration of this chunk in milliseconds

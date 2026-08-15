[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTResult

# Type Alias: STTResult

> **STTResult** = `object`

Defined in: [types/stt.ts:61](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L61)

STT result from transcription

## Properties

### text

> **text**: `string`

Defined in: [types/stt.ts:63](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L63)

Full transcribed text

---

### confidence

> **confidence**: `number`

Defined in: [types/stt.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L65)

Confidence score (0-1)

---

### language?

> `optional` **language?**: `string`

Defined in: [types/stt.ts:67](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L67)

Detected language code

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/stt.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L69)

Audio duration in seconds

---

### words?

> `optional` **words?**: [`WordTiming`](WordTiming.md)[]

Defined in: [types/stt.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L71)

Word-level timings

---

### segments?

> `optional` **segments?**: [`TranscriptionSegment`](TranscriptionSegment.md)[]

Defined in: [types/stt.ts:73](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L73)

Transcription segments

---

### speakers?

> `optional` **speakers?**: `string`[]

Defined in: [types/stt.ts:75](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L75)

Speaker labels (for diarization)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stt.ts:77](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/stt.ts#L77)

Performance metadata

#### Index Signature

\[`key`: `string`\]: `unknown`

Additional provider-specific metadata

#### latency

> **latency**: `number`

Processing latency in milliseconds

#### provider?

> `optional` **provider?**: `string`

Provider name

#### model?

> `optional` **model?**: `string`

Model used

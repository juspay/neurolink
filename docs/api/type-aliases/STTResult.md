[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTResult

# Type Alias: STTResult

> **STTResult** = `object`

Defined in: [types/stt.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L61)

STT result from transcription

## Properties

### text

> **text**: `string`

Defined in: [types/stt.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L63)

Full transcribed text

---

### confidence

> **confidence**: `number`

Defined in: [types/stt.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L65)

Confidence score (0-1)

---

### language?

> `optional` **language?**: `string`

Defined in: [types/stt.ts:67](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L67)

Detected language code

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/stt.ts:69](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L69)

Audio duration in seconds

---

### words?

> `optional` **words?**: [`WordTiming`](WordTiming.md)[]

Defined in: [types/stt.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L71)

Word-level timings

---

### segments?

> `optional` **segments?**: [`TranscriptionSegment`](TranscriptionSegment.md)[]

Defined in: [types/stt.ts:73](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L73)

Transcription segments

---

### speakers?

> `optional` **speakers?**: `string`[]

Defined in: [types/stt.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L75)

Speaker labels (for diarization)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/stt.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stt.ts#L77)

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

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTResult

# Type Alias: STTResult

> **STTResult** = `object`

STT result from transcription

## Properties

### text

> **text**: `string`

Full transcribed text

---

### confidence

> **confidence**: `number`

Confidence score (0-1)

---

### language?

> `optional` **language?**: `string`

Detected language code

---

### duration?

> `optional` **duration?**: `number`

Audio duration in seconds

---

### words?

> `optional` **words?**: [`WordTiming`](WordTiming.md)[]

Word-level timings

---

### segments?

> `optional` **segments?**: [`TranscriptionSegment`](TranscriptionSegment.md)[]

Transcription segments

---

### speakers?

> `optional` **speakers?**: `string`[]

Speaker labels (for diarization)

---

### metadata?

> `optional` **metadata?**: `object`

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

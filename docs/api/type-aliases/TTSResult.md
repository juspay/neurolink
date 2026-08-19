[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSResult

# Type Alias: TTSResult

> **TTSResult** = `object`

Defined in: [types/tts.ts:119](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L119)

TTS audio result returned from generation

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/tts.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L121)

Audio data as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L123)

Audio format

---

### size

> **size**: `number`

Defined in: [types/tts.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L125)

Audio file size in bytes

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tts.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L127)

Duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:129](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L129)

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/tts.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L131)

Sample rate in Hz

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/tts.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L133)

Performance and request metadata

#### Index Signature

\[`key`: `string`\]: `unknown`

Additional provider-specific metadata

#### latency

> **latency**: `number`

Request latency in milliseconds

#### provider?

> `optional` **provider?**: `string`

Provider name

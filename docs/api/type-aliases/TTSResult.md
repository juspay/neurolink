[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSResult

# Type Alias: TTSResult

> **TTSResult** = `object`

Defined in: [types/tts.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L92)

TTS audio result returned from generation

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/tts.ts:94](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L94)

Audio data as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L96)

Audio format

---

### size

> **size**: `number`

Defined in: [types/tts.ts:98](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L98)

Audio file size in bytes

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tts.ts:100](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L100)

Duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L102)

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/tts.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L104)

Sample rate in Hz

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/tts.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L106)

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

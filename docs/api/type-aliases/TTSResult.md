[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSResult

# Type Alias: TTSResult

> **TTSResult** = `object`

Defined in: [types/tts.ts:110](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L110)

TTS audio result returned from generation

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/tts.ts:112](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L112)

Audio data as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:114](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L114)

Audio format

---

### size

> **size**: `number`

Defined in: [types/tts.ts:116](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L116)

Audio file size in bytes

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tts.ts:118](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L118)

Duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:120](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L120)

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Defined in: [types/tts.ts:122](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L122)

Sample rate in Hz

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/tts.ts:124](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tts.ts#L124)

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

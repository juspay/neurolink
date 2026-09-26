[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSResult

# Type Alias: TTSResult

> **TTSResult** = `object`

TTS audio result returned from generation

## Properties

### buffer

> **buffer**: `Buffer`

Audio data as Buffer

---

### format

> **format**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio format

---

### size

> **size**: `number`

Audio file size in bytes

---

### duration?

> `optional` **duration?**: `number`

Duration in seconds (if available)

---

### voice?

> `optional` **voice?**: `string`

Voice used for generation

---

### sampleRate?

> `optional` **sampleRate?**: `number`

Sample rate in Hz

---

### metadata?

> `optional` **metadata?**: `object`

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

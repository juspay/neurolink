[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerTranscribeRequest

# Type Alias: ServerTranscribeRequest

> **ServerTranscribeRequest** = `object`

Body of `POST <basePath>/agent/transcribe`. Exactly one of `audio`,
`audioUrl` or `audioPath`. There is no `credentials` field: a caller cannot
swap in its own key or point an engine at another host.

## Properties

### audio?

> `optional` **audio?**: `string`

Base64 audio, or a `data:` URL.

---

### audioUrl?

> `optional` **audioUrl?**: `string`

`http(s)` URL the server downloads (SSRF-guarded, size-capped).

---

### audioPath?

> `optional` **audioPath?**: `string`

Server-local path; refused unless it lies under `allowedAudioRoots`.

---

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

---

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### language?

> `optional` **language?**: `string`

---

### prompt?

> `optional` **prompt?**: `string`

---

### dictionary?

> `optional` **dictionary?**: [`STTDictionaryEntry`](STTDictionaryEntry.md)[]

---

### correction?

> `optional` **correction?**: [`STTCorrectionOptions`](STTCorrectionOptions.md)

---

### fallback?

> `optional` **fallback?**: [`STTFallbackOptions`](STTFallbackOptions.md)

---

### diarization?

> `optional` **diarization?**: `boolean`

---

### wordTimestamps?

> `optional` **wordTimestamps?**: `boolean`

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

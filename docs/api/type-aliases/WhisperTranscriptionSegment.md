[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhisperTranscriptionSegment

# Type Alias: WhisperTranscriptionSegment

> **WhisperTranscriptionSegment** = `object`

## Properties

### id

> **id**: `number`

---

### seek?

> `optional` **seek?**: `number`

OpenAI always sends these decoder stats; OpenAI-compatible servers may omit them.

---

### start

> **start**: `number`

---

### end

> **end**: `number`

---

### text

> **text**: `string`

---

### tokens?

> `optional` **tokens?**: `number`[]

---

### temperature?

> `optional` **temperature?**: `number`

---

### avg_logprob?

> `optional` **avg_logprob?**: `number`

---

### compression_ratio?

> `optional` **compression_ratio?**: `number`

---

### no_speech_prob?

> `optional` **no_speech_prob?**: `number`

---

### speaker?

> `optional` **speaker?**: `string`

Not part of OpenAI's schema. Diarizing OpenAI-compatible servers (the
NeuroLink diarization sidecar, Deepgram's compat endpoint, …) label each
segment with a speaker; the handler surfaces it as `TranscriptionSegment.speaker`.

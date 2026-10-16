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

---

### language_detected?

> `optional` **language_detected?**: `boolean`

Extension, same meaning as the response-level fields: a gateway that
normalises the top level of `verbose_json` to OpenAI's schema (LiteLLM
does) keeps unknown keys inside segments, so a server may repeat its
language-detection verdict here and it survives the hop.

---

### language_scores?

> `optional` **language_scores?**: `object`[]

#### language

> **language**: `string`

#### score

> **score**: `number`

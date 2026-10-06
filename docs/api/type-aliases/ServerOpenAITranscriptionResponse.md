[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerOpenAITranscriptionResponse

# Type Alias: ServerOpenAITranscriptionResponse

> **ServerOpenAITranscriptionResponse** = `object`

`POST /v1/audio/transcriptions` with `response_format=verbose_json`:
OpenAI's shape, plus NeuroLink's extras in snake_case.

## Properties

### task

> **task**: `"transcribe"`

---

### text

> **text**: `string`

---

### language?

> `optional` **language?**: `string`

---

### duration?

> `optional` **duration?**: `number`

---

### segments?

> `optional` **segments?**: [`ServerOpenAITranscriptionSegment`](ServerOpenAITranscriptionSegment.md)[]

---

### words?

> `optional` **words?**: [`ServerOpenAITranscriptionWord`](ServerOpenAITranscriptionWord.md)[]

---

### raw

> **raw**: `string`

Engine text before correction.

---

### corrected?

> `optional` **corrected?**: `string`

Present when the correction changed the text.

---

### decisions?

> `optional` **decisions?**: [`STTDecisionRecord`](STTDecisionRecord.md)[]

---

### engine

> **engine**: [`STTEngineInfo`](STTEngineInfo.md)

---

### language_detected?

> `optional` **language_detected?**: `boolean`

---

### steps

> **steps**: `string`[]

---

### timings

> **timings**: [`TranscribeTimings`](TranscribeTimings.md)

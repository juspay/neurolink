[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhisperVerboseResponse

# Type Alias: WhisperVerboseResponse

> **WhisperVerboseResponse** = `object`

## Properties

### task

> **task**: `string`

---

### language

> **language**: `string`

---

### duration

> **duration**: `number`

---

### text

> **text**: `string`

---

### segments?

> `optional` **segments?**: [`WhisperTranscriptionSegment`](WhisperTranscriptionSegment.md)[]

---

### words?

> `optional` **words?**: [`WhisperTranscriptionWord`](WhisperTranscriptionWord.md)[]

---

### speakers?

> `optional` **speakers?**: `string`[]

Extension: distinct speaker labels, in order of first appearance.

---

### language_detected?

> `optional` **language_detected?**: `boolean`

Extension: a self-hosted server that scores language identification may
say whether it trusts its own detection. Read defensively; never required.

---

### language_scores?

> `optional` **language_scores?**: `object`[]

Extension: candidate languages and the server's score for each.

#### language

> **language**: `string`

#### score

> **score**: `number`

---

### language_confidence?

> `optional` **language_confidence?**: `number`

Extension: the server's confidence in `language`.

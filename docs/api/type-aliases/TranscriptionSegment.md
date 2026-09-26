[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscriptionSegment

# Type Alias: TranscriptionSegment

> **TranscriptionSegment** = `object`

Transcription segment for streaming STT

## Properties

### index?

> `optional` **index?**: `number`

Segment index

---

### text

> **text**: `string`

Transcribed text

---

### isFinal

> **isFinal**: `boolean`

Whether this is a final result

---

### confidence?

> `optional` **confidence?**: `number`

Confidence score (0-1)

---

### startTime?

> `optional` **startTime?**: `number`

Start time in audio (seconds)

---

### start?

> `optional` **start?**: `number`

Start time (alias for startTime)

---

### endTime?

> `optional` **endTime?**: `number`

End time in audio (seconds)

---

### end?

> `optional` **end?**: `number`

End time (alias for endTime)

---

### words?

> `optional` **words?**: [`WordTiming`](WordTiming.md)[]

Word-level timings

---

### speaker?

> `optional` **speaker?**: `string`

Speaker label

---

### language?

> `optional` **language?**: `string`

Detected language

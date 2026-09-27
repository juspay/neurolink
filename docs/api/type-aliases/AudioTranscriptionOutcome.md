[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioTranscriptionOutcome

# Type Alias: AudioTranscriptionOutcome

> **AudioTranscriptionOutcome** = `object`

What a transcription attempt produced (#409/#416).

`transcriptionSkippedReason` is present on exactly the attempts that yielded
no transcript, so a caller can tell "no speech in this audio" from "no
backend was reachable".

## Properties

### transcript

> **transcript**: `string` \| `undefined`

---

### hasTranscript

> **hasTranscript**: `boolean`

---

### transcriptionProvider

> **transcriptionProvider**: `string` \| `undefined`

---

### transcriptionLanguage

> **transcriptionLanguage**: `string` \| `undefined`

---

### transcriptionDuration

> **transcriptionDuration**: `number` \| `undefined`

---

### transcriptionSkippedReason

> **transcriptionSkippedReason**: `string` \| `undefined`

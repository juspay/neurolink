[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioTranscriptionOutcome

# Type Alias: AudioTranscriptionOutcome

> **AudioTranscriptionOutcome** = `object`

Defined in: [types/file.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L642)

What a transcription attempt produced (#409/#416).

`transcriptionSkippedReason` is present on exactly the attempts that yielded
no transcript, so a caller can tell "no speech in this audio" from "no
backend was reachable".

## Properties

### transcript

> **transcript**: `string` \| `undefined`

Defined in: [types/file.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L643)

---

### hasTranscript

> **hasTranscript**: `boolean`

Defined in: [types/file.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L644)

---

### transcriptionProvider

> **transcriptionProvider**: `string` \| `undefined`

Defined in: [types/file.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L645)

---

### transcriptionLanguage

> **transcriptionLanguage**: `string` \| `undefined`

Defined in: [types/file.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L646)

---

### transcriptionDuration

> **transcriptionDuration**: `number` \| `undefined`

Defined in: [types/file.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L647)

---

### transcriptionSkippedReason

> **transcriptionSkippedReason**: `string` \| `undefined`

Defined in: [types/file.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L648)

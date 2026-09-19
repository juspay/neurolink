[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AudioTranscriptionOutcome

# Type Alias: AudioTranscriptionOutcome

> **AudioTranscriptionOutcome** = `object`

Defined in: [types/file.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L482)

What a transcription attempt produced (#409/#416).

`transcriptionSkippedReason` is present on exactly the attempts that yielded
no transcript, so a caller can tell "no speech in this audio" from "no
backend was reachable".

## Properties

### transcript

> **transcript**: `string` \| `undefined`

Defined in: [types/file.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L483)

---

### hasTranscript

> **hasTranscript**: `boolean`

Defined in: [types/file.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L484)

---

### transcriptionProvider

> **transcriptionProvider**: `string` \| `undefined`

Defined in: [types/file.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L485)

---

### transcriptionLanguage

> **transcriptionLanguage**: `string` \| `undefined`

Defined in: [types/file.ts:486](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L486)

---

### transcriptionDuration

> **transcriptionDuration**: `number` \| `undefined`

Defined in: [types/file.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L487)

---

### transcriptionSkippedReason

> **transcriptionSkippedReason**: `string` \| `undefined`

Defined in: [types/file.ts:488](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L488)

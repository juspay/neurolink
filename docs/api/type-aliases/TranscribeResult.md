[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscribeResult

# Type Alias: TranscribeResult

> **TranscribeResult** = [`STTResult`](STTResult.md) & `object`

The result of `transcribe()`: an `STTResult` plus what the layers did to it.

## Type Declaration

### raw

> **raw**: `string`

Engine text before any correction.

### corrected?

> `optional` **corrected?**: `string`

Present when the correction changed the text; `text` then holds the corrected version.

### languageDetected?

> `optional` **languageDetected?**: `boolean`

`false` when the engine reported a low language-detection score.

### languageScores?

> `optional` **languageScores?**: [`STTLanguageScore`](STTLanguageScore.md)[]

### decisions?

> `optional` **decisions?**: [`STTDecisionRecord`](STTDecisionRecord.md)[]

### engine

> **engine**: [`STTEngineInfo`](STTEngineInfo.md)

### timings

> **timings**: [`TranscribeTimings`](TranscribeTimings.md)

### steps

> **steps**: `string`[]

Human-readable trail of what happened ("dictionary 2/2", "rewrite timed out · kept text").

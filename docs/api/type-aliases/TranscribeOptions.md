[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscribeOptions

# Type Alias: TranscribeOptions

> **TranscribeOptions** = `Omit`\<[`STTOptions`](STTOptions.md), `"enabled"` \| `"provider"` \| `"language"` \| `"model"` \| `"format"`\> & `object`

Options for `neurolink.transcribe()`. `provider` defaults to
`NEUROLINK_STT_PROVIDER`, then the first configured STT provider in
descriptor order, then the built-in local engine (Whistle), which needs no
credentials. `language` omitted or `"auto"` lets the engine detect it.

## Type Declaration

### audio

> **audio**: [`TranscribeAudioInput`](TranscribeAudioInput.md)

### provider?

> `optional` **provider?**: `string`

### model?

> `optional` **model?**: `string`

### language?

> `optional` **language?**: `string`

ISO / BCP-47 code, or `"auto"` (the default) to let the engine detect.

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio container of a buffer input; inferred from a path or URL.

### prompt?

> `optional` **prompt?**: `string`

Context prompt for engines that bias on one (Whisper, Qwen3-ASR …). Dictionary terms are appended.

### dictionary?

> `optional` **dictionary?**: [`STTDictionaryEntry`](STTDictionaryEntry.md)[]

### correction?

> `optional` **correction?**: [`STTCorrectionOptions`](STTCorrectionOptions.md)

### fallback?

> `optional` **fallback?**: [`STTFallbackOptions`](STTFallbackOptions.md)

### streaming?

> `optional` **streaming?**: [`STTStreamingOptions`](STTStreamingOptions.md)

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Whole-call timeout.

### credentials?

> `optional` **credentials?**: [`STTCredentialsCarrier`](STTCredentialsCarrier.md)

Per-call credentials; the `stt` slice reaches the handlers.

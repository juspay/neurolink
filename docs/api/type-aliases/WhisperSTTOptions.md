[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhisperSTTOptions

# Type Alias: WhisperSTTOptions

> **WhisperSTTOptions** = [`STTOptions`](STTOptions.md) & `object`

## Type Declaration

### model?

> `optional` **model?**: [`WhisperModel`](WhisperModel.md)

### responseFormat?

> `optional` **responseFormat?**: `"json"` \| `"text"` \| `"srt"` \| `"verbose_json"` \| `"vtt"`

### temperature?

> `optional` **temperature?**: `number`

### prompt?

> `optional` **prompt?**: `string`

### translate?

> `optional` **translate?**: `boolean`

Translate audio to English instead of transcribing in original language

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Request timeout in milliseconds. Default 30_000, which suits OpenAI's
hosted endpoint; a self-hosted server transcribing a whole meeting needs
minutes, so raise it (or set `OPENAI_STT_TIMEOUT_MS`).

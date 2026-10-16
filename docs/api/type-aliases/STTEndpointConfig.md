[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTEndpointConfig

# Type Alias: STTEndpointConfig

> **STTEndpointConfig** = `object`

One OpenAI-compatible `/audio/transcriptions` endpoint registered under a
name of its own, so several self-hosted engines can be told apart — and
used as each other's `fallback` or `secondOpinion`. `model` is the default
`model` field sent to it.

## Properties

### baseURL

> **baseURL**: `string`

---

### apiKey?

> `optional` **apiKey?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

---

### priorLanguageForm?

> `optional` **priorLanguageForm?**: `string`

How this server takes a language prior in its `language` field, as a
template with `{lang}` (the IndicConformer wrapper: `"auto-{lang}"`).
Unset, no prior is ever sent: a server that does not understand one
would refuse the request.

---

### lidModel?

> `optional` **lidModel?**: `string`

A model name this server runs in language-identification-only mode (see `STTHandler.languageProbeModel`).

---

### vocabularyPrompt?

> `optional` **vocabularyPrompt?**: `boolean`

Whether the dictionary terms travel to this server as a "Names and
terms used: …" prompt. Whisper biases on it; Qwen3-ASR and most others
ignore it and some echo it back on a pause. Default `true`; set `false`
for a server that echoes it.

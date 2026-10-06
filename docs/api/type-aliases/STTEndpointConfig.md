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

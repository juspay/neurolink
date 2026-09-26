[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStreamChunk

# Type Alias: ProviderStreamChunk

> **ProviderStreamChunk** = \{ `content`: `string`; \} \| \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \} \| \{ `type`: `"image"`; `imageOutput`: \{ `base64`: `string`; \}; \}

Provider-level chunks accepted by NeuroLink's core streaming pipeline.

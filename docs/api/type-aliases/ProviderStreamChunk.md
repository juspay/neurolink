[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStreamChunk

# Type Alias: ProviderStreamChunk

> **ProviderStreamChunk** = \{ `content`: `string`; \} \| \{ `type`: `"audio"`; `audio`: [`AudioChunk`](AudioChunk.md); \} \| \{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \} \| \{ `type`: `"image"`; `imageOutput`: \{ `base64`: `string`; \}; \}

Defined in: [types/stream.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/stream.ts#L225)

Provider-level chunks accepted by NeuroLink's core streaming pipeline.

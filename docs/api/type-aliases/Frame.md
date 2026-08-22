[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Frame

# Type Alias: Frame

> **Frame** = \{ `type`: `"audio"`; `data`: `Int16Array`; \} \| \{ `type`: `"vad_start"`; \} \| \{ `type`: `"vad_stop"`; \} \| \{ `type`: `"transcript"`; `text`: `string`; `final`: `boolean`; \} \| \{ `type`: `"llm_token"`; `text`: `string`; \} \| \{ `type`: `"tts_audio"`; `data`: `Buffer`; \} \| \{ `type`: `"interrupt"`; \}

Defined in: [types/server.ts:1166](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L1166)

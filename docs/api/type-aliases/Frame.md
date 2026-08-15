[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Frame

# Type Alias: Frame

> **Frame** = \{ `type`: `"audio"`; `data`: `Int16Array`; \} \| \{ `type`: `"vad_start"`; \} \| \{ `type`: `"vad_stop"`; \} \| \{ `type`: `"transcript"`; `text`: `string`; `final`: `boolean`; \} \| \{ `type`: `"llm_token"`; `text`: `string`; \} \| \{ `type`: `"tts_audio"`; `data`: `Buffer`; \} \| \{ `type`: `"interrupt"`; \}

Defined in: [types/server.ts:1166](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1166)

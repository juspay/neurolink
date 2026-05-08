[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Frame

# Type Alias: Frame

> **Frame** = \{ `type`: `"audio"`; `data`: `Int16Array`; \} \| \{ `type`: `"vad_start"`; \} \| \{ `type`: `"vad_stop"`; \} \| \{ `type`: `"transcript"`; `text`: `string`; `final`: `boolean`; \} \| \{ `type`: `"llm_token"`; `text`: `string`; \} \| \{ `type`: `"tts_audio"`; `data`: `Buffer`; \} \| \{ `type`: `"interrupt"`; \}

Defined in: [types/server.ts:1166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1166)

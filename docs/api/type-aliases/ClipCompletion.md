[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClipCompletion

# Type Alias: ClipCompletion

> **ClipCompletion** = \{ `status`: `"pending"`; \} \| \{ `status`: `"success"`; `result`: [`ClipResult`](ClipResult.md); \} \| \{ `status`: `"failure"`; `error`: `Error`; \}

Defined in: [types/multimodal.ts:733](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L733)

Completion status for ordered circuit-breaker tracking.

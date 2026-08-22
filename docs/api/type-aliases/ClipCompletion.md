[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClipCompletion

# Type Alias: ClipCompletion

> **ClipCompletion** = \{ `status`: `"pending"`; \} \| \{ `status`: `"success"`; `result`: [`ClipResult`](ClipResult.md); \} \| \{ `status`: `"failure"`; `error`: `Error`; \}

Defined in: [types/multimodal.ts:733](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L733)

Completion status for ordered circuit-breaker tracking.

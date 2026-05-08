[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClipCompletion

# Type Alias: ClipCompletion

> **ClipCompletion** = \{ `status`: `"pending"`; \} \| \{ `status`: `"success"`; `result`: [`ClipResult`](ClipResult.md); \} \| \{ `status`: `"failure"`; `error`: `Error`; \}

Defined in: [types/multimodal.ts:630](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L630)

Completion status for ordered circuit-breaker tracking.

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClipCompletion

# Type Alias: ClipCompletion

> **ClipCompletion** = \{ `status`: `"pending"`; \} \| \{ `status`: `"success"`; `result`: [`ClipResult`](ClipResult.md); \} \| \{ `status`: `"failure"`; `error`: `Error`; \}

Completion status for ordered circuit-breaker tracking.

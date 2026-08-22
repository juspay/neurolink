[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicStreamPreflightResult

# Type Alias: AnthropicStreamPreflightResult

> **AnthropicStreamPreflightResult** = \{ `kind`: `"ready"`; `chunks`: `Uint8Array`[]; \} \| \{ `kind`: `"empty"`; `chunks`: `Uint8Array`[]; \} \| \{ `kind`: `"transport_error"`; `chunks`: `Uint8Array`[]; `error`: `unknown`; \} \| \{ `kind`: `"sse_error"`; `chunks`: `Uint8Array`[]; `errorType`: `string`; `message`: `string`; \}

Defined in: [types/proxy.ts:900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L900)

Result of buffering only enough upstream SSE to make a retry-safe decision.

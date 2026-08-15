[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicStreamPreflightResult

# Type Alias: AnthropicStreamPreflightResult

> **AnthropicStreamPreflightResult** = \{ `kind`: `"ready"`; `chunks`: `Uint8Array`[]; \} \| \{ `kind`: `"empty"`; `chunks`: `Uint8Array`[]; \} \| \{ `kind`: `"transport_error"`; `chunks`: `Uint8Array`[]; `error`: `unknown`; \} \| \{ `kind`: `"sse_error"`; `chunks`: `Uint8Array`[]; `errorType`: `string`; `message`: `string`; \}

Defined in: [types/proxy.ts:882](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L882)

Result of buffering only enough upstream SSE to make a retry-safe decision.

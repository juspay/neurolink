[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DEFAULT_RETRY_CONFIG

# Variable: DEFAULT_RETRY_CONFIG

> `const` **DEFAULT_RETRY_CONFIG**: [`ProcessorRetryConfig`](../type-aliases/ProcessorRetryConfig.md)

Defined in: [types/processor.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L199)

Default retry configuration for file downloads.
Uses exponential backoff: 1s, 2s, 4s (capped at maxDelayMs)

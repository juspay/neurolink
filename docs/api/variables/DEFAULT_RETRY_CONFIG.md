[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DEFAULT_RETRY_CONFIG

# Variable: DEFAULT_RETRY_CONFIG

> `const` **DEFAULT_RETRY_CONFIG**: [`ProcessorRetryConfig`](../type-aliases/ProcessorRetryConfig.md)

Defined in: [types/processor.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/processor.ts#L199)

Default retry configuration for file downloads.
Uses exponential backoff: 1s, 2s, 4s (capped at maxDelayMs)

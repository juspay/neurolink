[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DEFAULT_RETRY_CONFIG

# Variable: DEFAULT_RETRY_CONFIG

> `const` **DEFAULT_RETRY_CONFIG**: [`ProcessorRetryConfig`](../type-aliases/ProcessorRetryConfig.md)

Default retry configuration for file downloads.
Uses exponential backoff: 1s, 2s, 4s (capped at maxDelayMs)

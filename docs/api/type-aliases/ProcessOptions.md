[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessOptions

# Type Alias: ProcessOptions

> **ProcessOptions** = `object`

Options for file processing operations.
Allows customization of download behavior and retry logic.

## Properties

### authHeaders?

> `optional` **authHeaders?**: `Record`\<`string`, `string`\>

Authentication headers for download requests

---

### timeout?

> `optional` **timeout?**: `number`

Override default timeout (in milliseconds)

---

### retryConfig?

> `optional` **retryConfig?**: [`ProcessorRetryConfig`](ProcessorRetryConfig.md)

Retry configuration for transient failures

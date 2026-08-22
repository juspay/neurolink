[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessOptions

# Type Alias: ProcessOptions

> **ProcessOptions** = `object`

Defined in: [types/processor.ts:182](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L182)

Options for file processing operations.
Allows customization of download behavior and retry logic.

## Properties

### authHeaders?

> `optional` **authHeaders?**: `Record`\<`string`, `string`\>

Defined in: [types/processor.ts:184](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L184)

Authentication headers for download requests

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/processor.ts:186](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L186)

Override default timeout (in milliseconds)

---

### retryConfig?

> `optional` **retryConfig?**: [`ProcessorRetryConfig`](ProcessorRetryConfig.md)

Defined in: [types/processor.ts:188](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/processor.ts#L188)

Retry configuration for transient failures

[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientRetryConfig

# Type Alias: ClientRetryConfig

> **ClientRetryConfig** = `object`

Defined in: [types/client.ts:46](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L46)

Retry configuration for failed requests

## Properties

### maxAttempts

> **maxAttempts**: `number`

Defined in: [types/client.ts:48](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L48)

Maximum number of retry attempts (default: 3)

---

### initialDelayMs

> **initialDelayMs**: `number`

Defined in: [types/client.ts:50](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L50)

Initial delay in milliseconds before first retry (default: 1000)

---

### maxDelayMs

> **maxDelayMs**: `number`

Defined in: [types/client.ts:52](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L52)

Maximum delay in milliseconds between retries (default: 10000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Defined in: [types/client.ts:54](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L54)

Backoff multiplier for exponential backoff (default: 2)

---

### retryableStatusCodes?

> `optional` **retryableStatusCodes?**: `number`[]

Defined in: [types/client.ts:56](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L56)

HTTP status codes to retry on (default: [408, 429, 500, 502, 503, 504])

---

### retryOnNetworkError?

> `optional` **retryOnNetworkError?**: `boolean`

Defined in: [types/client.ts:58](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L58)

Whether to retry on network errors (default: true)

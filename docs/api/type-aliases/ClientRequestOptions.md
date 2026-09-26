[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientRequestOptions

# Type Alias: ClientRequestOptions

> **ClientRequestOptions** = `object`

Request options that can be passed to individual API calls

## Properties

### timeout?

> `optional` **timeout?**: `number`

Request timeout override in milliseconds

---

### signal?

> `optional` **signal?**: `AbortSignal`

Signal for request cancellation

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Additional headers for this request

---

### skipRetry?

> `optional` **skipRetry?**: `boolean`

Skip retry for this request

[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientRequestOptions

# Type Alias: ClientRequestOptions

> **ClientRequestOptions** = `object`

Defined in: [types/client.ts:64](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L64)

Request options that can be passed to individual API calls

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/client.ts:66](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L66)

Request timeout override in milliseconds

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/client.ts:68](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L68)

Signal for request cancellation

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L70)

Additional headers for this request

---

### skipRetry?

> `optional` **skipRetry?**: `boolean`

Defined in: [types/client.ts:72](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L72)

Skip retry for this request

[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientRequestOptions

# Type Alias: ClientRequestOptions

> **ClientRequestOptions** = `object`

Defined in: [types/client.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L64)

Request options that can be passed to individual API calls

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/client.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L66)

Request timeout override in milliseconds

---

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [types/client.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L68)

Signal for request cancellation

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/client.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L70)

Additional headers for this request

---

### skipRetry?

> `optional` **skipRetry?**: `boolean`

Defined in: [types/client.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L72)

Skip retry for this request

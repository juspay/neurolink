[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorHandlerOptions

# Type Alias: ErrorHandlerOptions

> **ErrorHandlerOptions** = `object`

Defined in: [types/client.ts:1383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1383)

Error handling interceptor options

## Properties

### onError?

> `optional` **onError?**: (`error`, `request`) => `Error` \| `void`

Defined in: [types/client.ts:1385](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1385)

Custom error handler

#### Parameters

##### error

`Error`

##### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

#### Returns

`Error` \| `void`

---

### transformError?

> `optional` **transformError?**: (`error`) => [`ClientApiError`](ClientApiError.md)

Defined in: [types/client.ts:1387](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1387)

Transform error response

#### Parameters

##### error

`unknown`

#### Returns

[`ClientApiError`](ClientApiError.md)

---

### reportError?

> `optional` **reportError?**: (`error`, `context`) => `void` \| `Promise`\<`void`\>

Defined in: [types/client.ts:1389](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1389)

Report errors to external service

#### Parameters

##### error

`Error`

##### context

[`ClientMiddlewareContext`](ClientMiddlewareContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

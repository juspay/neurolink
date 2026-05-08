[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryInterceptorOptions

# Type Alias: RetryInterceptorOptions

> **RetryInterceptorOptions** = [`ClientRetryConfig`](ClientRetryConfig.md) & `object`

Defined in: [types/client.ts:1304](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1304)

Retry interceptor options

## Type Declaration

### onRetry?

> `optional` **onRetry?**: (`attempt`, `error`, `request`) => `void`

Callback when a retry is attempted

#### Parameters

##### attempt

`number`

##### error

`Error` \| [`ClientApiError`](ClientApiError.md)

##### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

#### Returns

`void`

### shouldRetry?

> `optional` **shouldRetry?**: (`response`, `attempt`) => `boolean`

Custom retry condition

#### Parameters

##### response

[`ClientMiddlewareResponse`](ClientMiddlewareResponse.md)

##### attempt

`number`

#### Returns

`boolean`

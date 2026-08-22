[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryInterceptorOptions

# Type Alias: RetryInterceptorOptions

> **RetryInterceptorOptions** = [`ClientRetryConfig`](ClientRetryConfig.md) & `object`

Defined in: [types/client.ts:1304](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/client.ts#L1304)

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

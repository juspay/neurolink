[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TimeoutInterceptorOptions

# Type Alias: TimeoutInterceptorOptions

> **TimeoutInterceptorOptions** = `object`

Defined in: [types/client.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L1368)

Timeout interceptor options

## Properties

### timeout

> **timeout**: `number`

Defined in: [types/client.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L1370)

Timeout in milliseconds

---

### onTimeout?

> `optional` **onTimeout?**: (`request`) => `void`

Defined in: [types/client.ts:1372](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L1372)

Callback when timeout occurs

#### Parameters

##### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

#### Returns

`void`

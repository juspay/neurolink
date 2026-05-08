[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TimeoutInterceptorOptions

# Type Alias: TimeoutInterceptorOptions

> **TimeoutInterceptorOptions** = `object`

Defined in: [types/client.ts:1368](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1368)

Timeout interceptor options

## Properties

### timeout

> **timeout**: `number`

Defined in: [types/client.ts:1370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1370)

Timeout in milliseconds

---

### onTimeout?

> `optional` **onTimeout?**: (`request`) => `void`

Defined in: [types/client.ts:1372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L1372)

Callback when timeout occurs

#### Parameters

##### request

[`ClientMiddlewareRequest`](ClientMiddlewareRequest.md)

#### Returns

`void`

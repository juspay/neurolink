[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ErrorHandlerOptions

# Type Alias: ErrorHandlerOptions

> **ErrorHandlerOptions** = `object`

Error handling interceptor options

## Properties

### onError?

> `optional` **onError?**: (`error`, `request`) => `Error` \| `void`

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

Transform error response

#### Parameters

##### error

`unknown`

#### Returns

[`ClientApiError`](ClientApiError.md)

---

### reportError?

> `optional` **reportError?**: (`error`, `context`) => `void` \| `Promise`\<`void`\>

Report errors to external service

#### Parameters

##### error

`Error`

##### context

[`ClientMiddlewareContext`](ClientMiddlewareContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

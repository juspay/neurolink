[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareOptions

# Type Alias: AuthMiddlewareOptions

> **AuthMiddlewareOptions** = `object`

Auth middleware options

## Properties

### provider

> **provider**: [`AuthProvider`](AuthProvider.md)

Auth provider instance

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Routes to exclude from authentication

---

### optional?

> `optional` **optional?**: `boolean`

Whether auth is optional (continue if no token)

---

### onUnauthorized?

> `optional` **onUnauthorized?**: (`context`) => `Response` \| `Promise`\<`Response`\>

Custom unauthorized handler

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Response` \| `Promise`\<`Response`\>

---

### onError?

> `optional` **onError?**: (`error`, `context`) => `Response` \| `Promise`\<`Response`\>

Custom error handler

#### Parameters

##### error

`Error`

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Response` \| `Promise`\<`Response`\>

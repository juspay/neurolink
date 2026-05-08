[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareOptions

# Type Alias: AuthMiddlewareOptions

> **AuthMiddlewareOptions** = `object`

Defined in: [types/auth.ts:573](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L573)

Auth middleware options

## Properties

### provider

> **provider**: [`AuthProvider`](AuthProvider.md)

Defined in: [types/auth.ts:575](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L575)

Auth provider instance

---

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Defined in: [types/auth.ts:577](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L577)

Routes to exclude from authentication

---

### optional?

> `optional` **optional?**: `boolean`

Defined in: [types/auth.ts:579](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L579)

Whether auth is optional (continue if no token)

---

### onUnauthorized?

> `optional` **onUnauthorized?**: (`context`) => `Response` \| `Promise`\<`Response`\>

Defined in: [types/auth.ts:581](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L581)

Custom unauthorized handler

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Response` \| `Promise`\<`Response`\>

---

### onError?

> `optional` **onError?**: (`error`, `context`) => `Response` \| `Promise`\<`Response`\>

Defined in: [types/auth.ts:585](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L585)

Custom error handler

#### Parameters

##### error

`Error`

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Response` \| `Promise`\<`Response`\>

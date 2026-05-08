[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareConfig

# Type Alias: AuthMiddlewareConfig

> **AuthMiddlewareConfig** = `object`

Defined in: [types/auth.ts:594](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L594)

Auth middleware configuration

## Properties

### provider

> **provider**: [`AuthProviderType`](AuthProviderType.md)

Defined in: [types/auth.ts:596](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L596)

Auth provider to use

---

### providerConfig

> **providerConfig**: [`AuthProviderConfig`](AuthProviderConfig.md)

Defined in: [types/auth.ts:598](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L598)

Provider configuration

---

### tokenExtraction?

> `optional` **tokenExtraction?**: [`TokenExtractionConfig`](TokenExtractionConfig.md)

Defined in: [types/auth.ts:600](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L600)

Token extraction configuration

---

### publicRoutes?

> `optional` **publicRoutes?**: `string`[]

Defined in: [types/auth.ts:602](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L602)

Routes that don't require authentication

---

### optional?

> `optional` **optional?**: `boolean`

Defined in: [types/auth.ts:604](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L604)

Whether authentication is optional (request proceeds with or without auth)

---

### onError?

> `optional` **onError?**: (`error`, `context`) => `void` \| `Promise`\<`void`\>

Defined in: [types/auth.ts:606](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L606)

Custom error handler

#### Parameters

##### error

[`AuthErrorInfo`](AuthErrorInfo.md)

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

---

### onAuthenticated?

> `optional` **onAuthenticated?**: (`context`) => `void` \| `Promise`\<`void`\>

Defined in: [types/auth.ts:611](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L611)

Hook called after successful authentication

#### Parameters

##### context

[`AuthenticatedContext`](AuthenticatedContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

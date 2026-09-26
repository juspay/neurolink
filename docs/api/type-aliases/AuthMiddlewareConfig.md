[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareConfig

# Type Alias: AuthMiddlewareConfig

> **AuthMiddlewareConfig** = `object`

Auth middleware configuration

## Properties

### provider

> **provider**: [`AuthProviderType`](AuthProviderType.md)

Auth provider to use

---

### providerConfig

> **providerConfig**: [`AuthProviderConfig`](AuthProviderConfig.md)

Provider configuration

---

### tokenExtraction?

> `optional` **tokenExtraction?**: [`TokenExtractionConfig`](TokenExtractionConfig.md)

Token extraction configuration

---

### publicRoutes?

> `optional` **publicRoutes?**: `string`[]

Routes that don't require authentication

---

### optional?

> `optional` **optional?**: `boolean`

Whether authentication is optional (request proceeds with or without auth)

---

### onError?

> `optional` **onError?**: (`error`, `context`) => `void` \| `Promise`\<`void`\>

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

Hook called after successful authentication

#### Parameters

##### context

[`AuthenticatedContext`](AuthenticatedContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

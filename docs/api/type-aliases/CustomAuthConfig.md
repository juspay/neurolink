[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CustomAuthConfig

# Type Alias: CustomAuthConfig

> **CustomAuthConfig** = `object`

Custom auth provider configuration

## Properties

### validateToken

> **validateToken**: (`token`, `context?`) => `Promise`\<[`TokenValidationResult`](TokenValidationResult.md)\>

Custom token validation function

#### Parameters

##### token

`string`

##### context?

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`TokenValidationResult`](TokenValidationResult.md)\>

---

### getUser?

> `optional` **getUser?**: (`userId`) => `Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

Custom user fetching function

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

---

### createSession?

> `optional` **createSession?**: (`user`, `context?`) => `Promise`\<[`AuthSession`](AuthSession.md)\>

Custom session creation function

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### context?

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)\>

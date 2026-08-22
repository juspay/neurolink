[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CustomAuthConfig

# Type Alias: CustomAuthConfig

> **CustomAuthConfig** = `object`

Defined in: [types/auth.ts:827](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L827)

Custom auth provider configuration

## Properties

### validateToken

> **validateToken**: (`token`, `context?`) => `Promise`\<[`TokenValidationResult`](TokenValidationResult.md)\>

Defined in: [types/auth.ts:829](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L829)

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

Defined in: [types/auth.ts:834](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L834)

Custom user fetching function

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

---

### createSession?

> `optional` **createSession?**: (`user`, `context?`) => `Promise`\<[`AuthSession`](AuthSession.md)\>

Defined in: [types/auth.ts:836](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L836)

Custom session creation function

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### context?

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)\>

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthTokenValidator

# Type Alias: AuthTokenValidator

> **AuthTokenValidator** = `object`

Token operations: validate, extract, refresh, revoke.

## Methods

### authenticateToken()

> **authenticateToken**(`token`, `context?`): `Promise`\<[`TokenValidationResult`](TokenValidationResult.md)\>

Validate and decode an authentication token

#### Parameters

##### token

`string`

##### context?

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`TokenValidationResult`](TokenValidationResult.md)\>

---

### extractToken()

> **extractToken**(`context`): `string` \| `Promise`\<`string` \| `null`\> \| `null`

Extract token from request context

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`string` \| `Promise`\<`string` \| `null`\> \| `null`

---

### refreshToken()?

> `optional` **refreshToken**(`refreshToken`): `Promise`\<[`TokenRefreshResult`](TokenRefreshResult.md)\>

Refresh an authentication token (optional)

#### Parameters

##### refreshToken

`string`

#### Returns

`Promise`\<[`TokenRefreshResult`](TokenRefreshResult.md)\>

---

### revokeToken()?

> `optional` **revokeToken**(`token`): `Promise`\<`void`\>

Revoke a token / logout (optional)

#### Parameters

##### token

`string`

#### Returns

`Promise`\<`void`\>

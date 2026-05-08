[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthTokenValidator

# Type Alias: AuthTokenValidator

> **AuthTokenValidator** = `object`

Defined in: [types/auth.ts:1071](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1071)

Token operations: validate, extract, refresh, revoke.

## Methods

### authenticateToken()

> **authenticateToken**(`token`, `context?`): `Promise`\<[`TokenValidationResult`](TokenValidationResult.md)\>

Defined in: [types/auth.ts:1073](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1073)

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

Defined in: [types/auth.ts:1079](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1079)

Extract token from request context

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`string` \| `Promise`\<`string` \| `null`\> \| `null`

---

### refreshToken()?

> `optional` **refreshToken**(`refreshToken`): `Promise`\<[`TokenRefreshResult`](TokenRefreshResult.md)\>

Defined in: [types/auth.ts:1084](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1084)

Refresh an authentication token (optional)

#### Parameters

##### refreshToken

`string`

#### Returns

`Promise`\<[`TokenRefreshResult`](TokenRefreshResult.md)\>

---

### revokeToken()?

> `optional` **revokeToken**(`token`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1087](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1087)

Revoke a token / logout (optional)

#### Parameters

##### token

`string`

#### Returns

`Promise`\<`void`\>

[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthSessionManager

# Type Alias: AuthSessionManager

> **AuthSessionManager** = `object`

Defined in: [types/auth.ts:1113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1113)

Session management: create, read, refresh, destroy.

## Methods

### createSession()

> **createSession**(`user`, `context?`): `Promise`\<[`AuthSession`](AuthSession.md)\>

Defined in: [types/auth.ts:1115](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1115)

Create a new session for a user

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### context?

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)\>

---

### getSession()

> **getSession**(`sessionId`): `Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

Defined in: [types/auth.ts:1121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1121)

Get an existing session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

---

### refreshSession()

> **refreshSession**(`sessionId`): `Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

Defined in: [types/auth.ts:1124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1124)

Refresh/extend a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

---

### destroySession()

> **destroySession**(`sessionId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1127)

Invalidate/destroy a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](AuthSession.md)[]\>

Defined in: [types/auth.ts:1130](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1130)

Get all active sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)[]\>

---

### destroyAllUserSessions()

> **destroyAllUserSessions**(`userId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1133)

Invalidate all sessions for a user (global logout)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

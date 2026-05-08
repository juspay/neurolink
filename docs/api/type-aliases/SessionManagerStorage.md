[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionManagerStorage

# Type Alias: SessionManagerStorage

> **SessionManagerStorage** = `object`

Defined in: [types/auth.ts:1231](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1231)

Session storage interface for SessionManager

Defines the contract for session storage backends (memory, Redis, custom).
Note: This is a SessionManager-specific interface that uses `set()`/`getUserSessions()`/
`deleteUserSessions()`/`isHealthy()` method names, which differ from the canonical
`SessionStorage` type in `../types/auth.js` (which uses `save()`/`getForUser()`/
`deleteAllForUser()`/`exists()`/`touch()`). Both interfaces coexist because
SessionManager and BaseAuthProvider have separate storage patterns.

## Methods

### get()

> **get**(`sessionId`): `Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

Defined in: [types/auth.ts:1233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1233)

Get a session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

---

### set()

> **set**(`session`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1236)

Store a session

#### Parameters

##### session

[`AuthSession`](AuthSession.md)

#### Returns

`Promise`\<`void`\>

---

### delete()

> **delete**(`sessionId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1239](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1239)

Delete a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](AuthSession.md)[]\>

Defined in: [types/auth.ts:1242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1242)

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)[]\>

---

### deleteUserSessions()

> **deleteUserSessions**(`userId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1245)

Delete all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:1248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1248)

Clear all sessions (for cleanup)

#### Returns

`Promise`\<`void`\>

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Defined in: [types/auth.ts:1251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1251)

Health check

#### Returns

`Promise`\<`boolean`\>

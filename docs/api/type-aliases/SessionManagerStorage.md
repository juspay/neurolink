[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionManagerStorage

# Type Alias: SessionManagerStorage

> **SessionManagerStorage** = `object`

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

Get a session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

---

### set()

> **set**(`session`): `Promise`\<`void`\>

Store a session

#### Parameters

##### session

[`AuthSession`](AuthSession.md)

#### Returns

`Promise`\<`void`\>

---

### delete()

> **delete**(`sessionId`): `Promise`\<`void`\>

Delete a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](AuthSession.md)[]\>

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)[]\>

---

### deleteUserSessions()

> **deleteUserSessions**(`userId`): `Promise`\<`void`\>

Delete all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Clear all sessions (for cleanup)

#### Returns

`Promise`\<`void`\>

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Health check

#### Returns

`Promise`\<`boolean`\>

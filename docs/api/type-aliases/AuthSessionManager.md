[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthSessionManager

# Type Alias: AuthSessionManager

> **AuthSessionManager** = `object`

Session management: create, read, refresh, destroy.

## Methods

### createSession()

> **createSession**(`user`, `context?`): `Promise`\<[`AuthSession`](AuthSession.md)\>

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

Get an existing session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

---

### refreshSession()

> **refreshSession**(`sessionId`): `Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

Refresh/extend a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

---

### destroySession()

> **destroySession**(`sessionId`): `Promise`\<`void`\>

Invalidate/destroy a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](AuthSession.md)[]\>

Get all active sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)[]\>

---

### destroyAllUserSessions()

> **destroyAllUserSessions**(`userId`): `Promise`\<`void`\>

Invalidate all sessions for a user (global logout)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

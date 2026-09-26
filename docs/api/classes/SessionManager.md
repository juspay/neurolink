[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionManager

# Class: SessionManager

Session Manager

High-level session management that handles session lifecycle,
automatic refresh, and storage abstraction.

## Constructors

### Constructor

> **new SessionManager**(`config?`): `SessionManager`

#### Parameters

##### config?

[`SessionConfig`](../type-aliases/SessionConfig.md) = `{}`

#### Returns

`SessionManager`

## Methods

### createSession()

> **createSession**(`user`, `metadata?`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

Create a new session

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

##### metadata?

###### ipAddress?

`string`

###### userAgent?

`string`

###### deviceId?

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

---

### getSession()

> **getSession**(`sessionId`, `autoRefresh?`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

Get a session by ID

Optionally auto-refreshes if close to expiration.

#### Parameters

##### sessionId

`string`

##### autoRefresh?

`boolean` \| `undefined`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

---

### refreshSession()

> **refreshSession**(`sessionId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

Refresh a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

---

### destroySession()

> **destroySession**(`sessionId`): `Promise`\<`void`\>

Destroy a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

---

### destroyAllUserSessions()

> **destroyAllUserSessions**(`userId`): `Promise`\<`void`\>

Destroy all sessions for a user (global logout)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### validateSession()

> **validateSession**(`sessionId`): `Promise`\<`boolean`\>

Validate a session is still active

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

---

### updateSessionMetadata()

> **updateSessionMetadata**(`sessionId`, `metadata`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

Update session metadata

#### Parameters

##### sessionId

`string`

##### metadata

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Health check

#### Returns

`Promise`\<`boolean`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Clear all sessions (for testing/cleanup)

#### Returns

`Promise`\<`void`\>

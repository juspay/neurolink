[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionManager

# Class: SessionManager

Defined in: [auth/sessionManager.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L370)

Session Manager

High-level session management that handles session lifecycle,
automatic refresh, and storage abstraction.

## Constructors

### Constructor

> **new SessionManager**(`config?`): `SessionManager`

Defined in: [auth/sessionManager.ts:374](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L374)

#### Parameters

##### config?

[`SessionConfig`](../type-aliases/SessionConfig.md) = `{}`

#### Returns

`SessionManager`

## Methods

### createSession()

> **createSession**(`user`, `metadata?`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

Defined in: [auth/sessionManager.ts:409](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L409)

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

Defined in: [auth/sessionManager.ts:466](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L466)

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

Defined in: [auth/sessionManager.ts:520](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L520)

Refresh a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

---

### destroySession()

> **destroySession**(`sessionId`): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:550](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L550)

Destroy a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

Defined in: [auth/sessionManager.ts:558](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L558)

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

---

### destroyAllUserSessions()

> **destroyAllUserSessions**(`userId`): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:565](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L565)

Destroy all sessions for a user (global logout)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### validateSession()

> **validateSession**(`sessionId`): `Promise`\<`boolean`\>

Defined in: [auth/sessionManager.ts:573](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L573)

Validate a session is still active

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

---

### updateSessionMetadata()

> **updateSessionMetadata**(`sessionId`, `metadata`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

Defined in: [auth/sessionManager.ts:592](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L592)

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

Defined in: [auth/sessionManager.ts:614](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L614)

Health check

#### Returns

`Promise`\<`boolean`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:621](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L621)

Clear all sessions (for testing/cleanup)

#### Returns

`Promise`\<`void`\>

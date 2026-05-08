[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemorySessionStorage

# Class: MemorySessionStorage

Defined in: [auth/sessionManager.ts:31](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L31)

In-memory session storage

Simple session storage using Map. Suitable for single-instance deployments
or development. Sessions are lost on restart.

## Implements

- [`SessionManagerStorage`](../type-aliases/SessionManagerStorage.md)

## Constructors

### Constructor

> **new MemorySessionStorage**(): `MemorySessionStorage`

#### Returns

`MemorySessionStorage`

## Methods

### get()

> **get**(`sessionId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

Defined in: [auth/sessionManager.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L35)

Get a session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

#### Implementation of

`SessionManagerStorage.get`

---

### set()

> **set**(`session`): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L51)

Store a session

#### Parameters

##### session

[`AuthSession`](../type-aliases/AuthSession.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionManagerStorage.set`

---

### delete()

> **delete**(`sessionId`): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:63](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L63)

Delete a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionManagerStorage.delete`

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

Defined in: [auth/sessionManager.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L78)

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

#### Implementation of

`SessionManagerStorage.getUserSessions`

---

### deleteUserSessions()

> **deleteUserSessions**(`userId`): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L96)

Delete all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionManagerStorage.deleteUserSessions`

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L107)

Clear all sessions (for cleanup)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionManagerStorage.clear`

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Defined in: [auth/sessionManager.ts:112](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L112)

Health check

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

`SessionManagerStorage.isHealthy`

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MemorySessionStorage

# Class: MemorySessionStorage

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

Clear all sessions (for cleanup)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionManagerStorage.clear`

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Health check

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

`SessionManagerStorage.isHealthy`

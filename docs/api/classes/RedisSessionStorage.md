[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisSessionStorage

# Class: RedisSessionStorage

Redis session storage

Distributed session storage using Redis. Suitable for multi-instance
deployments. Requires the "redis" (node-redis) package.

Note: Redis client must be provided or configured via environment.

## Implements

- [`SessionManagerStorage`](../type-aliases/SessionManagerStorage.md)

## Constructors

### Constructor

> **new RedisSessionStorage**(`config`): `RedisSessionStorage`

#### Parameters

##### config

###### url

`string`

###### prefix?

`string`

###### ttl?

`number`

#### Returns

`RedisSessionStorage`

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

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

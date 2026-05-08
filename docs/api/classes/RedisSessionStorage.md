[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisSessionStorage

# Class: RedisSessionStorage

Defined in: [auth/sessionManager.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L125)

Redis session storage

Distributed session storage using Redis. Suitable for multi-instance
deployments. Requires the "redis" (node-redis) package.

Note: Redis client must be provided or configured via environment.

## Implements

- [`SessionManagerStorage`](../type-aliases/SessionManagerStorage.md)

## Constructors

### Constructor

> **new RedisSessionStorage**(`config`): `RedisSessionStorage`

Defined in: [auth/sessionManager.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L132)

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

Defined in: [auth/sessionManager.ts:189](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L189)

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

Defined in: [auth/sessionManager.ts:226](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L226)

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

Defined in: [auth/sessionManager.ts:254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L254)

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

Defined in: [auth/sessionManager.ts:288](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L288)

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

Defined in: [auth/sessionManager.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L308)

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

Defined in: [auth/sessionManager.ts:323](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L323)

Clear all sessions (for cleanup)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionManagerStorage.clear`

---

### isHealthy()

> **isHealthy**(): `Promise`\<`boolean`\>

Defined in: [auth/sessionManager.ts:345](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L345)

Health check

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

`SessionManagerStorage.isHealthy`

---

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Defined in: [auth/sessionManager.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/sessionManager.ts#L355)

#### Returns

`Promise`\<`void`\>

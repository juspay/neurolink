[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemorySessionStorage

# Class: InMemorySessionStorage

Defined in: [auth/providers/BaseAuthProvider.ts:53](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L53)

Default in-memory session storage

## Implements

- [`SessionStorage`](../type-aliases/SessionStorage.md)

## Constructors

### Constructor

> **new InMemorySessionStorage**(): `InMemorySessionStorage`

#### Returns

`InMemorySessionStorage`

## Accessors

### size

#### Get Signature

> **get** **size**(): `number`

Defined in: [auth/providers/BaseAuthProvider.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L154)

Get session count (for testing/monitoring)

##### Returns

`number`

## Methods

### get()

> **get**(`sessionId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

Defined in: [auth/providers/BaseAuthProvider.ts:57](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L57)

Get a session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

#### Implementation of

`SessionStorage.get`

---

### save()

> **save**(`session`): `Promise`\<`void`\>

Defined in: [auth/providers/BaseAuthProvider.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L61)

Save a session

#### Parameters

##### session

[`AuthSession`](../type-aliases/AuthSession.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionStorage.save`

---

### delete()

> **delete**(`sessionId`): `Promise`\<`void`\>

Defined in: [auth/providers/BaseAuthProvider.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L70)

Delete a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionStorage.delete`

---

### deleteAllForUser()

> **deleteAllForUser**(`userId`): `Promise`\<`void`\>

Defined in: [auth/providers/BaseAuthProvider.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L86)

Delete all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionStorage.deleteAllForUser`

---

### getForUser()

> **getForUser**(`userId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

Defined in: [auth/providers/BaseAuthProvider.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L96)

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

#### Implementation of

`SessionStorage.getForUser`

---

### exists()

> **exists**(`sessionId`): `Promise`\<`boolean`\>

Defined in: [auth/providers/BaseAuthProvider.ts:134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L134)

Check if a session exists

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

`SessionStorage.exists`

---

### touch()

> **touch**(`sessionId`): `Promise`\<`void`\>

Defined in: [auth/providers/BaseAuthProvider.ts:138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L138)

Update session last activity

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionStorage.touch`

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [auth/providers/BaseAuthProvider.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L146)

Clear all sessions

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionStorage.clear`

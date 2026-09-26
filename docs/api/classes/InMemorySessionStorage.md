[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemorySessionStorage

# Class: InMemorySessionStorage

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

Get session count (for testing/monitoring)

##### Returns

`number`

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

`SessionStorage.get`

---

### save()

> **save**(`session`): `Promise`\<`void`\>

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

Clear all sessions

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SessionStorage.clear`

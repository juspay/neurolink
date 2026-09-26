[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionStorage

# Type Alias: SessionStorage

> **SessionStorage** = `object`

Session storage interface

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

### save()

> **save**(`session`): `Promise`\<`void`\>

Save a session

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

### deleteAllForUser()

> **deleteAllForUser**(`userId`): `Promise`\<`void`\>

Delete all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### getForUser()

> **getForUser**(`userId`): `Promise`\<[`AuthSession`](AuthSession.md)[]\>

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)[]\>

---

### exists()

> **exists**(`sessionId`): `Promise`\<`boolean`\>

Check if a session exists

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

---

### touch()

> **touch**(`sessionId`): `Promise`\<`void`\>

Update session last activity

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Clear all sessions

#### Returns

`Promise`\<`void`\>

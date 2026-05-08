[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionStorage

# Type Alias: SessionStorage

> **SessionStorage** = `object`

Defined in: [types/auth.ts:292](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L292)

Session storage interface

## Methods

### get()

> **get**(`sessionId`): `Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

Defined in: [types/auth.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L294)

Get a session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md) \| `null`\>

---

### save()

> **save**(`session`): `Promise`\<`void`\>

Defined in: [types/auth.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L296)

Save a session

#### Parameters

##### session

[`AuthSession`](AuthSession.md)

#### Returns

`Promise`\<`void`\>

---

### delete()

> **delete**(`sessionId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:298](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L298)

Delete a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### deleteAllForUser()

> **deleteAllForUser**(`userId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:300](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L300)

Delete all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### getForUser()

> **getForUser**(`userId`): `Promise`\<[`AuthSession`](AuthSession.md)[]\>

Defined in: [types/auth.ts:302](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L302)

Get all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](AuthSession.md)[]\>

---

### exists()

> **exists**(`sessionId`): `Promise`\<`boolean`\>

Defined in: [types/auth.ts:304](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L304)

Check if a session exists

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`boolean`\>

---

### touch()

> **touch**(`sessionId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:306](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L306)

Update session last activity

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### clear()

> **clear**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L308)

Clear all sessions

#### Returns

`Promise`\<`void`\>

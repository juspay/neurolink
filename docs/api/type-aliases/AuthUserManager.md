[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthUserManager

# Type Alias: AuthUserManager

> **AuthUserManager** = `object`

Defined in: [types/auth.ts:1149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1149)

Optional user management operations.

## Methods

### getUser()?

> `optional` **getUser**(`userId`): `Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

Defined in: [types/auth.ts:1151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1151)

Get user by ID

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

---

### getUserByEmail()?

> `optional` **getUserByEmail**(`email`): `Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

Defined in: [types/auth.ts:1154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1154)

Get user by email

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

---

### updateUserMetadata()?

> `optional` **updateUserMetadata**(`userId`, `metadata`): `Promise`\<[`AuthUser`](AuthUser.md)\>

Defined in: [types/auth.ts:1157](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1157)

Update user metadata

#### Parameters

##### userId

`string`

##### metadata

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md)\>

---

### updateUserRoles()?

> `optional` **updateUserRoles**(`userId`, `roles`): `Promise`\<[`AuthUser`](AuthUser.md)\>

Defined in: [types/auth.ts:1163](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1163)

Update user roles

#### Parameters

##### userId

`string`

##### roles

`string`[]

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md)\>

---

### updateUserPermissions()?

> `optional` **updateUserPermissions**(`userId`, `permissions`): `Promise`\<[`AuthUser`](AuthUser.md)\>

Defined in: [types/auth.ts:1166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1166)

Update user permissions

#### Parameters

##### userId

`string`

##### permissions

`string`[]

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md)\>

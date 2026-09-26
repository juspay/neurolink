[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthUserManager

# Type Alias: AuthUserManager

> **AuthUserManager** = `object`

Optional user management operations.

## Methods

### getUser()?

> `optional` **getUser**(`userId`): `Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

Get user by ID

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

---

### getUserByEmail()?

> `optional` **getUserByEmail**(`email`): `Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

Get user by email

#### Parameters

##### email

`string`

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md) \| `null`\>

---

### updateUserMetadata()?

> `optional` **updateUserMetadata**(`userId`, `metadata`): `Promise`\<[`AuthUser`](AuthUser.md)\>

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

Update user permissions

#### Parameters

##### userId

`string`

##### permissions

`string`[]

#### Returns

`Promise`\<[`AuthUser`](AuthUser.md)\>

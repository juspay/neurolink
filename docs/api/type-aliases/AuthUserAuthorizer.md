[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthUserAuthorizer

# Type Alias: AuthUserAuthorizer

> **AuthUserAuthorizer** = `object`

Authorization: check roles and permissions.

## Methods

### authorizeUser()

> **authorizeUser**(`user`, `permission`): `Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

Check if a user is authorized to perform an action

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### permission

`string`

#### Returns

`Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

---

### authorizeRoles()

> **authorizeRoles**(`user`, `roles`): `Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

Check if user has specific roles

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### roles

`string`[]

#### Returns

`Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

---

### authorizePermissions()

> **authorizePermissions**(`user`, `permissions`): `Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

Check if user has all specified permissions

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### permissions

`string`[]

#### Returns

`Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

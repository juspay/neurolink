[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthUserAuthorizer

# Type Alias: AuthUserAuthorizer

> **AuthUserAuthorizer** = `object`

Defined in: [types/auth.ts:1093](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1093)

Authorization: check roles and permissions.

## Methods

### authorizeUser()

> **authorizeUser**(`user`, `permission`): `Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

Defined in: [types/auth.ts:1095](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1095)

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

Defined in: [types/auth.ts:1101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1101)

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

Defined in: [types/auth.ts:1104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1104)

Check if user has all specified permissions

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### permissions

`string`[]

#### Returns

`Promise`\<[`AuthorizationResult`](AuthorizationResult.md)\>

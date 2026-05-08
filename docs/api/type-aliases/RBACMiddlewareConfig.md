[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RBACMiddlewareConfig

# Type Alias: RBACMiddlewareConfig

> **RBACMiddlewareConfig** = `object`

Defined in: [types/auth.ts:617](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L617)

RBAC middleware configuration

## Properties

### roles?

> `optional` **roles?**: `string`[]

Defined in: [types/auth.ts:619](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L619)

Required roles (user must have at least one)

---

### permissions?

> `optional` **permissions?**: `string`[]

Defined in: [types/auth.ts:621](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L621)

Required permissions (user must have all)

---

### requireAllRoles?

> `optional` **requireAllRoles?**: `boolean`

Defined in: [types/auth.ts:623](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L623)

Whether all roles are required (default: false, any role matches)

---

### superAdminRoles?

> `optional` **superAdminRoles?**: `string`[]

Defined in: [types/auth.ts:625](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L625)

Super admin roles that bypass all role/permission checks

---

### rolePermissions?

> `optional` **rolePermissions?**: `Record`\<`string`, `string`[]\>

Defined in: [types/auth.ts:627](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L627)

Mapping from role name to granted permissions

---

### roleHierarchy?

> `optional` **roleHierarchy?**: `Record`\<`string`, `string`[]\>

Defined in: [types/auth.ts:629](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L629)

Role hierarchy: a role inherits permissions from its children

---

### custom?

> `optional` **custom?**: (`user`, `context`) => `boolean` \| `Promise`\<`boolean`\>

Defined in: [types/auth.ts:631](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L631)

Custom authorization function

#### Parameters

##### user

[`AuthUser`](AuthUser.md)

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`boolean` \| `Promise`\<`boolean`\>

---

### onDenied?

> `optional` **onDenied?**: (`result`, `context`) => `void` \| `Promise`\<`void`\>

Defined in: [types/auth.ts:636](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L636)

Custom error handler

#### Parameters

##### result

[`AuthorizationResult`](AuthorizationResult.md)

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

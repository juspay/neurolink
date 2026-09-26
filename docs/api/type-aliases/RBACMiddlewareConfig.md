[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RBACMiddlewareConfig

# Type Alias: RBACMiddlewareConfig

> **RBACMiddlewareConfig** = `object`

RBAC middleware configuration

## Properties

### roles?

> `optional` **roles?**: `string`[]

Required roles (user must have at least one)

---

### permissions?

> `optional` **permissions?**: `string`[]

Required permissions (user must have all)

---

### requireAllRoles?

> `optional` **requireAllRoles?**: `boolean`

Whether all roles are required (default: false, any role matches)

---

### superAdminRoles?

> `optional` **superAdminRoles?**: `string`[]

Super admin roles that bypass all role/permission checks

---

### rolePermissions?

> `optional` **rolePermissions?**: `Record`\<`string`, `string`[]\>

Mapping from role name to granted permissions

---

### roleHierarchy?

> `optional` **roleHierarchy?**: `Record`\<`string`, `string`[]\>

Role hierarchy: a role inherits permissions from its children

---

### custom?

> `optional` **custom?**: (`user`, `context`) => `boolean` \| `Promise`\<`boolean`\>

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

Custom error handler

#### Parameters

##### result

[`AuthorizationResult`](AuthorizationResult.md)

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`void` \| `Promise`\<`void`\>

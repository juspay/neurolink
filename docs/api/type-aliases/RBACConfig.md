[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RBACConfig

# Type Alias: RBACConfig

> **RBACConfig** = `object`

Defined in: [types/auth.ts:535](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L535)

Role-Based Access Control configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/auth.ts:537](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L537)

Enable RBAC

---

### defaultRoles?

> `optional` **defaultRoles?**: `string`[]

Defined in: [types/auth.ts:539](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L539)

Default roles for new users

---

### roleHierarchy?

> `optional` **roleHierarchy?**: `Record`\<`string`, `string`[]\>

Defined in: [types/auth.ts:541](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L541)

Role hierarchy (higher roles inherit lower role permissions)

---

### rolePermissions?

> `optional` **rolePermissions?**: `Record`\<`string`, `string`[]\>

Defined in: [types/auth.ts:543](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L543)

Permission definitions per role

---

### permissions?

> `optional` **permissions?**: [`PermissionDefinition`](PermissionDefinition.md)[]

Defined in: [types/auth.ts:545](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L545)

Permission definitions

---

### defaultPermissions?

> `optional` **defaultPermissions?**: `string`[]

Defined in: [types/auth.ts:547](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L547)

Default permissions for authenticated users

---

### superAdminRoles?

> `optional` **superAdminRoles?**: `string`[]

Defined in: [types/auth.ts:549](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L549)

Super admin roles (bypass all checks)

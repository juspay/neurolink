[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RBACConfig

# Type Alias: RBACConfig

> **RBACConfig** = `object`

Role-Based Access Control configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable RBAC

---

### defaultRoles?

> `optional` **defaultRoles?**: `string`[]

Default roles for new users

---

### roleHierarchy?

> `optional` **roleHierarchy?**: `Record`\<`string`, `string`[]\>

Role hierarchy (higher roles inherit lower role permissions)

---

### rolePermissions?

> `optional` **rolePermissions?**: `Record`\<`string`, `string`[]\>

Permission definitions per role

---

### permissions?

> `optional` **permissions?**: [`PermissionDefinition`](PermissionDefinition.md)[]

Permission definitions

---

### defaultPermissions?

> `optional` **defaultPermissions?**: `string`[]

Default permissions for authenticated users

---

### superAdminRoles?

> `optional` **superAdminRoles?**: `string`[]

Super admin roles (bypass all checks)

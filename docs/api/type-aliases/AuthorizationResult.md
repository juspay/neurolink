[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthorizationResult

# Type Alias: AuthorizationResult

> **AuthorizationResult** = `object`

Authorization check result

## Properties

### authorized

> **authorized**: `boolean`

Whether the user is authorized

---

### user?

> `optional` **user?**: [`AuthUser`](AuthUser.md)

User being authorized

---

### requiredRoles?

> `optional` **requiredRoles?**: `string`[]

Required roles that were checked

---

### requiredPermissions?

> `optional` **requiredPermissions?**: `string`[]

Required permissions that were checked

---

### reason?

> `optional` **reason?**: `string`

Reason for denial if not authorized

---

### missingPermissions?

> `optional` **missingPermissions?**: `string`[]

Missing permissions if denied

---

### missingRoles?

> `optional` **missingRoles?**: `string`[]

Missing roles if denied

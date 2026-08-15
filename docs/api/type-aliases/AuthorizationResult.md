[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthorizationResult

# Type Alias: AuthorizationResult

> **AuthorizationResult** = `object`

Defined in: [types/auth.ts:318](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L318)

Authorization check result

## Properties

### authorized

> **authorized**: `boolean`

Defined in: [types/auth.ts:320](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L320)

Whether the user is authorized

---

### user?

> `optional` **user?**: [`AuthUser`](AuthUser.md)

Defined in: [types/auth.ts:322](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L322)

User being authorized

---

### requiredRoles?

> `optional` **requiredRoles?**: `string`[]

Defined in: [types/auth.ts:324](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L324)

Required roles that were checked

---

### requiredPermissions?

> `optional` **requiredPermissions?**: `string`[]

Defined in: [types/auth.ts:326](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L326)

Required permissions that were checked

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/auth.ts:328](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L328)

Reason for denial if not authorized

---

### missingPermissions?

> `optional` **missingPermissions?**: `string`[]

Defined in: [types/auth.ts:330](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L330)

Missing permissions if denied

---

### missingRoles?

> `optional` **missingRoles?**: `string`[]

Defined in: [types/auth.ts:332](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L332)

Missing roles if denied

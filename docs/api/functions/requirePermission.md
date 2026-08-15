[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / requirePermission

# Function: requirePermission()

> **requirePermission**(`permission`): `void`

Defined in: [auth/authContext.ts:231](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/authContext.ts#L231)

Require a permission

Throws if user doesn't have the permission.

## Parameters

### permission

`string`

Required permission

## Returns

`void`

## Throws

Error if user lacks permission

## Example

```typescript
requirePermission("admin:write");
// Safe to proceed with admin write operation
```

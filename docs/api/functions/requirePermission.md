[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / requirePermission

# Function: requirePermission()

> **requirePermission**(`permission`): `void`

Defined in: [auth/authContext.ts:231](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/authContext.ts#L231)

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

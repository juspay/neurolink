[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / requirePermission

# Function: requirePermission()

> **requirePermission**(`permission`): `void`

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

[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isJWTExpired

# Function: isJWTExpired()

> **isJWTExpired**(`token`, `bufferMs?`): `boolean`

Check if a JWT token is expired

## Parameters

### token

`string`

### bufferMs?

`number` = `0`

## Returns

`boolean`

## Example

```typescript
if (isJWTExpired(token)) {
  // Refresh the token
}
```

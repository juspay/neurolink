[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isJWTExpired

# Function: isJWTExpired()

> **isJWTExpired**(`token`, `bufferMs?`): `boolean`

Defined in: [client/auth.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/client/auth.ts#L511)

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

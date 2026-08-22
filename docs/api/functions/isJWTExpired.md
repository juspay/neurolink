[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isJWTExpired

# Function: isJWTExpired()

> **isJWTExpired**(`token`, `bufferMs?`): `boolean`

Defined in: [client/auth.ts:511](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L511)

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

[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isJWTExpired

# Function: isJWTExpired()

> **isJWTExpired**(`token`, `bufferMs?`): `boolean`

Defined in: [client/auth.ts:511](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/client/auth.ts#L511)

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
